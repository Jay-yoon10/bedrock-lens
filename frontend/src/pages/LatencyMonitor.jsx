// frontend/src/pages/LatencyMonitor.jsx
// Bedrock Lens — Latency Monitor Page
//
// Shows: Configurable latency baseline, breach count,
//        latency distribution histogram, Flex tier guidance

import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useApi } from "../hooks/useApi";
import { apiPut } from "../hooks/useApi";
import {
  MetricCard, SectionTitle, ChartCard, CustomTooltip,
  LoadingState, EmptyState, ErrorState, C,
} from "../components/ui";

const BASELINE_OPTIONS = [3, 5, 10, 15];

export default function LatencyMonitor({ days, period }) {
  const { data: latencyData, loading, error } = useApi("/api/latency/distribution", { days });
  const { data: config } = useApi("/api/config");

  const [baseline, setBaseline] = useState(5000); // ms

  // Load saved baseline from config
  useEffect(() => {
    if (config?.latencyBaselineMs) {
      setBaseline(Number(config.latencyBaselineMs));
    }
  }, [config]);

  const baselineSec = baseline / 1000;

  // Add baseline flag to each bucket
  const buckets = useMemo(() => {
    if (!latencyData?.buckets) return [];

    const bucketThresholds = {
      "<1s": 1,
      "1-2s": 2,
      "2-3s": 3,
      "3-5s": 5,
      "5-8s": 8,
      "8-12s": 12,
      "12-20s": 20,
      ">20s": Infinity,
    };

    return latencyData.buckets.map((b) => ({
      ...b,
      overBaseline: (bucketThresholds[b.bucket] || 0) > baselineSec,
    }));
  }, [latencyData, baselineSec]);

  // Calculate breach stats
  const breachStats = useMemo(() => {
    if (!buckets.length) return { count: 0, total: 0, pct: 0 };
    const total = buckets.reduce((s, b) => s + b.count, 0);
    const breached = buckets.filter((b) => b.overBaseline).reduce((s, b) => s + b.count, 0);
    return {
      count: breached,
      total,
      pct: total > 0 ? ((breached / total) * 100).toFixed(1) : 0,
    };
  }, [buckets]);

  // Save baseline to API
  const handleBaselineChange = async (seconds) => {
    const ms = seconds * 1000;
    setBaseline(ms);
    try {
      await apiPut("/api/config", { latencyBaselineMs: ms });
    } catch (err) {
      console.error("Failed to save baseline:", err);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      {/* Baseline Selector */}
      <div style={{
        padding: "16px 20px",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, color: C.textMuted, flexShrink: 0 }}>
          Latency baseline:
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {BASELINE_OPTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => handleBaselineChange(sec)}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                background: baselineSec === sec ? C.accent : "transparent",
                color: baselineSec === sec ? C.bg : C.textMuted,
                border: `1px solid ${baselineSec === sec ? C.accent : C.border}`,
                transition: "all 0.2s",
              }}
            >
              {sec}s
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: C.textDim }}>
          Invocations exceeding this threshold will be highlighted
        </div>
      </div>

      {/* Breach Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <MetricCard
          label={`Exceeded ${baselineSec}s baseline`}
          value={breachStats.count.toLocaleString()}
          color={breachStats.pct > 30 ? C.red : breachStats.pct > 15 ? C.amber : C.green}
          sub="invocations"
        />
        <MetricCard
          label="Breach rate"
          value={`${breachStats.pct}%`}
          color={breachStats.pct > 30 ? C.red : breachStats.pct > 15 ? C.amber : C.green}
          sub={`of ${breachStats.total.toLocaleString()} total requests`}
        />
        <MetricCard
          label="Total data points"
          value={(latencyData?.totalDataPoints || 0).toString()}
          sub={`over ${period}`}
        />
      </div>

      {/* Latency Distribution Histogram */}
      <SectionTitle sub={`Amber buckets exceed your ${baselineSec}s baseline`}>
        Latency distribution
      </SectionTitle>
      <ChartCard>
        {buckets.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={buckets}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
              <XAxis
                dataKey="bucket"
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v > 1000 ? `${(v / 1000).toFixed(1)}K` : v}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]} barSize={36}>
                {buckets.map((b, i) => (
                  <Cell
                    key={i}
                    fill={b.overBaseline ? C.amber : C.accent}
                    fillOpacity={b.overBaseline ? 0.9 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No latency data available yet." />
        )}
      </ChartCard>

      {/* Flex Tier Guidance */}
      {breachStats.count > 0 && (
        <div style={{
          marginTop: 24,
          padding: "16px 20px",
          background: "rgba(251,191,36,0.06)",
          borderRadius: 12,
          border: "1px solid rgba(251,191,36,0.12)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.amber, marginBottom: 6 }}>
            Cost saving opportunity
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
            {breachStats.count.toLocaleString()} invocations ({breachStats.pct}%) exceeded your {baselineSec}s baseline.
            If these are part of non-latency-sensitive workflows (batch processing, background tasks, async pipelines),
            switching to the <strong style={{ color: C.text }}>Flex tier</strong> would reduce costs by 50%
            on those invocations. Flex tier uses the same synchronous API — no code restructuring needed.
          </div>
        </div>
      )}
    </div>
  );
}