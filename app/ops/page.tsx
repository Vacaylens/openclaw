"use client";

import { useEffect, useState, useRef } from "react";

interface Status {
  bigSleep?: {
    lastRunOk: boolean;
    lastConsolidationAt: string;
    dailyFilesProcessed: number;
    memoryMdBytes: number;
  };
  fts?: {
    docsIndexed: number;
    lastIndexedAt: string;
  };
  smoke?: {
    date: string;
    ok: boolean;
    marker: string;
  };
  updatedAt: string;
}

interface JobInfo {
  id: string;
  request?: string;
  approved?: string;
  createdAt?: string;
  approvedAt?: string;
  failReason?: string;
  hasRunSh?: boolean;
  path?: string;
}

interface OpsData {
  now: string;
  status: Status;
  jobs: { [key: string]: JobInfo[] };
}

async function fetchOps() {
  const protocol = window.location.protocol;
  const host = window.location.host;
  const res = await fetch(`${protocol}//${host}/api/ops/summary`);
  return res.json();
}

function formatTime(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
}

function formatBytes(b: number) {
  if (!b) return "-";
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

export default function OpsPage() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    try {
      const result = await fetchOps();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Set up interval based on autoRefresh state
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, 30000);
    }
    
    // Keyboard shortcut: r to refresh
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" && !e.ctrlKey && !e.metaKey && !e.altKey && 
          document.activeElement?.tagName !== "INPUT" && 
          document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setRefreshing(true);
        loadData();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [autoRefresh]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <main style={{ padding: 20, fontFamily: "ui-sans-serif, system-ui" }}>
        <h1 style={{ fontSize: 24 }}>Ops Panel</h1>
        <p><a href="/dashboard">← Dashboard</a></p>
        <p>Loading...</p>
      </main>
    );
  }

  const jobCounts = data?.jobs ? {
    pending: data.jobs.pending?.length || 0,
    running: data.jobs.running?.length || 0,
    done: data.jobs.done?.length || 0,
    failed: data.jobs.failed?.length || 0,
    pending_l2: data.jobs.pending_l2?.length || 0,
    running_l2: data.jobs.running_l2?.length || 0,
    done_l2: data.jobs.done_l2?.length || 0,
    failed_l2: data.jobs.failed_l2?.length || 0,
  } : {};

  return (
    <main style={{ padding: 20, fontFamily: "ui-sans-serif, system-ui", maxWidth: 900 }}>
      <h1 style={{ fontSize: 24 }}>Ops Panel</h1>
      <p><a href="/dashboard">← Dashboard</a></p>

      {data && (
        <>
          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>Status</h2>
            <p style={{ color: "#666", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              Updated: {formatTime(data.now)}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  marginLeft: 12,
                  padding: "4px 12px",
                  fontSize: 12,
                  cursor: refreshing ? "not-allowed" : "pointer",
                  background: refreshing ? "#e0e0e0" : "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                }}
              >
                {refreshing ? "Refreshing..." : "↻ Refresh"}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{
                  marginLeft: 8,
                  padding: "4px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: autoRefresh ? "#10b981" : "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                }}
              >
                {autoRefresh ? "⏸ Pause" : "▶ Resume"}
              </button>
            </p>
          </section>

          <section style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Big Sleep</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
              <div>Last Run: <span style={{ color: data.status?.bigSleep?.lastRunOk ? "green" : "red" }}>
                {data.status?.bigSleep?.lastRunOk ? "OK" : "FAILED"}
              </span></div>
              <div>Last Consolidation: {formatTime(data.status?.bigSleep?.lastConsolidationAt || "")}</div>
              <div>Files Processed: {data.status?.bigSleep?.dailyFilesProcessed || 0}</div>
              <div>Memory Size: {formatBytes(data.status?.bigSleep?.memoryMdBytes || 0)}</div>
            </div>
          </section>

          <section style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>FTS Index</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
              <div>Docs Indexed: {data.status?.fts?.docsIndexed || 0}</div>
              <div>Last Indexed: {formatTime(data.status?.fts?.lastIndexedAt || "")}</div>
            </div>
          </section>

          <section style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Smoke Test</h3>
            <div style={{ fontSize: 13 }}>
              <span style={{ 
                padding: "2px 8px", 
                borderRadius: 4, 
                background: data.status?.smoke?.ok ? "#d4edda" : "#f8d7da",
                color: data.status?.smoke?.ok ? "#155724" : "#721c24",
              }}>
                {data.status?.smoke?.ok ? "PASS" : "FAIL"}
              </span>
              <span style={{ marginLeft: 8, color: "#666" }}>
                {data.status?.smoke?.date} - {data.status?.smoke?.marker}
              </span>
            </div>
          </section>

          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>Job Queue</h2>
            
            {/* Filter presets */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
              {[
                { label: "Failed", bucket: "failed", color: "#fef2f2" },
                { label: "Pending", bucket: "pending", color: "#eff6ff" },
                { label: "Running", bucket: "running", color: "#f0fdf4" },
                { label: "Done", bucket: "done", color: "#f9fafb" },
              ].map((preset) => {
                const total = (data.jobs?.[preset.bucket]?.length || 0) + (data.jobs?.[`${preset.bucket}_l2`]?.length || 0);
                return (
                  <a
                    key={preset.bucket}
                    href={`/jobs?bucket=${preset.bucket}`}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      background: preset.color,
                      borderRadius: 6,
                      textDecoration: "none",
                      color: "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {preset.label} ({total})
                  </a>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
              {Object.entries(jobCounts).map(([bucket, count]) => (
                <a 
                  key={bucket} 
                  href={`/jobs?bucket=${bucket}`}
                  style={{ 
                    display: "block",
                    padding: 12, 
                    background: bucket.includes("failed") ? "#fff3cd" : "#f8f9fa",
                    borderRadius: 6,
                    textAlign: "center",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: "bold" }}>{count}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>{bucket}</div>
                </a>
              ))}
            </div>
            
            {(data.jobs.failed?.length || data.jobs.failed_l2?.length) ? (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 14, color: "#dc2626", marginBottom: 8 }}>⚠️ Failed Jobs</h3>
                <ul style={{ margin: 0, padding: "0 0 0 16", fontSize: 12, fontFamily: "ui-monospace, monospace" }}>
                  {data.jobs.failed?.map(j => (
                    <li key={j.id} style={{ marginBottom: 4 }}>
                      <a href={`/jobs/${encodeURIComponent(j.id)}`} style={{ color: "#dc2626", textDecoration: "none" }}>
                        {j.id}
                      </a>
                      {j.failReason && <span style={{ color: "#666", marginLeft: 8 }}>— {j.failReason.slice(0, 50)}</span>}
                    </li>
                  ))}
                  {data.jobs.failed_l2?.map(j => (
                    <li key={j.id} style={{ marginBottom: 4 }}>
                      <a href={`/jobs/${encodeURIComponent(j.id)}`} style={{ color: "#dc2626", textDecoration: "none" }}>
                        {j.id}
                      </a>
                      {j.failReason && <span style={{ color: "#666", marginLeft: 8 }}>— {j.failReason.slice(0, 50)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>Quick Links</h2>
            <ul style={{ fontSize: 13, lineHeight: 1.8 }}>
              <li><a href="/jobs">Jobs List</a></li>
              <li><a href="/memory">Memory Explorer</a></li>
              <li><a href="file:///home/openclaw/.openclaw/workspaces/eva/ClawVault/memory/status.json" target="_blank">status.json</a></li>
              <li><a href="file:///home/openclaw/.openclaw/workspaces/eva/ClawVault/memory/MEMORY.md" target="_blank">MEMORY.md</a></li>
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
