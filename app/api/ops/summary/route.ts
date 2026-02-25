import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VAULT = "/home/openclaw/.openclaw/workspaces/eva/ClawVault";
const JOBS = path.join(VAULT, "jobs");
const STATUS = path.join(VAULT, "memory", "status.json");

function readJsonSafe(p: string) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function listJobDir(dir: string) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const jobPath = path.join(dir, d.name);
        const readFile = (p: string) => { try { return fs.readFileSync(p, "utf8").trim(); } catch { return ""; } };
        return {
          id: d.name,
          request: readFile(path.join(jobPath, "request.txt")),
          approved: readFile(path.join(jobPath, "approved")),
          createdAt: readFile(path.join(jobPath, "created_at.txt")),
          approvedAt: readFile(path.join(jobPath, "approved_at.txt")),
          failReason: readFile(path.join(jobPath, "fail_reason.txt")),
          hasRunSh: fs.existsSync(path.join(jobPath, "run.sh")),
          path: jobPath,
        };
      });
  } catch {
    return [];
  }
}

export async function GET() {
  const status = readJsonSafe(STATUS);
  const buckets = ["pending","running","done","failed","pending_l2","running_l2","done_l2","failed_l2"];
  const jobs: Record<string, any[]> = {};
  for (const b of buckets) jobs[b] = listJobDir(path.join(JOBS, b));
  return NextResponse.json({ now: new Date().toISOString(), status, jobs });
}
