import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MEMORY_DIR = "/home/openclaw/.openclaw/workspaces/eva/ClawVault/memory";
const STATS_DIR = path.join(MEMORY_DIR, ".stats");

// Ensure stats directory exists
try {
  if (!fs.existsSync(STATS_DIR)) {
    fs.mkdirSync(STATS_DIR, { recursive: true });
  }
} catch {}

function getDateKey(d: Date = new Date()): string {
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function getStatsFilePath(date: string): string {
  return path.join(STATS_DIR, `stats_${date}.json`);
}

function countFiles(dir: string, ext?: string): number {
  try {
    const files = fs.readdirSync(dir);
    if (ext) {
      return files.filter(f => f.endsWith(ext)).length;
    }
    return files.length;
  } catch {
    return 0;
  }
}

function getDirSize(dir: string): number {
  try {
    let total = 0;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const p = path.join(dir, f);
      const stat = fs.statSync(p);
      if (stat.isFile()) {
        total += stat.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

function collectMemoryStats() {
  const memoryFiles = countFiles(MEMORY_DIR, ".md");
  const memorySize = getDirSize(MEMORY_DIR);
  const mdFiles = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith(".md"));
  
  // Get status.json for FTS info
  let ftsDocs = 0;
  let lastIndexed = null;
  try {
    const status = JSON.parse(fs.readFileSync(path.join(MEMORY_DIR, "status.json"), "utf8"));
    ftsDocs = status.fts?.docsIndexed || 0;
    lastIndexed = status.fts?.lastIndexedAt || null;
  } catch {
    // ignore
  }

  return {
    memoryFiles,
    memorySize,
    ftsDocs,
    lastIndexed,
    mdFiles,
    collectedAt: new Date().toISOString(),
  };
}

function loadStatsForDate(dateKey: string) {
  try {
    const fp = getStatsFilePath(dateKey);
    if (fs.existsSync(fp)) {
      return JSON.parse(fs.readFileSync(fp, "utf8"));
    }
  } catch {}
  return null;
}

function saveStatsForDate(dateKey: string, stats: object) {
  const fp = getStatsFilePath(dateKey);
  fs.writeFileSync(fp, JSON.stringify(stats, null, 2));
}

function computeDelta(today: any, yesterday: any) {
  if (!yesterday) {
    return { isFirst: true, changes: [] };
  }

  const changes: { type: "new" | "updated" | "deleted"; key: string; from: any; to: any }[] = [];
  
  // Compare memoryFiles
  if (today.memoryFiles !== yesterday.memoryFiles) {
    const diff = today.memoryFiles - yesterday.memoryFiles;
    changes.push({
      type: diff > 0 ? "new" : "deleted",
      key: "memoryFiles",
      from: yesterday.memoryFiles,
      to: today.memoryFiles,
    });
  }

  // Compare ftsDocs
  if (today.ftsDocs !== yesterday.ftsDocs) {
    const diff = today.ftsDocs - yesterday.ftsDocs;
    changes.push({
      type: diff > 0 ? "new" : "deleted",
      key: "ftsDocs",
      from: yesterday.ftsDocs,
      to: today.ftsDocs,
    });
  }

  // Compare memorySize
  if (today.memorySize !== yesterday.memorySize) {
    const diff = today.memorySize - yesterday.memorySize;
    changes.push({
      type: diff > 0 ? "updated" : "deleted",
      key: "memorySize",
      from: yesterday.memorySize,
      to: today.memorySize,
    });
  }

  // Compare individual MD files - find new/updated/deleted
  const todayFiles = new Set<string>((today.mdFiles as string[]) || []);
  const yesterdayFiles = new Set<string>((yesterday.mdFiles as string[]) || []);

  const newFiles: string[] = [];
  const deletedFiles: string[] = [];
  const existingFiles: string[] = [];

  for (const f of todayFiles) {
    if (!yesterdayFiles.has(f)) {
      newFiles.push(f);
    } else {
      existingFiles.push(f);
    }
  }

  for (const f of yesterdayFiles) {
    if (!todayFiles.has(f)) {
      deletedFiles.push(f);
    }
  }

  // Check for updated files by comparing file mtimes
  const updatedFiles: string[] = [];
  const todayKey = getDateKey();
  for (const f of existingFiles) {
    try {
      const fp = path.join(MEMORY_DIR, f);
      const stat = fs.statSync(fp);
      const fileMtime = new Date(stat.mtime).toISOString().split("T")[0];
      if (fileMtime === todayKey) {
        updatedFiles.push(f);
      }
    } catch {}
  }

  if (newFiles.length > 0) {
    changes.push({ type: "new", key: "newFiles", from: [], to: newFiles });
  }
  if (deletedFiles.length > 0) {
    changes.push({ type: "deleted", key: "deletedFiles", from: deletedFiles, to: [] });
  }
  if (updatedFiles.length > 0) {
    changes.push({ type: "updated", key: "updatedFiles", from: [], to: updatedFiles });
  }

  return { isFirst: false, changes };
}

export async function GET() {
  const todayKey = getDateKey();
  const yesterdayKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getDateKey(d);
  })();

  // Collect today's stats
  const todayStats = collectMemoryStats();
  
  // Save today's stats
  saveStatsForDate(todayKey, todayStats);

  // Load yesterday's stats
  const yesterdayStats = loadStatsForDate(yesterdayKey);

  // Compute delta
  const delta = computeDelta(todayStats, yesterdayStats);

  return NextResponse.json({
    today: todayStats,
    yesterday: yesterdayStats,
    delta,
    fetchedAt: new Date().toISOString(),
  });
}
