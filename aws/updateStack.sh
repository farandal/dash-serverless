#!/bin/sh

while IFS= read -r line; do
  if [[ "$line" =~ ^#.* ]]; then
    continue
  fi

  varname=$(echo "$line" | awk -F '=' '{print $1}')
  varvalue=$(echo "$line" | awk -F '=' '{print $2}')
  
  if [[ -z "$varvalue" ]]; then
    continue
  else
    echo "$varname=$varvalue"
    export $varname=$varvalue
  fi

done < $PWD/aws/.env

echo "AWS Profile: $AWS_PROFILE \n"
echo "AWS Stack: $AWS_STACK \n"

echo "aws cloudformation update-stack \
--profile $AWS_PROFILE \
--stack-name $AWS_STACK \
--template-body file://$UPDATE_TEMPLATE_BODY \
--parameters \
ParameterKey=EmailAddress,ParameterValue=$AWS_EMAIL_NOTIFICATION_ADDRESS \
ParameterKey=CodeVersion,ParameterValue=prod,\
ParameterKey=NodeJsLambdaLayerName,ParameterValue=$AWS_LAMBDA_LAYER_NAME,\
ParameterKey=DomainCertificateARN,ParameterValue=$DOMAIN_CERTIFICATE_ARN,\
ParameterKey=RegionalDomainCertificateARN,ParameterValue=$REGIONAL_DOMAIN_CERTIFICATE_ARN,\
ParameterKey=S3CodeBucket,ParameterValue=$AWS_CODE_BUCKET,\
ParameterKey=CodeVersion,ParameterValue=$new_version,\
ParameterKey=Subnet1ID,ParameterValue=$AWS_SUBNET1_ID,\
ParameterKey=Subnet2ID,ParameterValue=$AWS_SUBNET2_ID,\
ParameterKey=VPCID,ParameterValue=$AWS_VPC_ID,\
ParameterKey=DBName,ParameterValue=$AWS_DB_NAME,\
ParameterKey=DBMasterUsername,ParameterValue=$AWS_DB_MASTER_USERNAME,\
ParameterKey=DBMasterUserPassword,ParameterValue=$AWS_DB_MASTER_USER_PASSWORD,\
ParameterKey=DBSnapshotIdentifier,ParameterValue='',\
ParameterKey=DBBackupRetentionPeriod,ParameterValue=$AWS_DB_BACKUP_RETENTION_PERIOD,\
ParameterKey=SubDomainNameWithDot,ParameterValue=$AWS_SUB_DOMAIN_NAME_WITH_DOT,\
ParameterKey=PreferredBackupWindow,ParameterValue=$AWS_PREFERRED_BACKUP_WINDOW,\
ParameterKey=PreferredMaintenanceWindow,ParameterValue=$AWS_PREFERRED_MAINTENANCE_WINDOW,\
ParameterKey=EnableDataApi,ParameterValue=$AWS_ENABLE_DATA_API,\
ParameterKey=AutoPause,ParameterValue=$AWS_AUTO_PAUSE,\
ParameterKey=MaxCapacity,ParameterValue=$AWS_MAX_CAPACITY,\
ParameterKey=MinCapacity,ParameterValue=$AWS_MIN_CAPACITY,\
ParameterKey=SecondsUntilAutoPause,ParameterValue=$AWS_SECONDS_UNTIL_AUTO_PAUSE,\
ParameterKey=EngineVersion,ParameterValue=$AWS_ENGINE_VERSION \
--capabilities CAPABILITY_IAM"

aws cloudformation update-stack \
--profile $AWS_PROFILE \
--stack-name $AWS_STACK \
--template-body file://$UPDATE_TEMPLATE_BODY \
--parameters \
ParameterKey=Env,ParameterValue=$ENV \
ParameterKey=CodeVersion,ParameterValue=prod \
ParameterKey=NodeJsLambdaLayerName,ParameterValue=$AWS_LAMBDA_LAYER_NAME \
ParameterKey=DomainCertificateARN,ParameterValue=$DOMAIN_CERTIFICATE_ARN \
ParameterKey=RegionalDomainCertificateARN,ParameterValue=$REGIONAL_DOMAIN_CERTIFICATE_ARN \
ParameterKey=S3CodeBucket,ParameterValue=$AWS_CODE_BUCKET \
ParameterKey=CodeVersion,ParameterValue=$new_version \
ParameterKey=Subnet1ID,ParameterValue=$AWS_SUBNET_1_ID \
ParameterKey=Subnet2ID,ParameterValue=$AWS_SUBNET_2_ID \
ParameterKey=VPCID,ParameterValue=$AWS_VPC_ID \
ParameterKey=DBName,ParameterValue=$AWS_DB_NAME \
ParameterKey=DBMasterUsername,ParameterValue=$AWS_DB_MASTER_USERNAME \
ParameterKey=DBMasterUserPassword,ParameterValue=$AWS_DB_MASTER_USER_PASSWORD \
ParameterKey=DBSnapshotIdentifier,ParameterValue='' \
ParameterKey=DBBackupRetentionPeriod,ParameterValue=$AWS_DB_BACKUP_RETENTION_PERIOD \
ParameterKey=SubDomainNameWithDot,ParameterValue=$AWS_SUB_DOMAIN_NAME_WITH_DOT \
ParameterKey=PreferredBackupWindow,ParameterValue=$AWS_PREFERRED_BACKUP_WINDOW \
ParameterKey=PreferredMaintenanceWindow,ParameterValue=$AWS_PREFERRED_MAINTENANCE_WINDOW \
ParameterKey=EnableDataApi,ParameterValue=$AWS_ENABLE_DATA_API \
ParameterKey=AutoPause,ParameterValue=$AWS_AUTO_PAUSE \
ParameterKey=MaxCapacity,ParameterValue=$AWS_MAX_CAPACITY \
ParameterKey=MinCapacity,ParameterValue=$AWS_MIN_CAPACITY \
ParameterKey=SecondsUntilAutoPause,ParameterValue=$AWS_SECONDS_UNTIL_AUTO_PAUSE \
ParameterKey=EngineVersion,ParameterValue=$AWS_ENGINE_VERSION \
ParameterKey=EmailAddress,ParameterValue=$AWS_EMAIL_NOTIFICATION_ADDRESS \
ParameterKey=AwsRegion,ParameterValue=$AWS_REGION \
--capabilities CAPABILITY_IAM
# Wait for stack update to complete
echo "Waiting for stack update to complete..."
aws cloudformation wait stack-update-complete \
--profile $AWS_PROFILE \
--stack-name $AWS_STACK
if [ $? -eq 0 ]; then
    echo "Stack update completed successfully"
    echo "Listing stack resources and ARNs..."
    mkdir -p ./logs
    timestamp=$(date +%Y%m%d_%H%M%S)
    echo "{\"mainStack\": " > ./logs/stack_resources_${timestamp}.json
    aws cloudformation describe-stack-resources \
    --profile $AWS_PROFILE \
    --stack-name $AWS_STACK \
    --query 'StackResources[].{LogicalId:LogicalResourceId,PhysicalId:PhysicalResourceId,Type:ResourceType,ARN:PhysicalResourceId}' \
    --output json >> ./logs/stack_resources_${timestamp}.json
    
    # Get nested stack resources
    echo "Listing nested stack resources..."
    echo ", \"nestedStacks\": {" >> ./logs/stack_resources_${timestamp}.json
    first=true
    aws cloudformation list-stack-resources \
    --profile $AWS_PROFILE \
    --stack-name $AWS_STACK \
    --query 'StackResourceSummaries[?ResourceType==`AWS::CloudFormation::Stack`].PhysicalResourceId' \
    --output text | while read -r nested_stack; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> ./logs/stack_resources_${timestamp}.json
        fi
        echo "\"$nested_stack\": " >> ./logs/stack_resources_${timestamp}.json
        aws cloudformation describe-stack-resources \
        --profile $AWS_PROFILE \
        --stack-name $nested_stack \
        --query 'StackResources[].{LogicalId:LogicalResourceId,PhysicalId:PhysicalResourceId,Type:ResourceType,ARN:PhysicalResourceId}' \
        --output json >> ./logs/stack_resources_${timestamp}.json
    done
    echo "}} " >> ./logs/stack_resources_${timestamp}.json
    echo "Stack resources have been written to ./logs/stack_resources_${timestamp}.json"
else
    echo "Stack update failed or timed out"
    mkdir -p ./logs
    timestamp=$(date +%Y%m%d_%H%M%S)
    echo "{\"stackEvents\": " > ./logs/stack_failure_${timestamp}.json
    aws cloudformation describe-stack-events \
    --profile $AWS_PROFILE \
    --stack-name $AWS_STACK \
    --max-items 5 \
    --output json >> ./logs/stack_failure_${timestamp}.json
    echo ", \"stackErrors\": " >> ./logs/stack_failure_${timestamp}.json
    aws cloudformation describe-stack-events \
    --profile $AWS_PROFILE \
    --stack-name $AWS_STACK \
    --query 'StackEvents[?ResourceStatus==`UPDATE_FAILED` || ResourceStatus==`CREATE_FAILED` || ResourceStatus==`DELETE_FAILED`].{LogicalId:LogicalResourceId,Status:ResourceStatus,Reason:ResourceStatusReason}' \
    --output json >> ./logs/stack_failure_${timestamp}.json
    echo "}" >> ./logs/stack_failure_${timestamp}.json
    echo "Stack failure details have been written to ./logs/stack_failure_${timestamp}.json"
fi