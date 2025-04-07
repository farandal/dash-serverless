
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event, context) => {
  const command = new PutCommand({
    TableName: process.env.table,
    Item: {
      connectionId: event.requestContext.connectionId,
    },
  });

  try {
    const response = await docClient.send(command);

    console.log(response);
    return {
      statusCode: 200,
      body: response,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err,
    };
  }
};
