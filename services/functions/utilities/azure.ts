/** @format */

import axios from "axios";
import { ENV } from "./static";
export async function azureRecognition(url: string) {
  let analysis: any;
  const uriBase = ENV.AZURE_URL;
  // Display the image.
  const headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": ENV.AZURE_KEY || "",
  };

  try {
    const response = await axios.post(uriBase, { url }, { headers });
    analysis = {
      color: response?.data?.color,
      imageProperties: response?.data?.metadata,
      objects: response?.data?.objects,
    };
  } catch (err) {
    console.error(err);
  }
  return analysis;
}
