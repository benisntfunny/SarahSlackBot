/** @format */

import { Api, StackContext, Table, Bucket, Topic } from "sst/constructs";

export function APIStack({ stack }: StackContext) {
  stack.setDefaultFunctionProps({
    timeout: 300,
    memorySize: 512,
  });
  const bucket = new Bucket(stack, "Storage", {
    cors: [
      {
        allowedMethods: ["GET"],
        allowedOrigins: ["*"],
      },
    ],
  });
  bucket.attachPermissions(["s3"]);

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

  let environment: any = {
    OUTGOING_TABLE: outTable.tableName,
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
    SFMC_AUTHORIZED_APPS: process.env.SFMC_AUTHORIZED_APPS || "",
    SARAH_TOKEN: process.env.SLACK_USER_TOKEN || "",
    SARAH_APP_ID: process.env.SLACK_APP_ID || "",
    SARAH_AUTHORIZED_TEAMS: process.env.SARAH_AUTHORIZED_TEAMS || "",
    AZURE_DOMAIN: process.env.AZURE_DOMAIN || "",
    DEFAULT_APP_ID: process.env.DEFAULT_APP_ID || "",
    DEFAULT_IMAGE_SIZE: process.env.DEFAULT_IMAGE_SIZE || "",
    WHATSAPP_PASSWORD: process.env.WHATSAPP_PASSWORD || "",
    WHATSAPP_USERNAME: process.env.WHATSAPP_USERNAME || "",
    AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE: "1",
    SLACK_API_ID: process.env.SLACK_API_ID || "",
    ADMIN_ARN: process.env.ADMIN_ARN || "",
    BARD_API_KEY: process.env.BARD_API_KEY || "",
    DEEP_INFRA_API_KEY: process.env.DEEP_INFRA_API_KEY || "",
  };
  const fileTopic = new Topic(stack, "fileTopic", {
    defaults: {
      function: {
        timeout: 600,
        permissions: [
          outTable,
          "s3:*",
          settings,
          "textract:*",
          "sns:*",
          "dynamodb:*",
        ],
        environment,
      },
    },
    subscribers: {
      subscriber1: "services/functions/files/index.handler",
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
          handler: "services/functions/slack/process.handler",
          timeout: 300,
          environment,
          permissions: [
            outTable,
            "s3:*",
            settings,
            "textract:*",
            "sns:*",
            "dynamodb:*",
          ],
        },
      },
    },
  });
  environment = {
    ...environment,
    inTable: inTable.tableName,
    FILE_TOPIC: fileTopic.topicArn,
  };
  let apiConfig: any = {
    defaults: {
      authorizer: "iam",
      function: {
        timeout: 300,
        environment,
      },
    },

    routes: {
      "POST /event": {
        function: "services/functions/slack/event.handler",
        authorizer: "none",
      },
      "POST /button": {
        function: "services/functions/slack/event.click",
        authorizer: "none",
      },
      "POST /write": {
        function: "services/functions/slack/write.handler",
        authorizer: "none",
      },
      "POST /process": {
        function: "services/functions/slack/process.handler",
        authorizer: "none",
      },
      "POST /sarah/ask": {
        function: "services/functions/slack/content.getGPTAnswer",
        authorizer: "none",
      },
      "GET /auth": {
        function: "services/functions/auth.check",
        authorizer: "none",
      },
    },
  };

  if (process.env.DOMAIN_NAME && process.env.HOSTED_ZONE) {
    apiConfig.customDomain = {
      domainName: process.env.DOMAIN_NAME,
      hostedZone: process.env.HOSTED_ZONE,
    };
  }
  const api = new Api(stack, "Api", apiConfig);

  api.attachPermissions([
    inTable,
    outTable,
    settings,
    "s3:*",
    "textract:*",
    "sns:*",
    "dynamodb:*",
  ]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    bucketName: bucket.bucketName,
  });
}
