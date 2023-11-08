/** @format */

// Import required libraries and utilities
import { bard, convertBardChat } from "functions/utilities/bard";
import {
  readItemFromDynamoDB,
  slackImageUrlToS3,
  writeToDynamoDB,
} from "../utilities/aws";
import {
  buildSettingsText,
  chatGPT,
  chatGPTWithFunctions,
  dalleS3,
  visionGPT,
} from "../utilities/openai";
import {
  sarahRemover,
  sendBlock,
  sendMessage,
  swapOutIds,
  userLookup,
} from "../utilities/slack/slack";
import {
  ENV,
  IMAGE_MODELS,
  LLM_MODELS,
  SETTINGS_TYPES,
  SLACK_ACTION_TYPES,
  SLACK_TYPES,
  VISION_MODELS,
} from "../utilities/static";
import { addPeriod } from "../utilities/text";
import { deepChat, deepFusion } from "functions/utilities/deepinfra";
import { imageBlock } from "functions/utilities/slack/blocks";
import { azureRecognition, getObjects } from "functions/utilities/azure";

// Define the ProcessingActions class
export class ProcessingActions {
  payload: any = {};
  instruction: string = "";
  settings: any = {};
  text: string = "";
  model: string = "";
  imageModel: string = "";
  tempModel: string = "";
  history: any = [];
  imagePrompt: string = "";
  incoming: any = {};
  referencedChat: any = {};
  referenceId: string = "";
  message_ts: string = "";
  replaceMessage: boolean = false;
  username: string = "";

  // Constructor for initializing the class
  constructor(payload: any, incoming: any = {}) {
    this.payload = payload;
    if (incoming) {
      this.incoming = incoming;
    }
  }
  getModelName(model) {
    for (let key in LLM_MODELS) {
      if (LLM_MODELS[key].model === model) {
        return LLM_MODELS[key].name;
      }
    }

    return "Model not found.";
  }
  getModelProvider(model) {
    for (let key in LLM_MODELS) {
      if (LLM_MODELS[key].model === model) {
        return LLM_MODELS[key].provider;
      }
    }

    return "Model not found.";
  }
  getImageModelProvider(model) {
    for (let key in IMAGE_MODELS) {
      if (IMAGE_MODELS[key].model === model) {
        return IMAGE_MODELS[key].provider;
      }
    }

    return "Model not found.";
  }
  getRandomModel(): any {
    const inUseRealModels = Object.values(LLM_MODELS).filter(
      (llm: any) => llm.inUse && llm.real
    );
    const randomIndex = Math.floor(Math.random() * inUseRealModels.length);
    return inUseRealModels[randomIndex];
  }
  // Prepare incoming message data
  async prepIncomingMessageData() {
    // Retrieve settings from DynamoDB
    this.settings = await readItemFromDynamoDB(ENV.SETTINGS, {
      clientId: this.payload?.user ?? this.payload.event.user,
      type: SETTINGS_TYPES.BOT_SETTINGS,
    });
    if (!this.settings) {
      this.settings = {};
    }

    // Prepare text and user information
    let text = "";
    if (!this.payload.text)
      text = await swapOutIds(addPeriod(sarahRemover(this.payload.event.text)));
    else {
      text = this.payload.text;
    }
    if (
      this.payload.type === SLACK_TYPES.NEW_MESSAGE_SKIP_PROMPT ||
      this.payload.type === SLACK_TYPES.NEW_IMAGE_SKIP_PROMPT
    ) {
      this.message_ts = this.payload.message_ts;
    }
    this.username = await userLookup(
      this.payload?.user ?? this.payload.event.user
    );
    const settingsText = await buildSettingsText(this.settings);
    const instruction = `${settingsText}. User is named ${this.username}. Assistant is named Sarah.`;

    this.imageModel = this.settings[SLACK_ACTION_TYPES.IMAGE_MODEL]
      ? IMAGE_MODELS[this.settings[SLACK_ACTION_TYPES.IMAGE_MODEL]]?.model
      : IMAGE_MODELS.DALLE.model;
    // Choose the appropriate model
    this.model = this.settings[SLACK_ACTION_TYPES.CHAT_MODEL]
      ? LLM_MODELS[this.settings[SLACK_ACTION_TYPES.CHAT_MODEL]]?.model
      : LLM_MODELS.CHAT_GPT.model;

    if (this.model === LLM_MODELS.RANDOM.model) {
      const newModel: any = this.getRandomModel();
      this.model = newModel.model;
    }
    // Assign values to class properties
    this.instruction = instruction;
    this.text = text;
  }

  // Retrieve chat history
  async retrieveHistory() {
    // Read history from DynamoDB
    const item: any =
      (await readItemFromDynamoDB(ENV.OUTGOING_TABLE, {
        referenceId: this.incoming.referenceId,
      })) || {};

    // Assign retrieved values to class properties
    this.referencedChat = item;
    this.model =
      this.referencedChat[SLACK_ACTION_TYPES.CHAT_MODEL] ||
      LLM_MODELS.CHAT_GPT.model;
    this.imageModel = this.referencedChat[SLACK_ACTION_TYPES.IMAGE_MODEL];
    this.history = this.referencedChat.history;
  }

  // Write chat history
  async writeHistory() {
    // Write history to DynamoDB
    await writeToDynamoDB(ENV.OUTGOING_TABLE, {
      referenceId: this.referenceId,
      history: this.history,
      time: Date.now(),
      [SLACK_ACTION_TYPES.CHAT_MODEL]: this.model,
      [SLACK_ACTION_TYPES.IMAGE_MODEL]: this.imageModel,
    });
  }

  // Get a new ChatGPT message
  async newChatGPTMessage() {
    // Generate ChatGPT response
    const response = await chatGPT(
      [
        {
          role: "system",
          content: this.instruction,
        },
        {
          role: "user",
          content: this.text,
        },
      ],
      this.tempModel
    );
    // Save history and send the response
    this.referenceId = this.payload?.thread_ts || this.payload.event.event_ts;
    this.history = [
      {
        role: "system",
        content: this.instruction,
      },
      { role: "user", content: this.text },
      { role: "assistant", content: response },
    ];
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response,
      this.getModelName(this.tempModel)
    );
    await this.writeHistory();
  }

  async newDeepInfraMessage() {
    const response = await deepChat(
      [
        {
          role: "system",
          content: this.instruction,
        },
        {
          role: "user",
          content: this.text,
        },
      ],
      this.tempModel
    );

    // Save history and send the response
    this.referenceId = this.payload?.thread_ts || this.payload.event.event_ts;
    this.history = [
      {
        role: "system",
        content: this.instruction,
      },
      { role: "user", content: this.text },
      { role: "assistant", content: response },
    ];
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response,
      this.getModelName(this.tempModel)
    );
    await this.writeHistory();
  }

  async newBardMessage() {
    const response = await bard(
      [{ author: "user", content: this.text }],
      this.tempModel,
      this.instruction
    );

    // Save history and send the response
    this.referenceId = this.payload?.thread_ts || this.payload.event.event_ts;
    this.history = [
      {
        role: "system",
        content: this.instruction,
      },
      { role: "user", content: this.text },
      { role: "assistant", content: response },
    ];
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response,
      this.getModelName(this.tempModel)
    );
    await this.writeHistory();
  }

  async checkIfImage() {
    if (this.text && this.text.length <= 1000) {
      const response = await chatGPTWithFunctions(
        [
          {
            role: "user",
            content: this.text,
          },
        ],
        LLM_MODELS.CHAT_GPT35.model,
        [
          {
            name: "generate_image",
            description:
              "Generates an image when a user requests one. This means the user will say things like 'Create an image of... a picture of... an oil paiting of', etc",
            parameters: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description:
                    "The text provided to generate an image from removing any reference to 'an image' or 'a picture', etc. Just the prompt text to generate the image",
                },
              },
              required: ["prompt"],
            },
          },
        ]
      );
      return response;
    } else return false;
  }

  // Reply to ChatGPT message
  async replyBardMessage() {
    // Update history and generate ChatGPT response
    this.history.push({ role: "user", content: this.text });
    const payload = convertBardChat(this.history);
    const response = await bard(
      payload.messages,
      this.tempModel,
      payload.context
    );

    // Update history and send the response
    this.history.push({ role: "assistant", content: response });
    await this.writeHistory();
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response,
      this.getModelName(this.tempModel)
    );
  }
  async replyDeepInfraMessage() {
    // Update history and generate ChatGPT response
    this.history.push({ role: "user", content: this.text });
    const response = await deepChat(this.history, this.tempModel);
    // Update history and send the response
    this.history.push({ role: "assistant", content: response });
    await this.writeHistory();
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response,
      this.getModelName(this.tempModel)
    );
  }

  // Reply to ChatGPT message
  async replyChatGPTMessage() {
    // Update history and generate ChatGPT response
    this.history.push({ role: "user", content: this.text });
    const response = await chatGPT(this.history, this.tempModel);

    // Update history and send the response
    this.history.push({ role: "assistant", content: response });
    await this.writeHistory();
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response,
      this.getModelName(this.tempModel)
    );
  }

  async postImageToSlack(response: any, idx: string) {
    const recognition = await azureRecognition(response.url);

    const objects = getObjects(recognition);
    let tagsText = "";
    if (objects && objects.length > 0) {
      tagsText = objects.map((obj) => `*${obj}*`).join(", ");
    }

    let ib: any = imageBlock;
    ib[0].title.text = this.imagePrompt;
    ib[0].image_url = response.url;
    ib[0].alt_text = this.imagePrompt;
    ib[1].elements[0].value = idx;
    if (tagsText && ib.length === 3) {
      ib[2].text.text = tagsText;
    } else {
      ib.splice(2, 1);
    }

    await sendBlock(
      this.payload.event.channel,
      this.payload.event.event_ts,
      ib
    );

    await this.writeHistory();
  }
  // Request a new image
  async newDalleImage() {
    // Generate image URL from DalleS3 and send it
    const response = await dalleS3(
      this.imagePrompt,
      IMAGE_MODELS.DALLE.model,
      ENV.DEFAULT_APP_ID,
      "1024x1024"
    );
    this.history.push({
      role: "assistant",
      content: `I've generated an image for you of ${
        response.revised_prompt ?? this.imagePrompt
      }`,
    });
    this.imagePrompt = response.revised_prompt ?? this.imagePrompt;
    this.postImageToSlack(
      response,
      "index-" + (this.history.length - 1).toString()
    );
  }
  async newSDXLImage() {
    // Generate image URL from DalleS3 and send it
    const response: any = await deepFusion(
      this.imagePrompt,
      IMAGE_MODELS.STABLE_DIFFUSION.model,
      ENV.DEFAULT_APP_ID
    );
    this.history.push({
      role: "assistant",
      content: `I've generated an image for you of ${this.imagePrompt}`,
    });
    this.postImageToSlack(
      response,
      "index-" + (this.history.length - 1).toString()
    );
  }

  async buildImageURL(url): Promise<any> {
    const file = await slackImageUrlToS3(url, ENV.DEFAULT_APP_ID, "", false);

    return file.url;
  }
  async respondToImage(newChat: boolean = false) {
    let urls = this.payload.event.files.map((file) => file.url_private);

    let nextMessage: any = {
      role: "user",
      content: [{ type: "text", text: this.text }],
    };

    for (let i = 0; i < urls.length; i++) {
      let url = urls[i];
      nextMessage.content.push({
        type: "image_url",
        image_url: await this.buildImageURL(url),
      });
    }

    let response;
    // Save history and send the response
    this.referenceId = this.payload?.thread_ts || this.payload.event.event_ts;
    if (newChat) {
      response = await visionGPT(
        [
          {
            role: "system",
            content: this.instruction,
          },
          nextMessage,
        ],
        VISION_MODELS.GPT4.model
      );
      this.history = [
        {
          role: "system",
          content: this.instruction,
        },
        { role: "user", content: this.text },
        { role: "assistant", content: response },
      ];
    } else {
      this.history.push(nextMessage);
      response = await visionGPT(this.history, VISION_MODELS.GPT4.model);
      this.history.push({ role: "assistant", content: response });
    }
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response,
      VISION_MODELS.GPT4.name
    );
    await this.writeHistory();
  }

  // Post a new message
  async newMessage() {
    await this.prepIncomingMessageData();
    this.referenceId = this.payload?.thread_ts || this.payload.event.event_ts;
    this.tempModel =
      this.model === LLM_MODELS.THREADROULETTE.model
        ? this.getRandomModel().model
        : this.model;
    const image = await this.checkIfImage();
    if (image) {
      this.imagePrompt = image;
      switch (this.getImageModelProvider(this.imageModel)) {
        case "openai":
          await this.newDalleImage();
          break;
        case "deepinfra":
          await this.newSDXLImage();
          break;
        default:
          await this.newDalleImage();
          break;
      }
    } else {
      if (this.payload?.event?.files && this.payload?.event?.files.length > 0) {
        await this.respondToImage();
      } else {
        switch (this.getModelProvider(this.tempModel)) {
          case "openai":
            await this.newChatGPTMessage();
            break;
          case "google":
            await this.newBardMessage();
            break;
          case "deepinfra":
            await this.newDeepInfraMessage();
            break;
          default:
            this.newChatGPTMessage();
        }
      }
    }
  }

  // Reply to existing message
  async replyMessage() {
    // Retrieve history and prepare text
    await this.retrieveHistory();
    this.text = await swapOutIds(
      addPeriod(sarahRemover(this.payload.event.text))
    );

    // Assign referenceId and invoke reply methods based on the model
    this.tempModel =
      this.model === LLM_MODELS.THREADROULETTE.model
        ? this.getRandomModel().model
        : this.model;

    this.referenceId = this.incoming.referenceId;
    const image = await this.checkIfImage();
    if (image) {
      this.imagePrompt = image;
      switch (this.getImageModelProvider(this.imageModel)) {
        case "openai":
          await this.newDalleImage();
          break;
        case "deepinfra":
          await this.newSDXLImage();
          break;
        default:
          await this.newDalleImage();
          break;
      }
    } else {
      if (this.payload?.event?.files && this.payload?.event?.files.length > 0) {
        await this.respondToImage();
      } else {
        switch (this.getModelProvider(this.tempModel)) {
          case "openai":
            await this.newChatGPTMessage();
            break;
          case "google":
            await this.replyBardMessage();
            break;
          case "deepinfra":
            await this.replyDeepInfraMessage();
            break;
          default:
            await this.replyChatGPTMessage();
        }
      }
    }
  }
}
