import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MEMORY_DIR = "/home/openclaw/.openclaw/workspaces/eva/ClawVault/memory";

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

export async function GET() {
  const memoryFiles = countFiles(MEMORY_DIR, ".md");
  const memorySize = getDirSize(MEMORY_DIR);
  
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

  return NextResponse.json({
    memoryFiles,
    memorySize,
    ftsDocs,
    lastIndexed,
    fetchedAt: new Date().toISOString(),
  });
}
