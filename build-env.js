/** @format */

const fs = require("fs");
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
const ssm = new AWS.SSM({ apiVersion: "2014-11-06" });
const parameter = "sarahbot";
ssm
  .getParameter({
    Name: parameter,
  })
  .promise()
  .then((data) => {
    fs.writeFile(".env", data.Parameter.Value, (err) => {
      if (err) throw err;
      console.log(".env created");
    });
  })
  .catch((err) => {
    throw err;
  });
