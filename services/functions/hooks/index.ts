/** @format */

export async function handler(event: any) {
  console.log(event);
  try {
    function b64DecodeUnicode(str: any) {
      return decodeURIComponent(
        atob(str)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    }

    function parseUrlParameters(paramsStr: any) {
      const paramsArr = paramsStr.split("&");
      const jsonList: any = [];

      paramsArr.forEach((param: any) => {
        const [key, value] = param.split("=");
        jsonList.push({
          param: decodeURIComponent(key),
          value: decodeURIComponent(value).replace(/\+/g, " "),
        });
      });

      return jsonList;
    }

    const base64Str = event.body; // Replace this with your Base64 string

    const decodedText = b64DecodeUnicode(base64Str);
    console.log("Decoded Text:", decodedText);

    const jsonList = parseUrlParameters(decodedText);
    console.log("JSON List:", jsonList);
  } catch (err) {
    console.error(err);
  }
}
