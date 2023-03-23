/** @format */

import { HTTPS_CODES } from "./static";

export function success(body: any) {
  return buildResponse(HTTPS_CODES.SUCCESS, body);
}
export function successPlain(body: string = "") {
  return {
    statusCode: HTTPS_CODES.SUCCESS,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Content-Type": "text/plain",
    },
    body: body ?? undefined,
  };
}
export function badRequest(body: any) {
  return buildResponse(HTTPS_CODES.badRequest, body);
}
export function successImage(body: any) {
  return buildResponseImage(HTTPS_CODES.SUCCESS, body);
}

export function failure(body: any) {
  return buildResponse(HTTPS_CODES.FAILURE, body);
}
export function unauthorized(body: any) {
  return buildResponse(HTTPS_CODES.unauthorized, body);
}

function buildResponse(statusCode: number, body: any) {
  return {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
function buildResponseImage(statusCode: number, body: any) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "image/jpeg",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Expose-Headers": "Content-Length",
      "Content-Length": body.size,
      Accept: "image/jpeg",
    },
    body,
    isBase64Encoded: true,
  };
}
