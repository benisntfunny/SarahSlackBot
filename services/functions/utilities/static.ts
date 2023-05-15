/** @format */

// Define an object with key-value pairs for different setting types
export const SETTINGS_TYPES: { [key: string]: string } = {
  BOT_SETTINGS: "botSettings",
};
export const APPS: { [key: string]: string } = {
  SLACK: "slack",
  PSCHAT: "pschat",
  SARAHBLOCK: "sarahblock",
  CODEAI: "codeai",
  SUBJECTLINE: "subjectline",
};
// Define an object with key-value pairs for different slack event types
export const SLACK_TYPES: { [key: string]: string } = {
  MESSAGE: "message",
  REPLY: "reply",
  IM: "im",
  APP_MENTION: "app_mention",
  NEW_MESSAGE: "new_message",
  NOTHING: "nothing",
  IMAGE: "IMAGE",
  NEW_MESSAGE_SKIP_PROMPT: "new_message_skip_prompt",
  NEW_IMAGE_SKIP_PROMPT: "new_image_skip_prompt",
};

// Define an object with key-value pairs for different slack command types
export const SLACK_COMMANDS: { [key: string]: string } = {
  WRITE: "/write",
  IMAGE: "/image",
  MERGE: "/merge",
};

// Define an object with key-value pairs for different HTTPS response codes
export const HTTPS_CODES: { [key: string]: number } = {
  SUCCESS: 200,
  FAILURE: 500,
  AUTHORIZED: 401,
  BAD_REQUEST: 400,
};

// Define an object with key-value pairs for different SFMC (Salesforce Marketing Cloud) API URLs
export const SFMC_URLS: { [key: string]: string } = {
  AUTH: `https://${process.env.SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token`,
  TAGS: "/hub/v1/objects/media/tags/",
  ASSETS: "/asset/v1/content/assets",
  BASE: `https://${process.env.SFMC_SUBDOMAIN}.rest.marketingcloudapis.com`,
};

// Define an object with key-value pairs for different authorized URL origins
export const AUTH_URLS: { [key: string]: string } = {
  LOCAL_1: "https://local.dev:4200",
  LOCAL_2: "http://localhost:4200",
};

// Define an object with key-value pairs for different slack API URLs
export const SLACK_URLS: { [key: string]: string } = {
  POST_MESSAGE: "https://slack.com/api/chat.postMessage",
  UPDATE: "https://slack.com/api/chat.update",
  GET_USER: "https://slack.com/api/users.info?user=",
  GET_CHAT_THREAD: "https://slack.com/api/conversations.replies",
};

// Define an object with key-value pairs for different GPT styles
export const OPENAI_MODELS: any = {
  GPT4: {
    name: "GPT4",
    model: "gpt-4",
  },
  CHAT_GPT: {
    name: "ChatGPT",
    model: "gpt-3.5-turbo",
  },
  GPT3: {
    name: "GPT3",
    model: "text-davinci-003",
  },
};
export const FILE_ACTIONS: any = {
  SLACK_MERGE: "slack-merge",
};
// Define an object with key-value pairs for different slack action types
export const SLACK_ACTION_TYPES: { [key: string]: string } = {
  ADD_TO_SFMC: "AddToSFMC",
  NO_TO_SFMC: "NoToSFMC",
  SARAH_IMAGE: "SarahImage",
  SARAH_TEXT: "SarahText",
  CHAT_STYLE_PRESET: "chat_style_preset",
  CHAT_STYLE_OVERRIDE: "chat_style_overrides",
  INITIAL_PROMPT: "sarah_prompt_preference",
  CHAT_MODEL: "sarah_chat_model",
  NO_SETTINGS_REMINDER: "no_settings_reminder",
  NO_SETTINGS_TOGGLE: "no_settings_toggle",
  CLOSE_SETTINGS: "sarah_settings_done",
  NEW_CHAT_SETTINGS: "sarah_new_chat_settings",
  OPEN_SETTINGS: "sarah_open_settings",
  START_CHAT: "sarah_start_chat",
  CREATE_IMAGE: "sarah_create_image",
};

// Define an object with key-value pairs for different OpenAI API URLs
export const OPENAPI_URLS: { [key: string]: string } = {
  IMAGE_GENERATION: "https://api.openai.com/v1/images/generations",
  COMPLETITION: "https://api.openai.com/v1/chat/completions",
};

// Define an object with key-value pairs for different environment variables
export const ENV: { [key: string]: string } = {
  INCOMING_TABLE: process.env.inTable || "",
  OUTGOING_TABLE: process.env.OUTGOING_TABLE || "",
  DALLE_HISTORY: process.env.DALLE_HISTORY || "",
  SETTINGS: process.env.settings || "",
  USER_TABLE: process.env.USER_TABLE || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  CONTENT: process.env.content || "",
  SFMC_CLIENT_ID: process.env.SFMC_CLIENT_ID || "",
  SFMC_CLIENT_SECRET: process.env.SFMC_CLIENT_SECRET || "",
  SFMC_MID: process.env.SFMC_MID || "",
  SFMC_SUBDOMAIN: process.env.SFMC_SUBDOMAIN || "",
  SFMC_CATEGORY_ID: process.env.SFMC_CATEGORY_ID || "",
  SFMC_AUTHORIZED_APPS: process.env.SFMC_AUTHORIZED_APPS || "",
  AZURE_KEY: process.env.AZURE_KEY || "",
  SARAH_ID: process.env.SARAH_ID || "",
  SARAH_TOKEN: process.env.SARAH_TOKEN || "",
  AZURE_DOMAIN: process.env.AZURE_DOMAIN || "",
  CONTENT_URL: `https://s3.amazonaws.com/${process.env.content}/image-store/`,
  AZURE_URL: `https://${process.env.AZURE_DOMAIN}.cognitiveservices.azure.com/vision/v3.2/analyze?visualFeatures=Categories,Color,Objects`,
  SARAH_APP_ID: process.env.SARAH_APP_ID || "",
  SARAH_AUTHORIZED_TEAMS: process.env.SARAH_AUTHORIZED_TEAMS || "",
  DEFAULT_IMAGE_SIZE: process.env.DEFAULT_IMAGE_SIZE || "512x512",
  DEFAULT_APP_ID: process.env.DEFAULT_APP_ID || "SARAH-APP",
  PROXY_PASSWORD: process.env.PROXY_PASSWORD || "",
  REQUESTS_TABLE: process.env.requestTable || "",
  RESPONSES_TABLE: process.env.responseTable || "",
  SESSSION_TABLE: process.env.SESSION_TABLE || "",
  USER_SESSION_TABLE: process.env.USER_SESSION_TABLE || "",
};
export const REQUEST_ACTIONS: any = {
  INITIATE_CONVERSATION: "initiate_conversation",
  GENERATE_SUBJECTLINES: "generate_subjectlines",
};
// Define an object with key-value pairs for different Salesforce Marketing Cloud (SFMC) media types
export const SFMC_MEDIA_TYPES: any = {
  // Long list of various media types, such as:
  // ai: { id: 16 },
  // psd: { id: 17 },
  // ...
};
