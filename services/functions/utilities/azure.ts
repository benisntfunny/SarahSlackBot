/** @format */

import axios from "axios";
import { ENV } from "./static";
export async function azureRecognition(url: string) {
  let analysis: any;
  const uriBase = ENV.azure;
  // Display the image.
  const headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": ENV.azure_key || "",
  };

  try {
    const response = await axios.post(uriBase, { url }, { headers });
    //console.log(JSON.stringify(response.data));
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
