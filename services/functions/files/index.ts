/** @format */

import {
  deleteFile,
  getFile,
  listBucket,
  saveFile,
} from "functions/utilities/aws";
import { getJSONBody } from "functions/utilities/events";
import { success } from "functions/utilities/responses";
import { fileUpload } from "functions/utilities/slack/slack";
import { FILE_ACTIONS } from "functions/utilities/static";
import PDFMerger from "pdf-merger-js";

export async function handler(event: any) {
  const body = getJSONBody(event);
  const { type } = body;
  if (type === FILE_ACTIONS.SLACK_MERGE) {
    await handleSlackMerge(body);
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
