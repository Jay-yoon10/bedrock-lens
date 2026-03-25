#!/usr/bin/env node
// infrastructure/bin/app.ts
// Bedrock Lens — CDK App Entry Point

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BedrockLensCoreStack } from "../lib/core-stack";
import { BedrockLensFrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// ─── Core Stack (always deployed) ───────────────────────────────
const coreStack = new BedrockLensCoreStack(app, "BedrockLensCoreStack", {
  env,
  description: "Bedrock Lens — Cost intelligence dashboard for Amazon Bedrock",
  tags: { Project: "bedrock-lens", ManagedBy: "cdk" },
});

// ─── Frontend Stack ─────────────────────────────────────────────
const frontendStack = new BedrockLensFrontendStack(app, "BedrockLensFrontendStack", {
  env,
  description: "Bedrock Lens — Frontend hosting (S3 + CloudFront)",
  tags: { Project: "bedrock-lens", ManagedBy: "cdk" },

  // Pass values from core stack
  apiUrl: coreStack.api.url,
  userPoolId: coreStack.userPool.userPoolId,
  userPoolClientId: "FILL_AFTER_FIRST_DEPLOY", // Replace after first cdk deploy
  region: process.env.CDK_DEFAULT_REGION || "ap-southeast-2",
});

// Frontend depends on core (needs API URL)
frontendStack.addDependency(coreStack);

// ─── Optional: Quota Dashboard ──────────────────────────────────
// Deploy with: cdk deploy --context quotaDashboard=true
//
// const quotaDashboardEnabled = app.node.tryGetContext("quotaDashboard") === "true";
// if (quotaDashboardEnabled) {
//   new BedrockLensQuotaStack(app, "BedrockLensQuotaStack", { env });
// }