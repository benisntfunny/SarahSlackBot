/** @format */

import { isAuthorized } from "./utilities/auth";
import {
  failure,
  success,
  successPlain,
  unauthorized,
} from "./utilities/responses";
import { categoryListing, tagSearch } from "./utilities/sfmc";
import { ENV } from "./utilities/static";
/**
 * history
 * @description Returns a list of content items from the SFMC category
 * @param event
 * @returns any[]
 */
export const history = async (event: any) => {
  if (!isAuthorized(event)) {
    return unauthorized({ error: "Unauthorized" });
  }
  const body = JSON.parse(event.body);
  const results = await categoryListing(
    event.category || ENV.sfmc_category_id,
    body.page || 1
  );

  return success(results);
};
export const searchByTag = async (event: any) => {
  const tag = event?.queryStringParameters?.tag;
  if (tag) {
    const tags = await tagSearch(tag, 1);
    return success(tags.items && tags.items.length ? tags.items : []);
  } else return failure({ error: "Missing tag" });
};
