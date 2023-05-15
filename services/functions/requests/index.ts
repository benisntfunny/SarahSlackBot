/** @format */

import {
  getNewRecord,
  readItemFromDynamoDB,
  writeToDynamoDB,
} from "functions/utilities/aws";
import { getJSONBody } from "functions/utilities/events";
import { addToArrayAndLimitSize, hashKey } from "functions/utilities/generate";
import { chatGPT } from "functions/utilities/openai";
import { success } from "functions/utilities/responses";
import { APPS, ENV, REQUEST_ACTIONS } from "functions/utilities/static";

export const incoming = async (event: any) => {
  const body = getJSONBody(event);
  const { data, appId, sessionId } = body;
  let action;
  let payload;

  const referenceId = hashKey();
  if (
    appId?.toLowerCase()?.trim() === APPS.SUBJECTLINE?.toLowerCase()?.trim()
  ) {
    payload = data;
    action = REQUEST_ACTIONS.GENERATE_SUBJECTLINES;
  }

  if (action) {
    await writeToDynamoDB(ENV.REQUESTS_TABLE, {
      referenceId,
      appId,
      action,
      data: payload,
      sessionId: sessionId ?? "",
    });
    return success({ requestId: referenceId });
  }
};

export const request = async (event: any) => {
  console.log("incoming event", getNewRecord(event.Records)[0]);
  const record = getNewRecord(event.Records)[0];
  let { sessionId, user, referenceId, appId, data, action } = record;
  if (
    appId === APPS.PSCHAT &&
    action === REQUEST_ACTIONS.INITIATE_CONVERSATION
  ) {
    const response = await chatGPT(data);

    let dbUser = await readItemFromDynamoDB(ENV.USER_TABLE, { id: user.id });

    if (dbUser) {
      dbUser.history = dbUser.history || [];
      addToArrayAndLimitSize(dbUser.history, sessionId, 10);
      await writeToDynamoDB(ENV.USER_TABLE, dbUser);
    }
    data.push({ role: "assistant", content: response });
    await writeToDynamoDB(ENV.SESSSION_TABLE, {
      sessionId,
      userId: user.id,
      appId,
      history: data,
      lastReferenceId: referenceId,
    });

    await writeToDynamoDB(ENV.USER_SESSION_TABLE, {
      userId: user.id,
      date: new Date().getTime(),
      sessionId,
    });

    await writeToDynamoDB(ENV.RESPONSES_TABLE, {
      referenceId,
      appId,
      sessionId,
      data: response,
    });
  }

  if (appId === APPS.SUBJECTLINE) {
    await setTimeout(() => {
      writeToDynamoDB(ENV.RESPONSES_TABLE, {
        referenceId: record.referenceId,
        appId: record.appId,
        data: [
          {
            sl: "Subject Line 1",
            score: 0.5,
          },
          {
            sl: "Subject Line 2",
            score: 0.45,
          },
          {
            sl: "Subject Line 3",
            score: 0.44,
          },
          {
            sl: "Subject Line 4",
            score: 0.42,
          },
          {
            sl: "Subject Line 5",
            score: 0.3,
          },
          {
            sl: "Subject Line 6",
            score: 0.29,
          },
          {
            sl: "Subject Line 7",
            score: 0.28,
          },
          {
            sl: "Subject Line 8",
            score: 0.24,
          },
          {
            sl: "Subject Line 9",
            score: 0.2,
          },
          {
            sl: "Subject Line 10",
            score: 0.14,
          },
        ],
      }).then(() => {});
    }, 10000);
  }
};

export const response = async (event: any) => {
  const { appId, requestId } = event.queryStringParameters;
  const results = await readItemFromDynamoDB(ENV.RESPONSES_TABLE, {
    referenceId: requestId,
    appId,
  });
  if (results) {
    return success({ ...results, ready: true });
  }
  return success({ data: "NO DATA", ready: false });
};
