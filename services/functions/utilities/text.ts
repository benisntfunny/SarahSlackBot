/** @format */

export function convertBufferToJSON(data: string) {
  let buffer = Buffer.from(data, "base64");
  let string = decodeURI(buffer.toString("ascii"))
    .replace("payload=", "")
    .replaceAll("%3A", ":")
    .replaceAll("%2C", ",")
    .replaceAll("%22", '"')
    .replaceAll("%7B", "{")
    .replaceAll("%7D", ")")
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]")
    .replaceAll("%7C", "|")
    .replaceAll("%2F", "/");
  try {
    string = decodeURI(string)
      .replaceAll("%3A", ":")
      .replaceAll("%2C", ",")
      .replaceAll("%22", '"')
      .replaceAll("%7B", "{")
      .replaceAll("%7D", ")")
      .replaceAll("%5B", "[")
      .replaceAll("%5D", "]")
      .replaceAll("%7C", "|")
      .replaceAll("%2F", "/");
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
