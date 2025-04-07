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

rm -rf ../output
mkdir -p ../output
cd ../serverless/src
for dir in ./*; do
  filename="$(basename "$dir")"
  extension="${filename##*.}"
  filename_without_extension="${filename%.*}" 
  cd $dir
  yarn install
  yarn build
  zip -r "./${filename_without_extension}.zip" * --exclude='node_modules/*'
  mv "./${filename_without_extension}.zip" ../../../output
  cd ..
done