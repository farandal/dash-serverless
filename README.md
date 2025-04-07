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

# USAGE

- yarn install
- yarn create-stack - Create the AWS Initial Resources, S3 Bucket (You can only run this once, if error, you need to delete the stack manually, after that you need to run update-stack)
- yarn upload - Upload lambda node layer, lambdas,  and CF templates to S3.
- yarn update-stack - creates & update the serverless stack, aws api gateway, socket gateway, aurora instance, rds etc.

