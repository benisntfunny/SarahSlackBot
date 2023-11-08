/** @format */

// Import axios for making HTTP requests
import axios from "axios";
// Import static configuration for Azure Cognitive Services
import { ENV } from "./static";

export function getObjects(json) {
  // Initialize as a Set to hold the object names
  var objectNames = new Set();

  // Check if the input is an object
  if (typeof json === 'object' && json !== null) {
      // If it's an object, iterate through its properties
      for (var key in json) {

          // If a property name is 'object', it's an object name, so add it to the set
          if (key === 'object' && typeof(json[key]) === 'string') {
              objectNames.add(json[key]);
          }

          // If the property's value is an object or array, 
          // use recursion to check for object names in it
          if (typeof json[key] === 'object' || Array.isArray(json[key])) {
              var newObjects = getObjects(json[key]);
              newObjects.forEach((obj) => objectNames.add(obj));
          }
      }
  }

  // Convert Set to Array before returning
  return Array.from(objectNames);
}

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
