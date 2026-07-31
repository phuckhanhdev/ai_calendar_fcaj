import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

let secretsLoaded = false;
let loadSecretsPromise = null;

/**
 * Hàm lấy cấu hình từ AWS Secrets Manager và nạp vào process.env.
 * Thích hợp dùng ở môi trường Production (Amplify/EC2) để bảo mật.
 */
export async function loadAwsSecrets() {
  if (secretsLoaded) return true;
  if (loadSecretsPromise) return loadSecretsPromise;

  loadSecretsPromise = (async () => {
    // Chỉ kích hoạt khi biến USE_AWS_SECRETS_MANAGER=true
    if (process.env.USE_AWS_SECRETS_MANAGER !== "true") {
      console.log("ℹ️ AWS Secrets Manager is disabled (USE_AWS_SECRETS_MANAGER !== 'true'). Using env variables.");
      secretsLoaded = true;
      return true;
    }

    const secretName = process.env.APP_AWS_SECRET_NAME || process.env.AWS_SECRET_NAME;
    const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || "us-east-1";

    if (!secretName) {
      console.warn("⚠️ USE_AWS_SECRETS_MANAGER is true but AWS_SECRET_NAME is not set!");
      return false;
    }

    console.log(`🔒 Loading secrets from AWS Secrets Manager: ${secretName}...`);

    try {
      const config = { region };
      
      const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

      // Nếu chạy ở local phát triển và có cấu hình key trong env
      if (accessKeyId && secretAccessKey) {
        config.credentials = {
          accessKeyId,
          secretAccessKey,
        };
      }

      const client = new SecretsManagerClient(config);
      const response = await client.send(
        new GetSecretValueCommand({
          SecretId: secretName,
        })
      );

      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        
        // Nạp tất cả các key/value vào process.env
        Object.entries(secrets).forEach(([key, value]) => {
          process.env[key] = value;
        });

        console.log("✅ Successfully loaded and injected secrets from AWS Secrets Manager.");
        secretsLoaded = true;
        return true;
      }
      
      console.warn("⚠️ Secrets Manager returned empty SecretString.");
      return false;
    } catch (error) {
      console.error("❌ Failed to load secrets from AWS Secrets Manager:", error.message);
      // Không crash ứng dụng, fallback về env bình thường
      return false;
    }
  })();

  return loadSecretsPromise;
}
