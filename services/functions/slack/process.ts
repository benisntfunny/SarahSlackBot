/** @format */

import axios from "axios";
import {
  sarahRemover,
  sendMessage,
  sendImageWithButtons,
  replaceImage,
  swapOutIds,
  respondToMessage,
  sendBlock,
  sendSettingsBlock,
  userLookup,
} from "../utilities/slack/slack";
import { dalleS3, GPT3, chatGPT, buildSettingsText } from "../utilities/openai";
import { dalleToMC } from "../utilities/sfmc";
import { successPlain } from "../utilities/responses";
import {
  ENV,
  GPTStyles,
  SETTINGS_TYPES,
  SLACK_ACTION_TYPES,
  SLACK_COMMANDS,
  SLACK_TYPES,
} from "../utilities/static";
import { addPeriod } from "../utilities/text";
import {
  getNewRecord,
  readItemFromDynamoDB,
  writeToDynamoDB,
} from "../utilities/aws";
import { ProcessingActions } from "./processingActions";
const sarahId = ENV.SARAH_ID.replace("@", "");

export const handler = async (event: any) => {
  try {
    const { Records } = event;
    const newImages: any = getNewRecord(Records);
    const incoming = newImages[0];
    const payload = incoming?.payload || {};
    // Check if we are looking at a message or a reply
    if (
      incoming?.type === SLACK_TYPES.NEW_MESSAGE ||
      payload.type === SLACK_TYPES.NEW_MESSAGE_SKIP_PROMPT
    ) {
      const pa = new ProcessingActions(payload);
      await pa.newMessage(payload.type === SLACK_TYPES.NEW_MESSAGE_SKIP_PROMPT);
    } else if (payload.type === SLACK_TYPES.NEW_IMAGE_SKIP_PROMPT) {
      const pa = new ProcessingActions(payload);
      console.log("payload", payload);
      await pa.newImage();
    } else if (incoming?.type === SLACK_TYPES.REPLY && payload) {
      const pa = new ProcessingActions(payload, incoming);
      await pa.replyMessage();
    } else if (incoming.command === SLACK_COMMANDS.WRITE) {
      let text = await swapOutIds(
        addPeriod(sarahRemover(incoming.text.replace(/@/g, "")))
      );
      const settings =
        (await readItemFromDynamoDB(ENV.SETTINGS, {
          clientId: incoming.user_id,
          type: SETTINGS_TYPES.BOT_SETTINGS,
        })) || {};
      const model = settings[SLACK_ACTION_TYPES.CHAT_MODEL]
        ? GPTStyles[settings[SLACK_ACTION_TYPES.CHAT_MODEL]].model
        : GPTStyles.CHAT_GPT.model;
      const userName = await userLookup(incoming.user_id);
      const settingsText = await buildSettingsText(settings);
      const instruction = `${settingsText}. My name is ${userName}. You, the assistant, is named Sarah. Do not mention or allude to being an AI Model`;
      const response = await chatGPT(
        [
          {
            role: "system",
            content: instruction,
          },
          { role: "user", content: text },
        ],
        model
      );
      await respondToMessage(
        incoming.response_url,
        `<@${incoming.user_id}>\n\n${incoming.text}\n<@${sarahId}>${response}`
      );
    } else if (incoming.command === SLACK_COMMANDS.IMAGE) {
      const text = incoming.text.replace(/@/g, "");

      const response = (
        await dalleS3(
          await swapOutIds(text),
          ENV.DEFAULT_APP_ID,
          ENV.DEFAULT_IMAGE_SIZE
        )
      ).url;
      await axios.post(
        incoming.response_url,
        {
          attachments: [
            {
              fallback: incoming.text,
              text: incoming.text,
              image_url: response,
              thumb_url: response,
            },
          ],
        },
        { headers: { "Content-Type": "application/json" } }
      );
    } else if (incoming.command === "/settings") {
      const userSettings = await readItemFromDynamoDB(ENV.SETTINGS, {
        clientId: incoming.user_id,
        type: SETTINGS_TYPES.BOT_SETTINGS,
      });
      await sendSettingsBlock(incoming.response_url, userSettings);
      //sendBlock(incoming.response_url, );
    } else if (incoming.type === SLACK_ACTION_TYPES.ADD_TO_SFMC) {
      const image: any = await dalleToMC(
        incoming.payload.original_message.attachments[0].image_url,
        incoming.payload.original_message.attachments[0].text.replace(
          /\+/gi,
          " "
        )
      );
      await replaceImage(
        incoming.payload.channel.id,
        incoming.payload.message_ts,
        incoming.payload.original_message.text,
        incoming.payload.original_message.attachments[0].image_url
      );
      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Image added to SFMC",
          },
        },
        {
          type: "divider",
        },
        {
          type: "section",
          accessory: {
            type: "image",
            image_url:
              incoming.payload.original_message.attachments[0].image_url,
            alt_text: `${image.name}`,
          },
          text: {
            type: "mrkdwn",
            text: `:abc:: ${image.name}\n\n:globe_with_meridians:: ${
              image.fileProperties.publishedURL
            }${image.tags ? `\n:label:: ${image.tags.join(", ")}` : ""}`,
          },
        },
      ];
      await sendBlock(
        incoming.payload.channel.id,
        incoming.payload.original_message.thread_ts,
        blocks
      );
    } else if (incoming.type === SLACK_ACTION_TYPES.NO_TO_SFMC) {
      await replaceImage(
        incoming.payload.channel.id,
        incoming.payload.message_ts,
        incoming.payload.original_message.text,
        incoming.payload.original_message.attachments[0].image_url
      );
      await sendMessage(
        incoming.payload.channel.id,
        incoming.payload.original_message.thread_ts,
        `*Image not added to SFMC*`
      );
    }
  } catch (err) {
    console.error(err);
  }

  return successPlain();
};
