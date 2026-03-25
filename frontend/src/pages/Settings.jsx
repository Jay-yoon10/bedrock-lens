// frontend/src/pages/Settings.jsx
// Bedrock Lens — Settings Page
//
// Shows: Latency baseline config, deployment info, version

import { useState, useEffect } from "react";
import { useApi, apiPut } from "../hooks/useApi";
import { SectionTitle, C } from "../components/ui";

export default function Settings() {
  const { data: config, loading, refetch } = useApi("/api/config");

  const [latencyBaseline, setLatencyBaseline] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config?.latencyBaselineMs) {
      setLatencyBaseline(Number(config.latencyBaselineMs) / 1000);
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiPut("/api/config", {
        latencyBaselineMs: latencyBaseline * 1000,
      });
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Latency Baseline */}
      <SectionTitle sub="Set your acceptable response time threshold">
        Latency baseline
      </SectionTitle>
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 24,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}>
          <label style={{ fontSize: 14, color: C.text }}>Threshold:</label>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={latencyBaseline}
            onChange={(e) => setLatencyBaseline(Number(e.target.value))}
            style={{ flex: 1, accentColor: C.accent }}
          />
          <span style={{
            fontSize: 20,
            fontWeight: 600,
            color: C.accent,
            fontFamily: "'JetBrains Mono', monospace",
            minWidth: 50,
            textAlign: "right",
          }}>
            {latencyBaseline}s
          </span>
        </div>
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16 }}>
          Invocations exceeding this threshold will be highlighted in the Latency Monitor page.
          This setting is saved to your account and persists across sessions.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 24px",
              borderRadius: 8,
              border: "none",
              background: C.accent,
              color: C.bg,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: C.green }}>
              Saved
            </span>
          )}
        </div>
      </div>

      {/* System Info */}
      <SectionTitle sub="Deployment details">System information</SectionTitle>
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 24,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "12px 16px" }}>
          {[
            ["Version", "0.1.0"],
            ["Region", import.meta.env.VITE_COGNITO_REGION || "—"],
            ["API endpoint", import.meta.env.VITE_API_URL || "—"],
            ["Data retention", "90 days (auto-delete via DynamoDB TTL)"],
            ["Collection interval", "Every 1 hour (EventBridge)"],
            ["Quota dashboard", "Optional (deploy with --context quotaDashboard=true)"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "contents" }}>
              <div style={{ fontSize: 13, color: C.textMuted }}>{label}</div>
              <div style={{
                fontSize: 13,
                color: C.text,
                fontFamily: label === "API endpoint" ? "'JetBrains Mono', monospace" : "inherit",
                wordBreak: "break-all",
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <SectionTitle sub="Manage your deployment">Actions</SectionTitle>
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
              Disable data collection
            </div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>
              Stop the hourly EventBridge rule. No new data will be collected.
            </div>
          </div>
          <code style={{
            fontSize: 12,
            color: C.amber,
            background: "rgba(251,191,36,0.08)",
            padding: "6px 12px",
            borderRadius: 6,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            aws events disable-rule --name bedrock-lens-hourly-collection
          </code>
        </div>

        <div style={{ height: 1, background: C.border }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
              Tear down all resources
            </div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>
              Remove all AWS resources. Metrics table is retained by default.
            </div>
          </div>
          <code style={{
            fontSize: 12,
            color: C.red,
            background: "rgba(248,113,113,0.08)",
            padding: "6px 12px",
            borderRadius: 6,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            cdk destroy
          </code>
        </div>
      </div>
    </div>
  );
}