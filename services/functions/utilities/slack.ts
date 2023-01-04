/** @format */

import axios from "axios";
import { ENV, SLACK_ACTION_TYPES, SLACK_URLS } from "./static";

const userToken = ENV.sarah_token;
export function sarahRemover(text: string = "") {
  const r1 = new RegExp(`.*${ENV.sarah_id.replace("@", "")}>`, "");
  const r2 = new RegExp(`<@${ENV.sarah_id}>`, "gi");
  return text.replace(r1, "").trim().replace(r2, "Sarah");
}
export async function swapOutIds(text: string = "") {
  const matches = text.match(/<@[a-zA-Z0-9_]*>/gi) ?? [];
  for (let x = 0; x < matches.length; x++) {
    const match = matches[x];
    const name = await userLookup(
      match.replace("<", "").replace(">", "").replace("@", "")
    );
    const regex = RegExp(match);
    text = text.replace(regex, name);
  }
  return text;
}
export async function respondToMessage(url: string, text: string) {
  await axios.post(
    url,
    {
      text,
    },
    { headers: { "Content-Type": "application/json" } }
  );
}
export async function sendMessage(
  channel: string,
  thread: string,
  text: string = ""
) {
  await axios.post(
    SLACK_URLS.postMessage,
    {
      channel: channel,
      thread_ts: thread,
      text: text,
    },
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}
export async function userLookup(userId: string = "") {
  const ax = await axios.get(`${SLACK_URLS.getUser}${userId}`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
  return ax.data?.user?.real_name ?? "Name";
}

export async function sendImage(
  channel: string,
  thread: string,
  text: string = "",
  url: string = ""
) {
  await axios.post(
    SLACK_URLS.postMessage,
    {
      channel: channel,
      thread_ts: thread,
      attachments: [
        {
          fallback: text,
          text: text,
          image_url: url,
          thumb_url: url,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}
export async function replaceImage(
  channel: string,
  thread: string,
  text: string = "",
  url: string = ""
) {
  await axios.post(
    SLACK_URLS.update,
    {
      channel: channel,
      ts: thread,
      attachments: [
        {
          fallback: text,
          text: text,
          image_url: url,
          thumb_url: url,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}
export async function sendImageWithButtons(
  channel: string,
  thread: string,
  text: string = "",
  url: string = ""
) {
  await axios.post(
    SLACK_URLS.postMessage,
    {
      channel: channel,
      thread_ts: thread,
      attachments: [
        {
          fallback: text,
          text: text,
          image_url: url,
          thumb_url: url,
        },
        {
          text: "Add to Salesforce Marketing Cloud?",
          attachment_type: "default",
          fallback: "Can't add to sfmc at this time",
          callback_id: "dalle_tosfmc",
          color: "#3AA3E3",
          actions: [
            {
              name: "AddToSFMC",
              text: "Yes",
              type: "button",
              style: "success",
              value: SLACK_ACTION_TYPES.addToSFMC,
            },
            {
              name: "NoToSFMC",
              text: "No",
              type: "button",
              style: "danger",
              value: SLACK_ACTION_TYPES.noToSFMC,
            },
          ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}
