import { Suspense } from "react";
import JobsPageClient from "./JobsPageClient";

export default function JobsPage() {
  return (
    <Suspense fallback={
      <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui", background: "#f9fafb", minHeight: "100vh" }}>
        <a href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: 14 }}>← Dashboard</a>
        <h1 style={{ marginTop: 16 }}>Loading...</h1>
      </main>
    }>
      <JobsPageClient />
    </Suspense>
  );
}
