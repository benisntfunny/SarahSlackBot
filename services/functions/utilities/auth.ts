/** @format */

import { getJSONBody } from "./events";
import { AUTH_URLS, ENV } from "./static";

function isSlackRequest(event: any) {
  const json = getJSONBody(event);
  return json.token && json.api_app_id ? true : false;
}

export function isAuthorized(event: any) {
  if (isSlackRequest(event)) {
    if (
      getJSONBody(event).api_app_id === ENV.SARAH_APP_ID &&
      ENV.SARAH_AUTHORIZED_TEAMS?.split(",").includes(
        getJSONBody(event).team_id
      )
    ) {
      return true;
    } else {
      return false;
    }
  }
  const originPassOrigin =
    event?.headers?.origin === AUTH_URLS.LOCAL_1 ||
    event?.headers?.origin === AUTH_URLS.LOCAL_2;
  if (originPassOrigin) {
    return true;
  }
  const validAppIds = ENV.SFMC_AUTHORIZED_APPS?.split(",") || [];

  const validId = validAppIds.find((id: string) => {
    return id === event?.headers?.appid;
  });

  return validId ? true : false;
}
