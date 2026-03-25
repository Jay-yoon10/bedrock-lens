// frontend/src/pages/CacheAnalysis.jsx
// Bedrock Lens — Cache Analysis Page
//
// Shows: Cache hit rate, dollar savings, write overhead,
//        token breakdown chart, daily efficiency trend

import { useMemo } from "react";
import {
  AreaChart, Area, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useApi } from "../hooks/useApi";
import {
  MetricCard, SectionTitle, ChartCard, CustomTooltip,
  LoadingState, EmptyState, ErrorState, C,
} from "../components/ui";

export default function CacheAnalysis({ days, period }) {
  const { data: cacheData, loading, error } = useApi("/api/cache/efficiency", { days });
  const { data: tokenData, loading: loadingTokens } = useApi("/api/tokens/daily", { days });

  // Token trend chart data
  const tokenChartData = useMemo(() => {
    if (!tokenData || !Array.isArray(tokenData)) return [];
    return tokenData.map((d) => ({
      date: d.date.slice(5),
      "Input tokens": d.inputTokens,
      "Output tokens": d.outputTokens,
      "Cache read": d.cacheReadTokens,
      "Cache write": d.cacheWriteTokens,
    }));
  }, [tokenData]);

  // Cache efficiency daily trend
  const efficiencyTrend = useMemo(() => {
    if (!cacheData?.dailyTrend) return [];
    return cacheData.dailyTrend.map((d) => ({
      date: d.date.slice(5),
      hitRate: d.hitRate,
      savings: d.savings,
    }));
  }, [cacheData]);

  if (loading && loadingTokens) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const hitRate = cacheData?.overallHitRate || 0;
  const totalSavings = cacheData?.totalCacheSavings || 0;
  const totalCacheRead = cacheData?.totalCacheReadTokens || 0;
  const totalCacheWrite = cacheData?.totalCacheWriteTokens || 0;

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <MetricCard
          label="Cache hit rate"
          value={`${hitRate}%`}
          color={hitRate > 30 ? C.green : hitRate > 10 ? C.amber : C.textDim}
          sub={hitRate > 30 ? "Healthy" : hitRate > 10 ? "Room for improvement" : "Low — consider enabling caching"}
        />
        <MetricCard
          label="Total cache savings"
          value={`$${totalSavings.toFixed(2)}`}
          color={C.green}
          sub={`over ${period}`}
        />
        <MetricCard
          label="Cache read tokens"
          value={totalCacheRead > 1_000_000 ? `${(totalCacheRead / 1_000_000).toFixed(1)}M` : `${(totalCacheRead / 1000).toFixed(0)}K`}
          color={C.accent}
          sub="Served from cache (90% discount)"
        />
        <MetricCard
          label="Cache write tokens"
          value={totalCacheWrite > 1_000_000 ? `${(totalCacheWrite / 1_000_000).toFixed(2)}M` : `${(totalCacheWrite / 1000).toFixed(0)}K`}
          color={C.amber}
          sub="Written to cache (25% premium on 3rd party)"
        />
      </div>

      {/* Token Usage Trend */}
      <SectionTitle sub="Input, output, cache read, cache write over time">Token usage trend</SectionTitle>
      <ChartCard>
        {tokenChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={tokenChartData}>
              <defs>
                <linearGradient id="gInput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOutput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.pink} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={C.pink} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCacheR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(tokenChartData.length / 7) - 1)}
              />
              <YAxis
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v > 1000 ? `${(v / 1000).toFixed(0)}K` : v}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Input tokens" stroke={C.accent} fill="url(#gInput)" strokeWidth={2} />
              <Area type="monotone" dataKey="Output tokens" stroke={C.pink} fill="url(#gOutput)" strokeWidth={2} />
              <Area type="monotone" dataKey="Cache read" stroke={C.green} fill="url(#gCacheR)" strokeWidth={2} />
              <Line type="monotone" dataKey="Cache write" stroke={C.red} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No token data available yet." />
        )}
      </ChartCard>

      {/* Cache Efficiency Trend */}
      <SectionTitle sub="Daily cache hit rate and savings">Cache efficiency trend</SectionTitle>
      <ChartCard>
        {efficiencyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={efficiencyTrend}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(efficiencyTrend.length / 7) - 1)}
              />
              <YAxis
                yAxisId="rate"
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <YAxis
                yAxisId="savings"
                orientation="right"
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="savings" dataKey="savings" name="Savings ($)" fill={C.green} fillOpacity={0.4} radius={[4, 4, 0, 0]} barSize={16} />
              <Line yAxisId="rate" type="monotone" dataKey="hitRate" name="Hit rate (%)" stroke={C.accent} strokeWidth={2} dot={false} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No cache efficiency data yet." />
        )}
      </ChartCard>

      {/* Info Box */}
      <div style={{
        marginTop: 24,
        padding: "16px 20px",
        background: "rgba(34,211,238,0.06)",
        borderRadius: 12,
        border: "1px solid rgba(34,211,238,0.12)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.accent, marginBottom: 6 }}>
          How prompt caching works
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
          Cache write costs 125% of input price for 3rd party models (Anthropic, Meta) — free for Amazon models (Nova).
          Cache read costs only 10% of input price — a 90% saving. Default TTL is 5 minutes, resetting on each hit.
          Claude Opus 4.5, Haiku 4.5, and Sonnet 4.5 support 1-hour TTL. Minimum checkpoint size varies by model (1,024–4,096 tokens).
        </div>
      </div>
    </div>
  );
}