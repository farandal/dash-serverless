import { ApiGatewayManagementApiClient, GetConnectionCommand, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

export const handler = async function (event) {
  let connectionInfo;
  let connectionId = event.requestContext.connectionId;

const callbackAPI = new ApiGatewayManagementApiClient({
  apiVersion: '2018-11-29',
  endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
});

  try {
    const command = new GetConnectionCommand({ ConnectionId: connectionId });
    connectionInfo = await callbackAPI.send(command);
    
      try {
        const command = new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({action:"default",connectionId:connectionId,message:"Use the sendmessage route to send a message.",connectionInfo})
        });
        await callbackAPI.send(command);
      } catch (e) {
        console.log(e);
      }
      
  } catch (e) {
    console.log(e);
  }


  return {
    statusCode: 200,
  };
};