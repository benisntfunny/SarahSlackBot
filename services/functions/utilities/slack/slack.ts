/** @format */

import axios from "axios";
import {
  ENV,
  SLACK_ACTION_TYPES,
  SLACK_URLS,
  LLM_MODELS,
  IMAGE_MODELS,
} from "../static";
import { settingsBlock, prompt } from "./blocks";
import FormData from "form-data";

// Get the Sarah user token from the environment
const USER_TOKEN = ENV.SARAH_TOKEN;

/**
 * Replace any mention of Sarah's user ID with her name.
 * @param {string} text
 * @return {string} New text without Sarah's user ID
 */
export function sarahRemover(text: string = "") {
  const r1 = new RegExp(`.*${ENV.SARAH_ID.replace("@", "")}>`, "");
  const r2 = new RegExp(`<@${ENV.SARAH_ID}>`, "gi");
  return text.replace(r1, "").trim().replace(r2, "Sarah");
}

/**
 * Replace user IDs in the text with their names.
 * @param {string} text
 * @return {Promise<string>} New text with names instead of user IDs
 */
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

/**
 * Send a message as a response to a specified url.
 * @param {string} url
 * @param {string} text
 */
export async function respondToMessage(url: string, text: string) {
  await axios.post(
    url,
    {
      text,
    },
    { headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Get the text of the selected option from the settings block.
 * @param {string} optionType
 * @param {string} value
 * @return {string} Option text
 */
function getOptionsTextFromSettings(optionType: string, value: string) {
  switch (optionType) {
    case SLACK_ACTION_TYPES.CHAT_STYLE_PRESET:
      return settingsBlock[4]?.accessory?.options?.find((option) => {
        return option.value === value;
      })?.text.text;
    case SLACK_ACTION_TYPES.CHAT_MODEL:
      return settingsBlock[2]?.accessory?.options?.find((option) => {
        return option.value === value;
      })?.text.text;
    case SLACK_ACTION_TYPES.IMAGE_MODEL:
      return settingsBlock[3]?.accessory?.options?.find((option) => {
        return option.value === value;
      })?.text.text;
    default:
      return "Unknown";
  }
}

/**
 * Populate the model types  section of the settings block with options.
 * @return {any} Updated settings block
 */
function addInModelTypes() {
  const block: any = settingsBlock;

  for (const [key, value] of Object.entries(LLM_MODELS)) {
    const option = {
      text: {
        type: "plain_text",
        text: LLM_MODELS[key].name,
        emoji: true,
      },
      value: key,
    };
    if (LLM_MODELS[key].inUse) block[2].accessory.options.push(option);
  }
  for (const [key, value] of Object.entries(IMAGE_MODELS)) {
    const option = {
      text: {
        type: "plain_text",
        text: IMAGE_MODELS[key].name,
        emoji: true,
      },
      value: key,
    };
    block[3].accessory.options.push(option);
  }
  return block;
}

/**
 * Apply user-selected options to the settings block.
 * @param {any} options
 * @return {any[]} Updated settings block
 */
function applySettingsBlock(options: any = undefined) {
  let block: any[] = addInModelTypes() || [];
  if (!options) return block;
  else {
    let text;
    //Set default values of prompts, chatStyle, override
    if (options[SLACK_ACTION_TYPES.INITIAL_PROMPT]) {
      text = getOptionsTextFromSettings(
        SLACK_ACTION_TYPES.INITIAL_PROMPT,
        options[SLACK_ACTION_TYPES.INITIAL_PROMPT]
      );
      block[0].element["initial_option"] = {
        text: {
          type: "plain_text",
          text,
          emoji: true,
        },
        value: options[SLACK_ACTION_TYPES.INITIAL_PROMPT],
      };
    }
    if (options[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET]) {
      text = getOptionsTextFromSettings(
        SLACK_ACTION_TYPES.CHAT_STYLE_PRESET,
        options[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET]
      );
      block[4].accessory["initial_option"] = {
        text: {
          type: "plain_text",
          text,
          emoji: true,
        },
        value: options[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET],
      };
    }
    if (options[SLACK_ACTION_TYPES.CHAT_MODEL]) {
      text = getOptionsTextFromSettings(
        SLACK_ACTION_TYPES.CHAT_MODEL,
        options[SLACK_ACTION_TYPES.CHAT_MODEL]
      );
      block[2].accessory["initial_option"] = {
        text: {
          type: "plain_text",
          text,
          emoji: true,
        },
        value: options[SLACK_ACTION_TYPES.CHAT_MODEL],
      };
    }
    if (options[SLACK_ACTION_TYPES.IMAGE_MODEL]) {
      text = getOptionsTextFromSettings(
        SLACK_ACTION_TYPES.IMAGE_MODEL,
        options[SLACK_ACTION_TYPES.IMAGE_MODEL]
      );
      block[3].accessory["initial_option"] = {
        text: {
          type: "plain_text",
          text,
          emoji: true,
        },
        value: options[SLACK_ACTION_TYPES.IMAGE_MODEL],
      };
    }
    if (options[SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE]) {
      text = options[SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE];

      block[7].element["initial_value"] = text;
    }
  }
  return block;
}

/**
 * Send a message with a specified text to a specified Slack channel.
 * @param {string} channel
 * @param {string} text
 */
export async function postToChannel(channel: string, text: string) {
  await axios.post(
    SLACK_URLS.POST_MESSAGE,
    { text, channel, mrkdwn: true },
    {
      headers: {
        Authorization: `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}

/**
 * Send the prompt block to a specified Slack channel with a specified thread timestamp.
 * @param {string} channel
 * @param {string} thread_ts
 * @param {any} options
 */
export async function sendPromptBlock(
  channel: string,
  thread_ts: string,
  options: any = undefined
) {
  let blocks = prompt.blocks;
  if (options && options[SLACK_ACTION_TYPES.NO_SETTINGS_REMINDER]?.length > 0) {
    blocks = blocks.slice(0, 2);
  }
  await axios.post(
    SLACK_URLS.POST_MESSAGE,
    {
      channel,
      thread_ts,
      blocks,
    },
    {
      headers: {
        Authorization: `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}

/**
 * Send the settings block as a response to a specified url.
 * @param {string} url
 * @param {any} options
 */
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

export async function fileUpload(
  channels: string[] = [],
  filename: string,
  file: any
) {
  const form = new FormData();
  form.append("token", USER_TOKEN);
  form.append("channels", channels[0]);
  form.append("file", file, {
    filename,
    contentType: "application/octet-stream",
  });
  form.append("filename", filename);

  const response = await axios.post(
    `https://slack.com/api/files.upload`,
    form,
    {
      headers: form.getHeaders(),
    }
  );
  return response;
}

/**
 * Send the settings block as an ephemeral message to specified user and channel.
 * @param {string} channel
 * @param {string} user
 * @param {any} options
 */
export async function sendSettingsEpherealBlock(
  channel: string,
  user: string,
  options: any = undefined
) {
  let blocks = applySettingsBlock(options);
  await axios.post(
    "https://slack.com/api/chat.postEphemeral",
    {
      channel,
      user,
      blocks,
    },
    {
      headers: {
        Authorization: `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Send a message to a specified channel and thread in Slack.
 * @param {string} channel
 * @param {string} thread
 * @param {string} text
 */
export async function sendMessage(
  channel: string,
  thread: string,
  text: string = "",
  model: string = ""
) {
  let payload: any = {
    channel: channel,
    thread_ts: thread,
    blocks: [
      {
        type: "section",

        text: {
          type: "mrkdwn",
          text: text,
        },
      },
    ],
  };
  if (model) {
    payload.blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `_${model}_`,
        },
      ],
    });
  }
  await axios.post(SLACK_URLS.POST_MESSAGE, payload, {
    headers: {
      Authorization: `Bearer ${USER_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Send a block to a specified channel and thread in Slack.
 * @param {string} channel
 * @param {string} thread_ts
 * @param {any} blocks
 */
export async function sendBlock(
  channel: string,
  thread_ts: string,
  blocks: any = {}
) {
  let body: any = {
    channel,
    thread_ts,
    blocks,
  };
  const response = await axios.post(SLACK_URLS.POST_MESSAGE, body, {
    headers: {
      Authorization: `Bearer ${USER_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Get the real name of a Slack user based on their user ID.
 * @param {string} userId
 * @return {Promise<string>} Real name of the user
 */
export async function userLookup(userId: string = "") {
  const ax = await axios.get(`${SLACK_URLS.GET_USER}${userId}`, {
    headers: {
      Authorization: `Bearer ${USER_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
  return ax.data?.user?.real_name ?? "Name";
}

/**
 * Send an image as a message to a specified channel and thread in Slack.
 * @param {string} channel
 * @param {string} thread
 * @param {string} text
 * @param {string} url
 */
export async function sendImage(
  channel: string,
  thread: string,
  text: string = "",
  url: string = ""
) {
  await axios.post(
    SLACK_URLS.POST_MESSAGE,
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
        Authorization: `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}

/**
 * Replace an existing message in Slack with a new message with specified text.
 * @param {string} channel
 * @param {string} thread
 * @param {string} text
 */
export async function replaceMessage(
  channel: string = "",
  thread: string = "",
  text: string = "",
  blocks
) {
  const res = await axios.post(
    SLACK_URLS.UPDATE,
    {
      channel: channel,
      ts: thread,
      text,
      blocks,
    },
    {
      headers: {
        Authorization: `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}

/**
 * Replace an existing image message in Slack with a new image message.
 * @param {string} channel
 * @param {string} thread
 * @param {string} text
 * @param {string} url
 */
export async function replaceImage(
  channel: string,
  thread: string,
  text: string = "",
  url: string = ""
) {
  await axios.post(
    SLACK_URLS.UPDATE,
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
        Authorization: `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}
/**
 * Get a Slack chat thread by specified channel and message timestamp.
 * @param {string} channel
 * @param {string} ts
 * @return {Promise<any>} Slack chat thread
 */
export async function getChatThread(channel: string, ts: string) {
  const ax = await axios.get(
    `${SLACK_URLS.GET_CHAT_THREAD}?channel=${channel}&ts=${ts}`,
    {
      headers: {
        Authorization: `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
  return ax.data;
}

/**
 * Send an image with buttons to a specified channel and thread in Slack.
 * @param {string} channel
 * @param {string} thread
 * @param {string} text
 * @param {string} url
 */
export async function sendImageWithButtons(
  channel: string,
  thread: string,
  text: string = "",
  url: string = ""
) {
  await axios.post(
    SLACK_URLS.POST_MESSAGE,
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
              name: SLACK_ACTION_TYPES.ADD_TO_SFMC,
              text: "Yes",
              type: "button",
              style: "primary",
              value: SLACK_ACTION_TYPES.ADD_TO_SFMC,
            },
            {
              name: SLACK_ACTION_TYPES.NO_TO_SFMC,
              text: "No",
              type: "button",
              style: "danger",
              value: SLACK_ACTION_TYPES.NO_TO_SFMC,
            },
          ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}
