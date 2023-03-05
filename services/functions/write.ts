/** @format */

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { hashKey } from "./utilities/generate";
import { success, successPlain } from "./utilities/responses";
import { writeToDynamoDB } from "./utilities/aws";
import { ENV } from "./utilities/static";

function paramsToObject(entries: any) {
  const result: any = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  let buff = Buffer.from(event.body ?? "", "base64");
  let text = buff.toString("ascii");
  const params: any = paramsToObject(new URLSearchParams(text).entries());
  const key = hashKey();
  await writeToDynamoDB(ENV.incomingTable, {
    referenceId: key,
    time: Date.now(),
    ...params,
    nextTable: ENV.outgoingTable,
  });
  return successPlain();
};
