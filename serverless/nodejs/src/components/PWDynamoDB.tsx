import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
} from "@aws-sdk/lib-dynamodb";

export class PWDynamoDB {
    private client: DynamoDBClient;

    constructor(region: string) {
        this.client = new DynamoDBClient({ region });
    }

    async getItem(tableName: string | undefined, id: any) {
        try {
            const result = await this.client.send(
                new GetCommand({
                    TableName: tableName,
                    Key: { id: id },
                })
            );
            console.log(`get item id ${id} from table ${tableName}`);
            console.log(result.Item);
            return result.Item;
        } catch (error) {
            console.error(error);
            console.error(`Error getting item ${id} from table ${tableName}:`, error);
            throw error;
        }
    }

    async putItem(tableName: any, item: any) {
        try {
            await this.client.send(
                new PutCommand({
                    TableName: tableName,
                    Item: item,
                    ConditionExpression: "attribute_not_exists(platform_id)",
                })
            );
            console.log(`Item added to table ${tableName}`);
        } catch (error) {
            console.error(`Error adding item to table ${tableName}:`, error);
            throw error;
        }
    }
}
