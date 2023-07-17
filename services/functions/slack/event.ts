/** @format */
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { UserMessage } from "functions/models/UserMessage";
import { isAuthorized } from "../utilities/auth";
import { readItemFromDynamoDB, writeToDynamoDB } from "../utilities/aws";
import { getJSONBody } from "../utilities/events";
import { success, successPlain, unauthorized } from "../utilities/responses";
import {
  getChatThread,
  sendImage,
  sendSettingsBlock,
  sendSettingsEpherealBlock,
} from "../utilities/slack/slack";
import {
  ENV,
  SETTINGS_TYPES,
  SLACK_ACTION_TYPES,
  SLACK_TYPES,
} from "../utilities/static";
import { convertBufferToJSON } from "../utilities/text";

const SARAH_ID = ENV.SARAH_ID?.replace("@", "");

// Function to write events into DynamoDB
async function writeEvent(referenceId: string, type: string, payload: any) {
  return await writeToDynamoDB(ENV.INCOMING_TABLE, {
    referenceId,
    time: Date.now(),
    type,
    payload,
    nextTable: ENV.OUTGOING_TABLE,
  });
}

// Helper function to retrieve settings (currently empty)
async function getSettings(clientId: string) {}

// Handler function for processing new messages and replies
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  const body = getJSONBody(event);
  const messageType = eventType(event);
  // Write new messages to DynamoDB
  if (messageType === SLACK_TYPES.NEW_MESSAGE) {
    await writeEvent(
      body.event.thread_ts ?? body.event.event_ts,
      SLACK_TYPES.NEW_MESSAGE,
      body
    );
    // Write replies to DynamoDB
  } else if (messageType === SLACK_TYPES.REPLY) {
    const item = await readItemFromDynamoDB(ENV.INCOMING_TABLE, {
      referenceId: body?.event?.thread_ts,
    });
    if (JSON.stringify(item) !== "{}") {
      await writeEvent(body.event.thread_ts, SLACK_TYPES.REPLY, body);
    } else {
      console.log("Didn't find item", item);
    }
  } else {
    console.log(
      "Not processing",
      body?.event?.type,
      body?.event?.subtype,
      body?.event?.user,
      body?.event?.thread_ts,
      body.event?.channel_type
    );
  }
  return success({ challenge: body.challenge });
};

// Helper functions to detect add and not-add actions
function isItAddAction(actions: any) {
  return actions.find((action: any) => {
    return action.value === SLACK_ACTION_TYPES.ADD_TO_SFMC;
  });
}
function isItNotAddAction(actions: any) {
  return actions.find(
    (action: any) => action.value === SLACK_ACTION_TYPES.NO_TO_SFMC
  );
}

// Responds to a Slack action
export async function click(event: any) {
  const body = event?.body;
  let json = convertBufferToJSON(body);
  // Write add or not-add actions to DynamoDB
  if (
    isItAddAction(json.actions ?? []) ||
    isItNotAddAction(json.actions ?? [])
  ) {
    await writeToDynamoDB(ENV.INCOMING_TABLE, {
      referenceId: json.original_message.ts,
      time: Date.now(),
      type: isItAddAction(json.actions ?? [])
        ? SLACK_ACTION_TYPES.ADD_TO_SFMC
        : SLACK_ACTION_TYPES.NO_TO_SFMC,
      payload: json,
      nextTable: ENV.OUTGOING_TABLE,
    });
    // Check for user updating their settings
  } else if (
    [SLACK_ACTION_TYPES.OPEN_SETTINGS].includes(json.actions[0].action_id)
  ) {
    const userSettings = await readItemFromDynamoDB(ENV.SETTINGS, {
      clientId: json.user.id,
      type: SETTINGS_TYPES.BOT_SETTINGS,
    });
    await sendSettingsEpherealBlock(
      json.channel.id,
      json.user.id,
      userSettings
    );
    // Handle chat styles and settings update
  } else if (
    [
      SLACK_ACTION_TYPES.CHAT_STYLE_PRESET,
      SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE,
      SLACK_ACTION_TYPES.INITIAL_PROMPT,
      SLACK_ACTION_TYPES.CHAT_MODEL,
    ].includes(json.actions[0].action_id)
  ) {
    const userSettings = await readItemFromDynamoDB(ENV.SETTINGS, {
      clientId: json.user.id,
      type: SETTINGS_TYPES.BOT_SETTINGS,
    });
    let insertRecord: any = {
      clientId: json.user.id,
      type: SETTINGS_TYPES.BOT_SETTINGS,
    };
    if (userSettings) {
      insertRecord = { ...userSettings };
    }
    if (SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE !== json.actions[0].action_id) {
      insertRecord[json.actions[0].action_id] =
        json.actions[0].selected_option.value;
    } else {
      if (json.actions[0].value) {
        insertRecord[json.actions[0].action_id] = json.actions[0].value.replace(
          /\+/g,
          " "
        );
      } else delete insertRecord[json.actions[0].action_id];
    }
    await writeToDynamoDB(ENV.SETTINGS, insertRecord);
  } else if (json.actions[0].action_id === SLACK_ACTION_TYPES.CLOSE_SETTINGS) {
    return success({
      response_type: "ephemeral",
      text: "",
      replace_original: true,
      delete_original: true,
    });
    // Handle start chat or create image actions
  } else if (
    json.actions[0].value === SLACK_ACTION_TYPES.START_CHAT ||
    json.actions[0].value === SLACK_ACTION_TYPES.CREATE_IMAGE
  ) {
    const message: UserMessage = new UserMessage(
      json,
      json.actions[0].value === SLACK_ACTION_TYPES.START_CHAT
        ? SLACK_TYPES.NEW_MESSAGE_SKIP_PROMPT
        : SLACK_TYPES.NEW_IMAGE_SKIP_PROMPT
    );
    const thread = await getChatThread(message.channel, message.thread_ts);
    message.text = thread?.messages?.[0]?.text;
    message.message_ts = thread?.messages?.[1]?.ts;
    await message.cleanseText();
    await writeToDynamoDB(
      ENV.INCOMING_TABLE,
      await writeToDynamoDB(ENV.INCOMING_TABLE, {
        referenceId: message.thread_ts,
        time: Date.now(),
        type:
          json.actions[0].value === SLACK_ACTION_TYPES.START_CHAT
            ? SLACK_TYPES.NEW_MESSAGE_SKIP_PROMPT
            : SLACK_TYPES.NEW_IMAGE_SKIP_PROMPT,
        payload: message,
        nextTable: ENV.OUTGOING_TABLE,
      })
    );
    return successPlain("Working...");
  }
  return successPlain("");
}

// Function to determine the event type
export function eventType(event: any) {
  const body = getJSONBody(event);

  // Determine if event type is a new message
  if (
    (body?.event?.type === SLACK_TYPES.APP_MENTION &&
      body?.event?.user !== SARAH_ID) ||
    (body.event?.channel_type == SLACK_TYPES.IM &&
      body?.event?.type === SLACK_TYPES.MESSAGE &&
      body?.event?.text.indexOf(SARAH_ID) > -1 &&
      !body.event?.thread_ts)
  ) {
    return SLACK_TYPES.NEW_MESSAGE;
    // Determine if event type is a reply
  } else if (
    body?.event?.type === SLACK_TYPES.MESSAGE &&
    !body?.event?.subtype &&
    body?.event?.user !== SARAH_ID &&
    body?.event?.thread_ts
  ) {
    return SLACK_TYPES.REPLY;
  }
}
