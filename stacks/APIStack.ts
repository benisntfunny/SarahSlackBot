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

  const DALLE_HISTORY = new Table(stack, "DalleHistory", {
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
  const stats = new Table(stack, "Stats", {
    fields: {
      userId: "string",
    },
    primaryIndex: { partitionKey: "userId" },
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
          handler: "../services/functions/slack/process.handler",
          timeout: 60,
          environment: {
            OUTGOING_TABLE: outTable.tableName,
            DALLE_HISTORY: DALLE_HISTORY.tableName,
            settings: settings.tableName,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
            content: bucket.bucketName,
            SFMC_CLIENT_ID: process.env.SFMC_CLIENT_ID || "",
            SFMC_CLIENT_SECRET: process.env.SFMC_CLIENT_SECRET || "",
            SFMC_MID: process.env.SFMC_MID || "",
            SFMC_SUBDOMAIN: process.env.SFMC_SUBDOMAIN || "",
            SFMC_CATEGORY_ID: process.env.SFMC_CATEGORY_ID || "",
            AZURE_KEY: process.env.AZURE_KEY || "",
            SARAH_ID: process.env.SARAH_ID || "",
            SARAH_TOKEN: process.env.SLACK_USER_TOKEN || "",
            SARAH_APP_ID: process.env.SARAH_APP_ID || "",
            SARAH_AUTHORIZED_TEAMS: process.env.SARAH_AUTHORIZED_TEAMS || "",
            AZURE_DOMAIN: process.env.AZURE_DOMAIN || "",
            DEFAULT_APP_ID: process.env.DEFAULT_APP_ID || "",
            DEFAULT_IMAGE_SIZE: process.env.DEFAULT_IMAGE_SIZE || "",
          },
          permissions: [outTable, "s3:*", DALLE_HISTORY, settings],
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
          INCOMING_TABLE: inTable.tableName,
          OUTGOING_TABLE: outTable.tableName,
          DALLE_HISTORY: DALLE_HISTORY.tableName,
          settings: settings.tableName,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
          content: bucket.bucketName,
          SFMC_CLIENT_ID: process.env.SFMC_CLIENT_ID || "",
          SFMC_CLIENT_SECRET: process.env.SFMC_CLIENT_SECRET || "",
          SFMC_MID: process.env.SFMC_MID || "",
          SFMC_SUBDOMAIN: process.env.SFMC_SUBDOMAIN || "",
          SFMC_CATEGORY_ID: process.env.SFMC_CATEGORY_ID || "",
          SFMC_AUTHORIZED_APPS: process.env.SFMC_AUTHORIZED_APPS || "",
          AZURE_KEY: process.env.AZURE_KEY || "",
          SARAH_ID: process.env.SARAH_ID || "",
          SARAH_APP_ID: process.env.SARAH_APP_ID || "",
          SARAH_AUTHORIZED_TEAMS: process.env.SARAH_AUTHORIZED_TEAMS || "",
          SARAH_TOKEN: process.env.SLACK_USER_TOKEN || "",
          AZURE_DOMAIN: process.env.AZURE_DOMAIN || "",
          DEFAULT_APP_ID: process.env.DEFAULT_APP_ID || "",
          DEFAULT_IMAGE_SIZE: process.env.DEFAULT_IMAGE_SIZE || "",
          loading_image_url: process.env.LOADING_IMAGE_URL || "",
        },
      },
    },

    routes: {
      "POST /event": "functions/slack/event.handler",
      "POST /button": "functions/slack/event.click",
      "POST /write": "functions/slack/write.handler",
      "POST /process": "functions/slack/process.handler",
      "POST /sarah/ask": "functions/slack/content.getGPTAnswer",
      "POST /dalle/generate": "functions/slack/content.getDALLEAnswer",
      "POST /dalle/sfmc/history": "functions/sfmc/sfmc.history",
      "GET /dalle/sfmc/tag-search": "functions/sfmc/sfmc.searchByTag",
      "GET /dalle/history": "functions/slack/content.getDalleHistory",
      "GET /auth": "functions/auth.check",
    },
  });

  api.attachPermissions([inTable, outTable, DALLE_HISTORY, settings, "s3:*"]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    bucketName: bucket.bucketName,
  });
}
