/** @format */

// Import required libraries and utilities
import { readItemFromDynamoDB, writeToDynamoDB } from "../utilities/aws";
import { buildSettingsText, chatGPT, dalleS3 } from "../utilities/openai";
import {
  replaceMessage,
  sarahRemover,
  sendImageWithButtons,
  sendMessage,
  sendPromptBlock,
  swapOutIds,
  userLookup,
} from "../utilities/slack/slack";
import {
  ENV,
  OPENAI_MODELS,
  SETTINGS_TYPES,
  SLACK_ACTION_TYPES,
  SLACK_TYPES,
} from "../utilities/static";
import { addPeriod } from "../utilities/text";

// Define the ProcessingActions class
export class ProcessingActions {
  payload: any = {};
  instruction: string = "";
  settings: any = {};
  text: string = "";
  model: string = "";
  history: any = [];
  incoming: any = {};
  referencedChat: any = {};
  referenceId: string = "";
  message_ts: string = "";
  replaceMessage: boolean = false;

  // Constructor for initializing the class
  constructor(payload: any, incoming: any = {}) {
    this.payload = payload;
    if (incoming) {
      this.incoming = incoming;
    }
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
    const userName = await userLookup(
      this.payload?.user ?? this.payload.event.user
    );
    const settingsText = await buildSettingsText(this.settings);
    const instruction = `${settingsText}. User is named ${userName}. Assistant is named Sarah.`;

    // Choose the appropriate model
    const model = this.settings[SLACK_ACTION_TYPES.CHAT_MODEL]
      ? OPENAI_MODELS[this.settings[SLACK_ACTION_TYPES.CHAT_MODEL]]?.model
      : OPENAI_MODELS.CHAT_GPT.model;

    // Assign values to class properties
    this.instruction = instruction;
    this.text = text;
    this.model = model;
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
      OPENAI_MODELS.CHAT_GPT.model;
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
    });
  }

  /* Get a new GPT-3 message
  async newGPT3Message(replace: boolean = false) {
    // Modify the text to include instruction
    this.text = "Note: " + this.instruction + "-------\n\n" + this.text;

    // Generate GPT-3 response
    const response = await GPT3(this.text, this.model);

    // Save history and send the response
    this.referenceId = this.payload?.thread_ts || this.payload.event.event_ts;
    this.history = [this.text, response];
    await this.writeHistory();
    if (!replace) {
      await sendMessage(this.payload.event.channel, this.referenceId, response);
    } else {
      await replaceMessage(this.payload.channel, this.message_ts, response);
    }
  }
  */

  // Get a new ChatGPT message
  async newChatGPTMessage(replace: boolean = false) {
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
      this.model,
      [
        {
          name: "generate_image",
          description: "Generates an image when a user requests it",
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
        {
          name: "sentiment_trigger",
          description:
            "Sends the perceived sentiment level of a user if they are angry, frustrated, upset, manic, any negative sentiment. Still sends a response back to the user",
          parameters: {
            type: "object",
            properties: {
              sentiment_type: {
                type: "string",
                description: "The description of the sentiment",
              },
              content: {
                type: "string",
                description: "The response to the original message",
              },
              reasoning: {
                type: "string",
                description: "The reasoning for assigning the sentiment",
              },
              keywords: {
                type: "string",
                description:
                  "The keywords that triggered the sentiment delimited by comma",
              },
            },
            required: ["sentiment_type", "content", "reasoning", "keywords"],
          },
        },
      ]
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
    await this.writeHistory();
    if (!replace) {
      await sendMessage(
        this.payload.event.channel,
        this.payload.event.event_ts,
        response
      );
    } else {
      await replaceMessage(
        this.payload.channel,
        this.payload.message_ts,
        response
      );
    }
  }

  /*
  // Reply to GPT-3 message
  async replyGPT3Message() {
    // Prepare text and generate GPT-3 response
    this.text =
      this.history.join("\n") +
      "\n\n" +
      (await swapOutIds(addPeriod(sarahRemover(this.payload.event.text))));
    const response = await GPT3(this.text, this.model);

    // Update history and send the response
    this.history.push(
      "\n\n" + addPeriod(sarahRemover(this.payload.event.text))
    );
    this.history.push(response);
    await this.writeHistory();
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response
    );
  }
  */

  // Reply to ChatGPT message
  async replyChatGPTMessage() {
    // Update history and generate ChatGPT response
    this.history.push({ role: "user", content: this.text });
    const response = await chatGPT(this.history, this.model);

    // Update history and send the response
    this.history.push({ role: "assistant", content: response });
    await this.writeHistory();
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response
    );
  }

  // Request a new image
  async newImage() {
    await this.prepIncomingMessageData();
    // Generate image URL from DalleS3 and send it
    const response = await dalleS3(
      this.text,
      ENV.DEFAULT_APP_ID,
      ENV.DEFAULT_IMAGE_SIZE
    );
    console.log(response);
    await sendImageWithButtons(
      this.payload.channel ?? this.payload.event.channel,
      this.payload.thread_ts ?? this.payload.event.event_ts,
      this.text,
      response?.url
    );
  }

  // Post a new message
  async newMessage(skipPrompt: boolean = false) {
    await this.prepIncomingMessageData();

    await this.newChatGPTMessage(skipPrompt);
  }

  // Send a new message without prompt
  async newMessageSkipPrompt() {}

  // Prompt for next action
  async promptForNextAction() {
    // Send a prompt block to the user
    await sendPromptBlock(
      this.payload.event.channel,
      this.payload.event.event_ts,
      this.settings
    );
  }

  // Reply to existing message
  async replyMessage() {
    // Retrieve history and prepare text
    await this.retrieveHistory();
    this.text = await swapOutIds(
      addPeriod(sarahRemover(this.payload.event.text))
    );

    // Assign referenceId and invoke reply methods based on the model
    this.referenceId = this.incoming.referenceId;
    //if (this.model === OPENAI_MODELS.GPT3.model) {
    //  await this.replyGPT3Message();
    //} else {
    //GPT3 is not supported
    await this.replyChatGPTMessage();
    //}
  }
}
