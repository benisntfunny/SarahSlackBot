/** @format */
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { isAuthorized } from "./utilities/auth";
import { readItemFromDynamoDB, writeToDynamoDB } from "./utilities/aws";
import { getJSONBody } from "./utilities/events";
import { success, successPlain, unauthorized } from "./utilities/responses";
import { sendImage } from "./utilities/slack";
import { ENV, SLACK_ACTION_TYPES, SLACK_TYPES } from "./utilities/static";
import { convertBufferToJSON } from "./utilities/text";

const sarahId = ENV.sarah_id?.replace("@", "");

async function writeEvent(referenceId: string, type: string, payload: any) {
  return await writeToDynamoDB(ENV.incomingTable, {
    referenceId,
    time: Date.now(),
    type,
    payload,
    nextTable: ENV.outgoingTable,
  });
}
/**
 * Looks for new messages and replies and writes them to DynamoDB
 * @param event
 * @returns
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  const body = getJSONBody(event);
  const messageType = eventType(event);
  if (messageType === SLACK_TYPES.new_message) {
    await writeEvent(
      body.event.thread_ts ?? body.event.event_ts,
      SLACK_TYPES.new_message,
      body
    );
  } else if (messageType === SLACK_TYPES.reply) {
    const item = await readItemFromDynamoDB(ENV.incomingTable, {
      referenceId: body?.event?.thread_ts,
    });
    if (JSON.stringify(item) !== "{}") {
      await writeEvent(body.event.thread_ts, SLACK_TYPES.reply, body);
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
    return action.value === SLACK_ACTION_TYPES.addToSFMC;
  });
}
function isItNotAddAction(actions: any) {
  return actions.find(
    (action: any) => action.value === SLACK_ACTION_TYPES.noToSFMC
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
  if (
    isItAddAction(json.actions ?? []) ||
    isItNotAddAction(json.actions ?? [])
  ) {
    await writeToDynamoDB(ENV.incomingTable, {
      referenceId: json.original_message.ts,
      time: Date.now(),
      type: isItAddAction(json.actions ?? [])
        ? SLACK_ACTION_TYPES.addToSFMC
        : SLACK_ACTION_TYPES.noToSFMC,
      payload: json,
      nextTable: ENV.outgoingTable,
    });
    //See if a user is updating their settings
  } else if (
    [
      SLACK_ACTION_TYPES.chatStylePreset,
      SLACK_ACTION_TYPES.chatStyleOverride,
      SLACK_ACTION_TYPES.initialPrompt,
    ].includes(json.actions[0].action_id)
  ) {
    // Get the user's existing settings if any
    const userSettings = await readItemFromDynamoDB(ENV.settings, {
      clientId: json.user.id,
      type: "botSettings",
    });
    // Create a new record to insert
    let insertRecord: any = {
      clientId: json.user.id,
      type: "botSettings",
    };
    // If there are existing settings, add them to the new record
    if (userSettings) {
      insertRecord = { ...userSettings };
    }
    // Add the new setting to the record if it's an array item
    if (SLACK_ACTION_TYPES.chatStyleOverride !== json.actions[0].action_id) {
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
    await writeToDynamoDB(ENV.settings, insertRecord);
  } else if (json.actions[0].action_id === SLACK_ACTION_TYPES.closeSettings) {
    return success({
      response_type: "ephemeral",
      text: "",
      replace_original: true,
      delete_original: true,
    });
  }
  return successPlain("");
}
export function eventType(event: any) {
  const body = getJSONBody(event);

  if (
    (body?.event?.type === SLACK_TYPES.app_mention &&
      body?.event?.user !== sarahId) ||
    (body.event?.channel_type == SLACK_TYPES.im &&
      body?.event?.type === SLACK_TYPES.message &&
      body?.event?.text.indexOf(sarahId) > -1 &&
      !body.event?.thread_ts)
  ) {
    return SLACK_TYPES.new_message;
  } else if (
    body?.event?.type === SLACK_TYPES.message &&
    !body?.event?.subtype &&
    body?.event?.user !== sarahId &&
    body?.event?.thread_ts
  ) {
    return SLACK_TYPES.reply;
  }
}
