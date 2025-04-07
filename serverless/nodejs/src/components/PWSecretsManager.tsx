import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

export class PWSecretsManager {

    private client: SecretsManagerClient;

    constructor(region: string) {
        this.client = new SecretsManagerClient({ region });
    }

    async getSecret(secretName: string | undefined) {
        try {
            const result = await this.client.send(
                new GetSecretValueCommand({ SecretId: secretName })
            );
            if (result.SecretString) {
                return JSON.parse(result.SecretString);
            }
        } catch (error) {
            console.error(`Error getting secret ${secretName}:`, error);
            throw error;
        }
    }
}
