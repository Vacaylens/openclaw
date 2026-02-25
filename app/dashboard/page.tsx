async function getData() {
  const [summaryRes, deltaRes] = await Promise.all([
    fetch("/api/ops/summary", { cache: "no-store" }),
    fetch("/api/memory/delta", { cache: "no-store" }),
  ]);
  const summary = await summaryRes.json();
  const delta = await deltaRes.json();
  return { summary, delta };
}

function Card({ title, children, href }: { title: string; children: React.ReactNode; href?: string }) {
  const content = (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</h3>
      {children}
    </div>
  );
  if (href) {
    return <a href={href} style={{ textDecoration: "none", color: "inherit" }}>{content}</a>;
  }
  return content;
}

function DeltaBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    new: "#dcfce7 #16a34a",
    updated: "#fef3c7 #d97706",
    deleted: "#fee2e2 #dc2626",
  };
  const [bg, text] = colors[type] || colors.updated;
  return (
    <span style={{
      background: bg,
      color: text,
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 6,
      fontWeight: 600,
      textTransform: "uppercase",
      marginRight: 8,
    }}>
      {type}
    </span>
  );
}

function DeltaCard({ delta }: { delta: any }) {
  const { today, delta: changes } = delta || {};
  const isFirst = changes?.isFirst;

  if (isFirst) {
    return (
      <Card title="Memory Delta">
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          First run — no previous stats to compare. Delta tracking starts tomorrow.
        </div>
      </Card>
    );
  }

  const hasChanges = changes?.changes?.length > 0;

  return (
    <Card title="Memory Delta">
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
        {!hasChanges ? (
          <div style={{ color: "#6b7280" }}>No changes since yesterday</div>
        ) : (
          changes.changes.map((c: any, i: number) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <DeltaBadge type={c.type} />
              {c.key === "memoryFiles" && (
                <span>memoryFiles: {c.from} → <strong>{c.to}</strong></span>
              )}
              {c.key === "ftsDocs" && (
                <span>ftsDocs: {c.from} → <strong>{c.to}</strong></span>
              )}
              {c.key === "memorySize" && (
                <span>memorySize: {(c.from / 1024).toFixed(1)}KB → <strong>{(c.to / 1024).toFixed(1)}KB</strong></span>
              )}
              {c.key === "newFiles" && (
                <span>new files: {c.to.join(", ")}</span>
              )}
              {c.key === "deletedFiles" && (
                <span>deleted: {c.from.join(", ")}</span>
              )}
              {c.key === "updatedFiles" && (
                <span>updated today: {c.to.join(", ")}</span>
              )}
            </div>
          ))
        )}
        {today && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb", color: "#6b7280" }}>
            Today: {today.memoryFiles} files • {today.ftsDocs} FTS docs
          </div>
        )}
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const { summary, delta } = await getData();
  const s = summary?.status ?? {};
  const fts = s?.fts ?? {};
  const bigSleep = s?.bigSleep ?? {};
  const jobs = summary?.jobs ?? {};
  const count = (k: string) => (jobs?.[k]?.length ?? 0);

  const l1Failed = count("failed");
  const l2Failed = count("failed_l2");

  return (
    <main style={{ 
      padding: 24, 
      fontFamily: "ui-sans-serif, system-ui", 
      background: "#f9fafb", 
      minHeight: "100vh",
      maxWidth: 900,
      margin: "0 auto",
    }}>
      <h1 style={{ fontSize: 32, marginBottom: 4, color: "#111827" }}>Mission Control</h1>
      <p style={{ marginTop: 0, color: "#6b7280", marginBottom: 24 }}>Vacaylens operator cockpit</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card title="Jobs" href="/jobs">
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
            <div><span style={{ color: "#6b7280" }}>L1:</span> {count("pending")} pending • {count("running")} running • <span style={{ color: l1Failed ? "#dc2626" : "#16a34a" }}>{l1Failed} failed</span> • {count("done")} done</div>
            <div><span style={{ color: "#6b7280" }}>L2:</span> {count("pending_l2")} pending • {count("running_l2")} running • <span style={{ color: l2Failed ? "#dc2626" : "#16a34a" }}>{l2Failed} failed</span> • {count("done_l2")} done</div>
          </div>
        </Card>

        <DeltaCard delta={delta} />

        <Card title="Memory" href="/memory">
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
            <div><span style={{ color: "#6b7280" }}>FTS docs:</span> {fts?.docsIndexed ?? "-"}</div>
            <div><span style={{ color: "#6b7280" }}>Last index:</span> {fts?.lastIndexedAt ? new Date(fts.lastIndexedAt).toLocaleDateString() : "-"}</div>
            <div><span style={{ color: "#6b7280" }}>Smoke:</span> <span style={{ color: s?.smoke?.ok ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{s?.smoke?.ok ? "PASS" : "FAIL"}</span></div>
          </div>
        </Card>

        <Card title="Big Sleep" href="/ops">
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
            <div><span style={{ color: bigSleep?.lastRunOk ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{bigSleep?.lastRunOk ? "OK" : "FAILED"}</span> • last run</div>
            <div><span style={{ color: "#6b7280" }}>Last consolidation:</span> {bigSleep?.lastConsolidationAt ? new Date(bigSleep.lastConsolidationAt).toLocaleDateString() : "-"}</div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <a href="/jobs" style={{ 
          padding: "10px 20px", 
          background: "#3b82f6", 
          color: "#fff", 
          borderRadius: 8, 
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
        }}>Jobs</a>
        <a href="/memory" style={{ 
          padding: "10px 20px", 
          background: "#8b5cf6", 
          color: "#fff", 
          borderRadius: 8, 
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
        }}>Memory</a>
        <a href="/ops" style={{ 
          padding: "10px 20px", 
          background: "#10b981", 
          color: "#fff", 
          borderRadius: 8, 
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
        }}>Ops</a>
      </div>
    </main>
  );
}
