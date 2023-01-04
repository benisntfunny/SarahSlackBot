/** @format */

import * as AWS from "aws-sdk";
import axios from "axios";
import { DynamoDB } from "aws-sdk";
import { createRandomFileName } from "./generate";
import { ENV } from "./static";

const dynamoDB = new AWS.DynamoDB();
const dynamoDb = new DynamoDB.DocumentClient();
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

export async function dallUrlToS3(url: string, appId: string, query: string) {
  if (!appId) return;
  //get the image from the url
  const imageRes = await axios.get(url, {
    responseType: "arraybuffer",
  });
  //get the current date
  let now: any = new Date();
  //convert date into a string
  now = now.getMonth() + 1 + "-" + now.getDate() + "-" + now.getFullYear();
  //create a random number for the image name combined with date
  const imageName = createRandomFileName(now, "png");
  //upload the image to s3
  const params: any = {
    Bucket: ENV.content,
    Key: `image-store/${appId}/${imageName}`,
    Body: Buffer.from(imageRes.data, "base64"),
    ContentType: "image/png",
  };
  await s3.putObject(params).promise();
  //set the URL for the image
  const s3Url = `${ENV.contentURL}${appId}/${imageName}`;
  //save the image URL to dynamoDB
  const writeParams = {
    appId: appId,
    requestDate: Date.now(),
    url: s3Url,
    query: query,
  };
  writeToDynamoDB(ENV.dalleHistory, writeParams);
  //return the image URL
  return writeParams;
}
export function getNewRecord(Records: any) {
  return Records.map((record: any) =>
    AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage)
  );
}
export async function queryDalleHistory(appId: string, count: Number) {
  const statement = `SELECT url, requestDate, query
                     FROM "${ENV.dalleHistory}" 
                     WHERE "appId" = '${appId}'
                     ORDER BY "requestDate" DESC`;

  let results: any = await dynamoDB
    .executeStatement({ Statement: statement })
    .promise();

  results = results.Items?.map((item: any) => {
    return AWS.DynamoDB.Converter.unmarshall(item);
  });
  return results.slice(0, count);
}
export async function writeToDynamoDB(TableName: string, Item: any) {
  let params: any = {
    TableName,
    Item,
  };
  await dynamoDb.put(params).promise();
  return params.Item;
}
export async function readItemFromDynamoDB(TableName: string, Key: any) {
  let params: any = {
    TableName,
    Key,
  };
  let result = await dynamoDb.get(params).promise();
  return result.Item;
}
