/** @format */

import { Configuration, OpenAIApi } from "openai";
import axios from "axios";
import { dallUrlToS3 } from "./aws";
import { dalleToMC } from "./sfmc";
import { ENV, OPENAPI_URLS, SLACK_ACTION_TYPES } from "./static";

export async function GPT3(text: string, model: string): Promise<any> {
  const configuration = new Configuration({
    apiKey: ENV.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const response: any = await openai.createCompletion({
    model,
    prompt: text,
    temperature: 0.7,
    max_tokens: 400,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  return response.data.choices[0].text.replace("\n\n", "\n");
}

export async function chatGPT(messages: any, model: string): Promise<any> {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
      },
    }
  );
  return response.data.choices[0].message.content;
}
export function buildSettingsText(settings: any) {
  if (settings) {
    if (settings[SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE]) {
      return `${settings[SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE]}`;
    } else if (
      settings[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET] &&
      settings[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET] !== "default"
    ) {
      switch (settings[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET]) {
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
            SLACK_ACTION_TYPES.CHAT_STYLE_PRESET
          ].replace(/_/g, " ")}.`;
      }
    }
  }

  return "";
}

export async function dalle(
  text: string,
  appId: string,
  size: string = ENV.DEFAULT_IMAGE_SIZE
): Promise<any> {
  const data = JSON.stringify({
    prompt: text,
    n: 1,
    size,
  });

  var config = {
    method: "post",
    url: OPENAPI_URLS.IMAGE_GENERATION,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
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
  prompt: string,
  appId: string,
  size: string = "1024x1024"
): Promise<any> {
  const data = JSON.stringify({
    prompt,
    n: 1,
    size,
  });
  var config = {
    method: "post",
    url: OPENAPI_URLS.IMAGE_GENERATION,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
    },
    data: data,
  };
  const response = await axios(config);

  const url = response?.data?.data[0]?.url;

  const uploadDetails = await dallUrlToS3(url, appId, prompt);
  //const uploadDetails = await dalleToMC(url, text);
  return uploadDetails;
}
