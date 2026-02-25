import { NextResponse } from "next/server";
import { execSync } from "child_process";

const FTS_DB = "/home/openclaw/.openclaw/workspaces/eva/ClawVault/memory/db/fts.sqlite3";

function escapeFtsQuery(q: string): string {
  return q.replace(/['"]/g, "").split(/\s+/).map(t => `"${t}"*`).join(" ");
}

function queryFts(sql: string): any[] {
  try {
    const output = execSync(`sqlite3 ${FTS_DB} "${sql.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    if (!output.trim()) return [];
    return output.trim().split("\n").map(line => {
      const parts = line.split("\t");
      if (parts.length >= 6) {
        return {
          id: parts[0],
          kind: parts[1],
          title: parts[2],
          path: parts[3],
          updated_at: parts[4],
          snippet: parts[5],
        };
      }
      return null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  
  if (!q) {
    return NextResponse.json({ results: [], query: "" });
  }

  try {
    const escaped = escapeFtsQuery(q);
    const sql = `SELECT d.id, d.kind, d.title, d.path, d.updated_at, snippet(docs_fts, 1, '<mark>', '</mark>', '...', 32) as snippet FROM docs_fts f JOIN docs d ON d.id = f.id WHERE docs_fts MATCH '${escaped}' ORDER BY rank LIMIT 50`;
    const results = queryFts(sql);
    
    return NextResponse.json({ results, query: q });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}
