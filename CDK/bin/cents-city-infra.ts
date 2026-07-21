#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CentsCityStack } from '../lib/cents-city-stack';

const app = new cdk.App();
new CentsCityStack(app, 'CentsCityStack', {
  env: {
    account: '834665744233',
    region: 'us-east-1',
  },
});
