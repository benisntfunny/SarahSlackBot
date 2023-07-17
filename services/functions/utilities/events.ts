/** @format */

// This function takes an event object as input and attempts to parse the JSON body, returning it as an object
export function getJSONBody(event: any) {
  // Wrap the operation in a try-catch block to handle any errors during parsing
  try {
    // Attempt to parse the JSON body from the event, and if successful, return the result (an object)
    return JSON.parse(event.body) || {};
  } catch (err) {
    // If an error occurs during parsing, log it in the console with a label for easier debugging
    console.error("[getJSONBody]", err);
    
    // Return an empty object as fallback (since the JSON body could not be parsed)
    return {};
  }
}