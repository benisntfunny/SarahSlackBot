/** @format */

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GPT, dalle } from "./utilities/openai";
import { queryDalleHistory } from "./utilities/aws";
import { isAuthorized } from "./utilities/auth";
import {
  badRequest,
  success,
  successPlain,
  unauthorized,
} from "./utilities/responses";

/**
 * getGPTAnswer
 * @description Returns an answer from GPT-3
 * @param event: any
 * @returns http response
 */
export const getGPTAnswer: APIGatewayProxyHandlerV2 = async (event: any) => {
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  const body = JSON.parse(event.body ?? {});
  const text = body.text;
  if (!text) {
    return badRequest({ error: "Missing text" });
  }
  let response = await GPT(text);
  response =
    response.indexOf("\n") === 0 ? response.replace("\n", "") : response;
  return success({ response });
};
/**
 * getDALLEAnswer
 * @description Returns an image from DALL-E
 * @param event: any
 * @returns https response
 */
export const getDALLEAnswer: APIGatewayProxyHandlerV2 = async (event: any) => {
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  const body = JSON.parse(event.body ?? {});
  const { text, appId } = body;
  if (!text || !appId) {
    return badRequest({ error: "Missing text or appId" });
  }
  const data = await dalle(text, appId);
  return success({ data });
};
/**
 * getDalleHistory
 * @description Returns the history of DALL-E images
 * @param event: any
 * @returns http response
 */
export const getDalleHistory: APIGatewayProxyHandlerV2 = async (event: any) => {
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  const appId = event.queryStringParameters?.appId;
  if (!appId) {
    return badRequest({ error: "Missing appId" });
  }

  const history: any = await queryDalleHistory(appId, 100);
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  return success(history);
};
