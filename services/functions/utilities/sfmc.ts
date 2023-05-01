/** @format */

import axios from "axios";
import { writeToDynamoDB, readItemFromDynamoDB } from "./aws";
import { azureRecognition } from "./azure";
import { createRandomFileName } from "./generate";
import { ENV, SFMC_MEDIA_TYPES, SFMC_URLS } from "./static";

/**
 * isTokenValid
 * @description Determines if the current auth token is valid or needs to be refreshed
 * @param expires: number
 * @returns boolean
 */
function isTokenValid(expires: number) {
  return expires > new Date().getTime();
}

/**
 * getAssetTypeId
 * @description Returns the asset type id for the given type
 * @param type: string
 * @returns number | undefined
 */
function getAssetTypeId(type: string) {
  return SFMC_MEDIA_TYPES[type]?.id;
}

/**
 * buildTagsFromAnalysis
 * @description Builds an array of tags from the analysis
 * @param analysis: any
 * @returns string[]
 */
function buildTagsFromAnalysis(analysis: any) {
  let tags: string[] = [];
  //add the dominant colors to the tags
  if (analysis?.color) {
    tags = analysis.color.dominantColors.map((color: string) =>
      color.toLowerCase()
    );
  }
  //add the objects to the tags
  if (analysis?.objects && analysis.objects.length > 0) {
    analysis.objects.forEach((obj: any) => {
      if (tags.indexOf(obj.object) === -1) {
        tags.push(obj.object.toLowerCase());
      }
    });
  }
  return tags;
}

/**
 * dalleToMC
 * @description Downloads the asset from a URL, creates a new name, and saves to SFMC
 * @param url
 * @param name
 * @returns asset data
 */
export async function dalleToMC(url: string, name: string) {
  const analysis = await azureRecognition(url);
  const tags = buildTagsFromAnalysis(analysis);
  //Get the image from the URL
  const imageRes = await axios.get(url, {
    responseType: "arraybuffer",
  });
  //get the current date
  let now: any = new Date();
  //convert date into a string
  now = now.getMonth() + 1 + "-" + now.getDate() + "-" + now.getFullYear();
  //create a random number for the image name combined with date
  const imageName = createRandomFileName(now, "png");
  // encode image as base64
  const file = Buffer.from(imageRes.data, "base64").toString("base64");
  //save the asset to SFMC
  return await saveAsset(name, imageName, file, url, tags);
}

/**
 * checkNewName
 * @description Checks the error message for a suggested name and returns it
 * @param error
 * @returns string | undefined
 */
function checkNewName(error: any) {
  const validationErrors = error.response?.data?.validationErrors;
  if (validationErrors && validationErrors.length === 1) {
    const message = validationErrors[0].message;
    if (message.indexOf("is already taken. Suggested name") > -1) {
      //suggested name is after the colon
      const newName = message.split(":")[1].trim();
      return newName;
    }
  }
  //some other error or more than one validation error that we don't know how to handle
  return undefined;
}

/**
 * tagSearch
 * @description Searches for assets with a specific tag
 * @param tag: string
 * @param page: number
 * @returns any[]
 */
export async function tagSearch(tag: string = "", page: number = 1) {
  return await callMC(
    "get",
    `${SFMC_URLS.ASSETS}?$filter=Tags=${tag}&pagesize=250&page=${page}`,
    null
  );
}

/**
 * categoryListing
 * @description Gets a list of assets in a category
 * @param category: string
 * @param page: number
 * @returns any[]
 */
export async function categoryListing(
  category: string = ENV.SFMC_CATEGORY_ID || "",
  page: number = 1
) {
  return await callMC(
    "get",
    `${SFMC_URLS.ASSETS}?$filter=category.id=${category}&pagesize=250&page=${page}`,
    null
  );
}

/**
 * callMC
 * @description Calls the SFMC API
 * @param method: string
 * @param url: string
 * @param body: any
 * @returns any
 */
export async function callMC(method: string, url: string, body: any) {
  //get the token
  const token = await getSFMCToken();

  if (method === "post") {
    return (
      await axios.post(`${SFMC_URLS.BASE}${url}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
    ).data;
  } else {
    return (
      await axios.get(`${SFMC_URLS.BASE}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }
}

/**
 * saveAsset
 * @description Saves an asset to SFMC
 * @param name: string
 * @param fileName: string
 * @param file: string
 * @param originalFileURL: string
 * @param Tags: string[]
 * @param category: string
 * @returns asset details
 */
export async function saveAsset(
  name: string,
  fileName: string,
  file: string,
  originalFileURL: string = "",
  Tags: string[] = [],
  category: string = ENV.SFMC_CATEGORY_ID || ""
) {
  //get the file type after the last period
  const fileType = fileName.split(".").pop() || "";
  //get the asset type id
  const assetTypeId = getAssetTypeId(fileType || "");
  let content;
  if (!assetTypeId || !name || !fileName || !file) {
    return;
  }
  let body = {
    name,
    assetType: {
      name: fileType,
      id: assetTypeId,
    },
    data: { originalFileURL, Tags },
    FileProperties: {
      fileName,
    },
    Category: {
      id: category,
    },
    file,
    Tags,
  };

  try {
    content = await callMC("post", SFMC_URLS.ASSETS, body);
  } catch (err: any) {
    console.error(err.response?.data);
    //check if the error is because the name is already taken
    const newName = checkNewName(err);
    if (newName) {
      body.name = newName;
      try {
        //try again with the new name
        content = await callMC("post", SFMC_URLS.ASSETS, body);
      } catch (err) {
        console.error(err);
      }
    }
    return content;
  }
  try {
    await callMC("post", SFMC_URLS.TAGS, {
      objectIds: [content.objectID],
      tagNames: Tags,
    });
  } catch (err) {
    console.error(err);
  }
  return content;
}

/**
 * getSFMCToken
 * @description Gets the SFMC token from DynamoDB or calls SFMC to get a new one
 * @returns string
 */
async function getSFMCToken() {
  try {
    //get the token from DynamoDB
    const token: any = await readItemFromDynamoDB(ENV.SETTINGS || "", {
      clientId: ENV.SFMC_CLIENT_ID,
      type: "sfmc_token",
    });
    //check if the token is expired
    const expired = token ? isTokenValid(token.expireDate) : true;
    //if the token is expired or doesn't exist, get a new one
    if (!expired) {
      return token.accessToken;
    } else {
      const url = SFMC_URLS.AUTH;
      const data = {
        grant_type: "client_credentials",
        client_id: ENV.SFMC_CLIENT_ID,
        client_secret: ENV.SFMC_CLIENT_SECRET,
        account_id: ENV.SFMC_MID,
      };
      try {
        //get the new token
        const response = await axios.post(url, data, {
          headers: { "Content-Type": "application/json" },
        });
        const accessToken = response.data.access_token;
        //save the new token to DynamoDB
        const dynamoInsert = {
          clientId: ENV.SFMC_CLIENT_ID,
          type: "sfmc_token",
          accessToken,
          expireDate: new Date().getTime() + Number(response.data.expires_in),
        };
        await writeToDynamoDB(ENV.SETTINGS || "", dynamoInsert);
        return accessToken;
      } catch (err) {
        console.error(err);
        return "";
      }
    }
  } catch (err) {
    console.error(err);
    return;
  }
} 