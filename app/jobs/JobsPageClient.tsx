"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

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
  jobs: { [key: string]: JobInfo[] };
}

async function fetchJobs() {
  const res = await fetch("/api/ops/summary", { cache: "no-store" });
  return res.json();
}

function BucketCard({ title, items, bucket, highlighted }: { title: string; items: any[]; bucket: string; highlighted?: boolean }) {
  const isFailed = bucket.includes("failed");
  const isRunning = bucket.includes("running");
  const count = items.length;
  
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      boxShadow: highlighted ? "0 0 0 2px #3b82f6" : "0 1px 3px rgba(0,0,0,0.1)",
      border: isFailed ? "1px solid #fca5a5" : "1px solid ##e5e7eb",
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 12,
      }}>
        <h3 style={{ margin: 0, fontSize: 14, color: "#6b7280", textTransform: "uppercase" }}>{title}</h3>
        <span style={{ 
          background: isFailed ? "#fef2f2" : isRunning ? "#eff6ff" : "#f9fafb",
          color: isFailed ? "#dc2626" : isRunning ? "#2563eb" : "#374151",
          padding: "4px 10px",
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
        }}>
          {count}
        </span>
      </div>
      
      {count === 0 ? (
        <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>No jobs</p>
      ) : (
        <ul style={{ margin: 0, padding: "0 0 0 16", fontSize: 13, color: "#374151" }}>
          {items.slice(0, 5).map((j) => (
            <li key={j.id} style={{ marginBottom: 4 }}>
              <a 
                href={`/jobs/${encodeURIComponent(j.id)}`} 
                style={{ 
                  color: isFailed ? "#dc2626" : "#3b82f6", 
                  textDecoration: "none",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                }}
              >
                {j.id.length > 40 ? j.id.slice(0, 40) + "..." : j.id}
              </a>
            </li>
          ))}
          {count > 5 && (
            <li style={{ color: "#9ca3af", fontSize: 12 }}>+{count - 5} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function JobsPageClient() {
  const searchParams = useSearchParams();
  const bucketFilter = searchParams.get("bucket");
  
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    try {
      const result = await fetchJobs();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        setLoading(true);
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

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (loading) {
    return (
      <main style={{ 
        padding: 24, 
        fontFamily: "ui-sans-serif, system-ui", 
        background: "#f9fafb", 
        minHeight: "100vh",
      }}>
        <a href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: 14 }}>← Dashboard</a>
        <h1 style={{ marginTop: 16 }}>Loading...</h1>
      </main>
    );
  }

  const jobs = data?.jobs ?? {};
  const buckets = [
    { key: "pending", label: "L1 Pending" },
    { key: "running", label: "L1 Running" },
    { key: "failed", label: "L1 Failed" },
    { key: "done", label: "L1 Done" },
    { key: "pending_l2", label: "L2 Pending" },
    { key: "running_l2", label: "L2 Running" },
    { key: "failed_l2", label: "L2 Failed" },
    { key: "done_l2", label: "L2 Done" },
  ];

  const sortedBuckets = bucketFilter 
    ? [...buckets].sort((a, b) => (a.key === bucketFilter ? -1 : b.key === bucketFilter ? 1 : 0))
    : buckets;

  return (
    <main style={{ 
      padding: 24, 
      fontFamily: "ui-sans-serif, system-ui", 
      background: "#f9fafb", 
      minHeight: "100vh",
      maxWidth: 900,
      margin: "0 auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <a href="/dashboard" style={{ 
          color: "#6b7280", 
          textDecoration: "none",
          fontSize: 14,
        }}>← Dashboard</a>
        {bucketFilter && (
          <a href="/jobs" style={{ 
            color: "#3b82f6", 
            textDecoration: "none",
            fontSize: 14,
          }}>(clear filter)</a>
        )}
      </div>
      
      <h1 style={{ fontSize: 28, marginBottom: 4, color: "#111827" }}>Jobs</h1>
      <p style={{ marginTop: 0, color: "#6b7280", marginBottom: 16 }}>
        {bucketFilter ? `Filtered: ${bucketFilter}` : "All job queues"}
        {data?.now && (
          <span style={{ marginLeft: 12, fontSize: 12 }}>
            Updated: {new Date(data.now).toLocaleTimeString()}
          </span>
        )}
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search jobs by ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 14px",
            fontSize: 14,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontFamily: "ui-monospace, monospace",
          }}
        />
        <button
          onClick={toggleAutoRefresh}
          style={{
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 500,
            background: autoRefresh ? "#10b981" : "#6b7280",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {autoRefresh ? "⏸ Pause (30s)" : "▶ Resume"}
        </button>
        <button
          onClick={() => { setLoading(true); loadData(); }}
          style={{
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 500,
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {sortedBuckets.map((b) => {
          const bucketJobs = (jobs?.[b.key] ?? []).filter((j: JobInfo) => 
            !search || j.id.toLowerCase().includes(search.toLowerCase())
          );
          return (
            <BucketCard 
              key={b.key} 
              title={b.label} 
              bucket={b.key}
              highlighted={b.key === bucketFilter}
              items={bucketJobs} 
            />
          );
        })}
      </div>
    </main>
  );
}
