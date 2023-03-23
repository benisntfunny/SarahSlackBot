/** @format */

export function convertBufferToJSON(data: string) {
  let buffer = Buffer.from(data, "base64");
  let string = decodeURI(buffer.toString("ascii"))
    .replace("payload=", "")
    .replace(/%3A/gi, ":")
    .replace(/%2C/gi, ",")
    .replace(/%22/gi, '"')
    .replace(/%7B/gi, "{")
    .replace(/%7D/gi, ")")
    .replace(/%5B/gi, "[")
    .replace(/%5D/gi, "]")
    .replace(/%7C/gi, "|")
    .replace(/%2F/gi, "/");
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
  return JSON.parse(string);
}
export function addPeriod(sentence: string = "") {
  if (
    sentence.charAt(sentence.length - 1) !== "." &&
    sentence.charAt(sentence.length - 1) !== "!" &&
    sentence.charAt(sentence.length - 1) !== "?"
  ) {
    return sentence + ".";
  } else {
    return sentence;
  }
}
