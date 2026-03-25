# backend/api/handler.py
# Bedrock Lens — API Lambda
#
# Serves aggregated Bedrock metrics and cost data from DynamoDB
# to the React frontend via API Gateway.

import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ─── AWS Clients ────────────────────────────────────────────────────

dynamodb = boto3.resource("dynamodb")

METRICS_TABLE_NAME = os.environ.get("METRICS_TABLE_NAME", "bedrock-lens-metrics")
CONFIG_TABLE_NAME = os.environ.get("CONFIG_TABLE_NAME", "bedrock-lens-config")

metrics_table = dynamodb.Table(METRICS_TABLE_NAME)
config_table = dynamodb.Table(CONFIG_TABLE_NAME)


# ─── Helpers ────────────────────────────────────────────────────────

class DecimalEncoder(json.JSONEncoder):
    """DynamoDB returns Decimal types; convert to float for JSON."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def response(status_code: int, body: Any) -> dict:
    """Build API Gateway proxy response with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def get_date_range(days: int) -> list[str]:
    """Generate list of date strings for the last N days."""
    today = datetime.now(timezone.utc).date()
    return [(today - timedelta(days=i)).isoformat() for i in range(days)]


def query_metrics_for_date(date_str: str) -> list[dict]:
    """Query all model metrics for a single date."""
    try:
        result = metrics_table.query(
            KeyConditionExpression=Key("date").eq(date_str),
        )
        return result.get("Items", [])
    except ClientError as e:
        logger.error(f"Failed to query metrics for {date_str}: {e}")
        return []


def query_metrics_for_range(days: int) -> dict[str, list[dict]]:
    """Query metrics for the last N days, grouped by date."""
    dates = get_date_range(days)
    data = {}
    for date_str in dates:
        items = query_metrics_for_date(date_str)
        if items:
            data[date_str] = items
    return data


# ─── Route Handlers ─────────────────────────────────────────────────

def handle_cost_daily(params: dict) -> dict:
    """
    GET /api/cost/daily?days=30
    Returns daily cost breakdown by model.
    """
    days = int(params.get("days", "30"))
    raw_data = query_metrics_for_range(days)

    result = []
    for date_str in sorted(raw_data.keys()):
        day_entry = {"date": date_str, "models": {}, "totalCost": 0}
        for item in raw_data[date_str]:
            model_id = item["modelId"]
            cost = float(item.get("estimatedCostUsd", 0))
            day_entry["models"][item.get("displayName", model_id)] = {
                "cost": cost,
                "inputTokens": int(item.get("inputTokens", 0)),
                "outputTokens": int(item.get("outputTokens", 0)),
            }
            day_entry["totalCost"] += cost
        day_entry["totalCost"] = round(day_entry["totalCost"], 4)
        result.append(day_entry)

    return response(200, result)


def handle_cost_summary(params: dict) -> dict:
    """
    GET /api/cost/summary?period=30d
    Returns total cost, top model, trend vs previous period.
    """
    period_str = params.get("period", "30d")
    days = int(period_str.replace("d", ""))

    # Current period
    current_data = query_metrics_for_range(days)

    # Calculate totals per model
    model_totals = {}
    total_cost = 0
    total_invocations = 0
    total_throttles = 0

    for date_str, items in current_data.items():
        for item in items:
            name = item.get("displayName", item["modelId"])
            cost = float(item.get("estimatedCostUsd", 0))
            invocations = int(item.get("invocations", 0))
            throttles = int(item.get("throttles", 0))

            if name not in model_totals:
                model_totals[name] = {"cost": 0, "invocations": 0, "provider": item.get("provider", "Unknown")}
            model_totals[name]["cost"] += cost
            model_totals[name]["invocations"] += invocations

            total_cost += cost
            total_invocations += invocations
            total_throttles += throttles

    # Find top model by cost
    top_model = max(model_totals.items(), key=lambda x: x[1]["cost"]) if model_totals else ("N/A", {"cost": 0})

    # Round model totals
    for name in model_totals:
        model_totals[name]["cost"] = round(model_totals[name]["cost"], 4)

    return response(200, {
        "period": period_str,
        "daysWithData": len(current_data),
        "totalCost": round(total_cost, 4),
        "totalInvocations": total_invocations,
        "totalThrottles": total_throttles,
        "topModel": {"name": top_model[0], "cost": round(top_model[1]["cost"], 4)},
        "modelBreakdown": model_totals,
    })


def handle_tokens_daily(params: dict) -> dict:
    """
    GET /api/tokens/daily?days=30
    Returns daily token breakdown (input/output/cache read/cache write).
    """
    days = int(params.get("days", "30"))
    raw_data = query_metrics_for_range(days)

    result = []
    for date_str in sorted(raw_data.keys()):
        day_totals = {
            "date": date_str,
            "inputTokens": 0,
            "outputTokens": 0,
            "cacheReadTokens": 0,
            "cacheWriteTokens": 0,
        }
        for item in raw_data[date_str]:
            day_totals["inputTokens"] += int(item.get("inputTokens", 0))
            day_totals["outputTokens"] += int(item.get("outputTokens", 0))
            day_totals["cacheReadTokens"] += int(item.get("cacheReadTokens", 0))
            day_totals["cacheWriteTokens"] += int(item.get("cacheWriteTokens", 0))
        result.append(day_totals)

    return response(200, result)


def handle_cache_efficiency(params: dict) -> dict:
    """
    GET /api/cache/efficiency?days=30
    Returns cache hit rate, savings, and write overhead.
    """
    days = int(params.get("days", "30"))
    raw_data = query_metrics_for_range(days)

    total_input = 0
    total_cache_read = 0
    total_cache_write = 0
    total_cache_savings = 0

    daily_trend = []

    for date_str in sorted(raw_data.keys()):
        day_input = 0
        day_cache_read = 0
        day_cache_write = 0
        day_savings = 0

        for item in raw_data[date_str]:
            day_input += int(item.get("inputTokens", 0))
            day_cache_read += int(item.get("cacheReadTokens", 0))
            day_cache_write += int(item.get("cacheWriteTokens", 0))
            day_savings += float(item.get("cacheSavingsUsd", 0))

        total_input += day_input
        total_cache_read += day_cache_read
        total_cache_write += day_cache_write
        total_cache_savings += day_savings

        total_for_day = day_input + day_cache_read + day_cache_write
        hit_rate = round((day_cache_read / total_for_day * 100), 1) if total_for_day > 0 else 0

        daily_trend.append({
            "date": date_str,
            "hitRate": hit_rate,
            "savings": round(day_savings, 4),
            "cacheReadTokens": day_cache_read,
            "cacheWriteTokens": day_cache_write,
        })

    grand_total = total_input + total_cache_read + total_cache_write
    overall_hit_rate = round((total_cache_read / grand_total * 100), 1) if grand_total > 0 else 0

    return response(200, {
        "overallHitRate": overall_hit_rate,
        "totalCacheSavings": round(total_cache_savings, 4),
        "totalCacheReadTokens": total_cache_read,
        "totalCacheWriteTokens": total_cache_write,
        "dailyTrend": daily_trend,
    })


def handle_latency_distribution(params: dict) -> dict:
    """
    GET /api/latency/distribution?days=30
    Returns latency distribution buckets for histogram.
    """
    days = int(params.get("days", "30"))
    raw_data = query_metrics_for_range(days)

    # Collect all avg latency values with their invocation counts
    latency_points = []
    for date_str, items in raw_data.items():
        for item in items:
            avg_latency = float(item.get("avgLatencyMs", 0))
            invocations = int(item.get("invocations", 0))
            if invocations > 0 and avg_latency > 0:
                latency_points.append({
                    "latencyMs": avg_latency,
                    "invocations": invocations,
                    "model": item.get("displayName", item["modelId"]),
                    "date": date_str,
                })

    # Build histogram buckets
    buckets = [
        {"bucket": "<1s", "minMs": 0, "maxMs": 1000, "count": 0},
        {"bucket": "1-2s", "minMs": 1000, "maxMs": 2000, "count": 0},
        {"bucket": "2-3s", "minMs": 2000, "maxMs": 3000, "count": 0},
        {"bucket": "3-5s", "minMs": 3000, "maxMs": 5000, "count": 0},
        {"bucket": "5-8s", "minMs": 5000, "maxMs": 8000, "count": 0},
        {"bucket": "8-12s", "minMs": 8000, "maxMs": 12000, "count": 0},
        {"bucket": "12-20s", "minMs": 12000, "maxMs": 20000, "count": 0},
        {"bucket": ">20s", "minMs": 20000, "maxMs": float("inf"), "count": 0},
    ]

    for point in latency_points:
        for bucket in buckets:
            if bucket["minMs"] <= point["latencyMs"] < bucket["maxMs"]:
                bucket["count"] += point["invocations"]
                break

    # Clean up for JSON (remove inf)
    result_buckets = [{"bucket": b["bucket"], "count": b["count"]} for b in buckets]

    return response(200, {
        "buckets": result_buckets,
        "totalDataPoints": len(latency_points),
    })


def handle_tiers_breakdown(params: dict) -> dict:
    """
    GET /api/tiers/breakdown?days=30
    Returns request count and cost per service tier.
    """
    days = int(params.get("days", "30"))
    raw_data = query_metrics_for_range(days)

    tier_totals = {
        "standard": {"requests": 0, "cost": 0},
        "flex": {"requests": 0, "cost": 0},
        "priority": {"requests": 0, "cost": 0},
        "batch": {"requests": 0, "cost": 0},
    }

    for date_str, items in raw_data.items():
        for item in items:
            breakdown = item.get("tierBreakdown", {})
            if isinstance(breakdown, dict):
                for tier, count in breakdown.items():
                    tier_lower = tier.lower()
                    if tier_lower in tier_totals:
                        tier_totals[tier_lower]["requests"] += int(count)

    # Calculate percentages
    total_requests = sum(t["requests"] for t in tier_totals.values())
    for tier in tier_totals:
        tier_totals[tier]["pct"] = (
            round(tier_totals[tier]["requests"] / total_requests * 100, 1)
            if total_requests > 0 else 0
        )

    return response(200, {
        "totalRequests": total_requests,
        "tiers": tier_totals,
    })


def handle_config_get() -> dict:
    """
    GET /api/config
    Returns all user configuration settings.
    """
    try:
        result = config_table.scan()
        config = {}
        for item in result.get("Items", []):
            config[item["configKey"]] = item.get("value")
        return response(200, config)
    except ClientError as e:
        logger.error(f"Failed to read config: {e}")
        return response(500, {"error": "Failed to read configuration"})


def handle_config_put(body: dict) -> dict:
    """
    PUT /api/config
    Updates user configuration settings.
    Body: { "latencyBaselineMs": 5000, "costAlertThresholdUsd": 100 }
    """
    allowed_keys = {"latencyBaselineMs", "costAlertThresholdUsd", "retentionDays"}

    try:
        updated = []
        for key, value in body.items():
            if key not in allowed_keys:
                continue
            config_table.put_item(Item={"configKey": key, "value": Decimal(str(value))})
            updated.append(key)

        return response(200, {"updated": updated})
    except ClientError as e:
        logger.error(f"Failed to update config: {e}")
        return response(500, {"error": "Failed to update configuration"})


# ─── Router ─────────────────────────────────────────────────────────

ROUTES = {
    ("GET", "/api/cost/daily"): handle_cost_daily,
    ("GET", "/api/cost/summary"): handle_cost_summary,
    ("GET", "/api/tokens/daily"): handle_tokens_daily,
    ("GET", "/api/cache/efficiency"): handle_cache_efficiency,
    ("GET", "/api/latency/distribution"): handle_latency_distribution,
    ("GET", "/api/tiers/breakdown"): handle_tiers_breakdown,
}


def handler(event: dict, context: Any) -> dict:
    """
    Main Lambda entry point. Handles API Gateway proxy requests.
    """
    method = event.get("httpMethod", "GET")
    path = event.get("path", "")
    params = event.get("queryStringParameters") or {}
    body_str = event.get("body", "{}")

    logger.info(f"{method} {path} params={params}")

    # CORS preflight
    if method == "OPTIONS":
        return response(200, {})

    # Config endpoints
    if path == "/api/config":
        if method == "GET":
            return handle_config_get()
        elif method == "PUT":
            try:
                body = json.loads(body_str) if body_str else {}
            except json.JSONDecodeError:
                return response(400, {"error": "Invalid JSON body"})
            return handle_config_put(body)

    # Route to handler
    route_key = (method, path)
    route_handler = ROUTES.get(route_key)

    if route_handler:
        return route_handler(params)

    return response(404, {"error": f"Not found: {method} {path}"})