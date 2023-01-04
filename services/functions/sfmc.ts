/** @format */

import { isAuthorized } from "./utilities/auth";
import { success, unauthorized } from "./utilities/responses";
import { categoryListing } from "./utilities/sfmc";
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
