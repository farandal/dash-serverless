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

done < $PWD/.env

cd ../serverless/nodejs
npm run package
cd ..
#zip -r ./pw-lambda-layer.zip ./nodejs --exclude='./nodejs/node_modules/*'
zip -r ./$AWS_LAMBDA_LAYER_NAME.zip ./nodejs
cd ..
mkdir -p ./nodejs-layer
mv ./serverless/$AWS_LAMBDA_LAYER_NAME.zip ./nodejs-layer