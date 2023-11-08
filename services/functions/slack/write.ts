/**
 * @format
 */

// Import the necessary packages and modules
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { hashKey } from "../utilities/generate";
import { successPlain } from "../utilities/responses";
import { writeToDynamoDB } from "../utilities/aws";
import { ENV } from "../utilities/static";

// Function to convert URLSearchParams entries to an object
function paramsToObject(entries: any) {
  const result: any = {};
  // Iterate over the entries and store each key-value pair in the result object
  for (const [key, value] of entries) {
    result[key] = value;
  }
  // Return the final result object
  return result;
}

// Main handler for the Lambda function
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Decode the body of the event
  let buff = Buffer.from(event.body ?? "", "base64");
  let text = buff.toString("ascii");

  // Convert the URLSearchParams entries to an object
  const params: any = paramsToObject(new URLSearchParams(text).entries());

  // Generate a hash key for the record
  const key = hashKey();
  // Write the record to the DynamoDB table
  await writeToDynamoDB(ENV.INCOMING_TABLE, {
    referenceId: key,
    time: Date.now(),
    ...params,
    nextTable: ENV.OUTGOING_TABLE,
  });

  // Return a success response
  return successPlain();
};
