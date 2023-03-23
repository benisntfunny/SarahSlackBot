/** @format */

import {
  sarahRemover,
  swapOutIds,
  userLookup,
} from "functions/utilities/slack/slack";

/** @format */
export class UserMessage {
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

  async userLookup() {
    const user = await userLookup(this.user);
    this.name = user?.name;
  }
  async cleanseText() {
    this.text = await swapOutIds(sarahRemover(this.text));
  }

  constructor(payload: any = {}, type: string = "") {
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
