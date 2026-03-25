// infrastructure/lib/frontend-stack.ts
// Bedrock Lens — Frontend Hosting Stack
//
// Resources:
// - S3 bucket (React build files)
// - CloudFront distribution (HTTPS + CDN)
// - Origin Access Control (S3 only accessible via CloudFront)

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";
import { Construct } from "constructs";

interface FrontendStackProps extends cdk.StackProps {
  apiUrl: string;          // API Gateway URL from core stack
  userPoolId: string;      // Cognito User Pool ID
  userPoolClientId: string; // Cognito Client ID
  region: string;          // Cognito region
}

export class BedrockLensFrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // ═══════════════════════════════════════════════════════════════
    // S3 Bucket for static files
    // ═══════════════════════════════════════════════════════════════

    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      bucketName: `bedrock-lens-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Only CloudFront can access
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // Clean up on stack deletion
    });

    // ═══════════════════════════════════════════════════════════════
    // CloudFront Distribution
    // ═══════════════════════════════════════════════════════════════

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "Bedrock Lens Dashboard",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",

      // SPA routing: return index.html for all 404s (React Router handles routes)
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // ═══════════════════════════════════════════════════════════════
    // Deploy React build to S3
    // ═══════════════════════════════════════════════════════════════

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../../frontend/dist")),
      ],
      destinationBucket: websiteBucket,
      distribution: this.distribution,
      distributionPaths: ["/*"], // Invalidate CloudFront cache on deploy
    });

    // ═══════════════════════════════════════════════════════════════
    // Stack Outputs
    // ═══════════════════════════════════════════════════════════════

    new cdk.CfnOutput(this, "DashboardUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "Bedrock Lens dashboard URL",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID",
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
      description: "S3 bucket for frontend files",
    });
  }
}