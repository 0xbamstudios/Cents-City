import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';

export class CentsCityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = 'cents-city.com';

    // ─── DynamoDB Table ──────────────────────────────────────────────────
    const table = new dynamodb.Table(this, 'CentsCityTable', {
      tableName: 'CentsCityTable',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ─── Lambda Function ─────────────────────────────────────────────────
    const gameCounterLambda = new lambda.Function(this, 'GameCounterFunction', {
      functionName: 'CentsCityGameCounter',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/game-counter')),
      environment: {
        TABLE_NAME: table.tableName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Grant Lambda read/write access to DynamoDB
    table.grantReadWriteData(gameCounterLambda);

    // ─── API Gateway ─────────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, 'GameCounterApi', {
      restApiName: 'CentsCityGameCounterApi',
      description: 'API for tracking game start counts',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'PUT', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
      },
    });

    const gamesResource = api.root.addResource('games');
    const counterResource = gamesResource.addResource('counter');

    const lambdaIntegration = new apigateway.LambdaIntegration(gameCounterLambda);

    counterResource.addMethod('PUT', lambdaIntegration);
    counterResource.addMethod('GET', lambdaIntegration);

    // ─── S3 Bucket for React App ─────────────────────────────────────────
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: 'cents-city-site',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ─── CloudFront Distribution ─────────────────────────────────────────
    const certificate = acm.Certificate.fromCertificateArn(
      this, 'SiteCertificate', 'arn:aws:acm:us-east-1:834665744233:certificate/3e67eb3d-81c8-4417-88e6-153fc38d670e'
    );

    // CloudFront Function to redirect apex (cents-city.com) to www.cents-city.com
    const redirectFunction = new cloudfront.Function(this, 'RedirectApexToWww', {
      functionName: 'CentsCityRedirectApexToWww',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;
  if (host === 'cents-city.com') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://www.cents-city.com' + request.uri }
      }
    };
  }
  return request;
}
      `),
    });

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      domainNames: ['www.cents-city.com', 'cents-city.com'],
      certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [{
          function: redirectFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // ─── S3 Deployment ───────────────────────────────────────────────────
    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../react/dist'))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ─── Route53 Records (disabled for now) ────────────────────────────
    // const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
    //   domainName,
    // });

    // // A record for apex domain
    // new route53.ARecord(this, 'SiteAliasRecord', {
    //   zone: hostedZone,
    //   recordName: domainName,
    //   target: route53.RecordTarget.fromAlias(
    //     new route53Targets.CloudFrontTarget(distribution)
    //   ),
    // });

    // // A record for www subdomain
    // new route53.ARecord(this, 'WwwAliasRecord', {
    //   zone: hostedZone,
    //   recordName: `www.${domainName}`,
    //   target: route53.RecordTarget.fromAlias(
    //     new route53Targets.CloudFrontTarget(distribution)
    //   ),
    // });

    // ─── Outputs ─────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway Endpoint',
    });

    new cdk.CfnOutput(this, 'SiteBucketName', {
      value: siteBucket.bucketName,
      description: 'S3 Bucket for site content',
    });
  }
}
