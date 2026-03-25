// frontend/src/App.jsx
// Bedrock Lens — Main App with routing and auth

import { useState, useEffect } from "react";
import { isAuthenticated, signOut } from "./auth";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import CacheAnalysis from "./pages/CacheAnalysis";
import LatencyMonitor from "./pages/LatencyMonitor";
import Settings from "./pages/Settings";

const TABS = [
  { id: "overview", label: "Overview", component: Overview },
  { id: "cache", label: "Cache analysis", component: CacheAnalysis },
  { id: "latency", label: "Latency monitor", component: LatencyMonitor },
  { id: "settings", label: "Settings", component: Settings },
];

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("30d");

  // Check auth on mount
  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  const ActivePage = TABS.find((t) => t.id === activeTab)?.component || Overview;
  const days = parseInt(period.replace("d", ""));

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>B</div>
          <div>
            <div style={styles.logoTitle}>Bedrock Lens</div>
            <div style={styles.logoSub}>Cost intelligence dashboard</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.periodGroup}>
            {["7d", "14d", "30d"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  ...styles.periodBtn,
                  ...(period === p ? styles.periodBtnActive : {}),
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => { signOut(); setAuthed(false); }}
            style={styles.signOutBtn}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.navBtn,
              ...(activeTab === tab.id ? styles.navBtnActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Page Content */}
      <main style={styles.main}>
        <ActivePage days={days} period={period} />
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>Bedrock Lens v0.1.0 — Open Source</span>
        <span>Data refreshed hourly via EventBridge + Lambda</span>
      </footer>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const C = {
  bg: "#0B0E11",
  card: "#12161C",
  border: "#1E2530",
  text: "#E2E8F0",
  textMuted: "#8494A7",
  textDim: "#556070",
  accent: "#22D3EE",
  accentDim: "rgba(34,211,238,0.12)",
};

const styles = {
  app: {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  },
  header: {
    padding: "16px 32px",
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
    color: C.bg,
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  logoSub: {
    fontSize: 11,
    color: C.textDim,
  },
  periodGroup: {
    display: "flex",
    gap: 4,
  },
  periodBtn: {
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    border: `1px solid ${C.border}`,
    background: "transparent",
    color: C.textMuted,
    transition: "all 0.2s",
  },
  periodBtnActive: {
    background: C.accentDim,
    color: C.accent,
    borderColor: "rgba(34,211,238,0.3)",
  },
  signOutBtn: {
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    border: `1px solid ${C.border}`,
    background: "transparent",
    color: C.textDim,
  },
  nav: {
    padding: "0 32px",
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    gap: 0,
  },
  navBtn: {
    padding: "14px 20px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    background: "none",
    border: "none",
    color: C.textMuted,
    borderBottom: "2px solid transparent",
    transition: "all 0.2s",
  },
  navBtnActive: {
    color: C.accent,
    borderBottom: `2px solid ${C.accent}`,
  },
  main: {
    padding: "24px 32px",
    maxWidth: 1200,
    margin: "0 auto",
  },
  footer: {
    padding: "20px 32px",
    borderTop: `1px solid ${C.border}`,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: C.textDim,
  },
};