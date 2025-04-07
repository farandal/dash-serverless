import fs from "fs";
import path from "path";
import { readFile } from "fs/promises";
import { mkdir } from 'fs/promises';
import {
    LambdaClient,
    UpdateFunctionCodeCommand,
    UpdateFunctionConfigurationCommand,
    ListFunctionsCommand,
} from "@aws-sdk/client-lambda";

import {
    APIGatewayClient,
    CreateDeploymentCommand,
    GetRestApisCommand,
} from "@aws-sdk/client-api-gateway";

import dotenv from 'dotenv';
dotenv.config();
console.log(dotenv.config())
const AWS_STACK = process.env.AWS_STACK;
const AWS_REGION = process.env.AWS_REGION;
const AWS_KEY = process.env.AWS_KEY;
const AWS_SECRET = process.env.AWS_SECRET;

if (!AWS_STACK) {
    throw new Error('AWS_STACK environment variable is missing. Please check your .env file');
}
if (!AWS_REGION) {
    throw new Error('AWS_REGION environment variable is missing. Please check your .env file');
}
if (!AWS_KEY) {
    throw new Error('AWS_KEY environment variable is missing. Please check your .env file');
}
if (!AWS_SECRET) {
    throw new Error('AWS_SECRET environment variable is missing. Please check your .env file');
}

const folderPath = "../output/";

try {
    await mkdir(folderPath, { recursive: true });
} catch (error) {
    if (error.code !== 'EEXIST') {
        throw error;
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadJsonFile = async (path) => {
  const fileContents = await readFile(path, 'utf8');
  return JSON.parse(fileContents);
}

const getLambdaMapper = async () => {
    const sourceFolderPath = "../serverless/src/";
    const mapper = {};
    
    try {
        const folders = await fs.promises.readdir(sourceFolderPath);
        
        for (const folder of folders) {
            const folderPath = path.join(sourceFolderPath, folder);
            const stat = await fs.promises.stat(folderPath);
            
            if (stat.isDirectory()) {
                try {
                    const packageJsonPath = path.join(folderPath, 'package.json');
                    const packageJson = await loadJsonFile(packageJsonPath);
                    
                    if (packageJson.lambda) {
                        mapper[packageJson.lambda] = folder + '.zip';
                    }
                } catch (error) {
                    console.warn(`No package.json or lambda attribute in ${folder}`);
                }
            }
        }
    } catch (error) {
        console.error('Error reading functions directory:', error);
    }
    
    if (process.env.npm_config_functions) {
        const functionsName = process.env.npm_config_functions.split(",");
        return Object.fromEntries(
            Object.entries(mapper).filter(([key]) => functionsName.includes(key))
        );
    }
    
    return mapper;
}

console.log("Lambda Functions Mapper");
console.log(await getLambdaMapper());

const clientParams = {
    credentials: {
        accessKeyId: AWS_KEY,
        secretAccessKey: AWS_SECRET,
    },
    region: AWS_REGION,
};

const lambdaClient = new LambdaClient(clientParams);
const apiGatewayClient = new APIGatewayClient({ ...clientParams });

const getMatchingEntries = (mapping, fileList) => {
    console.log(mapping,fileList)
    return Object.entries(mapping).filter(([key, value]) =>
        fileList.includes(value)
    );
};

const getFileNamesInFolder = () => {
    return new Promise((resolve, reject) => {
        try {
            fs.readdir(folderPath, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }

                const fileNames = files.map(
                    (file) => path.parse(file).name + path.parse(file).ext
                );
                resolve(fileNames);
            });
        } catch (err) {
            reject(err);
        }
    });
};

const updateServerlessAppCode = async () => {
    const command = new ListFunctionsCommand({});
    const lambdasRequest = await lambdaClient.send(command);
    const lambdas = lambdasRequest.Functions;

    const filePaths = await getFileNamesInFolder();
    const lambdaMapper = await getLambdaMapper();
   
    console.log("Lambda Mapper:", lambdaMapper);
    console.log("File Paths:", filePaths);
    console.log("Missing files in Lambda Mapper:", filePaths.filter(file => !Object.values(lambdaMapper).includes(file)));
    const matches = getMatchingEntries(lambdaMapper, filePaths);


    for (const match of matches) {
        const fileName = match[1];

        if (!lambdas) return;

        const lambda = lambdas.filter(
            (l) => { return l && l.FunctionName && l.FunctionName.indexOf(match[0]) !== -1 }
        )[0];

        const fnName = lambda && lambda.FunctionName ? lambda.FunctionName : ""

        if (fnName === "") return;

        const code = await readFile(folderPath + fileName);

        const lambdaCommand = {
            ZipFile: code,
            FunctionName: fnName,
            Architectures: ["arm64"],
            Handler: "index.handler",
            PackageType: "Zip",
            Runtime: "nodejs18.x",
        };

        try {
            await lambdaClient.send(new UpdateFunctionCodeCommand(lambdaCommand));
            console.log(
                `Successfully updated lambda function ${match[0]} with file ${match[1]}`
            );
        } catch (err) {
            console.error(
                `Error updating lambda function ${match[0]} with file ${match[1]}`,
                err
            );
        }
    }
};

const DEPLOY_API_GATEWAYS = false;
const deployApiGateways = async () => {
    if(DEPLOY_API_GATEWAYS) {
        const getRestApisCommand = new GetRestApisCommand({});
        const apis = await apiGatewayClient.send(getRestApisCommand);

        if (!apis || !apis.items) {
            throw new Error("Cannot continue. Not able to get API gateways list from AWS")
        }
        for (const api of apis.items) {
            const updateApiStageParams = {
                restApiId: api.id,
                stageName: "prod",
            };

            await sleep(6000);
            const response = await apiGatewayClient.send(
                new CreateDeploymentCommand(updateApiStageParams)
            );

            console.log("API deployed " + api.name);
            console.log(response);
        }
    } else {
        console.log("Skiping API re-deploy");
    }
};


await updateServerlessAppCode();