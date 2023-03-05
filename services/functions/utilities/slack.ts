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
function getOptionsTextFromSettings(optionType: string, value: string) {
  switch (optionType) {
    case SLACK_ACTION_TYPES.initialPrompt:
      return settingsBlock[0]?.element?.options?.find((option) => {
        return option.value === value;
      })?.text.text;
    case SLACK_ACTION_TYPES.chatStylePreset:
      return settingsBlock[4]?.accessory?.options?.find((option) => {
        return option.value === value;
      })?.text.text;
    default:
      return "Unknown";
  }
}
function applySettingsBlock(options: any = undefined) {
  let block: any[] = settingsBlock || [];

  if (!options) return block;
  else {
    let text;
    //Set default values of prompts, chatStyle, override
    if (options[SLACK_ACTION_TYPES.initialPrompt]) {
      text = getOptionsTextFromSettings(
        SLACK_ACTION_TYPES.initialPrompt,
        options[SLACK_ACTION_TYPES.initialPrompt]
      );
      block[0].element["initial_option"] = {
        text: {
          type: "plain_text",
          text,
          emoji: true,
        },
        value: options[SLACK_ACTION_TYPES.initialPrompt],
      };
    }
    if (options[SLACK_ACTION_TYPES.chatStylePreset]) {
      text = getOptionsTextFromSettings(
        SLACK_ACTION_TYPES.chatStylePreset,
        options[SLACK_ACTION_TYPES.chatStylePreset]
      );
      block[4].accessory["initial_option"] = {
        text: {
          type: "plain_text",
          text,
          emoji: true,
        },
        value: options[SLACK_ACTION_TYPES.chatStylePreset],
      };
    }
    if (options[SLACK_ACTION_TYPES.chatStyleOverride]) {
      text = options[SLACK_ACTION_TYPES.chatStyleOverride];

      block[6].element["initial_value"] = text;
    }
  }
  return block;
}

export async function sendSettingsBlock(url: string, options: any = undefined) {
  let blocks = applySettingsBlock(options);
  await axios.post(
    url,
    {
      blocks,
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
export async function sendBlock(
  channel: string,
  thread_ts: string,
  blocks: any = {}
) {
  await axios.post(
    SLACK_URLS.postMessage,
    {
      channel,
      thread_ts,
      blocks,
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

export async function imageOrTextButtons(channel: string, thread: string) {
  await axios.post(
    SLACK_URLS.postMessage,
    {
      channel: channel,
      thread_ts: thread,
      attachments: [
        {
          text: "What do you want to do?",
          attachment_type: "default",
          fallback: "Sorry I'm not working :(",
          callback_id: "sarah_path",
          color: "#3AA3E3",
          actions: [
            {
              name: SLACK_ACTION_TYPES.SarahText,
              text: "Yes",
              type: "button",
              style: "primary",
              value: SLACK_ACTION_TYPES.SarahText,
            },
            {
              name: SLACK_ACTION_TYPES.SarahImage,
              text: "No",
              type: "button",
              style: "primary",
              value: SLACK_ACTION_TYPES.SarahImage,
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
          type: "divider",
        },
        {
          text: "Add to Salesforce Marketing Cloud?",
          attachment_type: "default",
          fallback: "Can't add to sfmc at this time",
          callback_id: "dalle_tosfmc",
          color: "#3AA3E3",
          actions: [
            {
              name: SLACK_ACTION_TYPES.addToSFMC,
              text: "Yes",
              type: "button",
              style: "primary",
              value: SLACK_ACTION_TYPES.addToSFMC,
            },
            {
              name: SLACK_ACTION_TYPES.noToSFMC,
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
export const settingsBlock = [
  {
    type: "input",
    element: {
      type: "radio_buttons",
      options: [
        {
          text: {
            type: "plain_text",
            text: "Prompt for Images or Chat",
            emoji: true,
          },
          value: "prompt",
        },
        {
          text: {
            type: "plain_text",
            text: "Chat Only",
            emoji: true,
          },
          value: "chat_only",
        },
        {
          text: {
            type: "plain_text",
            text: "Images Only",
            emoji: true,
          },
          value: "images_only",
        },
      ],
      action_id: SLACK_ACTION_TYPES.initialPrompt,
    },
    label: {
      type: "plain_text",
      text: "Initial Prompt Options",
      emoji: true,
    },
  },
  {
    type: "divider",
  },
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "Chat Settings",
      emoji: true,
    },
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "These options will take effect on your next chat.",
      },
    ],
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Preset chat style*",
    },
    accessory: {
      type: "static_select",
      placeholder: {
        type: "plain_text",
        text: "Select an item",
        emoji: true,
      },
      options: [
        {
          text: {
            type: "plain_text",
            text: "Default",
            emoji: true,
          },
          value: "default",
        },
        {
          text: {
            type: "plain_text",
            text: "Sarcastic",
            emoji: true,
          },
          value: "sarcasm",
        },
        {
          text: {
            type: "plain_text",
            text: "Rhymes Too Much",
            emoji: true,
          },
          value: "rhymes",
        },
        {
          text: {
            type: "plain_text",
            text: "Overly Excited",
            emoji: true,
          },
          value: "overly_excited",
        },
        {
          text: {
            type: "plain_text",
            text: "Purposely Lie",
            emoji: true,
          },
          value: "liar",
        },
        {
          text: {
            type: "plain_text",
            text: "Very Happy",
            emoji: true,
          },
          value: "happy",
        },
      ],
      action_id: SLACK_ACTION_TYPES.chatStylePreset,
    },
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "*Custom chat style instructions*",
      },
    ],
  },
  {
    dispatch_action: true,
    type: "input",
    element: {
      type: "plain_text_input",
      action_id: "chat_style_overrides",
    },
    label: {
      type: "plain_text",
      text: " ",
      emoji: true,
    },
  },
  /*

  {
    type: "divider",
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Close Settings",
          emoji: true,
        },
        value: "done",
        action_id: SLACK_ACTION_TYPES.closeSettings,
      },
    ],
  },
  */
];
