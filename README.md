# DASH SERVERLESS ARCHITECTURE

DASH Serverless Project Overview

Note: This project is minded for an specific application architecture and is not intended to be a generic serverless framework.

Helper to manage and create serverless architecture on AWS.
The project creates a serverless backend infrastructure on AWS with these main components:

- Aurora PostgreSQL Serverless database cluster
- AWS Lambda functions for serverless execution
- NodeJS Lambda Layer for shared code
- IAM roles with necessary permissions for Lambda execution
- API Layer: WebSocket API Gateway for real-time communication (referenced in the SocketGatewayStack)
- S3 bucket for code storage and versioning
- DynamoDB tables (implied by IAM permissions)
- SecretsManager for storing sensitive information
- Handles ACM certificates for domain security
- IAM roles with least-privilege permissions
- VPC configuration with proper subnet isolation

DASHCreateServerless.yml
Initial infrastructure setup

- Creates S3 code bucket with versioning
- Sets up IAM roles for Lambda functions
- Creates SecretsManager secrets

DASHUpdateServerless.yml
Main application stack

- References the infrastructure created by the first stack
- Creates/updates the database stack
- Deploys the WebSocket gateway stack
- Configures domains and certificates

aurora-postgres-serverless-rds.stack.yml: Database infrastructure

- Creates Aurora PostgreSQL Serverless cluster
- Configures security groups, subnet groups, and parameters
- Sets up monitoring and notifications

# NOTES

- copy .env.example to .env and replace variables
- AWS Logs output in the ./logs folder
- Lambdas source code at: serverless/src
- NodeJS layer for lambdas at: serverless/src/node_modules
- Configuration for lambdas at: aws/templates/dash-sockets-gateway.yml
- Configuration for Aurora at: aurora-postgres-serverless-rds.stack.yml
# USAGE

- yarn install

- yarn build

- yarn create-stack - Create the AWS Initial Resources, S3 Bucket (You can only run this once, if error, you need to delete the stack manually, after that you need to run update-stack)
  
- yarn upload - Upload lambda node layer, lambdas,  and CF templates to S3.

- yarn update-stack - creates & update the serverless stack, aws api gateway, socket gateway, aurora instance, rds etc.

# POSTGRES AND DASH - ABOUT AURORA SERVERLESS CONFIGURATION FOR DASH  

Dash Requires a Database to work, specifically a postgres database:

## Development Environment
For development purposes, please check the main README file, as a postgres database is configure within a docker environment. 

## Staging / Testing Environment
For staging / testing purposes is recommended to go cheap, and the cheapest option within AWS, is to go around a Serverless RDS, instead of a dedicated database virtual machine. 

Aurora Serverless v2 will be cheaper if the database is inactive for significant periods, as it can pause completely and you only pay for storage during those times, while a db.t2.small will be cheaper if your database needs to be active almost continuously and maintains a consistent load above 0.5 ACUs

### Cost Considerations
- If your staging environment is used only during business hours (e.g., 8 hours/day, 5 days/week), Aurora Serverless v2 with auto-pause could save approximately 75% on compute costs compared to db.t2.small.
- If your database needs to be available 24/7 with consistent usage, db.t2.small might be more cost-effective
- The key advantage of Serverless v2 is that it automatically scales to zero compute costs when not in use, which makes it ideal for development, test, and staging environments with intermittent usage patterns.

## Comparison

### Aurora Serverless v2 (Current Configuration)

- Pricing model: Pay per ACU-hour consumed
- Min capacity: 0.5 ACUs
- Max capacity: 2 ACUs
- Auto-pause: Yes (pauses after 5 minutes of inactivity)
- Billing when inactive: Only pay for storage when paused (no compute costs)

### db.t2.small

- Pricing model: Fixed hourly rate
- vCPUs: 1
- Memory: 2 GiB
- Network performance: Low to moderate
- Auto-pause: Not available (you pay 24/7 regardless of usage)
- Billing when inactive: Full instance cost continues

For production environment, the evaluation requires to be accordingly to the project.

## CLOUDFORMATION DATABASE SCRIPT

This is a CloudFormation template for deploying an Aurora PostgreSQL Serverless RDS database in an AWS environment,
for the DASH Backend Persistency Layer.

It's configured with a min capacity of 0.5 ACUs and max of 2 ACUs

### YML Template Database Configuration

- PostgreSQL version: 14.3 (default)
- Cluster identifier: dash-rds-cluster 

Required configurations:
- Database name: (required to be config or passed as arguments) 
- Master username: (required to be config or passed as arguments) 
- Master password: (required to be config or passed as arguments) 

### Serverless Configuration: NOT FOR PRODUCTION!!!

This configurations can also be configured, thus, they are settings for minimum consumption, for development and staging only.

- Minimum capacity: 0.5 ACUs (Aurora Capacity Units)
- Maximum capacity: 2 ACUs
- Using serverless v2 scaling configuration

### Networking

- Uses specific subnets and VPC IDs that are passed as arguments
- Security group allows access to default port 3306 from any IP (0.0.0.0/0)

### Monitoring

- Sets up an SNS topic with email notification to a configurable email.
- Monitors for events like failover, failure, and maintenance.

## Costs
Looking at the cost aspects of this Aurora PostgreSQL Serverless v2 configuration:

### Key Cost Factors

- Minimum capacity: Currently set to 0.5 ACUs (Aurora Capacity Units)
- Maximum capacity: Currently set to 2 ACUs
- Storage: Not explicitly defined but will incur costs
- Backup retention: Set to 30 days (parameter DBBackupRetentionPeriod)
- Auto pause: Set to 'true' (will pause after 300 seconds/5 minutes of inactivity)

### Cost Optimization Configuration

The minimum configuration that would reduce costs:

- Using the minimum possible ACU settings - check!
- Minimizing backup retention period
- Enabling auto pause

The minimum allowed ACU is already set to 0.5, which is the lowest option according to the AllowedValues for MinCapacity. 
The backup retention is set to 30 days, which could be reduced to 1 day (the minimum allowed value).

### Current Configuration

- Minimum capacity: 0.5 ACUs (already at the lowest possible setting)
- Maximum capacity: 2 ACUs (already at the lowest possible setting in the allowed values)
- Auto-pause: Enabled (set to 'true')
- Time until auto-pause: 300 seconds (5 minutes)
- Backup retention period: 30 days

Increase auto-pause timeout: If you're concerned about frequent scaling events, you could reduce them by increasing the pause timeout, though your current setting of 5 minutes is reasonably low already.

Storage: The template doesn't specify storage settings, so it will use default values. Storage is charged separately regardless of whether the cluster is paused.

Note that 0.5 ACUs is already the absolute minimum capacity allowed for Aurora Serverless v2, and 2 ACUs is the minimum max capacity allowed in the template configuration. You can't go lower than these values.

For a staging environment, this is already quite cost-effective - the database will automatically pause after 5 minutes of inactivity, and you're using the minimum possible compute scaling configuration.