/** @format */

export function getJSONBody(event: any) {
  try {
    return JSON.parse(event.body) || {};
  } catch (err) {
    console.error("[getJSONBody]", err);
    return {};
  }
}
