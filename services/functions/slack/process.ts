/** @format */

// Import necessary libraries and utilities
import axios from "axios";
import {
  sarahRemover,
  swapOutIds,
  respondToMessage,
  sendSettingsBlock,
  userLookup,
  replaceMessage,
} from "../utilities/slack/slack";
import { dalleS3, chatGPT, buildSettingsText } from "../utilities/openai";
import { imageToMC } from "../utilities/sfmc";
import { successPlain } from "../utilities/responses";
import {
  ENV,
  LLM_MODELS,
  SETTINGS_TYPES,
  SLACK_ACTION_TYPES,
  SLACK_COMMANDS,
  SLACK_TYPES,
} from "../utilities/static";
import { addPeriod, truncateText } from "../utilities/text";
import { getNewRecord, readItemFromDynamoDB } from "../utilities/aws";
import { ProcessingActions } from "./processingActions";

// Define sarahId by replacing "@" with an empty string
const sarahId = ENV.SARAH_ID.replace("@", "");

// Define the handler function
export const handler = async (event: any) => {
  try {
    // Get the related records from event
    const { Records } = event;

    // Get new images from the retrieved records
    const newImages: any = getNewRecord(Records);

    // Get the first incoming image
    const incoming = newImages[0];

    // Get payload from the incoming image
    const payload = incoming?.payload || {};

    // Process new message, new_image_skip_prompt or reply type events
    if (incoming?.type === SLACK_TYPES.NEW_MESSAGE) {
      const pa = new ProcessingActions(payload);
      await pa.newMessage();
      /*} else if (payload.type === SLACK_TYPES.NEW_IMAGE_SKIP_PROMPT) {
      const pa = new ProcessingActions(payload);
      await pa.newImage();*/
    } else if (incoming?.type === SLACK_TYPES.REPLY && payload) {
      const pa = new ProcessingActions(payload, incoming);
      await pa.replyMessage();
    }

    // Process write command
    else if (incoming.command === SLACK_COMMANDS.WRITE) {
      let text = await swapOutIds(
        addPeriod(sarahRemover(incoming.text.replace(/@/g, "")))
      );
      const settings =
        (await readItemFromDynamoDB(ENV.SETTINGS, {
          clientId: incoming.user_id,
          type: SETTINGS_TYPES.BOT_SETTINGS,
        })) || {};
      const model = settings[SLACK_ACTION_TYPES.CHAT_MODEL]
        ? LLM_MODELS[settings[SLACK_ACTION_TYPES.CHAT_MODEL]].model
        : LLM_MODELS.CHAT_GPT.model;
      const userName = await userLookup(incoming.user_id);
      const settingsText = await buildSettingsText(settings);
      const instruction = `${
        settingsText ? settingsText + ". " : ""
      }My name is ${userName}. You, the assistant, is named Sarah.`;
      const response = await chatGPT(
        [
          {
            role: "system",
            content: instruction,
          },
          {
            role: "user",
            content: text,
          },
        ],
        model,
        [
          {
            name: "generate_image",
            description: "Generates an image when a user requests it",
            parameters: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "The text provided to generate an image from",
                },
              },
              required: ["prompt"],
            },
          },
        ]
      );
      await respondToMessage(
        incoming.response_url,
        `<@${incoming.user_id}>\n\n${incoming.text}\n<@${sarahId}>${response}`
      );
    }
    // Process image command
    else if (incoming.command === SLACK_COMMANDS.IMAGE) {
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
    } else if (incoming.command === SLACK_COMMANDS.MERGE) {
      const urlParts = incoming.response_url.split("/");
      await axios.post(incoming.response_url, {
        text: `Upload your files here:\nhttps://chat.mysarah.net/slack/merge/${incoming.user_id}/${urlParts[4]}/${urlParts[5]}/${urlParts[6]}`,
      });
      return successPlain("Success");
    } else if (incoming.command === SLACK_COMMANDS.SUMMARRY) {
      const urlParts = incoming.response_url.split("/");
      await axios.post(incoming.response_url, {
        text: `Upload your file here:\nhttps://chat.mysarah.net/slack/summarize/${incoming.user_id}/${urlParts[4]}/${urlParts[5]}/${urlParts[6]}`,
      });
      return successPlain("Success");
    }
    // Process "/settings" command
    else if (incoming.command === SLACK_COMMANDS.SETTINGS) {
      const userSettings = await readItemFromDynamoDB(ENV.SETTINGS, {
        clientId: incoming.user_id,
        type: SETTINGS_TYPES.BOT_SETTINGS,
      });
      await sendSettingsBlock(incoming.response_url, userSettings);
    }
    // Process add_to_sfmc action
    else if (incoming.type === SLACK_ACTION_TYPES.SAVE_TO_MC) {
      let tags = [];
      if (incoming.payload.message.blocks.length === 3) {
        tags = incoming.payload.message.blocks[2].text.text
          .replace(/\+/gi, "")
          .replace(/\*/gi, "")
          .split(",")
          .map((str) => str.trim());
      }

      const image: any = await imageToMC(
        incoming.payload.message.blocks[0].image_url,
        truncateText(
          incoming.payload.message.blocks[0].title.text.replace(/\+/gi, " "),
          30
        ),
        tags
      );

      let blocks = incoming.payload.message.blocks;
      blocks[0].title.text = blocks[0].title.text.replace(/\+/gi, " ");
      blocks[1] = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "_Added to Salesforce Marketing Cloud_",
        },
      };
      if (blocks.length === 3) {
        //fix the tags
        blocks[2] = {
          type: "section",
          text: {
            type: "mrkdwn",
            text: blocks[2].text.text
              .replace(/\+/gi, "")
              .split(",")
              .map((str) => str.trim())
              .join(", "),
          },
        };
      }
      await replaceMessage(
        incoming.payload.container.channel_id,
        incoming.payload.container.message_ts,
        "",
        blocks
      );
    }
  } catch (err) {
    console.error(err);
  }

  // Return success response
  return successPlain();
};
