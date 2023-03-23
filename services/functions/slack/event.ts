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

async function writeEvent(referenceId: string, type: string, payload: any) {
  return await writeToDynamoDB(ENV.INCOMING_TABLE, {
    referenceId,
    time: Date.now(),
    type,
    payload,
    nextTable: ENV.OUTGOING_TABLE,
  });
}
/**
 * Looks for new messages and replies and writes them to DynamoDB
 * @param event
 * @returns
 */

async function getSettings(clientId: string) {}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  const body = getJSONBody(event);
  const messageType = eventType(event);
  if (messageType === SLACK_TYPES.NEW_MESSAGE) {
    await writeEvent(
      body.event.thread_ts ?? body.event.event_ts,
      SLACK_TYPES.NEW_MESSAGE,
      body
    );
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
/**
 * Responds to a Slack action
 * @param event
 * @returns
 */
export async function click(event: any) {
  const body = event?.body;
  let json = convertBufferToJSON(body);
  //console.log(json);
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
    //See if a user is updating their settings
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
  } else if (
    [
      SLACK_ACTION_TYPES.CHAT_STYLE_PRESET,
      SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE,
      SLACK_ACTION_TYPES.INITIAL_PROMPT,
      SLACK_ACTION_TYPES.CHAT_MODEL,
    ].includes(json.actions[0].action_id)
  ) {
    // Get the user's existing settings if any
    const userSettings = await readItemFromDynamoDB(ENV.SETTINGS, {
      clientId: json.user.id,
      type: SETTINGS_TYPES.BOT_SETTINGS,
    });
    // Create a new record to insert
    let insertRecord: any = {
      clientId: json.user.id,
      type: SETTINGS_TYPES.BOT_SETTINGS,
    };
    // If there are existing settings, add them to the new record
    if (userSettings) {
      insertRecord = { ...userSettings };
    }
    // Add the new setting to the record if it's an array item
    if (SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE !== json.actions[0].action_id) {
      insertRecord[json.actions[0].action_id] =
        json.actions[0].selected_option.value;
    } else {
      //set the chat style override to the value of the text input
      if (json.actions[0].value) {
        insertRecord[json.actions[0].action_id] = json.actions[0].value.replace(
          /\+/g,
          " "
        );
      } else delete insertRecord[json.actions[0].action_id];
    }
    //insert the new record
    await writeToDynamoDB(ENV.SETTINGS, insertRecord);
  } else if (json.actions[0].action_id === SLACK_ACTION_TYPES.CLOSE_SETTINGS) {
    return success({
      response_type: "ephemeral",
      text: "",
      replace_original: true,
      delete_original: true,
    });
  } else if (
    json.actions[0].action_id === SLACK_ACTION_TYPES.NO_SETTINGS_REMINDER
  ) {
    const userSettings =
      (await readItemFromDynamoDB(ENV.SETTINGS, {
        clientId: json.user.id,
        type: SETTINGS_TYPES.BOT_SETTINGS,
      })) || {};
    // Create a new record to insert
    let insertRecord: any = {
      clientId: json.user.id,
      type: SETTINGS_TYPES.BOT_SETTINGS,
    };
    if (userSettings) {
      insertRecord = { ...userSettings };
    }

    insertRecord[json.actions[0].action_id] = json.actions[0].selected_options;

    await writeToDynamoDB(ENV.SETTINGS, insertRecord);
  } else if (
    json.actions[0].value === SLACK_ACTION_TYPES.START_CHAT ||
    json.actions[0].value === SLACK_ACTION_TYPES.CREATE_IMAGE
  ) {
    console.log(json);
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
    console.log(
      json.actions[0].value === SLACK_ACTION_TYPES.START_CHAT
        ? SLACK_TYPES.NEW_MESSAGE_SKIP_PROMPT
        : SLACK_TYPES.NEW_IMAGE_SKIP_PROMPT
    );

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
export function eventType(event: any) {
  const body = getJSONBody(event);

  if (
    (body?.event?.type === SLACK_TYPES.APP_MENTION &&
      body?.event?.user !== SARAH_ID) ||
    (body.event?.channel_type == SLACK_TYPES.IM &&
      body?.event?.type === SLACK_TYPES.MESSAGE &&
      body?.event?.text.indexOf(SARAH_ID) > -1 &&
      !body.event?.thread_ts)
  ) {
    return SLACK_TYPES.NEW_MESSAGE;
  } else if (
    body?.event?.type === SLACK_TYPES.MESSAGE &&
    !body?.event?.subtype &&
    body?.event?.user !== SARAH_ID &&
    body?.event?.thread_ts
  ) {
    return SLACK_TYPES.REPLY;
  }
}
