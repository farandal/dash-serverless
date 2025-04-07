import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient } from "./ddbClient.js";

export const handler = async function (event, context) {
  const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

  const command = new DeleteCommand({
    TableName: process.env.table,
    Key: {
      connectionId: event.requestContext.connectionId,
    },
  });

  await ddbDocClient.send(command);

  return {
    statusCode: 200,
  };
};