/** @format */

import * as AWS from "aws-sdk";
import axios from "axios";
import { DynamoDB } from "aws-sdk";
import { createRandomFileName } from "./generate";
import { ENV } from "./static";
// Initialize AWS services
const dynamoDb = new DynamoDB.DocumentClient();
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

export async function listBucket(Bucket: string, Prefix: string = "") {
  try {
    return await s3.listObjects({ Bucket, Prefix }).promise();
  } catch (err) {
    console.error(err);
  }
}
export async function textExtract(Bucket: string, Name: string) {
  const textract = new AWS.Textract();
  const params: any = {
    Document: {
      S3Object: {
        Bucket,
        Name,
      },
    },
  };
  const response = await textract.detectDocumentText(params).promise();
}
export async function textExtractPDF(Bucket: string, Name: string) {
  const textract = new AWS.Textract();
  const params: any = {
    DocumentLocation: {
      S3Object: {
        Bucket,
        Name,
      },
    },
    OutputConfig: {
      S3Bucket: Bucket,
      S3Prefix: Name + ".SUMMARY",
    },
    NotificationChannel: {
      SNSTopicArn: ENV.FILE_TOPIC,
      RoleArn: ENV.ROLE_ARN,
    },
  };
  const response = await textract.startDocumentTextDetection(params).promise();
}
export async function getFile(Bucket: string, Key: string) {
  return (await s3.getObject({ Bucket, Key }).promise())?.Body;
}
export async function saveFile(Bucket: string, Key: string, Body: any) {
  return await s3.putObject({ Bucket, Key, Body }).promise();
}
export async function deleteFile(Bucket: string, Key: string) {
  return await s3.deleteObject({ Bucket, Key }).promise();
}
/**
 * Function: dallUrlToS3
 * Description: Takes an image URL, retrieves the image,
 * uploads it to S3, and saves the S3 URL to DynamoDB.
 * @param {string} url - Image URL
 * @param {string} appId - The ID of the app
 * @param {string} query - The query associated with the image
 * @return {Promise<object>} - An object containing the image data and its URL
 */
export async function imageUrlToS3(url: string, appId: string, query: string) {
  if (!appId) return;
  // Fetch the image from the URL
  const imageRes = await axios.get(url, {
    responseType: "arraybuffer",
  });
  // Generate a unique name for the image file
  let now: any = new Date();
  now = now.getMonth() + 1 + "-" + now.getDate() + "-" + now.getFullYear();
  const imageName = createRandomFileName(now, "png");
  // Upload the image to S3
  const params: any = {
    Bucket: ENV.CONTENT,
    Key: `image-store/${appId}/${imageName}`,
    Body: Buffer.from(imageRes.data, "base64"),
    ContentType: `image/png`,
  };
  await s3.putObject(params).promise();

  // Set the S3 URL for the image
  const s3Url = `${ENV.CONTENT_URL}${appId}/${imageName}`;

  // Save the image URL to DynamoDB
  const writeParams = {
    appId: appId,
    requestDate: Date.now(),
    url: s3Url,
    query: query,
  };

  // Return the image URL
  return writeParams;
}
export async function slackImageUrlToS3(
  url: string,
  appId: string,
  query: string,
  write: boolean = true
) {
  if (!appId) return;
  // Fetch the image from the URL
  const imageRes = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${ENV.SARAH_TOKEN}`,
    },
  });
  // Generate a unique name for the image file
  let now: any = new Date();
  now = now.getMonth() + 1 + "-" + now.getDate() + "-" + now.getFullYear();
  const imageName = createRandomFileName(now, url.split(".").pop());

  // Upload the image to S3
  const params: any = {
    Bucket: ENV.CONTENT,
    Key: `image-store/${appId}/${imageName}`,
    Body: Buffer.from(imageRes.data, "base64"),
    ContentType: `image/${url.split(".").pop()}`,
  };
  await s3.putObject(params).promise();

  // Set the S3 URL for the image
  const s3Url = `${ENV.CONTENT_URL}${appId}/${imageName}`;

  // Save the image URL to DynamoDB
  const writeParams = {
    appId: appId,
    requestDate: Date.now(),
    url: s3Url,
    query: query,
  };

  // Return the image URL
  return writeParams;
}
/**
 * Function: getNewRecord
 * Description: Unmarshalls DynamoDB records and extracts the NewImage value
 * @param {array} Records - Array containing the DynamoDB records
 * @return {array} - Array containing the unmarshalled NewImage values
 */
export function getNewRecord(Records: any) {
  return Records.map((record: any) =>
    AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage)
  );
}

/**
 * Function: writeToDynamoDB
 * Description: Adds an item to the specified DynamoDB table
 * @param {string} TableName - The DynamoDB table name
 * @param {object} Item - The item to add to the table
 * @return {Promise<object>} - The added item
 */
export async function writeToDynamoDB(TableName: string, Item: any) {
  let params: any = {
    TableName,
    Item,
  };
  await dynamoDb.put(params).promise();
  return params.Item;
}

/**
 * Function: readItemFromDynamoDB
 * Description: Reads an item from the specified DynamoDB table
 * @param {string} TableName - The DynamoDB table name
 * @param {object} Key - The key of the item to read
 * @return {Promise<object>} - The retrieved item
 */
export async function readItemFromDynamoDB(TableName: string, Key: any) {
  let params: any = {
    TableName,
    Key,
  };
  let result = await dynamoDb.get(params).promise();
  return result.Item;
}
