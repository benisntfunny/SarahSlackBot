/** @format */

import { Configuration, OpenAIApi } from "openai";
import axios from "axios";
import { dallUrlToS3 } from "./aws";
import { dalleToMC } from "./sfmc";
import { ENV, OPENAPI_URLS } from "./static";

export async function GPT(text: string): Promise<any> {
  const configuration = new Configuration({
    apiKey: ENV.openAPIKey,
  });
  const openai = new OpenAIApi(configuration);

  const response: any = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: text,
    temperature: 0.7,
    max_tokens: 400,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  return response.data.choices[0].text.replace("\n\n", "\n");
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
