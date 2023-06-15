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
import {
  APPS,
  ENV,
  OPENAI_MODELS,
  REQUEST_ACTIONS,
} from "functions/utilities/static";

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
  //console.log("incoming event", getNewRecord(event.Records)[0]);
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
    const request = [
      {
        role: "user",
        content: `I have to generate subject lines based on this JSON instruction set ${JSON.stringify(
          record.data
        )}\n\n Respond back with only subject lines and other accompanying description of text. Have the subect lines return back in a JSON array of strings. Example ["subject line 1", "subject line 2", "and so on"]
        
        Here is the defintions for each property in the JSON structure for the request:
        - tone: The tone of the subject line
        - avoidPunctuation: when true do not use any punctuation in the subject line
        - exampleSubject: A user provided subject line that fits the overall messaging that other subject lines should loosely reference to generate new subject lines
        - numberToGenerate: total subject lines that should be created
        - topic: The explanation of what we are trying to speak to with these subject lines
        - industry: the industry that these subject lines most closely align to
        - optionalEmoji: when true the subject line can and, for at least some, use emojis
        - maxLength: The subject line should not exceed this length
        `,
      },
    ];
    //console.log(request);
    const response = JSON.parse(
      await chatGPT(request, OPENAI_MODELS.GPT4.model)
    );
    //console.log(JSON.parse(response), JSON.parse(response).length);
    /*
    let response = [
      "New Pants with Built-in Diapers - Say Goodbye to Bathroom Trips!",
      "Experience the Convenience of Diaper Pants for Men!",
      "Revolutionary Pants for Men: No More Bathroom Breaks!",
      "Stay Comfortable and Dry All Day Long with Our Diaper Pants!",
      "Say Hello to the Future of Men's Pants - Built-in Diapers!",
      "Introducing the Ultimate Solution to Bathroom Breaks - Diaper Pants for Men!",
      "No More Embarrassing Accidents with Our Diaper Pants for Men!",
      "Keep Your Confidence High with Diaper Pants for Men!",
      "Effortlessly Manage Incontinence with Our Men's Diaper Pants!",
      "Introducing a Game-Changer for Men - Pants with Built-in Diapers!",
      "Eliminate Bathroom Trips with Our Innovative Men's Pants!",
      "Stay Comfortable and Confident with Our Diaper Pants for Men!",
      "Experience the Comfort and Convenience of Diaper Pants for Men!",
      "End the Worry of Accidents with Our Diaper Pants for Men!",
      "Discover the Ultimate Comfort with Our Pants featuring Built-in Diapers!",
      "Say Goodbye to Embarrassment and Hello to Confidence with Our Diaper Pants!",
      "Smart, Durable, and Convenient - Our Diaper Pants for Men!",
    ];
    */

    let orderedResponse = response.map((item: string, index: number) => {
      return { sl: item, score: (index + 1) * Math.random() * 0.05 };
    });
    orderedResponse.sort(function (a: any, b: any) {
      return b.score - a.score;
    });
    console.log({
      referenceId,
      appId,
      sessionId,
      data: orderedResponse,
    });
    await writeToDynamoDB(ENV.RESPONSES_TABLE, {
      referenceId,
      appId,
      sessionId,
      data: orderedResponse,
    });
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
