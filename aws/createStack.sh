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

#timestamp=$(date +"%Y%m%d%H%M%S")
## Read the current version number from the file
#current_version=$(cat version.txt)
## Increment the version number by 1
#new_version=$((current_version + 1))
## Write the new version number to the file
#echo $new_version > version.txt
#echo "Current version: $current_version"
## Print the new version number to the console
#echo "New version number: $new_version"
echo "AWS Profile: $AWS_PROFILE \n"
echo "AWS Stack: $AWS_STACK \n"

aws cloudformation create-stack \
--profile $AWS_PROFILE \
--stack-name $AWS_STACK \
--template-body file://$CREATE_TEMPLATE_BODY \
--parameters \
ParameterKey=S3CodeBucket,ParameterValue=$AWS_CODE_BUCKET \
--capabilities CAPABILITY_IAM