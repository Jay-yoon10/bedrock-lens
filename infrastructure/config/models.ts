// infrastructure/config/models.ts
// Bedrock Lens — Model Pricing Registry
//
// Pricing data: us-east-1, Standard tier, On-Demand (per 1M tokens)
// Source: https://aws.amazon.com/bedrock/pricing/ (verified March 2026)
//
// IMPORTANT: Prices change. Update this file when AWS updates pricing.
// Last updated: 2026-03-24

export interface ModelPricing {
  modelId: string;             // Bedrock model identifier
  displayName: string;         // Human-readable name
  provider: string;            // Model provider
  inputPricePer1M: number;     // USD per 1M input tokens (Standard tier)
  outputPricePer1M: number;    // USD per 1M output tokens (Standard tier)
  cacheWriteMultiplier: number;  // Cache write cost multiplier (1.25 = 25% premium, 1.0 = free)
  cacheReadMultiplier: number;   // Cache read cost multiplier (0.1 = 90% discount)
  burndownRate: number;          // Output token quota multiplier (5 for Claude 3.7+, 1 for others)
  flexDiscount: number;          // Flex tier discount (0.5 = 50% off Standard)
  priorityPremium: number;       // Priority tier premium (1.75 = 75% more than Standard)
  supportsCaching: boolean;      // Whether this model supports prompt caching
  minCacheTokens: number;        // Minimum tokens per cache checkpoint
}

export const MODEL_REGISTRY: Record<string, ModelPricing> = {

  // ─── Anthropic Claude ───────────────────────────────────────────

  "anthropic.claude-opus-4-6-20260210-v1:0": {
    modelId: "anthropic.claude-opus-4-6-20260210-v1:0",
    displayName: "Claude Opus 4.6",
    provider: "Anthropic",
    inputPricePer1M: 15.00,
    outputPricePer1M: 75.00,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.10,
    burndownRate: 5,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 4096,
  },

  "anthropic.claude-sonnet-4-6-20260210-v1:0": {
    modelId: "anthropic.claude-sonnet-4-6-20260210-v1:0",
    displayName: "Claude Sonnet 4.6",
    provider: "Anthropic",
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.10,
    burndownRate: 5,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 1024,
  },

  "anthropic.claude-sonnet-4-5-20250929-v1:0": {
    modelId: "anthropic.claude-sonnet-4-5-20250929-v1:0",
    displayName: "Claude Sonnet 4.5",
    provider: "Anthropic",
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.10,
    burndownRate: 5,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 1024,
  },

  "anthropic.claude-opus-4-5-20250520-v1:0": {
    modelId: "anthropic.claude-opus-4-5-20250520-v1:0",
    displayName: "Claude Opus 4.5",
    provider: "Anthropic",
    inputPricePer1M: 15.00,
    outputPricePer1M: 75.00,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.10,
    burndownRate: 5,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 4096,
  },

  "anthropic.claude-haiku-4-5-20251001-v1:0": {
    modelId: "anthropic.claude-haiku-4-5-20251001-v1:0",
    displayName: "Claude Haiku 4.5",
    provider: "Anthropic",
    inputPricePer1M: 0.80,
    outputPricePer1M: 4.00,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.10,
    burndownRate: 5,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 4096,
  },

  "anthropic.claude-sonnet-4-20250514-v1:0": {
    modelId: "anthropic.claude-sonnet-4-20250514-v1:0",
    displayName: "Claude Sonnet 4",
    provider: "Anthropic",
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.10,
    burndownRate: 5,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 1024,
  },

  "anthropic.claude-3-7-sonnet-20250219-v1:0": {
    modelId: "anthropic.claude-3-7-sonnet-20250219-v1:0",
    displayName: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.10,
    burndownRate: 5,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 1024,
  },

  "anthropic.claude-3-5-haiku-20241022-v1:0": {
    modelId: "anthropic.claude-3-5-haiku-20241022-v1:0",
    displayName: "Claude 3.5 Haiku",
    provider: "Anthropic",
    inputPricePer1M: 0.80,
    outputPricePer1M: 4.00,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.10,
    burndownRate: 5,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 2048,
  },

  // ─── Amazon Nova ────────────────────────────────────────────────

  "amazon.nova-pro-v1:0": {
    modelId: "amazon.nova-pro-v1:0",
    displayName: "Amazon Nova Pro",
    provider: "Amazon",
    inputPricePer1M: 0.80,
    outputPricePer1M: 3.20,
    cacheWriteMultiplier: 1.00,   // No cache write premium for Amazon models
    cacheReadMultiplier: 0.10,
    burndownRate: 1,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 1024,
  },

  "amazon.nova-lite-v1:0": {
    modelId: "amazon.nova-lite-v1:0",
    displayName: "Amazon Nova Lite",
    provider: "Amazon",
    inputPricePer1M: 0.06,
    outputPricePer1M: 0.24,
    cacheWriteMultiplier: 1.00,
    cacheReadMultiplier: 0.10,
    burndownRate: 1,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 1024,
  },

  "amazon.nova-micro-v1:0": {
    modelId: "amazon.nova-micro-v1:0",
    displayName: "Amazon Nova Micro",
    provider: "Amazon",
    inputPricePer1M: 0.035,
    outputPricePer1M: 0.14,
    cacheWriteMultiplier: 1.00,
    cacheReadMultiplier: 0.10,
    burndownRate: 1,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: true,
    minCacheTokens: 1024,
  },

  // ─── Meta Llama ─────────────────────────────────────────────────

  "meta.llama3-3-70b-instruct-v1:0": {
    modelId: "meta.llama3-3-70b-instruct-v1:0",
    displayName: "Meta Llama 3.3 70B",
    provider: "Meta",
    inputPricePer1M: 0.72,
    outputPricePer1M: 0.72,
    cacheWriteMultiplier: 1.00,
    cacheReadMultiplier: 0.10,
    burndownRate: 1,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: false,
    minCacheTokens: 0,
  },

  // ─── Mistral ────────────────────────────────────────────────────

  "mistral.mistral-large-2407-v1:0": {
    modelId: "mistral.mistral-large-2407-v1:0",
    displayName: "Mistral Large",
    provider: "Mistral",
    inputPricePer1M: 2.00,
    outputPricePer1M: 6.00,
    cacheWriteMultiplier: 1.00,
    cacheReadMultiplier: 0.10,
    burndownRate: 1,
    flexDiscount: 0.50,
    priorityPremium: 1.75,
    supportsCaching: false,
    minCacheTokens: 0,
  },
};

// ─── Helper functions ──────────────────────────────────────────────

/**
 * Get model pricing by model ID.
 * Handles both exact match and partial match (for cross-region inference profile IDs).
 */
export function getModelPricing(modelId: string): ModelPricing | undefined {
  // Exact match
  if (MODEL_REGISTRY[modelId]) {
    return MODEL_REGISTRY[modelId];
  }

  // Partial match: cross-region inference profiles use prefixes like "us." or "eu."
  // e.g., "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
  const stripped = modelId.replace(/^[a-z]{2}\./, "");
  if (MODEL_REGISTRY[stripped]) {
    return MODEL_REGISTRY[stripped];
  }

  // Search by partial model ID match
  for (const [key, pricing] of Object.entries(MODEL_REGISTRY)) {
    if (modelId.includes(key) || key.includes(modelId)) {
      return pricing;
    }
  }

  return undefined;
}

/**
 * List all models grouped by provider.
 */
export function getModelsByProvider(): Record<string, ModelPricing[]> {
  const grouped: Record<string, ModelPricing[]> = {};
  for (const model of Object.values(MODEL_REGISTRY)) {
    if (!grouped[model.provider]) {
      grouped[model.provider] = [];
    }
    grouped[model.provider].push(model);
  }
  return grouped;
}

/**
 * Get all unique provider names.
 */
export function getProviders(): string[] {
  return [...new Set(Object.values(MODEL_REGISTRY).map(m => m.provider))];
}
