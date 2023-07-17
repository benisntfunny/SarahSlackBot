/** @format */

// Import utilities for Slack functions
import {
  sarahRemover,
  swapOutIds,
  userLookup,
} from "functions/utilities/slack/slack";

/** @format */
// UserMessage class definition
export class UserMessage {
  // Define class properties
  user: string = "";
  username: string = "";
  name: string = "";
  api_app_id: string = "";
  thread_ts: string = "";
  message_ts: string = "";
  type: string = "";
  text: string = "";
  response_url: string = "";
  channel: string = "";

  // Method to look up user information
  async userLookup() {
    // Call userLookup function with user property and assign returned user object to name property
    const user = await userLookup(this.user);
    this.name = user?.name;
  }

  // Method to cleanse text by removing Sarah and swapping out user IDs
  async cleanseText() {
    // Call sarahRemover with text property as argument
    // Then call swapOutIds with the result of sarahRemover
    // Assign final result to text property
    this.text = await swapOutIds(sarahRemover(this.text));
  }

  // Constructor method for UserMessage class
  constructor(payload: any = {}, type: string = "") {
    // Assign values to class properties from payload and type
    if (payload?.user?.id) this.user = payload?.user?.id;
    if (payload?.user?.username) this.username = payload?.user?.username;
    if (payload?.api_app_id) this.api_app_id = payload?.api_app_id;
    if (payload?.message.thread_ts) {
      this.thread_ts = payload?.message.thread_ts;
    }
    if (type) this.type = type;
    if (payload.text) {
      this.text = payload.text;
    }
    if (payload.response_url) {
      this.response_url = payload.response_url;
    }
    if (payload.message_ts) {
      this.message_ts = payload.message_ts;
    }
    if (payload.channel?.id) {
      this.channel = payload.channel?.id;
    }
  }
}