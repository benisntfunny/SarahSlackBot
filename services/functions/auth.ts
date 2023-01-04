/** @format */

import { isAuthorized } from "./utilities/auth";
import { success } from "./utilities/responses";
/**
 * check
 * @description Checks if the request is authorized
 * @param event
 * @returns boolean
 */
export async function check(event: any) {
  return success({ authorized: isAuthorized(event) });
}
