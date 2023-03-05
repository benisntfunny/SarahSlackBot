/** @format */

import { Configuration, OpenAIApi } from "openai";
import axios from "axios";
import { dallUrlToS3 } from "./aws";
import { dalleToMC } from "./sfmc";
import { ENV, OPENAPI_URLS, SLACK_ACTION_TYPES } from "./static";

export async function GPT(messages: any): Promise<any> {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.openAPIKey}`,
      },
    }
  );
  return response.data.choices[0].message.content;
}
export function buildSettingsText(settings: any) {
  console.log("settings", settings);
  if (settings) {
    console.log(settings);
    if (settings[SLACK_ACTION_TYPES.chatStyleOverride]) {
      return `${settings[SLACK_ACTION_TYPES.chatStyleOverride]}`;
    } else if (
      settings[SLACK_ACTION_TYPES.chatStylePreset] &&
      settings[SLACK_ACTION_TYPES.chatStylePreset] !== "default"
    ) {
      switch (settings[SLACK_ACTION_TYPES.chatStylePreset]) {
        case "sarcasm":
          return "Be extremely sarcastic and snarky in all responses but still answer any request";
        case "rhymes":
          return "Rhyme all responses as much as possible";
        case "overly_excited":
          return "All responses should be hyper excited";
        case "liar":
          return "Attempt to obviously lie in all responses";
        case "happy":
          return "All responses should be extremely optmistic and happy";
        default:
          //this isn't ideal it means the preset in the menu hasn't be handled here yet.
          return `When you are talking be very ${settings[
            SLACK_ACTION_TYPES.chatStylePreset
          ].replace(/_/g, " ")}.`;
      }
    }
  }

  return "";
}

export async function dalle(
  text: string,
  appId: string,
  size: string = ENV.default_image_size
): Promise<any> {
  const data = JSON.stringify({
    prompt: text,
    n: 1,
    size,
  });

  var config = {
    method: "post",
    url: OPENAPI_URLS.imageGeneration,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.openAPIKey}`,
    },
    data: data,
  };

  const response = await axios(config);
  const url = response?.data?.data[0]?.url;

  //const uploadDetails = await dallUrlToS3(url, appId, text);
  const uploadDetails = await dalleToMC(url, text);
  return uploadDetails;
}

export async function dalleS3(
  text: string,
  appId: string,
  size: string = "1024x1024"
): Promise<any> {
  const data = JSON.stringify({
    prompt: text,
    n: 1,
    size,
  });
  var config = {
    method: "post",
    url: OPENAPI_URLS.imageGeneration,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.openAPIKey}`,
    },
    data: data,
  };
  const response = await axios(config);

  const url = response?.data?.data[0]?.url;

  const uploadDetails = await dallUrlToS3(url, appId, text);
  //const uploadDetails = await dalleToMC(url, text);
  return uploadDetails;
}
