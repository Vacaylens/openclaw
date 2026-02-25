"use client";

import { useState, useTransition } from "react";

type SearchResult = {
  id: string;
  kind: string;
  title: string;
  path: string;
  updated_at: string;
  snippet: string;
};

async function searchMemory(q: string) {
  const protocol = window.location.protocol;
  const host = window.location.host;
  const url = `${protocol}//${host}/api/memory/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  return res.json();
}

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSearch = (q: string) => {
    startTransition(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const data = await searchMemory(q);
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setError("");
        setResults(data.results || []);
      }
    });
  };

  const openDoc = (path: string) => {
    window.open(`file://${path}`, "_blank");
  };

  return (
    <main style={{ 
      padding: 24, 
      fontFamily: "ui-sans-serif, system-ui", 
      background: "#f9fafb", 
      minHeight: "100vh",
      maxWidth: 900,
      margin: "0 auto",
    }}>
      <a href="/dashboard" style={{ 
        color: "#6b7280", 
        textDecoration: "none",
        fontSize: 14,
      }}>← Dashboard</a>
      
      <h1 style={{ fontSize: 28, marginBottom: 4, color: "#111827", marginTop: 16 }}>Memory Explorer</h1>
      <p style={{ marginTop: 0, color: "#6b7280", marginBottom: 24 }}>Search your second brain</p>
      
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          placeholder="Search memory... (e.g., 'big sleep', 'mission control')"
          style={{
            width: "100%",
            padding: "14px 18px",
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            outline: "none",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        />
      </div>

      {isPending && (
        <div style={{ 
          padding: 20, 
          textAlign: "center", 
          color: "#6b7280",
          background: "#fff",
          borderRadius: 12,
        }}>
          Searching...
        </div>
      )}
      
      {error && (
        <div style={{ 
          marginTop: 16, 
          padding: 16, 
          background: "#fef2f2", 
          borderRadius: 10, 
          color: "#dc2626",
          border: "1px solid #fecaca",
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {results.length === 0 && query && !isPending && (
          <div style={{ 
            padding: 40, 
            textAlign: "center", 
            color: "#9ca3af",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}>
            No results found
          </div>
        )}
        
        {results.map((r) => (
          <div
            key={r.id}
            onClick={() => openDoc(r.path)}
            style={{
              padding: 16,
              marginBottom: 8,
              background: "#fff",
              borderRadius: 10,
              cursor: "pointer",
              border: "1px solid #e5e7eb",
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ 
                fontSize: 11, 
                padding: "3px 8px", 
                borderRadius: 6, 
                background: r.kind === "daily" ? "#dbeafe" : "#f3e8ff",
                color: r.kind === "daily" ? "#1d4ed8" : "#7c3aed",
                fontWeight: 500,
                textTransform: "uppercase",
              }}>
                {r.kind}
              </span>
              <strong style={{ color: "#111827" }}>{r.title}</strong>
            </div>
            <p 
              style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: r.snippet }}
            />
          </div>
        ))}
      </div>

      <style jsx global>{`
        mark {
          background: #fef3c7;
          padding: 1px 3px;
          border-radius: 3px;
          color: #92400e;
        }
      `}</style>
    </main>
  );
}
