import { exec } from "child_process";
import fs, { createReadStream } from "fs";
import path from "path";
import { readFile } from "fs/promises";
import { promisify } from "util";
import { mkdir } from 'fs/promises';
import {
    S3Client,
    PutObjectCommand,
    ListBucketsCommand,
    CreateBucketCommand
} from "@aws-sdk/client-s3";

import { CloudFormationClient, ValidateTemplateCommand } from "@aws-sdk/client-cloudformation";


import dotenv from 'dotenv';
dotenv.config();
console.log(dotenv.config())


const AWS_STACK = process.env.AWS_STACK;
const AWS_REGION = process.env.AWS_REGION;
const AWS_CODE_BUCKET = process.env.AWS_CODE_BUCKET;
const AWS_KEY = process.env.AWS_KEY;
const AWS_SECRET = process.env.AWS_SECRET;
const AWS_LAMBDA_LAYER_NAME = process.env.AWS_LAMBDA_LAYER_NAME;


const prepareNodeLayer = "./prepareNodeLayer.sh";

if (!AWS_REGION) {
    throw new Error('AWS_REGION environment variable is missing. Please check your .env file');
}
if (!AWS_CODE_BUCKET) {
    throw new Error('AWS_CODE_BUCKET environment variable is missing. Please check your .env file');
}
if (!AWS_KEY) {
    throw new Error('AWS_KEY environment variable is missing. Please check your .env file');
}
if (!AWS_SECRET) {
    throw new Error('AWS_SECRET environment variable is missing. Please check your .env file');
}

const folderPath = "../output/";
const templatesPath = "../aws/templates/";

try {
    await mkdir(folderPath, { recursive: true });
} catch (error) {
    if (error.code !== 'EEXIST') {
        throw error;
    }
}

const clientParams = {
    credentials: {
        accessKeyId: AWS_KEY,
        secretAccessKey: AWS_SECRET,
    },
    region: AWS_REGION,
};

const s3Client = new S3Client(clientParams);

const uploadFileToS3 = async (bucketName, filePath, prefix = '') => {
    const parsedFile = path.parse(filePath);
    const fileStream = createReadStream(filePath);
    const fileName = prefix ? `${prefix}/${parsedFile.base}` : parsedFile.base;

    const options = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileStream,
    };

    const s3Command = new PutObjectCommand(options);
    const s3Object = await s3Client.send(s3Command);

    console.log(
        `Successfully uploaded file ${fileName} to bucket ${bucketName}`
    );

    return s3Object;
};

const getFileNamesInFolder = (folderPath) => {
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



const prepareNodeJsLayer = async () => {
    const options = { maxBuffer: 1024 * 4000 };

    const execAsync = promisify(exec);

    try {
        const { stdout, stderr } = await execAsync(prepareNodeLayer, options);
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    } catch (error) {
        console.error(`exec error: ${error}`);
    }
};



const uploadLambdaLayer = async () => {
    let data;
    const layerPath = path.resolve(process.cwd(), `../nodejs-layer/${AWS_LAMBDA_LAYER_NAME}.zip`);
    console.log(`Uploading layer from: ${layerPath}`);

    await uploadFileToS3(AWS_CODE_BUCKET, layerPath);
};

const uploadServerlessAppCode = async () => {
    try {
        const data = await s3Client.send(new ListBucketsCommand({ }));
        const buckets = data.Buckets;
        const bucketExists = buckets.some((bucket) => bucket.Name === AWS_CODE_BUCKET);
        if (!bucketExists) {
            const params = { Bucket: AWS_CODE_BUCKET };
            await s3Client.send(new CreateBucketCommand(params));
            console.log(`Bucket ${AWS_CODE_BUCKET} created`);
        } else {
            console.log(`Bucket ${AWS_CODE_BUCKET} already exists`);
        }

        const filePaths = await getFileNamesInFolder(folderPath);
        for (const fileName of filePaths) {
            await uploadFileToS3(AWS_CODE_BUCKET, folderPath + fileName);
        }
    } catch (err) {
        throw err;
    }
};

const uploadTemplates = async () => {
    try {
        const templateFiles = await getFileNamesInFolder(templatesPath);
        for (const fileName of templateFiles) {
            // Read template file content
            const templateContent = await fs.promises.readFile(templatesPath + fileName, 'utf8');
            
            // Validate template using CloudFormation API
            const validateParams = {
                TemplateBody: templateContent
            };
            
            try {
                const templateFirstLine = templateContent.split('\n')[0].trim();
                if (templateFirstLine.includes('AWSTemplateFormatVersion')) {
                    const cfnClient = new CloudFormationClient();
                    await cfnClient.send(new ValidateTemplateCommand(validateParams));
                    console.log(`Template ${fileName} is valid`);
                }
                
                // Upload template only if validation passes or if no validation needed
                await uploadFileToS3(AWS_CODE_BUCKET, templatesPath + fileName, 'templates');
            } catch (validationError) {
                console.error(`Template ${fileName} validation failed:`, validationError);
                throw validationError;
            }        }
    } catch (err) {
        throw err;
    }
};

const uploadType = process.argv[2];
if (uploadType === 'layer') {
    await prepareNodeJsLayer();
    await uploadLambdaLayer();
    process.exit(0);
    
} else if (uploadType === 'lambdas') {
    await uploadServerlessAppCode();
    process.exit(0);
 
} else if (uploadType === 'templates') {
    await uploadTemplates();
    process.exit(0);
}


await prepareNodeJsLayer();
await uploadLambdaLayer();
await uploadServerlessAppCode();
await uploadTemplates();