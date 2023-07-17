/** @format */

// This function converts a base64 encoded string into a JSON object
export function convertBufferToJSON(data: string) {
  // Create a buffer from the base64 encoded string
  let buffer = Buffer.from(data, "base64");
  // Decode the buffer into an ASCII string and perform URL decoding
  let string = decodeURI(buffer.toString("ascii"))
    .replace("payload=", "") // Remove the "payload=" prefix
    .replace(/%3A/gi, ":") // Replace encoded colons
    .replace(/%2C/gi, ",") // Replace encoded commas
    .replace(/%22/gi, '"') // Replace encoded double quotes
    .replace(/%7B/gi, "{") // Replace encoded opening curly braces
    .replace(/%7D/gi, ")") // Replace encoded closing curly braces
    .replace(/%5B/gi, "[") // Replace encoded opening square brackets
    .replace(/%5D/gi, "]") // Replace encoded closing square brackets
    .replace(/%7C/gi, "|") // Replace encoded pipe symbols
    .replace(/%2F/gi, "/"); // Replace encoded forward slashes

  // Attempt URL decoding a second time to account for double encoding
  try {
    string = decodeURI(string)
      .replace(/%3A/gi, ":")
      .replace(/%2C/gi, ",")
      .replace(/%22/gi, '"')
      .replace(/%7B/gi, "{")
      .replace(/%7D/gi, ")")
      .replace(/%5B/gi, "[")
      .replace(/%5D/gi, "]")
      .replace(/%7C/gi, "|")
      .replace(/%2F/gi, "/");
  } catch (e) {}

  // Convert the decoded string to a JSON object and return it
  return JSON.parse(string);
}

// This function adds a period to the end of a sentence if it does not already have one
export function addPeriod(sentence: string = "") {
  // Check if the last character is not a period, exclamation, or question mark
  if (
    sentence.charAt(sentence.length - 1) !== "." &&
    sentence.charAt(sentence.length - 1) !== "!" &&
    sentence.charAt(sentence.length - 1) !== "?"
  ) {
    // Append a period to the sentence and return it
    return sentence + ".";
  } else {
    // Return the sentence unmodified
    return sentence;
  }
}