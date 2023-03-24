/** @format */

import { postToChannel } from "functions/utilities/slack/slack";
import { convertBufferToJSON } from "functions/utilities/text";

function formatJSONToMarkdown(json: string) {
  let markdown = "{\n";
  const spaces = "  ";

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

  markdown += formatObject(json, 0);
  markdown += "}";
  return markdown;
}

export async function hook(event: any = {}) {
  let buffer = Buffer.from(event.body, "base64");
  let text = decodeURI(buffer.toString("ascii"));
  const decodeAndSplit = (text: string) => {
    const decodedText = decodeURIComponent(text);
    return decodedText.split("&");
  };

  const convertTextToJson = (textArray: any) => {
    const jsonObject: any = {};

    textArray.forEach((item: any) => {
      const [key, value] = item.split("=");
      jsonObject[key] = value;
    });

    return jsonObject;
  };

  const textArray = decodeAndSplit(text);
  let jsonResult = convertTextToJson(textArray);
  jsonResult.Body = jsonResult.Body.replace(/\+/gi, " ");
  const resultString = formatJSONToMarkdown(jsonResult);

  await postToChannel("C050PNQTB32", resultString);
}
