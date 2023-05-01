/** @format */

// Import axios for making HTTP requests
import axios from "axios";
// Import static configuration for Azure Cognitive Services
import { ENV } from "./static";

/**
 * Function for recognizing properties and objects in an image using Azure Cognitive Services
 * @param {string} url - The URL of the image to be analyzed
 * @returns {Object} analysis - Recognized properties and objects in the image
 */
export async function azureRecognition(url: string) {
  // Initialize an analysis object to store the results
  let analysis: any;
  // Get the base URL of Azure Cognitive Services from static configuration
  const uriBase = ENV.AZURE_URL;

  // Set up headers for the HTTP request
  const headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": ENV.AZURE_KEY || "",
  };

  try {
    // Make a POST request to Azure Cognitive Services with the image URL and headers
    const response = await axios.post(uriBase, { url }, { headers });
    // Extract relevant data from the response and store it in the analysis object
    analysis = {
      color: response?.data?.color,
      imageProperties: response?.data?.metadata,
      objects: response?.data?.objects,
    };
  } catch (err) {
    // Log any errors encountered in the HTTP request
    console.error(err);
  }
  
  // Return the analysis object containing recognized properties and objects in the image
  return analysis;
}