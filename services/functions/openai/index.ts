/** @format */

import { readItemFromDynamoDB, writeToDynamoDB } from "functions/utilities/aws";
import { getJSONBody } from "functions/utilities/events";
import { addToArrayAndLimitSize, hashKey } from "functions/utilities/generate";
import { failure, success } from "functions/utilities/responses";
import {
  ENV,
  OPENAI_MODELS,
  REQUEST_ACTIONS,
} from "functions/utilities/static";

export const proxy = async (event: any) => {
  console.log("event", event);
  const body = getJSONBody(event);
  const { data, appId, sessionId, user, action } = body;
  //test
  //test
  if (!data || !appId || !sessionId || !user) {
    failure({ error: "Missing data, appId, user, or sessionId" });
  }
  const referenceId = hashKey();
  if (action === REQUEST_ACTIONS.INITIATE_CONVERSATION) {
    const system = `You are an assistant named Sarah. It is required to have all responses in JSON format so it can be parsed programmatically. Here is the schema to follow. All table type information should be || delimited format. Use Markdown to format any text and syntax highlighting for code.
  [
    {"type": "text",
     "content": "this is for any text to display on the screen such as a response or information to be provided"
    },
    {
      "type": "code",
      "language": "language such as javascript or python",
      "content": "code to be displayed on the screen"
    },
    {
      "type":"table",
      "content": "table data || delimited" 
    }
  ]
  example response must follow this format
  [
    {"type":"text","content":"Here's a great table for you to look at"},
    {"type":"table", "content":"column1||column2||column3||column4||column5\ndata1||data2||data3||data4||data5"},
    {"type":"text", "content": "Here's some code for you to look at"},
    {"type":"code","language":"javascript", "content": "console.log('hello world')"},
  ]
  `;
    let messages = [
      { role: "system", content: system },
      { role: "user", content: body.data },
    ];

    await writeToDynamoDB(ENV.REQUESTS_TABLE, {
      referenceId,
      appId,
      action,
      data: messages,
      sessionId,
      user,
    });
  }
  //const response = await chatGPT(messages, OPENAI_MODELS.CHAT_GPT.model);

  //console.log({ data: response });

  return success({ requestId: referenceId });
};
