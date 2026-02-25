import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VAULT = "/home/openclaw/.openclaw/workspaces/eva/ClawVault";
const JOBS = path.join(VAULT, "jobs");
const LOG_DIR = "/tmp";

function readFile(p: string) {
  try { return fs.readFileSync(p, "utf8").trim(); } catch { return ""; }
}

function findJob(id: string) {
  const buckets = ["pending","running","done","failed","pending_l2","running_l2","done_l2","failed_l2"];
  for (const bucket of buckets) {
    // Check if it's a file (L1 jobs)
    const filePath = path.join(JOBS, bucket, id);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return { type: "file", bucket, path: filePath };
    }
    // Check if it's a directory (L2 jobs)
    const dirPath = path.join(JOBS, bucket, id);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      return { type: "dir", bucket, path: dirPath };
    }
  }
  return null;
}

function findLog(id: string) {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const logFile = files.find(f => f.includes(id) && f.startsWith("vacaylens-builder-") && f.endsWith(".log"));
    if (logFile) {
      const logPath = path.join(LOG_DIR, logFile);
      const content = fs.readFileSync(logPath, "utf8");
      const lines = content.split("\n");
      return lines.slice(-100).join("\n");
    }
  } catch {}
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = findJob(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const result: any = { id, bucket: job.bucket, type: job.type };
  
  if (job.type === "file") {
    result.content = readFile(job.path);
  } else {
    result.request = readFile(path.join(job.path, "request.txt"));
    result.approved = readFile(path.join(job.path, "approved"));
    result.approvedAt = readFile(path.join(job.path, "approved_at.txt"));
    result.createdAt = readFile(path.join(job.path, "created_at.txt"));
    result.runSh = readFile(path.join(job.path, "run.sh"));
    result.failReason = readFile(path.join(job.path, "fail_reason.txt"));
    result.result = readFile(path.join(job.path, "result.txt"));
  }

  const log = findLog(id);
  if (log) result.log = log;

  return NextResponse.json(result);
}
