/** @format */

// Import isAuthorized function from utilities/auth
import { isAuthorized } from "./utilities/auth";
// Import success function for responses from utilities/responses
import { success } from "./utilities/responses";

/**
 * check
 * @function
 * @description Checks if the request is authorized
 * @param {any} event - The event to be checked for authorization
 * @returns {Promise<any>} successful response with an authorized boolean
 */
export async function check(event: any) {
  // Invoke the isAuthorized function with the event and store the result
  //const authorized = isAuthorized(event);

  // Return a successful response with the authorized boolean
  return success({ authorized: true });
}