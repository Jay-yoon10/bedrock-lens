// infrastructure/lib/core-stack.ts
// Bedrock Lens — Core Infrastructure Stack
//
// Resources:
// - DynamoDB tables (metrics + config)
// - Collector Lambda (hourly data collection)
// - API Lambda (serves data to frontend)
// - API Gateway (REST endpoints)
// - Cognito User Pool (authentication)
// - EventBridge rule (hourly trigger)

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as path from "path";
import { Construct } from "constructs";

export class BedrockLensCoreStack extends cdk.Stack {
  public readonly metricsTable: dynamodb.Table;
  public readonly configTable: dynamodb.Table;
  public readonly collectorLambda: lambda.Function;
  public readonly apiLambda: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly userPool: cognito.UserPool;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ═══════════════════════════════════════════════════════════════
    // DynamoDB Tables
    // ═══════════════════════════════════════════════════════════════

    this.metricsTable = new dynamodb.Table(this, "MetricsTable", {
      tableName: "bedrock-lens-metrics",
      partitionKey: { name: "date", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "modelId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: "ttl",
    });

    this.configTable = new dynamodb.Table(this, "ConfigTable", {
      tableName: "bedrock-lens-config",
      partitionKey: { name: "configKey", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // ═══════════════════════════════════════════════════════════════
    // Collector Lambda
    // ═══════════════════════════════════════════════════════════════

    this.collectorLambda = new lambda.Function(this, "CollectorLambda", {
      functionName: "bedrock-lens-collector",
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "handler.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../backend/collector")),
      environment: {
        METRICS_TABLE_NAME: this.metricsTable.tableName,
        CONFIG_TABLE_NAME: this.configTable.tableName,
        RETENTION_DAYS: "90",
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      description: "Bedrock Lens: Collects Bedrock metrics and cost data hourly",
    });

    // Collector IAM permissions
    this.metricsTable.grantReadWriteData(this.collectorLambda);
    this.configTable.grantReadData(this.collectorLambda);

    this.collectorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "CloudWatchReadBedrockMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:GetMetricData", "cloudwatch:ListMetrics"],
        resources: ["*"],
      })
    );

    this.collectorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "CostExplorerRead",
        effect: iam.Effect.ALLOW,
        actions: ["ce:GetCostAndUsage"],
        resources: ["*"],
      })
    );

    this.collectorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "BedrockListModels",
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:ListFoundationModels", "bedrock:ListInferenceProfiles"],
        resources: ["*"],
      })
    );

    // EventBridge: trigger collector every hour
    const hourlyRule = new events.Rule(this, "HourlyCollectionRule", {
      ruleName: "bedrock-lens-hourly-collection",
      description: "Triggers Bedrock Lens collector Lambda every hour",
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
    });
    hourlyRule.addTarget(new targets.LambdaFunction(this.collectorLambda));

    // ═══════════════════════════════════════════════════════════════
    // Cognito User Pool (Authentication)
    // ═══════════════════════════════════════════════════════════════

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "bedrock-lens-users",
      selfSignUpEnabled: false, // Admin creates users only
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: "bedrock-lens-web",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false, // Frontend apps don't use client secrets
    });

    // ═══════════════════════════════════════════════════════════════
    // API Lambda
    // ═══════════════════════════════════════════════════════════════

    this.apiLambda = new lambda.Function(this, "ApiLambda", {
      functionName: "bedrock-lens-api",
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "handler.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../backend/api")),
      environment: {
        METRICS_TABLE_NAME: this.metricsTable.tableName,
        CONFIG_TABLE_NAME: this.configTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      description: "Bedrock Lens: API serving metrics data to the dashboard",
    });

    // API Lambda IAM: read-only access to both tables
    this.metricsTable.grantReadData(this.apiLambda);
    this.configTable.grantReadWriteData(this.apiLambda); // Write for config updates

    // ═══════════════════════════════════════════════════════════════
    // API Gateway
    // ═══════════════════════════════════════════════════════════════

    this.api = new apigateway.RestApi(this, "BedrockLensApi", {
      restApiName: "bedrock-lens-api",
      description: "Bedrock Lens dashboard API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Restrict to CloudFront domain in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // Cognito authorizer for API Gateway
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      authorizerName: "bedrock-lens-authorizer",
      cognitoUserPools: [this.userPool],
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(this.apiLambda);

    // Default auth settings for all endpoints
    const methodOptions: apigateway.MethodOptions = {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // ── Route definitions ──

    // /api
    const apiResource = this.api.root.addResource("api");

    // /api/cost
    const costResource = apiResource.addResource("cost");
    // /api/cost/daily
    costResource.addResource("daily").addMethod("GET", lambdaIntegration, methodOptions);
    // /api/cost/summary
    costResource.addResource("summary").addMethod("GET", lambdaIntegration, methodOptions);

    // /api/tokens
    const tokensResource = apiResource.addResource("tokens");
    // /api/tokens/daily
    tokensResource.addResource("daily").addMethod("GET", lambdaIntegration, methodOptions);

    // /api/cache
    const cacheResource = apiResource.addResource("cache");
    // /api/cache/efficiency
    cacheResource.addResource("efficiency").addMethod("GET", lambdaIntegration, methodOptions);

    // /api/latency
    const latencyResource = apiResource.addResource("latency");
    // /api/latency/distribution
    latencyResource.addResource("distribution").addMethod("GET", lambdaIntegration, methodOptions);

    // /api/tiers
    const tiersResource = apiResource.addResource("tiers");
    // /api/tiers/breakdown
    tiersResource.addResource("breakdown").addMethod("GET", lambdaIntegration, methodOptions);

    // /api/config (GET + PUT)
    const configResource = apiResource.addResource("config");
    configResource.addMethod("GET", lambdaIntegration, methodOptions);
    configResource.addMethod("PUT", lambdaIntegration, methodOptions);

    // ═══════════════════════════════════════════════════════════════
    // Stack Outputs
    // ═══════════════════════════════════════════════════════════════

    new cdk.CfnOutput(this, "MetricsTableName", {
      value: this.metricsTable.tableName,
      description: "DynamoDB table for Bedrock usage metrics",
    });

    new cdk.CfnOutput(this, "ConfigTableName", {
      value: this.configTable.tableName,
      description: "DynamoDB table for dashboard configuration",
    });

    new cdk.CfnOutput(this, "CollectorLambdaName", {
      value: this.collectorLambda.functionName,
      description: "Collector Lambda function name",
    });

    new cdk.CfnOutput(this, "ApiLambdaName", {
      value: this.apiLambda.functionName,
      description: "API Lambda function name",
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.api.url,
      description: "API Gateway endpoint URL",
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID (for frontend)",
    });
  }
}