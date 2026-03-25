# Security

## Data Handling Principles

1. **No prompt content** — Bedrock Lens never accesses, collects, or stores any model inputs or outputs. Only CloudWatch metrics (token counts, latency, invocations) and Cost Explorer billing data are collected.

2. **Data stays in your account** — All data is stored in DynamoDB within your AWS account. No data is transmitted to external services or third-party APIs.

3. **No cross-account access** — The tool runs entirely within your account using IAM roles. No cross-account IAM roles or external credentials are needed.

## IAM Permissions

The Collector Lambda uses the following permissions, all read-only except for its own DynamoDB tables:

| Permission | Resource | Purpose |
|-----------|----------|---------|
| `cloudwatch:GetMetricData` | `*` | Read Bedrock usage metrics |
| `cloudwatch:ListMetrics` | `*` | Discover active Bedrock models |
| `ce:GetCostAndUsage` | `*` | Read billing data |
| `bedrock:ListFoundationModels` | `*` | List available models |
| `bedrock:ListInferenceProfiles` | `*` | List inference profiles |
| `dynamodb:PutItem`, `UpdateItem`, `GetItem`, `Query`, `Scan` | Own tables only | Store and read collected metrics |
| `logs:CreateLogGroup`, `PutLogEvents` | Own log group | Lambda logging |

**Not included:**
- `bedrock:InvokeModel` — Cannot call any Bedrock model
- `iam:*` — Cannot modify any IAM resources
- `dynamodb:DeleteTable` — Cannot delete tables
- Any write permissions to CloudWatch, Cost Explorer, or Bedrock

Resource-scoped permissions (DynamoDB) are automatically configured by CDK using `grantReadWriteData()`.

## Authentication

- **Cognito User Pool** with self-signup disabled — only admin-created users can access the dashboard
- **API Gateway** uses Cognito authorizer — all API endpoints require a valid JWT token
- **CloudFront** serves the frontend over HTTPS only

## Data Encryption

- DynamoDB tables use AWS managed encryption at rest (default)
- All API traffic is encrypted in transit (HTTPS via CloudFront and API Gateway)
- Cognito tokens are stored in browser sessionStorage (cleared on tab close)

## Data Retention

- Metrics data has a 90-day TTL configured via DynamoDB TTL attribute
- Old data is automatically deleted by DynamoDB
- The metrics table has `removalPolicy: RETAIN` — it survives stack deletion to prevent accidental data loss

## Reporting Security Issues

If you discover a security vulnerability, please report it via GitHub Issues or contact the maintainer directly.