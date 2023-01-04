/** @format */
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { isAuthorized } from "./utilities/auth";
import { readItemFromDynamoDB, writeToDynamoDB } from "./utilities/aws";
import { getJSONBody } from "./utilities/events";
import { success, successPlain, unauthorized } from "./utilities/responses";
import { ENV, SLACK_ACTION_TYPES } from "./utilities/static";
import { convertBufferToJSON } from "./utilities/text";

const sarahId = ENV.sarah_id?.replace("@", "");
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  const body = getJSONBody(event);
  if (
    (body?.event?.type === "app_mention" && body?.event?.user !== sarahId) ||
    (body.event?.channel_type == "im" &&
      body?.event?.type === "message" &&
      body?.event?.text.indexOf(sarahId) > -1 &&
      !body.event?.thread_ts)
  ) {
    await writeToDynamoDB(ENV.incomingTable, {
      referenceId: body.event.thread_ts ?? body.event.event_ts,
      time: Date.now(),
      type: body.event.thread_ts ? "reply" : "message",
      payload: body,
      nextTable: ENV.outgoingTable,
    });
  } else if (
    body?.event?.type === "message" &&
    !body?.event?.subtype &&
    body?.event?.user !== sarahId &&
    body?.event?.thread_ts
  ) {
    const item = await readItemFromDynamoDB(ENV.incomingTable, {
      referenceId: body?.event?.thread_ts,
    });
    if (JSON.stringify(item) !== "{}") {
      const params = {
        referenceId: body.event.thread_ts,
        time: Date.now(),
        type: "reply",
        payload: body,
      };
      await writeToDynamoDB(ENV.incomingTable, params);
    } else {
      console.log("Didn't find item", item);
    }
  } else {
    console.log(
      "Event did not hit any conditions",
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
  }

  return successPlain("");
}
