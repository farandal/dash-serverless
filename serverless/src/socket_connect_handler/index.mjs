
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

export const handler = async (event, context) => {
  
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);


  const command = new PutCommand({
    TableName: process.env.table,
    Item: {
      connectionId: event.requestContext.connectionId,
    },
  });

  try {
    const response = await docClient.send(command);    
    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      body: JSON.stringify(err)
    };
  }
};
