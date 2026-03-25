# backend/collector/handler.py
# Bedrock Lens — Collector Lambda
#
# Triggered hourly by EventBridge.
# Collects Bedrock metrics from CloudWatch and cost data from Cost Explorer,
# calculates per-model costs, and writes aggregated daily data to DynamoDB.

import os
import json
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import boto3
from botocore.exceptions import ClientError

# Add shared module to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "shared"))
from pricing import get_model_pricing, calculate_cost, MODEL_REGISTRY

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ─── AWS Clients ────────────────────────────────────────────────────

cloudwatch = boto3.client("cloudwatch")
ce = boto3.client("ce")
bedrock = boto3.client("bedrock")
dynamodb = boto3.resource("dynamodb")

METRICS_TABLE_NAME = os.environ.get("METRICS_TABLE_NAME", "bedrock-lens-metrics")
CONFIG_TABLE_NAME = os.environ.get("CONFIG_TABLE_NAME", "bedrock-lens-config")
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "90"))

metrics_table = dynamodb.Table(METRICS_TABLE_NAME)


# ─── Step A: Discover active models ────────────────────────────────

def get_active_model_ids() -> list[str]:
    """
    Get list of Bedrock model IDs that have been invoked recently.
    Uses CloudWatch metrics to find models with actual usage.
    """
    try:
        response = cloudwatch.list_metrics(
            Namespace="AWS/Bedrock",
            MetricName="Invocations",
        )

        model_ids = set()
        for metric in response.get("Metrics", []):
            for dim in metric.get("Dimensions", []):
                if dim["Name"] == "ModelId":
                    model_ids.add(dim["Value"])

        logger.info(f"Found {len(model_ids)} active models: {model_ids}")
        return list(model_ids)

    except ClientError as e:
        logger.error(f"Failed to list metrics: {e}")
        return []


# ─── Step B: Fetch CloudWatch Bedrock metrics ──────────────────────

def fetch_cloudwatch_metrics(model_id: str, start_time: datetime, end_time: datetime) -> dict:
    """
    Fetch all relevant Bedrock metrics for a single model over the given time range.

    Returns dict with token counts, invocation stats, and latency data.
    """
    # metric_queries = [
    #     # Token counts
    #     {"Id": "input_tokens", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "InputTokenCount", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},
    #     {"Id": "output_tokens", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "OutputTokenCount", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},

    #     # Cache tokens
    #     {"Id": "cache_read", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "CacheReadInputTokens", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},
    #     {"Id": "cache_write", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "CacheWriteInputTokens", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},

    #     # Invocation counts
    #     {"Id": "invocations", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "Invocations", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},
    #     {"Id": "throttles", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "InvocationThrottles", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},

    #     # Latency
    #     {"Id": "avg_latency", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "InvocationLatency", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Average"}},
    #     {"Id": "p99_latency", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "InvocationLatency", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "p99"}},
    # ]
    metric_queries = [
        # Token counts
        {"Id": "input_tokens", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "InputTokenCount", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},
        {"Id": "output_tokens", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "OutputTokenCount", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},

        # Cache tokens
        {"Id": "cache_read", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "CacheReadInputTokens", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},
        {"Id": "cache_write", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "CacheWriteInputTokens", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},

        # Invocation counts
        {"Id": "invocations", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "Invocations", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},
        {"Id": "throttles", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "InvocationThrottles", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Sum"}},

        # Latency
        {"Id": "avg_latency", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "InvocationLatency", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "Average"}},
        {"Id": "p99_latency", "MetricStat": {"Metric": {"Namespace": "AWS/Bedrock", "MetricName": "InvocationLatency", "Dimensions": [{"Name": "ModelId", "Value": model_id}]}, "Period": 3600, "Stat": "p99"}},
    ]

    try:
        response = cloudwatch.get_metric_data(
            MetricDataQueries=metric_queries,
            StartTime=start_time,
            EndTime=end_time,
        )

        # Parse results into a clean dict
        result = {}
        for metric_result in response.get("MetricDataResults", []):
            metric_id = metric_result["Id"]
            values = metric_result.get("Values", [])
            # Sum all hourly data points for the period
            if metric_id in ("avg_latency", "p99_latency"):
                result[metric_id] = round(sum(values) / len(values), 2) if values else 0
            else:
                result[metric_id] = int(sum(values))

        logger.info(f"  [{model_id}] CloudWatch: {result}")
        return result

    except ClientError as e:
        logger.error(f"Failed to fetch CloudWatch metrics for {model_id}: {e}")
        return {}


# ─── Step C: Fetch Cost Explorer data ──────────────────────────────

def fetch_cost_explorer_data(date_str: str) -> dict[str, float]:
    """
    Fetch actual Bedrock billing data from Cost Explorer for a specific date.

    Note: Cost Explorer data has ~24h delay. Yesterday's data is typically
    available, but today's data may not be.

    Returns dict mapping usage type to cost in USD.
    """
    try:
        # Cost Explorer needs date range: [start, end)
        start_date = date_str
        end_dt = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
        end_date = end_dt.strftime("%Y-%m-%d")

        response = ce.get_cost_and_usage(
            TimePeriod={"Start": start_date, "End": end_date},
            Granularity="DAILY",
            Filter={
                "Dimensions": {
                    "Key": "SERVICE",
                    "Values": ["Amazon Bedrock"],
                }
            },
            Metrics=["UnblendedCost"],
            GroupBy=[
                {"Type": "DIMENSION", "Key": "USAGE_TYPE"},
            ],
        )

        costs = {}
        for group in response.get("ResultsByTime", [{}])[0].get("Groups", []):
            usage_type = group["Keys"][0]
            amount = float(group["Metrics"]["UnblendedCost"]["Amount"])
            if amount > 0:
                costs[usage_type] = amount

        total = sum(costs.values())
        logger.info(f"  Cost Explorer ({date_str}): total=${total:.4f}, {len(costs)} usage types")
        return costs

    except ClientError as e:
        # Cost Explorer may not have data for today yet
        logger.warning(f"Cost Explorer unavailable for {date_str}: {e}")
        return {}


# ─── Step D: Calculate costs and write to DynamoDB ─────────────────

def process_and_store(
    model_id: str,
    date_str: str,
    cw_metrics: dict,
    ce_costs: dict,
) -> None:
    """
    Calculate estimated costs from token counts and write/update DynamoDB item.
    """
    input_tokens = cw_metrics.get("input_tokens", 0)
    output_tokens = cw_metrics.get("output_tokens", 0)
    cache_read = cw_metrics.get("cache_read", 0)
    cache_write = cw_metrics.get("cache_write", 0)
    invocations = cw_metrics.get("invocations", 0)
    throttles = cw_metrics.get("throttles", 0)
    avg_latency = cw_metrics.get("avg_latency", 0)
    p99_latency = cw_metrics.get("p99_latency", 0)

    # Skip models with zero usage
    if invocations == 0 and input_tokens == 0:
        logger.info(f"  [{model_id}] No usage, skipping")
        return

    # Calculate estimated cost using pricing module
    cost_result = calculate_cost(
        model_id=model_id,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cache_read_tokens=cache_read,
        cache_write_tokens=cache_write,
    )

    estimated_cost = cost_result["total_cost"] if cost_result else 0
    cache_savings = cost_result["cache_savings"] if cost_result else 0

    # Get model display name
    pricing = get_model_pricing(model_id)
    display_name = pricing.display_name if pricing else model_id

    # Calculate TTL (auto-delete after RETENTION_DAYS)
    ttl_timestamp = int(
        (datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=RETENTION_DAYS)).timestamp()
    )

    # Write to DynamoDB using UpdateExpression to accumulate hourly data
    try:
        metrics_table.update_item(
            Key={
                "date": date_str,
                "modelId": model_id,
            },
            UpdateExpression="""
                SET displayName = :displayName,
                    provider = :provider,
                    inputTokens = if_not_exists(inputTokens, :zero) + :inputTokens,
                    outputTokens = if_not_exists(outputTokens, :zero) + :outputTokens,
                    cacheReadTokens = if_not_exists(cacheReadTokens, :zero) + :cacheRead,
                    cacheWriteTokens = if_not_exists(cacheWriteTokens, :zero) + :cacheWrite,
                    invocations = if_not_exists(invocations, :zero) + :invocations,
                    throttles = if_not_exists(throttles, :zero) + :throttles,
                    avgLatencyMs = :avgLatency,
                    p99LatencyMs = :p99Latency,
                    estimatedCostUsd = if_not_exists(estimatedCostUsd, :zerof) + :estimatedCost,
                    cacheSavingsUsd = if_not_exists(cacheSavingsUsd, :zerof) + :cacheSavings,
                    lastCollectedAt = :collectedAt,
                    #ttl_attr = :ttl
            """,
            ExpressionAttributeNames={
                "#ttl_attr": "ttl",  # 'ttl' is a reserved word in DynamoDB
            },
            ExpressionAttributeValues={
                ":displayName": display_name,
                ":provider": pricing.provider if pricing else "Unknown",
                ":inputTokens": input_tokens,
                ":outputTokens": output_tokens,
                ":cacheRead": cache_read,
                ":cacheWrite": cache_write,
                ":invocations": invocations,
                ":throttles": throttles,
                ":avgLatency": int(avg_latency),
                ":p99Latency": int(p99_latency),
                # ":estimatedCost": str(round(estimated_cost, 6)),
                # ":cacheSavings": str(round(cache_savings, 6)),
                ":estimatedCost": Decimal(str(round(estimated_cost, 6))),
                ":cacheSavings": Decimal(str(round(cache_savings, 6))),
                ":collectedAt": datetime.now(timezone.utc).isoformat(),
                ":ttl": ttl_timestamp,
                ":zero": 0,
                ":zerof": Decimal("0"),
            },
        )

        logger.info(
            f"  [{display_name}] Stored: {invocations} invocations, "
            f"{input_tokens} in / {output_tokens} out, "
            f"${estimated_cost:.4f} est. cost, ${cache_savings:.4f} cache savings"
        )

    except ClientError as e:
        logger.error(f"Failed to write DynamoDB for {model_id} on {date_str}: {e}")


# ─── Lambda Handler ─────────────────────────────────────────────────

def get_date_range(event: dict, now: datetime) -> list[str]:
    """
    Return list of date strings to collect, derived from the Lambda event.

    Normal (hourly) invocation  → [today]
    Backfill via event payload  → event must include "start_date" and "end_date"
                                  as "YYYY-MM-DD" strings (inclusive on both ends).
    """
    if "start_date" in event and "end_date" in event:
        start = datetime.strptime(event["start_date"], "%Y-%m-%d")
        end = datetime.strptime(event["end_date"], "%Y-%m-%d")
        days = (end - start).days + 1
        return [
            (start + timedelta(days=i)).strftime("%Y-%m-%d")
            for i in range(days)
        ]
    return [now.strftime("%Y-%m-%d")]


def handler(event: dict, context: Any) -> dict:
    """
    Main Lambda entry point. Triggered by EventBridge every hour.

    1. Discovers active Bedrock models from CloudWatch
    2. Determines date range to collect (today, or explicit backfill range)
    3. For each date: fetches per-day CloudWatch metrics and Cost Explorer data
    4. Calculates costs using pricing module
    5. Writes data to DynamoDB keyed by the actual date the metrics belong to

    Backfill: invoke manually with event = {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
    """
    logger.info("=== Bedrock Lens Collector Started ===")

    now = datetime.now(timezone.utc)

    # Step A: Find active models (once, shared across all dates)
    active_models = get_active_model_ids()
    if not active_models:
        logger.info("No active Bedrock models found. Nothing to collect.")
        return {"statusCode": 200, "body": "No active models"}

    dates = get_date_range(event, now)
    logger.info(f"Dates to process: {dates}")

    total_models_processed = 0

    for date_str in dates:
        logger.info(f"--- Processing date: {date_str} ---")

        # CloudWatch window: full UTC day for the target date
        day_start = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        # Cost Explorer data for this specific date
        ce_costs = fetch_cost_explorer_data(date_str)

        models_processed = 0
        for model_id in active_models:
            logger.info(f"Processing: {model_id}")

            cw_metrics = fetch_cloudwatch_metrics(model_id, day_start, day_end)

            if cw_metrics:
                process_and_store(
                    model_id=model_id,
                    date_str=date_str,
                    cw_metrics=cw_metrics,
                    ce_costs=ce_costs,
                )
                models_processed += 1

        logger.info(f"  {models_processed}/{len(active_models)} models processed for {date_str}")
        total_models_processed += models_processed

    logger.info(
        f"=== Collection complete: {total_models_processed} model-days across {len(dates)} date(s) ==="
    )

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Collection complete",
            "dates": dates,
            "totalModelDaysProcessed": total_models_processed,
        }),
    }