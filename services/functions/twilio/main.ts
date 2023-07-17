/** @format */

// importing required functions from external modules
import { postToChannel } from "functions/utilities/slack/slack";
import { convertBufferToJSON } from "functions/utilities/text";

// function to format a JSON object as a markdown string
function formatJSONToMarkdown(json: string) {
  let markdown = "{\n";
  const spaces = "  ";

  // helper function to format nested objects
  const formatObject = (obj: any, depth: any) => {
    let objStr = "";
    for (const [key, value] of Object.entries(obj)) {
      objStr += `${spaces.repeat(depth)}*"${key}"*: `;
      if (typeof value === "object") {
        objStr += "\n" + formatObject(value, depth + 1);
      } else {
        objStr += `${JSON.stringify(value)}\n`;
      }
    }
    return objStr;
  };

  // build the formatted markdown string
  markdown += formatObject(json, 0);
  markdown += "}";
  return markdown;
}

// main function to process the hook event
export async function hook(event: any = {}) {
  // convert the event body from base64 to string
  let buffer = Buffer.from(event.body, "base64");
  let text = decodeURI(buffer.toString("ascii"));

  // function to decode and split the text string into an array
  const decodeAndSplit = (text: string) => {
    const decodedText = decodeURIComponent(text);
    return decodedText.split("&");
  };

  // function to convert the array from the previous function into a JSON object
  const convertTextToJson = (textArray: any) => {
    const jsonObject: any = {};

    textArray.forEach((item: any) => {
      const [key, value] = item.split("=");
      jsonObject[key] = value;
    });

    return jsonObject;
  };

  // call the decodeAndSplit and convertTextToJson functions
  const textArray = decodeAndSplit(text);
  let jsonResult = convertTextToJson(textArray);

  // replace '+' characters with spaces in the 'Body' property
  jsonResult.Body = jsonResult.Body.replace(/\+/gi, " ");

  // format the JSON object as a markdown string using the formatJSONToMarkdown function
  const resultString = formatJSONToMarkdown(jsonResult);

  // post the formatted markdown string to a Slack channel using the previously imported 'postToChannel' function
  await postToChannel("C050PNQTB32", resultString);
}