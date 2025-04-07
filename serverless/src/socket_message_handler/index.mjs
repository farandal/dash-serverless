import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient } from "./ddbClient.js"; 
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

export const handler = async function (event, context) {
  
  const senderConnectionId = event.requestContext.connectionId;
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
    apiVersion: '2018-11-29',
    endpoint:
       'https://' + event.requestContext.domainName + '/' + event.requestContext.stage,
  });
  
  const connectedClients = connections.map((connection) => connection.connectionId);
  const logMessage = true;
  const message = JSON.parse(event.body).message;
  
  const responseObject = { senderConnectionId: senderConnectionId };

  if (event.body) {
    try {
      const bodyJson = JSON.parse(event.body);
      Object.assign(responseObject, bodyJson);
    } catch (e) {
      // bounce the malformed message to the user
      responseObject.action = "malformed_message";
      responseObject.message = event.body;
      responseObject.from = senderConnectionId;
      responseObject.to = senderConnectionId
    }
  }
  

  const sendMessages = async () => {

    try {
      // Replace "me" with senderConnectionId if 'from' attribute exists
      if (responseObject.from) {
        if (responseObject.from === "me") {
          responseObject.from = senderConnectionId;
        } else if (Array.isArray(responseObject.from)) {
          responseObject.from = responseObject.from.map((id) => id === "me" ? senderConnectionId : id);
        }
      }

      // Handle 'to' attribute, if no responseObject.to, then send it back to the sender
      let recipients = [senderConnectionId]
      if (responseObject.to) {
        // send the message to the explicitly defined to:
        recipients = [responseObject.to]
        if (responseObject.to === "all" || responseObject.to === "*" ) {
          // if all, send the message to all connected clients
          recipients = connectedClients;
        } else if (responseObject.to === "all-except-me") {
          // if all-except-me, send the message to all connected clients except me
          recipients = connectedClients.filter((id) => id !== senderConnectionId);
        } else if (Array.isArray(responseObject.to)) {
          // if to is an array, then send the messages to the targets in the array matching the connected clients
          recipients = connectedClients.filter((id) => responseObject.to.some((toId) => toId === id));
        }
      }

      logMessage && console.log(`RESPONSE OBJECT - sender_id:${senderConnectionId} send messages to: ${recipients}`);
      logMessage && console.log(JSON.stringify(responseObject));

      // Send messages to recipients
      if (recipients) {
        await Promise.all(recipients.map(async (connectionId) => {
          try {
            const command = new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: JSON.stringify(responseObject),
            });
            logMessage && console.log(`SENT TO  ${connectionId} message: ${JSON.stringify(responseObject)}`)
            await callbackAPI.send(command);
          } catch (e) {
            console.error(`Error sending message to connection ID ${connectionId}: ${e}`);
          }
        }));
      }
    } catch (e) {
      console.error(`Error sending messages: ${e}`);
    }
  };

  try {
    await sendMessages();
  } catch (e) {
    console.error(`Error sending messages: ${e}`);
    return {
      statusCode: 500,
    };
  }

  return { statusCode: 200 };
};