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
  
    const callbackAPI = new ApiGatewayManagementApiClient({
      apiVersion: "2018-11-29",
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  
    // Get your own connection ID from the event object
    const yourConnectionId = event.requestContext.connectionId;
  
    // Remove your own connection ID from the list of connected clients
    const connectedClients = connections
      .map(({ connectionId }) => connectionId)
      .filter((id) => id !== yourConnectionId);

  try {

    const command = new PostToConnectionCommand({
      ConnectionId: senderConnectionId,
      Data: JSON.stringify({ connectionId: yourConnectionId, connections: connectedClients }),
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