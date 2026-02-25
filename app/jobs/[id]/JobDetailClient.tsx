"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface JobData {
  id: string;
  bucket?: string;
  type?: string;
  request?: string;
  approved?: string;
  runSh?: string;
  failReason?: string;
  result?: string;
  log?: string;
  createdAt?: string;
  approvedAt?: string;
  content?: string;
}

async function getJob(id: string): Promise<JobData | null> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

function FileBlock({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ 
        cursor: "pointer", 
        fontWeight: 600, 
        color: "#4b5563",
        padding: "8px 12px",
        background: "#f3f4f6",
        borderRadius: 8,
      }}>
        {title}
      </summary>
      <pre style={{ 
        background: "#1e1e1e", 
        color: "#d4d4d4", 
        padding: 14, 
        borderRadius: 8, 
        overflow: "auto",
        maxHeight: 300,
        fontSize: 13,
        marginTop: 8,
        fontFamily: "ui-monospace, monospace",
      }}><code>{content}</code></pre>
    </details>
  );
}

export default function JobDetailClient({ id }: { id: string }) {
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getJob(id).then(j => {
      setJob(j);
      setLoading(false);
    });
  }, [id]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/retry`, { method: "POST" });
      if (res.ok) {
        router.push("/jobs?bucket=pending");
      } else {
        alert("Failed to retry job");
      }
    } catch {
      alert("Error retrying job");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui", background: "#f9fafb", minHeight: "100vh" }}>
        <a href="/jobs" style={{ color: "#6b7280", textDecoration: "none", fontSize: 14 }}>← Jobs</a>
        <h1 style={{ color: "#111827", marginTop: 16 }}>Loading...</h1>
      </main>
    );
  }

  if (!job) {
    return (
      <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui", background: "#f9fafb", minHeight: "100vh" }}>
        <a href="/jobs" style={{ color: "#6b7280", textDecoration: "none", fontSize: 14 }}>← Jobs</a>
        <h1 style={{ color: "#111827", marginTop: 16 }}>Job Not Found</h1>
      </main>
    );
  }

  const isFailed = job.bucket?.includes("failed");

  return (
    <main style={{ 
      padding: 24, 
      fontFamily: "ui-sans-serif, system-ui", 
      background: "#f9fafb", 
      minHeight: "100vh",
      maxWidth: 900,
      margin: "0 auto",
    }}>
      <a href="/jobs" style={{ color: "#6b7280", textDecoration: "none", fontSize: 14 }}>← Jobs</a>
      
      <div style={{ 
        marginTop: 16,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: isFailed ? "1px solid #fca5a5" : "1px solid #e5e7eb",
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8, color: "#111827", wordBreak: "break-all" }}>{id}</h1>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ 
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            background: isFailed ? "#fef2f2" : "#eff6ff",
            color: isFailed ? "#dc2626" : "#2563eb",
          }}>
            {job.bucket}
          </span>
          <span style={{ 
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            background: "#f3f4f6",
            color: "#6b7280",
          }}>
            {job.type}
          </span>
          {isFailed && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              style={{
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 500,
                background: retrying ? "#9ca3af" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: 20,
                cursor: retrying ? "not-allowed" : "pointer",
              }}
            >
              {retrying ? "Retrying..." : "↻ Retry"}
            </button>
          )}
        </div>
      </div>

      {job.type === "dir" && (
        <div style={{ 
          marginTop: 16,
          padding: 20,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div>
              <span style={{ color: "#6b7280" }}>Created:</span><br/>
              <strong>{job.createdAt || "-"}</strong>
            </div>
            <div>
              <span style={{ color: "#6b7280" }}>Approved:</span><br/>
              <strong>{job.approvedAt || "-"}</strong>
            </div>
          </div>
        </div>
      )}

      {job.type === "file" && (
        <FileBlock title="Job Script Content" content={job.content || ""} />
      )}

      {job.type === "dir" && (
        <>
          <FileBlock title="request.txt" content={job.request || ""} />
          <FileBlock title="approved" content={job.approved || ""} />
          <FileBlock title="run.sh" content={job.runSh || ""} />
          {job.failReason && (
            <FileBlock title="fail_reason.txt" content={job.failReason} />
          )}
          {job.result && (
            <FileBlock title="result.txt" content={job.result} />
          )}
        </>
      )}

      {job.log ? (
        <details style={{ marginTop: 16 }}>
          <summary style={{ 
            cursor: "pointer", 
            fontWeight: 600, 
            color: "#fff",
            padding: "10px 16px",
            background: "#1f2937",
            borderRadius: 8,
          }}>
            📄 Log Tail (last 100 lines)
          </summary>
          <pre style={{ 
            background: "#0d1117", 
            color: "#c9d1d9", 
            padding: 14, 
            borderRadius: 8, 
            overflow: "auto",
            maxHeight: 400,
            fontSize: 12,
            marginTop: 8,
            border: "1px solid #30363d",
            fontFamily: "ui-monospace, monospace",
          }}><code>{job.log}</code></pre>
        </details>
      ) : (
        <div style={{ 
          marginTop: 16, 
          padding: 20, 
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          color: "#9ca3af",
          textAlign: "center",
        }}>
          No log file found
        </div>
      )}
    </main>
  );
}
