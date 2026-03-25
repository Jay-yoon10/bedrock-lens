# backend/shared/pricing.py
# Bedrock Lens — Model Pricing Calculator
#
# Pricing data: us-east-1, Standard tier, On-Demand (per 1M tokens)
# Source: https://aws.amazon.com/bedrock/pricing/ (verified March 2026)
#
# IMPORTANT: Keep in sync with infrastructure/config/models.ts
# Last updated: 2026-03-24

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ModelPricing:
    model_id: str
    display_name: str
    provider: str
    input_price_per_1m: float       # USD per 1M input tokens (Standard)
    output_price_per_1m: float      # USD per 1M output tokens (Standard)
    cache_write_multiplier: float   # 1.25 for 3rd party, 1.0 for Amazon
    cache_read_multiplier: float    # 0.1 for all (90% discount)
    burndown_rate: int              # 5 for Claude 3.7+, 1 for others
    flex_discount: float            # 0.5 (50% off Standard)
    priority_premium: float         # 1.75 (75% more than Standard)
    supports_caching: bool
    min_cache_tokens: int


# ─── Model Registry ────────────────────────────────────────────────

MODEL_REGISTRY: dict[str, ModelPricing] = {

    # ── Anthropic Claude ──

    "anthropic.claude-opus-4-6-20260210-v1:0": ModelPricing(
        model_id="anthropic.claude-opus-4-6-20260210-v1:0",
        display_name="Claude Opus 4.6",
        provider="Anthropic",
        input_price_per_1m=15.00,
        output_price_per_1m=75.00,
        cache_write_multiplier=1.25,
        cache_read_multiplier=0.10,
        burndown_rate=5,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=4096,
    ),

    "anthropic.claude-sonnet-4-6-20260210-v1:0": ModelPricing(
        model_id="anthropic.claude-sonnet-4-6-20260210-v1:0",
        display_name="Claude Sonnet 4.6",
        provider="Anthropic",
        input_price_per_1m=3.00,
        output_price_per_1m=15.00,
        cache_write_multiplier=1.25,
        cache_read_multiplier=0.10,
        burndown_rate=5,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=1024,
    ),

    "anthropic.claude-sonnet-4-5-20250929-v1:0": ModelPricing(
        model_id="anthropic.claude-sonnet-4-5-20250929-v1:0",
        display_name="Claude Sonnet 4.5",
        provider="Anthropic",
        input_price_per_1m=3.00,
        output_price_per_1m=15.00,
        cache_write_multiplier=1.25,
        cache_read_multiplier=0.10,
        burndown_rate=5,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=1024,
    ),

    "anthropic.claude-opus-4-5-20250520-v1:0": ModelPricing(
        model_id="anthropic.claude-opus-4-5-20250520-v1:0",
        display_name="Claude Opus 4.5",
        provider="Anthropic",
        input_price_per_1m=15.00,
        output_price_per_1m=75.00,
        cache_write_multiplier=1.25,
        cache_read_multiplier=0.10,
        burndown_rate=5,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=4096,
    ),

    "anthropic.claude-haiku-4-5-20251001-v1:0": ModelPricing(
        model_id="anthropic.claude-haiku-4-5-20251001-v1:0",
        display_name="Claude Haiku 4.5",
        provider="Anthropic",
        input_price_per_1m=0.80,
        output_price_per_1m=4.00,
        cache_write_multiplier=1.25,
        cache_read_multiplier=0.10,
        burndown_rate=5,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=4096,
    ),

    "anthropic.claude-sonnet-4-20250514-v1:0": ModelPricing(
        model_id="anthropic.claude-sonnet-4-20250514-v1:0",
        display_name="Claude Sonnet 4",
        provider="Anthropic",
        input_price_per_1m=3.00,
        output_price_per_1m=15.00,
        cache_write_multiplier=1.25,
        cache_read_multiplier=0.10,
        burndown_rate=5,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=1024,
    ),

    "anthropic.claude-3-7-sonnet-20250219-v1:0": ModelPricing(
        model_id="anthropic.claude-3-7-sonnet-20250219-v1:0",
        display_name="Claude 3.7 Sonnet",
        provider="Anthropic",
        input_price_per_1m=3.00,
        output_price_per_1m=15.00,
        cache_write_multiplier=1.25,
        cache_read_multiplier=0.10,
        burndown_rate=5,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=1024,
    ),

    "anthropic.claude-3-5-haiku-20241022-v1:0": ModelPricing(
        model_id="anthropic.claude-3-5-haiku-20241022-v1:0",
        display_name="Claude 3.5 Haiku",
        provider="Anthropic",
        input_price_per_1m=0.80,
        output_price_per_1m=4.00,
        cache_write_multiplier=1.25,
        cache_read_multiplier=0.10,
        burndown_rate=5,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=2048,
    ),

    # ── Amazon Nova ──

    "amazon.nova-pro-v1:0": ModelPricing(
        model_id="amazon.nova-pro-v1:0",
        display_name="Amazon Nova Pro",
        provider="Amazon",
        input_price_per_1m=0.80,
        output_price_per_1m=3.20,
        cache_write_multiplier=1.00,
        cache_read_multiplier=0.10,
        burndown_rate=1,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=1024,
    ),

    "amazon.nova-lite-v1:0": ModelPricing(
        model_id="amazon.nova-lite-v1:0",
        display_name="Amazon Nova Lite",
        provider="Amazon",
        input_price_per_1m=0.06,
        output_price_per_1m=0.24,
        cache_write_multiplier=1.00,
        cache_read_multiplier=0.10,
        burndown_rate=1,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=1024,
    ),

    "amazon.nova-micro-v1:0": ModelPricing(
        model_id="amazon.nova-micro-v1:0",
        display_name="Amazon Nova Micro",
        provider="Amazon",
        input_price_per_1m=0.035,
        output_price_per_1m=0.14,
        cache_write_multiplier=1.00,
        cache_read_multiplier=0.10,
        burndown_rate=1,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=True,
        min_cache_tokens=1024,
    ),

    # ── Meta Llama ──

    "meta.llama3-3-70b-instruct-v1:0": ModelPricing(
        model_id="meta.llama3-3-70b-instruct-v1:0",
        display_name="Meta Llama 3.3 70B",
        provider="Meta",
        input_price_per_1m=0.72,
        output_price_per_1m=0.72,
        cache_write_multiplier=1.00,
        cache_read_multiplier=0.10,
        burndown_rate=1,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=False,
        min_cache_tokens=0,
    ),

    # ── Mistral ──

    "mistral.mistral-large-2407-v1:0": ModelPricing(
        model_id="mistral.mistral-large-2407-v1:0",
        display_name="Mistral Large",
        provider="Mistral",
        input_price_per_1m=2.00,
        output_price_per_1m=6.00,
        cache_write_multiplier=1.00,
        cache_read_multiplier=0.10,
        burndown_rate=1,
        flex_discount=0.50,
        priority_premium=1.75,
        supports_caching=False,
        min_cache_tokens=0,
    ),
}


# ─── Lookup ─────────────────────────────────────────────────────────

def get_model_pricing(model_id: str) -> Optional[ModelPricing]:
    """
    Get model pricing by model ID.
    Handles cross-region inference profile IDs (e.g., "us.anthropic.claude-...")
    """
    # Exact match
    if model_id in MODEL_REGISTRY:
        return MODEL_REGISTRY[model_id]

    # Strip cross-region prefix
    import re
    stripped = re.sub(r"^[a-z]{2}\.", "", model_id)
    if stripped in MODEL_REGISTRY:
        return MODEL_REGISTRY[stripped]

    # Partial match
    for key, pricing in MODEL_REGISTRY.items():
        if model_id in key or key in model_id:
            return pricing

    return None


# ─── Cost Calculations ──────────────────────────────────────────────

def calculate_cost(
    model_id: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_write_tokens: int = 0,
    tier: str = "standard",
) -> Optional[dict]:
    """
    Calculate the actual billing cost for a set of tokens.

    Returns:
        {
            "total_cost": float,
            "input_cost": float,
            "output_cost": float,
            "cache_read_cost": float,
            "cache_write_cost": float,
            "cache_savings": float,  # How much was saved by using cache
            "tier": str,
            "tier_multiplier": float,
        }
    """
    pricing = get_model_pricing(model_id)
    if not pricing:
        return None

    # Tier multiplier
    if tier == "flex":
        tier_multiplier = pricing.flex_discount  # 0.5
    elif tier == "priority":
        tier_multiplier = pricing.priority_premium  # 1.75
    else:
        tier_multiplier = 1.0  # standard

    input_price = pricing.input_price_per_1m / 1_000_000
    output_price = pricing.output_price_per_1m / 1_000_000

    # Non-cached input tokens = total input - cache_read (cache reads replace input processing)
    non_cached_input = max(0, input_tokens - cache_read_tokens)

    # Costs
    input_cost = non_cached_input * input_price * tier_multiplier
    output_cost = output_tokens * output_price * tier_multiplier
    cache_read_cost = cache_read_tokens * input_price * pricing.cache_read_multiplier * tier_multiplier
    cache_write_cost = cache_write_tokens * input_price * pricing.cache_write_multiplier * tier_multiplier

    total_cost = input_cost + output_cost + cache_read_cost + cache_write_cost

    # Cache savings = what it would have cost at full input price minus what we actually paid
    cache_savings = (cache_read_tokens * input_price * tier_multiplier) - cache_read_cost

    return {
        "total_cost": round(total_cost, 6),
        "input_cost": round(input_cost, 6),
        "output_cost": round(output_cost, 6),
        "cache_read_cost": round(cache_read_cost, 6),
        "cache_write_cost": round(cache_write_cost, 6),
        "cache_savings": round(cache_savings, 6),
        "tier": tier,
        "tier_multiplier": tier_multiplier,
    }


def calculate_quota_usage(
    model_id: str,
    input_tokens: int,
    output_tokens: int,
    cache_write_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> Optional[dict]:
    """
    Calculate quota (TPM) consumption — this is what determines throttling.

    Note: Billing != Quota. You pay for actual tokens, but quota is consumed
    at different rates due to burndown multipliers.

    Returns:
        {
            "billing_tokens": int,      # What you're billed for
            "quota_tokens": int,        # What counts toward TPM quota
            "burndown_rate": int,
            "difference": int,          # quota_tokens - billing_tokens
            "difference_pct": float,    # How much more quota vs billing
        }
    """
    pricing = get_model_pricing(model_id)
    if not pricing:
        return None

    # Billing: actual tokens used
    billing_tokens = input_tokens + output_tokens + cache_write_tokens
    # Note: cache_read_tokens are billed at reduced rate but still counted in billing

    # Quota: burndown-adjusted
    # Formula: Input + CacheWrite + (Output × burndown_rate)
    # CacheRead does NOT count toward quota for on-demand
    quota_tokens = input_tokens + cache_write_tokens + (output_tokens * pricing.burndown_rate)

    difference = quota_tokens - billing_tokens

    return {
        "billing_tokens": billing_tokens,
        "quota_tokens": quota_tokens,
        "burndown_rate": pricing.burndown_rate,
        "difference": difference,
        "difference_pct": round((difference / billing_tokens * 100), 1) if billing_tokens > 0 else 0,
    }


# ─── Tests ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Bedrock Lens Pricing Tests ===\n")

    # Test 1: Claude Sonnet 4 basic cost
    result = calculate_cost(
        model_id="anthropic.claude-sonnet-4-20250514-v1:0",
        input_tokens=1_000_000,
        output_tokens=200_000,
    )
    print(f"Test 1 — Claude Sonnet 4 (1M input, 200K output):")
    print(f"  Total: ${result['total_cost']:.4f}")
    print(f"  Input: ${result['input_cost']:.4f}, Output: ${result['output_cost']:.4f}")
    assert abs(result["total_cost"] - 6.00) < 0.01, f"Expected ~$6.00, got ${result['total_cost']}"
    print("  ✓ PASS\n")

    # Test 2: Cache savings
    result_no_cache = calculate_cost(
        model_id="anthropic.claude-sonnet-4-5-20250929-v1:0",
        input_tokens=500_000,
        output_tokens=50_000,
    )
    result_with_cache = calculate_cost(
        model_id="anthropic.claude-sonnet-4-5-20250929-v1:0",
        input_tokens=500_000,
        output_tokens=50_000,
        cache_read_tokens=400_000,
        cache_write_tokens=0,
    )
    print(f"Test 2 — Cache savings (400K of 500K input cached):")
    print(f"  Without cache: ${result_no_cache['total_cost']:.4f}")
    print(f"  With cache:    ${result_with_cache['total_cost']:.4f}")
    print(f"  Savings:       ${result_with_cache['cache_savings']:.4f}")
    assert result_with_cache["total_cost"] < result_no_cache["total_cost"], "Cache should reduce cost"
    print("  ✓ PASS\n")

    # Test 3: Burndown rate comparison
    claude_quota = calculate_quota_usage(
        model_id="anthropic.claude-sonnet-4-20250514-v1:0",
        input_tokens=1000,
        output_tokens=100,
        cache_write_tokens=200,
    )
    nova_quota = calculate_quota_usage(
        model_id="amazon.nova-pro-v1:0",
        input_tokens=1000,
        output_tokens=100,
        cache_write_tokens=200,
    )
    print(f"Test 3 — Burndown comparison (1000 input, 200 cache write, 100 output):")
    print(f"  Claude Sonnet 4 (5x): billing={claude_quota['billing_tokens']}, quota={claude_quota['quota_tokens']} (+{claude_quota['difference_pct']}%)")
    print(f"  Nova Pro (1x):        billing={nova_quota['billing_tokens']}, quota={nova_quota['quota_tokens']} (+{nova_quota['difference_pct']}%)")
    assert claude_quota["quota_tokens"] == 1700, f"Expected 1700, got {claude_quota['quota_tokens']}"
    assert nova_quota["quota_tokens"] == 1300, f"Expected 1300, got {nova_quota['quota_tokens']}"
    print("  ✓ PASS\n")

    # Test 4: Flex tier pricing
    standard = calculate_cost("amazon.nova-pro-v1:0", 1_000_000, 100_000, tier="standard")
    flex = calculate_cost("amazon.nova-pro-v1:0", 1_000_000, 100_000, tier="flex")
    print(f"Test 4 — Flex tier (50% discount):")
    print(f"  Standard: ${standard['total_cost']:.4f}")
    print(f"  Flex:     ${flex['total_cost']:.4f}")
    assert abs(flex["total_cost"] - standard["total_cost"] * 0.5) < 0.001, "Flex should be 50% of standard"
    print("  ✓ PASS\n")

    # Test 5: Cross-region model ID lookup
    pricing = get_model_pricing("us.anthropic.claude-sonnet-4-5-20250929-v1:0")
    print(f"Test 5 — Cross-region model ID lookup:")
    print(f"  'us.anthropic.claude-sonnet-4-5...' → {pricing.display_name if pricing else 'NOT FOUND'}")
    assert pricing is not None, "Should resolve cross-region model ID"
    assert pricing.display_name == "Claude Sonnet 4.5"
    print("  ✓ PASS\n")

    print("=== All tests passed ===")
