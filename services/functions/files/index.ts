/** @format */

import {
  deleteFile,
  getFile,
  listBucket,
  saveFile,
  textExtract,
  textExtractPDF,
} from "functions/utilities/aws";
import { getJSONBody } from "functions/utilities/events";
import { success } from "functions/utilities/responses";
import { fileUpload, respondToMessage } from "functions/utilities/slack/slack";
import { FILE_ACTIONS, OPENAI_MODELS } from "functions/utilities/static";
import PDFMerger from "pdf-merger-js";
//import { extractText } from "office-text-extractor";
import * as fs from "fs";
import { chatGPT } from "functions/utilities/openai";
//import pdf from "pdf-parse";

function splitContent(content: string) {
  const MAX_LENGTH = 12000;
  let chunks = [];
  let currentChunk = "";

  content.split(/\s+/).forEach((word: any) => {
    // split on all whitespace characters
    if (currentChunk.length + word.length + 1 > MAX_LENGTH) {
      chunks.push(currentChunk.trim()); // remove all empty new lines using trim()
      currentChunk = word;
    } else {
      if (currentChunk !== "") {
        currentChunk += " ";
      }
      currentChunk += word;
    }
  });

  chunks.push(currentChunk.trim()); // trim() the last chunk too

  return chunks.filter((chunk) => chunk !== ""); // filter out any empty chunks
}

export async function handler(event: any) {
  const body = getJSONBody(event);
  console.log(event);
  const { type } = body;
  if (type === FILE_ACTIONS.SLACK_MERGE) {
    await handleSlackMerge(body);
  }
  if (type === FILE_ACTIONS.SLACK_SUMMARY) {
    await handleSlackSummary(body);
  }
}

async function handleSlackSummary(data: any) {
  const file: any = await getFile(data.bucket, data.path);
  try {
    await fs.promises.writeFile(`/tmp/${data.path.split("/").pop()}`, file);
  } catch (err) {
    console.error(err);
  }
  //const text = await extractText(`/tmp/${data.path.split("/").pop()}`);
  let text: any;

  const fileExtension = data.path
    .split("/")
    .pop()
    .split(".")
    .pop()
    .toLowerCase();
  console.log("fileExtension", fileExtension);
  if (fileExtension !== "pdf") {
    console.log("test");

    //text = await extractText(`/tmp/${data.path.split("/").pop()}`);
    await handleText(text, fileExtension, data);
  } else if (
    fileExtension === "png" ||
    fileExtension === "jpg" ||
    fileExtension === "jpeg" ||
    fileExtension === "tiff"
  ) {
    console.log("is image");
    //text = await getPdfText(`/tmp/${data.path.split("/").pop()}`);
    text = await textExtract(data.bucket, data.path);
    await handleText(text, fileExtension, data);
  } else if (fileExtension === "pdf") {
    console.log("is pdf");
    text = await textExtractPDF(data.bucket, data.path);
  }
}

async function handleText(input: string, fileExtension: string, data: any) {
  const text = splitContent(input);
  if (text.length === 1) {
    const response = await chatGPT(
      [
        {
          role: "system",
          content: `I'm attaching the output of a ${fileExtension} file that was converted to plaintext and want a summary of the contents. Start with a general one sentence overview then give me bullet points on the important details.`,
        },
        {
          role: "user",
          content: text[0],
        },
      ],
      OPENAI_MODELS.CHAT_GPT.model
    );

    await respondToMessage(data.responseUrl, response);
  } else {
    let summaries: string = "";
    for (let i = 0; i < text.length; i++) {
      const input = text[i];
      const res = await chatGPT(
        [
          {
            role: "system",
            content: `Summarize the text in a way that will be understandable to a large language model. The text is intended to be added with other summaries and then fed back to the model to output a full summarization of the text.`,
          },
          {
            role: "user",
            content: input,
          },
        ],
        OPENAI_MODELS.CHAT_GPT.model
      );
      summaries += res + "\n";
    }
    const response = await chatGPT(
      [
        {
          role: "system",
          content: `I'm attaching the output of a ${fileExtension} file that was converted to plaintext and want a summary of the contents. The provided text is a combination of blocks of text that were previously summarize to be read by a large language model later. Combine all the information together to create a single summary view of the text. Create a one or two sentence overview then give me bullet points on the important details.`,
        },
        {
          role: "user",
          content: summaries,
        },
      ],
      OPENAI_MODELS.GPT4.model
    );
    await respondToMessage(data.responseUrl, response);
  }
}

function sortFiles(filePaths: any) {
  let sortedFiles: any = {
    cover: "",
    files: [],
  };

  filePaths.forEach((file: any) => {
    const pathParts = file.Key.split("/");
    if (pathParts.length === 9 && pathParts[7] !== "merged") {
      sortedFiles.cover = file.Key;
    } else if (pathParts[7] !== "merged") {
      sortedFiles.files.push(file.Key);
    }
  });
  console.log(sortedFiles);
  return sortedFiles;
}

async function handleSlackMerge(data: any) {
  const bucket = data.path.split("/")[0];
  const path =
    "public/users/slack/" + data.path.split("/").slice(2).join("/") + "/";
  const filePaths: any = await listBucket(bucket, path);

  let merge = sortFiles(filePaths?.Contents ?? []);

  const merger = new PDFMerger();
  const cov: any = await getFile(bucket, merge.cover);

  merger.add(cov);
  for (let i = 0; i < merge.files.length; i++) {
    const file: any = await getFile(bucket, merge.files[i]);
    merger.add(file);
  }
  const merged = await merger.saveAsBuffer();
  const fileResponse = await fileUpload(
    [path.split("/")[3]],
    merge.cover.split("/").pop(),
    merged
  );
  if (fileResponse?.data?.ok) {
    await deleteFile(bucket, merge.cover);
    for (let i = 0; i < merge.files.length; i++) {
      await deleteFile(bucket, merge.files[i]);
    }
  }

  return success({ message: "success" });
}
