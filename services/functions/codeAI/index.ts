/** @format */

import { readItemFromDynamoDB, writeToDynamoDB } from "functions/utilities/aws";
import { getJSONBody } from "functions/utilities/events";
import { success } from "functions/utilities/responses";
import { ENV, REQUEST_ACTIONS } from "functions/utilities/static";

export async function main(event: any) {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "hello world" }),
  };
}

export async function getUser(event: any) {
  const userId = event.queryStringParameters?.id;
  const email = event.queryStringParameters?.email ?? "";
  const phone = event.queryStringParameters?.phone ?? "";
  let user: any = await readItemFromDynamoDB(ENV.USER_TABLE, { id: userId });
  if (user && user.email === email && user.phone === phone) {
  } else {
    user = await writeToDynamoDB(ENV.USER_TABLE, { id: userId, email, phone });
  }
  return {
    statusCode: 200,
    body: JSON.stringify(user || {}),
  };
}
export async function updateUser(event: any) {
  const { user }: any = getJSONBody(event);
  let dbUser: any = await readItemFromDynamoDB(ENV.USER_TABLE, { id: user.id });
  dbUser = { ...dbUser, ...user };
  await writeToDynamoDB(ENV.USER_TABLE, dbUser);

  return success({ user: dbUser });
}
