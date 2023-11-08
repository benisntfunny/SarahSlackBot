/**
 * @format
 */

import { getJSONBody } from "./events";
import { AUTH_URLS, ENV } from "./static";

/**
 * Check if an event has a valid Slack request.
 * @param event - The object to be tested for a valid Slack request.
 * @returns {boolean} - A boolean value representing whether the event is a valid Slack request.
 */
function isSlackRequest(event: any) {
  const json = getJSONBody(event);
  return (json.token && json.api_app_id ? true : false) || event.requestContext?.http.userAgent === 'Slackbot 1.0 (+https://api.slack.com/robots)';
}

/**
 * Check whether an event is authorized.
 * @param event - The event object to be tested for authorization.
 * @returns {boolean} - A boolean value representing whether the event is authorized.
 */
export function isAuthorized(event: any) {
  // Check if it's a Slack request
  if (isSlackRequest(event)) {
    // Check if it's from the SARAH_APP_ID and a team ID in the SARAH_AUTHORIZED_TEAMS environment variable
    if (
      getJSONBody(event).api_app_id === ENV.SARAH_APP_ID &&
      ENV.SARAH_AUTHORIZED_TEAMS?.split(",").includes(
        getJSONBody(event).team_id
      )
    ) {
      return true;
    } 
    else if (ENV.SLACK_API_ID?.split(",").indexOf(event?.requestContext?.apiId) > -1)
    {
      return true;
    }
    
    else {
      return false;
    }
  }
  // Check if the event's origin is either LOCAL_1 or LOCAL_2
  const originPassOrigin =
    event?.headers?.origin === AUTH_URLS.LOCAL_1 ||
    event?.headers?.origin === AUTH_URLS.LOCAL_2;
  if (originPassOrigin) {
    return true;
  }
  // Check the list of authorized apps given by the SFMC_AUTHORIZED_APPS environment variable
  const validAppIds = ENV.SFMC_AUTHORIZED_APPS?.split(",") || [];

  // Find the valid app ID in the list
  const validId = validAppIds.find((id: string) => {
    return id === event?.headers?.appid;
  });

  // Return true if a valid app ID is found, otherwise return false
  return validId ? true : false;
}