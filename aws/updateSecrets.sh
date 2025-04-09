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
PARAMETERS_JSON=$(cat $PWD/aws/.env | grep -v '^#' | awk -F '=' '/.+/ {printf "\"%s\": \"%s\",", $1, $2}' | sed 's/,$//' | awk '{print "{"$0"}"}')
echo "Parameters JSON: $PARAMETERS_JSON"
# Create or update the secret in AWS Secrets Manager
# Check if secret exists
aws secretsmanager describe-secret \
  --profile $AWS_LOCAL_PROFILE \
  --secret-id "${AWS_STACK}-parameters" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  # Secret exists, update it
  aws secretsmanager update-secret \
    --profile $AWS_LOCAL_PROFILE \
    --secret-id "${AWS_STACK}-parameters" \
    --secret-string "$PARAMETERS_JSON"
 
else
  # Secret doesn't exist, create it
  aws secretsmanager create-secret \
    --profile $AWS_LOCAL_PROFILE \
    --name "${AWS_STACK}-parameters" \
    --description "CloudFormation stack parameters for ${AWS_STACK}" \
    --secret-string "$PARAMETERS_JSON"
fi