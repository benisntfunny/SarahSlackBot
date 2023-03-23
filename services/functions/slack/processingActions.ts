/** @format */

import { readItemFromDynamoDB, writeToDynamoDB } from "../utilities/aws";
import { buildSettingsText, chatGPT, dalleS3, GPT3 } from "../utilities/openai";
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
  GPTStyles,
  SETTINGS_TYPES,
  SLACK_ACTION_TYPES,
  SLACK_TYPES,
} from "../utilities/static";
import { addPeriod } from "../utilities/text";
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

  constructor(payload: any, incoming: any = {}) {
    this.payload = payload;
    if (incoming) {
      this.incoming = incoming;
    }
  }

  async prepIncomingMessageData() {
    this.settings = await readItemFromDynamoDB(ENV.SETTINGS, {
      clientId: this.payload?.user ?? this.payload.event.user,
      type: SETTINGS_TYPES.BOT_SETTINGS,
    });
    if (!this.settings) {
      this.settings = {};
    }
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

    const model = this.settings[SLACK_ACTION_TYPES.CHAT_MODEL]
      ? GPTStyles[this.settings[SLACK_ACTION_TYPES.CHAT_MODEL]]?.model
      : GPTStyles.CHAT_GPT.model;

    this.instruction = instruction;
    this.text = text;
    this.model = model;
  }

  async retrieveHistory() {
    const item: any =
      (await readItemFromDynamoDB(ENV.OUTGOING_TABLE, {
        referenceId: this.incoming.referenceId,
      })) || {};
    this.referencedChat = item;

    this.model =
      this.referencedChat[SLACK_ACTION_TYPES.CHAT_MODEL] ||
      GPTStyles.CHAT_GPT.model;
    this.history = this.referencedChat.history;
  }
  async writeHistory() {
    await writeToDynamoDB(ENV.OUTGOING_TABLE, {
      referenceId: this.referenceId,
      history: this.history,
      time: Date.now(),
      [SLACK_ACTION_TYPES.CHAT_MODEL]: this.model,
    });
  }
  async newGPT3Message(replace: boolean = false) {
    this.text = "Note: " + this.instruction + "-------\n\n" + this.text;
    const response = await GPT3(this.text, this.model);
    this.referenceId = this.payload?.thread_ts || this.payload.event.event_ts;
    this.history = [this.text, response];
    await this.writeHistory();
    if (!replace) {
      await sendMessage(this.payload.event.channel, this.referenceId, response);
    } else {
      await replaceMessage(this.payload.channel, this.message_ts, response);
    }
  }
  async newChatGPTMessage(replace: boolean = false) {
    const response = await chatGPT(
      [
        {
          role: "system",
          content: this.instruction,
        },
        { role: "user", content: this.text },
      ],
      this.model
    );
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
  async replyGPT3Message() {
    this.text =
      this.history.join("\n") +
      "\n\n" +
      (await swapOutIds(addPeriod(sarahRemover(this.payload.event.text))));

    const response = await GPT3(this.text, this.model);
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
  async replyChatGPTMessage() {
    this.history.push({ role: "user", content: this.text });
    /*if (text.length / 1000 >= 4) {
      await sendMessage(payload.event.channel, payload.event.event_ts, "...");
      return;
    } else {
      */
    const response = await chatGPT(this.history, this.model);
    this.history.push({ role: "assistant", content: response });

    await this.writeHistory();
    await sendMessage(
      this.payload.event.channel,
      this.payload.event.event_ts,
      response
    );
  }

  needsPrompt() {
    if (
      !this.settings[SLACK_ACTION_TYPES.INITIAL_PROMPT] ||
      this.settings[SLACK_ACTION_TYPES.INITIAL_PROMPT] === "prompt"
    )
      return true;
    else return false;
  }

  async newImage() {
    const response = (
      await dalleS3(this.text, ENV.DEFAULT_APP_ID, ENV.DEFAULT_IMAGE_SIZE)
    ).url;
    // send the image to slack
    await sendImageWithButtons(
      this.payload.channel ?? this.payload.event.channel,
      this.payload.thread_ts ?? this.payload.event.event_ts,
      this.text,
      response
    );
  }

  async newMessage(skipPrompt: boolean = false) {
    await this.prepIncomingMessageData();
    if (this.needsPrompt() && !skipPrompt) {
      await this.promptForNextAction();
    } else {
      if (this.model === GPTStyles.GPT3.model) {
        await this.newGPT3Message(skipPrompt);
      } else {
        await this.newChatGPTMessage(skipPrompt);
      }
    }
  }
  async newMessageSkipPrompt() {}

  async promptForNextAction() {
    await sendPromptBlock(
      this.payload.event.channel,
      this.payload.event.event_ts,
      this.settings
    );
  }

  async replyMessage() {
    await this.retrieveHistory();

    this.text = await swapOutIds(
      addPeriod(sarahRemover(this.payload.event.text))
    );
    this.referenceId = this.incoming.referenceId;
    if (this.model === GPTStyles.GPT3.model) {
      await this.replyGPT3Message();
    } else {
      await this.replyChatGPTMessage();
    }
  }
}
