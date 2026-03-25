// frontend/src/pages/Overview.jsx
// Bedrock Lens — Overview Page
//
// Shows: KPI cards, cost trend chart, model breakdown, service tier distribution

import { useMemo } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useApi } from "../hooks/useApi";
import {
  MetricCard, SectionTitle, ChartCard, CustomTooltip,
  LoadingState, EmptyState, ErrorState, C,
} from "../components/ui";

const MODEL_COLORS = [
  C.accent, C.green, C.purple, C.amber, C.orange, C.pink, C.blue,
];

const TIER_COLORS = {
  standard: C.blue,
  flex: C.green,
  priority: C.pink,
  batch: C.amber,
};

export default function Overview({ days, period }) {
  const { data: dailyCost, loading: loadingDaily, error: errorDaily } = useApi("/api/cost/daily", { days });
  const { data: summary, loading: loadingSummary, error: errorSummary } = useApi("/api/cost/summary", { period });
  const { data: cacheData, loading: loadingCache } = useApi("/api/cache/efficiency", { days });
  const { data: tierData, loading: loadingTiers } = useApi("/api/tiers/breakdown", { days });

  // Transform daily cost data for stacked area chart
  const chartData = useMemo(() => {
    if (!dailyCost || !Array.isArray(dailyCost)) return [];
    const allModels = new Set();
    dailyCost.forEach((day) => {
      Object.keys(day.models || {}).forEach((m) => allModels.add(m));
    });
    const modelList = [...allModels];
    return dailyCost.map((day) => {
      const point = { date: day.date.slice(5) };
      modelList.forEach((model) => {
        point[model] = day.models?.[model]?.cost || 0;
      });
      return point;
    });
  }, [dailyCost]);

  const modelNames = useMemo(() => {
    if (!chartData.length) return [];
    return Object.keys(chartData[0]).filter((k) => k !== "date");
  }, [chartData]);

  // Model breakdown sorted by cost
  const modelBreakdown = useMemo(() => {
    if (!summary?.modelBreakdown) return [];
    return Object.entries(summary.modelBreakdown)
      .map(([name, data], i) => ({
        name,
        cost: data.cost,
        invocations: data.invocations,
        provider: data.provider,
        color: MODEL_COLORS[i % MODEL_COLORS.length],
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [summary]);

  // Tier data for pie chart
  const tierChartData = useMemo(() => {
    if (!tierData?.tiers) return [];
    return Object.entries(tierData.tiers)
      .filter(([, data]) => data.requests > 0)
      .map(([tier, data]) => ({
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        value: data.requests,
        pct: data.pct,
        color: TIER_COLORS[tier] || C.textDim,
      }));
  }, [tierData]);

  if (loadingSummary && loadingDaily) return <LoadingState />;
  if (errorSummary) return <ErrorState message={errorSummary} />;
  if (errorDaily) return <ErrorState message={errorDaily} />;

  const totalCost = summary?.totalCost || 0;
  const totalInvocations = summary?.totalInvocations || 0;
  const cacheSavings = cacheData?.totalCacheSavings || 0;
  const cacheHitRate = cacheData?.overallHitRate || 0;
  const topModel = summary?.topModel?.name || "N/A";

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <MetricCard
          label={`Total cost (${period})`}
          value={`$${totalCost.toFixed(2)}`}
          sub={`${summary?.daysWithData || 0} days of data`}
        />
        <MetricCard
          label="Total invocations"
          value={totalInvocations > 1000 ? `${(totalInvocations / 1000).toFixed(1)}K` : totalInvocations.toString()}
          sub={`Top: ${topModel}`}
        />
        <MetricCard
          label="Cache savings"
          value={`$${cacheSavings.toFixed(2)}`}
          color={C.green}
          sub={`${cacheHitRate}% hit rate`}
        />
        <MetricCard
          label="Throttle events"
          value={(summary?.totalThrottles || 0).toString()}
          color={summary?.totalThrottles > 0 ? C.amber : C.green}
          sub={summary?.totalThrottles > 0 ? "Check quota settings" : "No throttling detected"}
        />
      </div>

      {/* Cost Trend Chart */}
      <SectionTitle sub="Daily spend by model">Cost trend</SectionTitle>
      <ChartCard>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                {modelNames.map((model, i) => (
                  <linearGradient key={model} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={MODEL_COLORS[i % MODEL_COLORS.length]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={MODEL_COLORS[i % MODEL_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 7) - 1)}
              />
              <YAxis
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {modelNames.map((model, i) => (
                <Area
                  key={model}
                  type="monotone"
                  dataKey={model}
                  name={model}
                  stackId="1"
                  stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                  fill={`url(#grad-${i})`}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No cost data available yet. Data will appear after the collector runs." />
        )}
      </ChartCard>

      {/* Model Breakdown + Tier Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>

        {/* Model Breakdown */}
        <div>
          <SectionTitle sub="Which model costs the most?">Model breakdown</SectionTitle>
          <div style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}>
            {modelBreakdown.length > 0 ? (
              modelBreakdown.map((m, i) => (
                <div
                  key={m.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: i < modelBreakdown.length - 1 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: m.color, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>
                      {m.invocations.toLocaleString()} invocations
                    </div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: C.text,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    ${m.cost.toFixed(2)}
                  </div>
                  <div style={{
                    width: 80, height: 6, background: C.border,
                    borderRadius: 3, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3, background: m.color,
                      width: `${modelBreakdown[0]?.cost ? (m.cost / modelBreakdown[0].cost) * 100 : 0}%`,
                    }} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No model data yet." />
            )}
          </div>
        </div>

        {/* Tier Distribution */}
        <div>
          <SectionTitle sub="Standard vs Flex vs Priority vs Batch">Service tier distribution</SectionTitle>
          <div style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}>
            {tierChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={tierChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      strokeWidth={0}
                    >
                      {tierChartData.map((t) => (
                        <Cell key={t.name} fill={t.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  gap: 8, marginTop: 8,
                }}>
                  {tierChartData.map((t) => (
                    <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", background: t.color,
                      }} />
                      <span style={{ fontSize: 12, color: C.textMuted, flex: 1 }}>{t.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{t.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="No tier data yet." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}