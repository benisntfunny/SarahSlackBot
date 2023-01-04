/** @format */

import { Api, StackContext, Table, Bucket } from "@serverless-stack/resources";

export function APIStack({ stack }: StackContext) {
  const bucket = new Bucket(stack, "Storage", {
    cors: [
      {
        allowedMethods: ["GET"],
        allowedOrigins: ["*"],
      },
    ],
  });
  bucket.attachPermissions(["s3"]);

  const dalleHistory = new Table(stack, "DalleHistory", {
    fields: {
      appId: "string",
      requestDate: "number",
    },
    primaryIndex: { partitionKey: "appId", sortKey: "requestDate" },
  });
  const settings = new Table(stack, "Settings", {
    fields: {
      clientId: "string",
      type: "string",
    },
    primaryIndex: { partitionKey: "clientId", sortKey: "type" },
  });
  const outTable = new Table(stack, "OutMessage", {
    fields: {
      referenceId: "string",
    },
    primaryIndex: { partitionKey: "referenceId" },
  });

  const inTable = new Table(stack, "InMessage", {
    fields: {
      referenceId: "string",
    },
    primaryIndex: { partitionKey: "referenceId" },
    stream: true,
    consumers: {
      consumer1: {
        function: {
          handler: "../services/functions/process.handler",
          timeout: 60,
          environment: {
            outgoingTable: outTable.tableName,
            dalleHistory: dalleHistory.tableName,
            settings: settings.tableName,
            openAPIKey: process.env.OPENAI_API_KEY || "",
            content: bucket.bucketName,
            sfmc_client_id: process.env.SFMC_CLIENT_ID || "",
            sfmc_client_secret: process.env.SFMC_CLIENT_SECRET || "",
            sfmc_mid: process.env.SFMC_MID || "",
            sfmc_subdomain: process.env.SFMC_SUBDOMAIN || "",
            sfmc_category_id: process.env.SFMC_CATEGORY_ID || "",
            azure_key: process.env.AZURE_KEY || "",
            sarah_id: process.env.SARAH_ID || "",
            sarah_token: process.env.SLACK_USER_TOKEN || "",
            sarah_app_id: process.env.SARAH_APP_ID || "",
            sarah_authorized_teams: process.env.SARAH_AUTHORIZED_TEAMS || "",
            azure_domain: process.env.AZURE_DOMAIN || "",
            default_app_id: process.env.DEFAULT_APP_ID || "",
            default_image_size: process.env.DEFAULT_IMAGE_SIZE || "",
          },
          permissions: [outTable, "s3:*", dalleHistory, settings],
        },
      },
    },
  });

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        timeout: 60,
        environment: {
          incomingTable: inTable.tableName,
          outgoingTable: outTable.tableName,
          dalleHistory: dalleHistory.tableName,
          settings: settings.tableName,
          openAPIKey: process.env.OPENAI_API_KEY || "",
          content: bucket.bucketName,
          sfmc_client_id: process.env.SFMC_CLIENT_ID || "",
          sfmc_client_secret: process.env.SFMC_CLIENT_SECRET || "",
          sfmc_mid: process.env.SFMC_MID || "",
          sfmc_subdomain: process.env.SFMC_SUBDOMAIN || "",
          sfmc_category_id: process.env.SFMC_CATEGORY_ID || "",
          sfmc_authorized_apps: process.env.SFMC_AUTHORIZED_APPS || "",
          azure_key: process.env.AZURE_KEY || "",
          sarah_id: process.env.SARAH_ID || "",
          sarah_app_id: process.env.SARAH_APP_ID || "",
          sarah_authorized_teams: process.env.SARAH_AUTHORIZED_TEAMS || "",
          sarah_token: process.env.SLACK_USER_TOKEN || "",
          azure_domain: process.env.AZURE_DOMAIN || "",
          default_app_id: process.env.DEFAULT_APP_ID || "",
          default_image_size: process.env.DEFAULT_IMAGE_SIZE || "",
        },
      },
    },

    routes: {
      "POST /event": "functions/event.handler",
      "POST /button": "functions/event.click",
      "POST /write": "functions/write.handler",
      "POST /process": "functions/process.handler",
      "POST /sarah/ask": "functions/content.getGPTAnswer",
      "POST /dalle/generate": "functions/content.getDALLEAnswer",
      "POST /dalle/sfmc/history": "functions/sfmc.history",
      "GET /dalle/history": "functions/content.getDalleHistory",
      "GET /auth": "functions/auth.check",
    },
  });

  api.attachPermissions([inTable, outTable, dalleHistory, settings, "s3:*"]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    bucketName: bucket.bucketName,
  });
}
