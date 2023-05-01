/** @format */

import { HTTPS_CODES } from "./static";

// Function to return a success response with a JSON body
export function success(body: any) {
  return buildResponse(HTTPS_CODES.SUCCESS, body);
}

// Function to return a success response with a plain text body
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

// Function to return a bad request response with a JSON body
export function badRequest(body: any) {
  return buildResponse(HTTPS_CODES.badRequest, body);
}

// Function to return a success response with an image body
export function successImage(body: any) {
  return buildResponseImage(HTTPS_CODES.SUCCESS, body);
}

// Function to return a failure response with a JSON body
export function failure(body: any) {
  return buildResponse(HTTPS_CODES.FAILURE, body);
}

// Function to return an unauthorized response with a JSON body
export function unauthorized(body: any) {
  return buildResponse(HTTPS_CODES.unauthorized, body);
}

// Helper function to build a response object with JSON content type
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

// Helper function to build a response object with image content type
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