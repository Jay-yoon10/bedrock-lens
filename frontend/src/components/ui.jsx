// frontend/src/components/ui.jsx
// Bedrock Lens — Shared UI Components

const C = {
    bg: "#0B0E11",
    card: "#12161C",
    border: "#1E2530",
    borderLight: "#2A3140",
    text: "#E2E8F0",
    textMuted: "#8494A7",
    textDim: "#556070",
    accent: "#22D3EE",
    green: "#34D399",
    red: "#F87171",
    amber: "#FBBF24",
    purple: "#A78BFA",
    pink: "#F472B6",
    blue: "#60A5FA",
    orange: "#FB923C",
    greenDim: "rgba(52,211,153,0.12)",
    redDim: "rgba(248,113,113,0.12)",
    amberDim: "rgba(251,191,36,0.12)",
  };
  
  export { C };
  
  export function MetricCard({ label, value, sub, trend, color = C.text }) {
    return (
      <div style={{
        padding: "20px 24px",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
      }}>
        <div style={{
          fontSize: 12,
          color: C.textMuted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 28,
          fontWeight: 600,
          color,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}>
          {value}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          {trend !== undefined && (
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              color: trend > 0 ? C.red : C.green,
              background: trend > 0 ? C.redDim : C.greenDim,
              padding: "2px 8px",
              borderRadius: 6,
            }}>
              {trend > 0 ? "+" : ""}{trend}%
            </span>
          )}
          {sub && <span style={{ fontSize: 12, color: C.textDim }}>{sub}</span>}
        </div>
      </div>
    );
  }
  
  export function SectionTitle({ children, sub }) {
    return (
      <div style={{ marginBottom: 16, marginTop: 36 }}>
        <h2 style={{
          fontSize: 17,
          fontWeight: 600,
          color: C.text,
          margin: 0,
          letterSpacing: "-0.01em",
        }}>
          {children}
        </h2>
        {sub && (
          <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>
            {sub}
          </p>
        )}
      </div>
    );
  }
  
  export function ChartCard({ children, height = 280 }) {
    return (
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "20px 20px 12px",
      }}>
        {children}
      </div>
    );
  }
  
  export function LoadingState() {
    return (
      <div style={{
        padding: 60,
        textAlign: "center",
        color: C.textDim,
        fontSize: 14,
      }}>
        Loading data...
      </div>
    );
  }
  
  export function EmptyState({ message = "No data available yet." }) {
    return (
      <div style={{
        padding: 60,
        textAlign: "center",
        color: C.textDim,
        fontSize: 14,
      }}>
        {message}
      </div>
    );
  }
  
  export function ErrorState({ message }) {
    return (
      <div style={{
        padding: "16px 20px",
        background: C.redDim,
        border: "1px solid rgba(248,113,113,0.2)",
        borderRadius: 12,
        color: C.red,
        fontSize: 13,
      }}>
        Error: {message}
      </div>
    );
  }
  
  export function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "#1A1F28",
        border: `1px solid ${C.borderLight}`,
        borderRadius: 10,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
          {label}
        </div>
        {payload.map((p, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color,
            }} />
            <span style={{ fontSize: 12, color: C.textMuted, flex: 1 }}>
              {p.name}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
              {typeof p.value === "number" && p.value > 1000
                ? `${(p.value / 1000).toFixed(1)}K`
                : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }