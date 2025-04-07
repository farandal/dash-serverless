import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient } from "./ddbClient.js";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

export const handler = async function (event, context) {
  const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

  let connections;

  try {
    const command = new ScanCommand({ TableName: process.env.table });
    const result = await ddbDocClient.send(command);
    connections = result.Items;
  } catch (err) {
    return {
      statusCode: 500,
    };
  }

  console.log("Request context");
  console.log(event.requestContext);

  const callbackAPI = new ApiGatewayManagementApiClient({
    apiVersion: "2018-11-29",
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  const senderConnectionId = event.requestContext.connectionId;
  let message;

  try {
    message = JSON.parse(event.body);
  } catch (e) {
    message = event.body;
  }

  const responseObject = {
    action: "ping",
    senderConnectionId,
    connectedClients: connections
      .filter((connection) => connection.connectionId !== senderConnectionId)
      .map((connection) => connection.connectionId)
  };

  if (typeof message === 'string') {
    responseObject.message = message;
  } else {
    Object.assign(responseObject, message);
  }

  try {
    const command = new PostToConnectionCommand({
      ConnectionId: senderConnectionId,
      Data: JSON.stringify(responseObject),
    });
    await callbackAPI.send(command);
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
    };
  }

  return { statusCode: 200 };
};