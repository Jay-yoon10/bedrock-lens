#!/usr/bin/env python3
# scripts/seed_test_data.py
# Bedrock Lens — Seed DynamoDB with realistic test data
#
# Usage: python3 scripts/seed_test_data.py
#
# This inserts 30 days of fake but realistic Bedrock usage data
# directly into DynamoDB. No Bedrock invocations needed.
# Run this once to populate the dashboard for testing/screenshots.
#
# To clean up: python3 scripts/seed_test_data.py --clean

import boto3
import sys
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

TABLE_NAME = "bedrock-lens-metrics"
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

# ─── Test Data Models ──────────────────────────────────────────────

MODELS = [
    {
        "modelId": "anthropic.claude-sonnet-4-20250514-v1:0",
        "displayName": "Claude Sonnet 4",
        "provider": "Anthropic",
        "dailyInvocations": (80, 150),     # min, max per day
        "inputTokensPerReq": (800, 2000),
        "outputTokensPerReq": (100, 500),
        "cacheReadRatio": 0.35,            # 35% of input served from cache
        "cacheWriteRatio": 0.05,
        "inputPrice": 3.0,                 # per 1M tokens
        "outputPrice": 15.0,
        "avgLatency": (1500, 3500),
        "p99Latency": (4000, 9000),
        "throttleRate": 0.005,
    },
    {
        "modelId": "anthropic.claude-haiku-4-5-20251001-v1:0",
        "displayName": "Claude Haiku 4.5",
        "provider": "Anthropic",
        "dailyInvocations": (200, 400),
        "inputTokensPerReq": (300, 800),
        "outputTokensPerReq": (50, 200),
        "cacheReadRatio": 0.40,
        "cacheWriteRatio": 0.04,
        "inputPrice": 0.8,
        "outputPrice": 4.0,
        "avgLatency": (500, 1500),
        "p99Latency": (2000, 4000),
        "throttleRate": 0.002,
    },
    {
        "modelId": "amazon.nova-pro-v1:0",
        "displayName": "Amazon Nova Pro",
        "provider": "Amazon",
        "dailyInvocations": (50, 120),
        "inputTokensPerReq": (500, 1500),
        "outputTokensPerReq": (100, 400),
        "cacheReadRatio": 0.25,
        "cacheWriteRatio": 0.06,
        "inputPrice": 0.8,
        "outputPrice": 3.2,
        "avgLatency": (800, 2000),
        "p99Latency": (3000, 6000),
        "throttleRate": 0.001,
    },
    {
        "modelId": "amazon.nova-lite-v1:0",
        "displayName": "Amazon Nova Lite",
        "provider": "Amazon",
        "dailyInvocations": (100, 250),
        "inputTokensPerReq": (200, 600),
        "outputTokensPerReq": (50, 150),
        "cacheReadRatio": 0.20,
        "cacheWriteRatio": 0.03,
        "inputPrice": 0.06,
        "outputPrice": 0.24,
        "avgLatency": (300, 800),
        "p99Latency": (1000, 2500),
        "throttleRate": 0.001,
    },
    {
        "modelId": "amazon.nova-micro-v1:0",
        "displayName": "Amazon Nova Micro",
        "provider": "Amazon",
        "dailyInvocations": (150, 350),
        "inputTokensPerReq": (100, 400),
        "outputTokensPerReq": (30, 100),
        "cacheReadRatio": 0.15,
        "cacheWriteRatio": 0.02,
        "inputPrice": 0.035,
        "outputPrice": 0.14,
        "avgLatency": (200, 600),
        "p99Latency": (800, 1800),
        "throttleRate": 0.0,
    },
]

RETENTION_DAYS = 90


def generate_day_data(model: dict, date: datetime) -> dict:
    """Generate one day of realistic data for a model."""
    # Add some weekly pattern (lower on weekends)
    weekday = date.weekday()
    weekend_factor = 0.3 if weekday >= 5 else 1.0

    # Add slight upward trend over 30 days
    day_offset = (datetime.now(timezone.utc).date() - date.date()).days
    trend_factor = 1.0 + (30 - day_offset) * 0.005  # 0.5% growth per day

    invocations = int(
        random.randint(*model["dailyInvocations"]) * weekend_factor * trend_factor
    )

    if invocations == 0:
        return None

    input_per_req = random.randint(*model["inputTokensPerReq"])
    output_per_req = random.randint(*model["outputTokensPerReq"])

    total_input = invocations * input_per_req
    total_output = invocations * output_per_req
    cache_read = int(total_input * model["cacheReadRatio"] * random.uniform(0.8, 1.2))
    cache_write = int(total_input * model["cacheWriteRatio"] * random.uniform(0.5, 1.5))
    throttles = int(invocations * model["throttleRate"] * random.uniform(0, 3))

    # Cost calculation
    non_cached_input = max(0, total_input - cache_read)
    input_cost = non_cached_input * model["inputPrice"] / 1_000_000
    output_cost = total_output * model["outputPrice"] / 1_000_000
    cache_read_cost = cache_read * model["inputPrice"] * 0.1 / 1_000_000
    cache_write_cost = cache_write * model["inputPrice"] * 1.25 / 1_000_000
    total_cost = input_cost + output_cost + cache_read_cost + cache_write_cost
    cache_savings = (cache_read * model["inputPrice"] / 1_000_000) - cache_read_cost

    avg_latency = random.randint(*model["avgLatency"])
    p99_latency = random.randint(*model["p99Latency"])

    ttl = int((date + timedelta(days=RETENTION_DAYS)).timestamp())

    return {
        "date": date.strftime("%Y-%m-%d"),
        "modelId": model["modelId"],
        "displayName": model["displayName"],
        "provider": model["provider"],
        "inputTokens": total_input,
        "outputTokens": total_output,
        "cacheReadTokens": cache_read,
        "cacheWriteTokens": cache_write,
        "invocations": invocations,
        "throttles": throttles,
        "avgLatencyMs": avg_latency,
        "p99LatencyMs": p99_latency,
        "estimatedCostUsd": Decimal(str(round(total_cost, 6))),
        "cacheSavingsUsd": Decimal(str(round(cache_savings, 6))),
        "lastCollectedAt": date.replace(hour=23, minute=59).isoformat(),
        "ttl": ttl,
    }


def seed_data():
    """Insert 30 days of test data for all models."""
    print("Seeding test data into DynamoDB...")
    print(f"Table: {TABLE_NAME}")
    print(f"Models: {len(MODELS)}")
    print(f"Days: 30\n")

    total_items = 0
    total_cost = 0

    with table.batch_writer() as batch:
        for day_offset in range(30):
            date = datetime.now(timezone.utc) - timedelta(days=day_offset)

            for model in MODELS:
                item = generate_day_data(model, date)
                if item:
                    batch.put_item(Item=item)
                    total_items += 1
                    total_cost += float(item["estimatedCostUsd"])

            if day_offset % 7 == 0:
                print(f"  Day -{day_offset}: {len(MODELS)} models written")

    print(f"\nDone! {total_items} items inserted.")
    print(f"Total estimated cost in test data: ${total_cost:.2f}")
    print(f"\nRefresh your dashboard to see the data.")


def clean_data():
    """Remove all test data from the table."""
    print("Cleaning all data from DynamoDB...")

    scan = table.scan(ProjectionExpression="#d, modelId", ExpressionAttributeNames={"#d": "date"})
    items = scan.get("Items", [])

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={"date": item["date"], "modelId": item["modelId"]})

    print(f"Deleted {len(items)} items.")


if __name__ == "__main__":
    if "--clean" in sys.argv:
        clean_data()
    else:
        seed_data()