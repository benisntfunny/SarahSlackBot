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
} from "./utilities/slack";
import { dalleS3, GPT, buildSettingsText } from "./utilities/openai";
import { dalleToMC } from "./utilities/sfmc";
import { successPlain } from "./utilities/responses";
import { ENV, SLACK_ACTION_TYPES, SLACK_TYPES } from "./utilities/static";
import { addPeriod } from "./utilities/text";
import {
  getNewRecord,
  readItemFromDynamoDB,
  writeToDynamoDB,
} from "./utilities/aws";
const sarahId = ENV.sarah_id.replace("@", "");

export const handler = async (event: any) => {
  try {
    const { Records } = event;
    const newImages: any = getNewRecord(Records);
    const incoming = newImages[0];
    // Check if we are looking at a message or a reply
    if (incoming?.type === SLACK_TYPES.new_message && incoming.payload) {
      const payload: any = incoming.payload;
      let text = await swapOutIds(addPeriod(sarahRemover(payload.event.text)));
      const settings = await readItemFromDynamoDB(ENV.settings, {
        clientId: payload.event.user,
        type: "botSettings",
      });
      const userName = await userLookup(payload.event.user);
      const settingsText = await buildSettingsText(settings);
      const instruction = `${settingsText}. My name is ${userName}. You, the assistant, is named Sarah. Do not mention or allude to being an AI Model`;

      if (text.trim().indexOf("+") !== 0) {
        const response = await GPT([
          {
            role: "system",
            content: instruction,
          },
          { role: "user", content: text },
        ]);

        await writeToDynamoDB(ENV.outgoingTable, {
          referenceId: payload.event.event_ts,
          time: Date.now(),
          history: [
            {
              role: "system",
              content: instruction,
            },
            { role: "user", content: text },
            { role: "assistant", content: response },
          ],
        });
        await sendMessage(
          payload.event.channel,
          payload.event.event_ts,
          response
        );
      } else {
        text = text.replace("+", "").trim();
        // get the image from dalle
        const response = (
          await dalleS3(
            await swapOutIds(text),
            ENV.default_app_id,
            ENV.default_image_size
          )
        ).url;
        // send the image to slack
        await sendImageWithButtons(
          payload.event.channel,
          payload.event.event_ts,
          text,
          response
        );
      }
    } else if (incoming?.type === SLACK_TYPES.reply && incoming.payload) {
      const payload: any = incoming.payload;
      const item: any = await readItemFromDynamoDB(ENV.outgoingTable, {
        referenceId: incoming.referenceId,
      });
      let history: any = item.history;
      const text = await swapOutIds(
        addPeriod(sarahRemover(payload.event.text))
      );

      history.push({ role: "user", content: text });

      /*if (text.length / 1000 >= 4) {
        await sendMessage(payload.event.channel, payload.event.event_ts, "...");
        return;
      } else {
        */
      const response = await GPT(history);
      history.push({ role: "assistant", content: response });

      await writeToDynamoDB(ENV.outgoingTable, {
        referenceId: incoming.referenceId,
        history,
      });
      await sendMessage(
        payload.event.channel,
        payload.event.event_ts,
        response
      );
    } else if (incoming.command === "/write") {
      let text = await swapOutIds(
        addPeriod(sarahRemover(incoming.text.replace(/@/g, "")))
      );
      const settings = await readItemFromDynamoDB(ENV.settings, {
        clientId: incoming.user_id,
        type: "botSettings",
      });

      const userName = await userLookup(incoming.user_id);
      const settingsText = await buildSettingsText(settings);
      const instruction = `${settingsText}. My name is ${userName}. You, the assistant, is named Sarah. Do not mention or allude to being an AI Model`;

      const response = await GPT([
        {
          role: "system",
          content: instruction,
        },
        { role: "user", content: text },
      ]);
      await respondToMessage(
        incoming.response_url,
        `<@${incoming.user_id}>\n\n${incoming.text}\n<@${sarahId}>${response}`
      );
    } else if (incoming.command === "/image") {
      const text = incoming.text.replace(/@/g, "");

      const response = (
        await dalleS3(
          await swapOutIds(text),
          ENV.default_app_id,
          ENV.default_image_size
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
      const userSettings = await readItemFromDynamoDB(ENV.settings, {
        clientId: incoming.user_id,
        type: "botSettings",
      });
      await sendSettingsBlock(incoming.response_url, userSettings);
      //sendBlock(incoming.response_url, );
    } else if (incoming.type === SLACK_ACTION_TYPES.addToSFMC) {
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
      console.log(JSON.stringify(blocks));
      await sendBlock(
        incoming.payload.channel.id,
        incoming.payload.original_message.thread_ts,
        blocks
      );
    } else if (incoming.type === SLACK_ACTION_TYPES.noToSFMC) {
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
