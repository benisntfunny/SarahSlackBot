/** @format */

// Import the necessary modules and libraries
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { dalle } from "../utilities/openai";
import { queryDalleHistory } from "../utilities/aws";
import { isAuthorized } from "../utilities/auth";
import {
  badRequest,
  success,
  successPlain,
  unauthorized,
} from "../utilities/responses";
import { OPENAI_MODELS } from "../utilities/static";

/**
 * getGPTAnswer
 * @description Returns an answer from GPT-3
 * @param event: any
 * @returns http response
 */
/*
export const getGPTAnswer: APIGatewayProxyHandlerV2 = async (event: any) => {
  // Check if the request is authorized
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }

  // Parse the request body and extract the text parameter
  const body = JSON.parse(event.body ?? {});
  const text = body.text;

  // Return a bad request if the text parameter is not provided
  if (!text) {
    return badRequest({ error: "Missing text" });
  }

  // Get the response from GPT-3
  let response = await GPT3(text, OPENAI_MODELS.GPT3.model);

  // Remove the leading newline character if present in the response
  response =
    response.indexOf("\n") === 0 ? response.replace("\n", "") : response;

  // Return the GPT-3 response
  return success({ response });
};
*/

/**
 * getDALLEAnswer
 * @description Returns an image from DALL-E
 * @param event: any
 * @returns http response
 */
export const getDALLEAnswer: APIGatewayProxyHandlerV2 = async (event: any) => {
  // Check if the request is authorized
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }

  // Parse the request body and extract the text and appId parameters
  const body = JSON.parse(event.body ?? {});
  const { text, appId } = body;

  // Return a bad request if the text or appId parameter is not provided
  if (!text || !appId) {
    return badRequest({ error: "Missing text or appId" });
  }

  // Get the DALL-E generated image
  const data = await dalle(text, appId);

  // Return the DALL-E image
  return success({ data });
};

/**
 * getDalleHistory
 * @description Returns the history of DALL-E images
 * @param event: any
 * @returns http response
 */
export const getDalleHistory: APIGatewayProxyHandlerV2 = async (event: any) => {
  // Check if the request is authorized
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }

  // Get the appId from the query string parameters
  const appId = event.queryStringParameters?.appId;

  // Return a bad request if the appId parameter is not provided
  if (!appId) {
    return badRequest({ error: "Missing appId" });
  }

  // Get the DALL-E history
  const history: any = await queryDalleHistory(appId, 100);

  // Check again if the request is authorized
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }

  // Return the DALL-E history
  return success(history);
};
