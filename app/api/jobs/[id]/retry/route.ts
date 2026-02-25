import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VAULT = "/home/openclaw/.openclaw/workspaces/eva/ClawVault";
const JOBS = path.join(VAULT, "jobs");

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Find the job in failed buckets
  const failedBuckets = ["failed", "failed_l2"];
  
  let jobPath: string | null = null;
  let isL2 = false;
  
  for (const bucket of failedBuckets) {
    const dirPath = path.join(JOBS, bucket, id);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      jobPath = dirPath;
      isL2 = bucket === "failed_l2";
      break;
    }
  }
  
  if (!jobPath) {
    return NextResponse.json({ error: "Failed job not found" }, { status: 404 });
  }
  
  // Determine target bucket
  const targetBucket = isL2 ? "pending_l2" : "pending";
  const targetPath = path.join(JOBS, targetBucket, id);
  
  try {
    // Move job to pending
    fs.renameSync(jobPath, targetPath);
    return NextResponse.json({ success: true, movedTo: targetBucket });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
