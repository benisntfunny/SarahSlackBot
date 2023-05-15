/** @format */

import { Api, StackContext, Table, Bucket } from "@serverless-stack/resources";

export function APIStack({ stack }: StackContext) {
  stack.setDefaultFunctionProps({
    timeout: 300,
    memorySize: 512,
  });
  const layerArn = "arn:aws:lambda:us-east-1:764866452798:layer:ghostscript:6";
  const bucket = new Bucket(stack, "Storage", {
    cors: [
      {
        allowedMethods: ["GET"],
        allowedOrigins: ["*"],
      },
    ],
  });
  bucket.attachPermissions(["s3"]);

  const USERS_TABLE = new Table(stack, "Users", {
    fields: {
      id: "string",
    },
    primaryIndex: { partitionKey: "id" },
  });
  const CODE_HISTORY = new Table(stack, "CodeHistory", {
    fields: {
      id: "string",
      date: "number",
    },
    primaryIndex: { partitionKey: "id", sortKey: "date" },
  });
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

  const responseTable = new Table(stack, "AppResponses", {
    fields: {
      referenceId: "string",
      appId: "string",
    },
    primaryIndex: { partitionKey: "referenceId", sortKey: "appId" },
  });
  const SESSION_TABLE = new Table(stack, "Session", {
    fields: {
      sessionId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "sessionId", sortKey: "userId" },
  });
  const USER_SESSION_TABLE = new Table(stack, "UserSession", {
    fields: {
      userId: "string",
      date: "number",
    },
    primaryIndex: { partitionKey: "userId", sortKey: "date" },
  });

  let environment: any = {
    OUTGOING_TABLE: outTable.tableName,
    DALLE_HISTORY: DALLE_HISTORY.tableName,
    USER_TABLE: USERS_TABLE.tableName,
    CODE_HISTORY: CODE_HISTORY.tableName,
    SESSION_TABLE: SESSION_TABLE.tableName,
    USER_SESSION_TABLE: USER_SESSION_TABLE.tableName,
    PROXY_PASSWORD: process.env.PROXY_PASSWORD || "",
    settings: settings.tableName,
    responseTable: responseTable.tableName,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    content: bucket.bucketName,
    SFMC_CLIENT_ID: process.env.SFMC_CLIENT_ID || "",
    SFMC_CLIENT_SECRET: process.env.SFMC_CLIENT_SECRET || "",
    SFMC_MID: process.env.SFMC_MID || "",
    SFMC_SUBDOMAIN: process.env.SFMC_SUBDOMAIN || "",
    SFMC_CATEGORY_ID: process.env.SFMC_CATEGORY_ID || "",
    AZURE_KEY: process.env.AZURE_KEY || "",
    SARAH_ID: process.env.SARAH_ID || "",
    SFMC_AUTHORIZED_APPS: process.env.SFMC_AUTHORIZED_APPS || "",
    SARAH_TOKEN: process.env.SLACK_USER_TOKEN || "",
    SARAH_APP_ID: process.env.SARAH_APP_ID || "",
    SARAH_AUTHORIZED_TEAMS: process.env.SARAH_AUTHORIZED_TEAMS || "",
    AZURE_DOMAIN: process.env.AZURE_DOMAIN || "",
    DEFAULT_APP_ID: process.env.DEFAULT_APP_ID || "",
    DEFAULT_IMAGE_SIZE: process.env.DEFAULT_IMAGE_SIZE || "",
  };

  const requestsTable = new Table(stack, "AppRequests", {
    fields: {
      referenceId: "string",
      appId: "string",
    },
    primaryIndex: { partitionKey: "referenceId", sortKey: "appId" },
    stream: true,
    consumers: {
      consumer2: {
        function: {
          handler: "../services/functions/requests/index.request",
          timeout: 300,
          environment,
          permissions: [
            responseTable,
            "s3:*",
            SESSION_TABLE,
            USER_SESSION_TABLE,
            SESSION_TABLE,
            USER_SESSION_TABLE,
            USERS_TABLE,
          ],
        },
      },
    },
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
          timeout: 300,
          environment,
          permissions: [
            outTable,
            "s3:*",
            DALLE_HISTORY,
            settings,
            USERS_TABLE,
            SESSION_TABLE,
            USER_SESSION_TABLE,
            requestsTable,
            responseTable,
          ],
        },
      },
    },
  });
  environment = {
    ...environment,
    requestTable: requestsTable.tableName,
    inTable: inTable.tableName,
  };
  // Create the HTTP API
  const api = new Api(stack, "Api", {
    customDomain: {
      domainName: "sarah.botsco.net",
      hostedZone: "botsco.net",
    },
    defaults: {
      authorizer: "iam",
      function: {
        timeout: 300,
        environment,
        layers: [layerArn],
      },
    },

    routes: {
      "POST /event": {
        function: "functions/slack/event.handler",
        authorizer: "none",
      },
      "POST /button": {
        function: "functions/slack/event.click",
        authorizer: "none",
      },
      "POST /write": {
        function: "functions/slack/write.handler",
        authorizer: "none",
      },
      "POST /process": {
        function: "functions/slack/process.handler",
        authorizer: "none",
      },
      "POST /sarah/ask": {
        function: "functions/slack/content.getGPTAnswer",
        authorizer: "none",
      },
      "POST /dalle/generate": {
        function: "functions/slack/content.getDALLEAnswer",
        authorizer: "none",
      },
      "POST /dalle/sfmc/history": {
        function: "functions/sfmc/sfmc.history",
        authorizer: "none",
      },
      "GET /dalle/sfmc/tag-search": {
        function: "functions/sfmc/sfmc.searchByTag",
        authorizer: "none",
      },
      "GET /dalle/history": {
        function: "functions/slack/content.getDalleHistory",
        authorizer: "none",
      },
      "GET /auth": {
        function: "functions/auth.check",
        authorizer: "none",
      },
      "POST /twilio-hook": {
        function: "functions/twilio/main.hook",
        authorizer: "none",
      },
      "POST /proxy": {
        function: "functions/openai/index.proxy",
      },
      "POST /sfmc/slg": {
        function: "functions/sfmc/sfmc.subjectLineGeneration",
        authorizer: "none",
      },
      "GET /request": {
        function: "functions/requests/index.response",
        authorizer: "none",
      },
      "POST /proceses-response": {
        function: "functions/requests/index.request",
        authorizer: "none",
      },
      "POST /request": {
        function: "functions/requests/index.incoming",
        authorizer: "none",
      },
      "GET /code/test": "functions/codeAI/index.main",
      "GET /apps/user": "functions/codeAI/index.getUser",
      "POST /apps/user": "functions/codeAI/index.updateUser",
      "POST /apps/files": "functions/files/index.handler",
      "GET /apps/files": "functions/files/index.handler",
      "DELETE /apps/files": "functions/files/index.handler",
      "POST /hooks": {
        function: "functions/hooks/index.handler",
        authorizer: "none",
      },
      "POST /files": {
        function: "functions/files/index.handler",
        authorizer: "none",
      },
    },
  });

  api.attachPermissions([
    inTable,
    outTable,
    DALLE_HISTORY,
    USERS_TABLE,
    CODE_HISTORY,
    responseTable,
    requestsTable,
    SESSION_TABLE,
    USER_SESSION_TABLE,
    settings,
    "s3:*",
  ]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    bucketName: bucket.bucketName,
  });
}
