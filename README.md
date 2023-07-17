<!-- @format -->

# Sarah Backend

Acts as a Slack Bot and Custom SFMC Content Block backend service. Runs in AWS using Lambda, S3, API Gateway, DynamoDB, and SSM

## Software/Service Prerequisites

- AWS Account https://aws.amazon.com/account/
- OpenAI Account https://openai.com/
- Microsoft Azure Account https://azure.microsoft.com/en-us/free/
- Slack App https://api.slack.com/start
- nodeJS https://nodejs.org/en/
- SST https://sst.dev/
- AWS CLI https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

## Getting started

- Populate the environment file in AWS Systems Manager (SSM). This will create the .env file used by the APIStack.ts code. The expected name for the parameter store name is `sarahbot` but can be updated in the build-env.js file at the root directory.
  ### File Example
  ```
  CLIENT_ID=<Slack Client ID>
  CLIENT_SECRET=<Slack Client Secret>
  SIGNING_SECRET=<Slack Signing Secret, Unused>
  VERIFY_TOKEN=<Slack Verifying Token>
  OPENAI_API_KEY=<OpenAI API Key>
  SFMC_CLIENT_ID=<SFMC Client Id>
  SFMC_CLIENT_SECRET=<SFMC Client Secret>
  SFMC_MID=<SFMC MID>
  SFMC_SUBDOMAIN=<SFMC Subdomain for package>
  SFMC_CATEGORY_ID=<SFMC Category to place images>
  SFMC_AUTHORIZED_APPS=<Comma separated SFMC Package ids allowed to make requests to the API>
  AZURE_KEY=<Azure API Key for Vision Services>
  SARAH_ID=<Slack App's User ID EX: @U03UJ11111>
  SLACK_USER_TOKEN=<Slack App User Token>
  AZURE_DOMAIN=<Azure Org Domain>
  SARAH_APP_ID=<App Id for the Slack App>
  SARAH_AUTHORIZED_TEAMS=<Comma separated list of authorized slack teams for the bot>
  DEFAULT_APP_ID=<Default ID used to store history table of image results generated from slack. This can be anything>
  DEFAULT_IMAGE_SIZE=<Square image size from OpenAI. EX: 512x512>
  ```
- Service is designed to work with Slack and a supporting Angular App (TODO: Upload angular app 😎) that runs locally on port 4200 using localhost local.dev as an https end point with mkcert
  - mkcert: https://github.com/FiloSottile/mkcert
