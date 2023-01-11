/** @format */
import { ConversationBot } from "@microsoft/teamsfx";
import { Activity, CardFactory, MessageFactory, TurnContext } from "botbuilder";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import axios from "axios";
import * as restify from "restify";
import { CardData } from "../models/cards";
import { commandBot } from "./utilities/teamsInitialize";
//import { commandBot } from "./utilities/teamsInitialize";
const helloWorldCard = {
  type: "AdaptiveCard",
  body: [
    {
      type: "TextBlock",
      size: "Medium",
      weight: "Bolder",
      text: "${title}",
    },
    {
      type: "TextBlock",
      text: "${body}",
      wrap: true,
    },
  ],
  actions: [
    {
      type: "Action.OpenUrl",
      title: "Bot Framework Docs",
      url: "https://docs.microsoft.com/en-us/azure/bot-service/?view=azure-bot-service-4.0",
    },
    {
      type: "Action.OpenUrl",
      title: "Teams Toolkit Docs",
      url: "https://aka.ms/teamsfx-docs",
    },
  ],
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.4",
};

export async function apiMessages(event: any) {
  //console.log(event);

  console.log(event);
  const server = restify.createServer();

  server.listen(1111, () => {});
  server.post("/api/messages", async (req, res) => {
    await commandBot.requestHandler(req, res);
    //res.header("Content-Type", "application/json");
    //res.header("auhorization", req.headers.authorization);
    //res.header("x-ms-tenant-id", req.headers["x-ms-tenant-id"]);
    //res.header("x-ms-conversation-id", req.header["x-ms-conversation-id"]);
    //res.header("ms-cv", req.headers["ms-cv"]);
    //try {
    /*
      const resp = await axios.post(
        `https://directline.botframework.com/api/conversations/${req.header["x-ms-conversation-id"]}/messages`,
        {
          type: "message",
          attachmentLayout: "list",
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              content: {
                type: "AdaptiveCard",
                body: [
                  {
                    type: "TextBlock",
                    size: "Medium",
                    weight: "Bolder",
                    text: "Your Hello World Bot is Running",
                  },
                  {
                    type: "TextBlock",
                    text: "Congratulations! Your hello world bot is running. Click the documentation below to learn more about Bots and the Teams Toolkit.",
                    wrap: true,
                  },
                ],
                actions: [
                  {
                    type: "Action.OpenUrl",
                    title: "Bot Framework Docs",
                    url: "https://docs.microsoft.com/en-us/azure/bot-service/?view=azure-bot-service-4.0",
                  },
                  {
                    type: "Action.OpenUrl",
                    title: "Teams Toolkit Docs",
                    url: "https://aka.ms/teamsfx-docs",
                  },
                ],
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                version: "1.4",
              },
            },
          ],
          inputHint: "acceptingInput",
        },
        {
          headers: {
            authorization: req.headers.authorization,
            "Content-Type": "application/json",
            "x-ms-conversation-id": req.headers["x-ms-conversation-id"] ?? "",
            "x-ms-tenant-id": req.headers["x-ms-tenant-id"] ?? "",
            "ms-cv": req.headers["ms-cv"] ?? "",
          },
        }
      );
      console.log("response", resp.data);
    } catch (err) {
      console.log("error", err.response.data);
    }

    res.send(200, "");
    */
  });

  return (
    await axios.post("http://localhost:1111/api/messages", event, {
      headers: event.headers,
    })
  ).data;
}
