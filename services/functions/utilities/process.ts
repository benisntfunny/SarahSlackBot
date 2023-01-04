/** @format */

import axios from "axios";
import {
  sarahRemover,
  sendMessage,
  sendImageWithButtons,
  replaceImage,
  swapOutIds,
  respondToMessage,
} from "./utilities/slack";
import { dalleS3, GPT } from "./utilities/openai";
import { dalleToMC } from "./utilities/sfmc";
import { success } from "./utilities/responses";
import { ENV, SLACK_ACTION_TYPES } from "./utilities/static";
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
    if (incoming?.type === "message" && incoming.payload) {
      const payload: any = incoming.payload;
      let text = await swapOutIds(addPeriod(sarahRemover(payload.event.text)));

      if (text.trim().indexOf("+") !== 0) {
        const response = await GPT(text);

        await writeToDynamoDB(ENV.outgoingTable, {
          referenceId: payload.event.event_ts,
          time: Date.now(),
          history: [text, response],
        });
        await sendMessage(
          payload.event.channel,
          payload.event.event_ts,
          response
        );
      } else {
        text = text.replace("+", "").trim();
        const response = (
          await dalleS3(
            await swapOutIds(text),
            ENV.default_app_id,
            ENV.default_image_size
          )
        ).url;
        await sendImageWithButtons(
          payload.event.channel,
          payload.event.event_ts,
          text,
          response
        );
      }
    }
    if (incoming?.type === "reply" && incoming.payload) {
      const payload: any = incoming.payload;
      const item: any = await readItemFromDynamoDB(ENV.outgoingTable, {
        referenceId: incoming.referenceId,
      });
      let history: any = item.history;
      const text =
        history.join("\n") +
        "\n\n" +
        (await swapOutIds(addPeriod(sarahRemover(payload.event.text))));

      if (text.length / 1000 >= 4) {
        await sendMessage(payload.event.channel, payload.event.event_ts, "...");
        return;
      } else {
        const response = await GPT(text);
        history.push("\n\n" + addPeriod(sarahRemover(payload.event.text)));
        history.push(response);

        await writeToDynamoDB(ENV.outgoingTable, {
          referenceId: incoming.referenceId,
          history,
        });
        await sendMessage(
          payload.event.channel,
          payload.event.event_ts,
          response
        );
      }
    }
    if (incoming.command === "/write") {
      const text = incoming.text.replace(/@/g, "");
      const response = await GPT(await swapOutIds(text));
      await respondToMessage(
        incoming.response_url,
        `<@${incoming.user_id}>\n${incoming.text}\n<@${sarahId}>${response}`
      );
    }
    if (incoming.command === "/image") {
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
    }
    if (incoming.type === SLACK_ACTION_TYPES.addToSFMC) {
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
      await sendMessage(
        incoming.payload.channel.id,
        incoming.payload.original_message.thread_ts,
        `*Image added to SFMC*\n*Name:* ${image.name}\n\n*URL*: ${
          image.fileProperties.publishedURL
        }${image.tags ? `\n*Tags: ${image.tags.join(", ")}*` : ""}`
      );
    }
    if (incoming.type === SLACK_ACTION_TYPES.noToSFMC) {
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

  return success({});
};
