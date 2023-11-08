import axios from "axios";
import { DEEP_INFRA_URLS, ENV } from "./static";
import { imageUrlToS3 } from "./aws";

export function convertLlamaChat(messages: any = []) {
  let messageString = "";
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (i === 0) {
      messageString =
        messageString +
        `[INST] <<SYS>> 
        ${message.content}<<SYS>>\n`;
    } else if (i === 1) {
      messageString = messageString + `${message.content} [/INST]`;
    } else if (message.role === "user") {
      messageString =
        messageString +
        `
      [INST] ${message.content}[/INST]`;
    } else if (message.role === "assistant") {
      messageString = messageString + ` ${message.content}`;
      if (i + 1 === messages.length || messages[i + 1].role === "user")
        messageString = messageString + "<s></s>";
    }
  }
  return messageString;
}

export async function deepChat(messages: any = [], model: string) {
  if (model.indexOf("Llama") > -1) {
    messages = convertLlamaChat(messages);
    return await llama2(messages, model);
  }
}

async function callDeepInfra(data: any, model) {
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${DEEP_INFRA_URLS.V1}/${model}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.DEEP_INFRA_API_KEY}`,
    },
    data,
  };

  return await axios.request(config);
}

export async function deepFusion(prompt, model, appId) {
  let data = JSON.stringify({
    input: {
      prompt,
      height: 512,
      width: 512,
    },
  });
  const response = await callDeepInfra(data, model);
  const uploadDetails = await imageUrlToS3(
    response?.data?.output[0],
    appId,
    prompt
  );
  return { ...uploadDetails };
}

async function llama2(messages: string, model) {
  let data = JSON.stringify({
    input: messages,
  });
  const response = await callDeepInfra(data, model);
  return response?.data?.results[0]?.generated_text?.trim();
}
