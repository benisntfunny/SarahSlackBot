/** @format */

import { SLACK_ACTION_TYPES } from "../static";

export const prompt = {
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "What can I help you with?",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            emoji: true,
            text: "Image",
          },
          value: SLACK_ACTION_TYPES.CREATE_IMAGE,
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            emoji: true,
            text: "Chat",
          },
          value: SLACK_ACTION_TYPES.START_CHAT,
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Settings",
            emoji: true,
          },
          value: SLACK_ACTION_TYPES.NEW_CHAT_SETTINGS,
          action_id: SLACK_ACTION_TYPES.OPEN_SETTINGS,
        },
        {
          type: "checkboxes",
          options: [
            {
              text: {
                type: "mrkdwn",
                text: "*Don't ask me again*",
              },
              description: {
                type: "mrkdwn",
                text: "*You won't be reminded about settings again.*",
              },
              value: SLACK_ACTION_TYPES.NO_SETTINGS_TOGGLE,
            },
          ],
          action_id: SLACK_ACTION_TYPES.NO_SETTINGS_REMINDER,
        },
      ],
    },
  ],
};
export const settingsBlock = [
  {
    type: "input",
    element: {
      type: "radio_buttons",
      options: [
        {
          text: {
            type: "plain_text",
            text: "Prompt for Images or Chat",
            emoji: true,
          },
          value: "prompt",
        },
        {
          text: {
            type: "plain_text",
            text: "Chat Only",
            emoji: true,
          },
          value: "chat_only",
        },
        {
          text: {
            type: "plain_text",
            text: "Images Only",
            emoji: true,
          },
          value: "images_only",
        },
      ],
      action_id: SLACK_ACTION_TYPES.INITIAL_PROMPT,
    },
    label: {
      type: "plain_text",
      text: "Initial Prompt Options",
      emoji: true,
    },
  },
  {
    type: "divider",
  },
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "Chat Settings",
      emoji: true,
    },
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "These options will take effect on your next chat.",
      },
    ],
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Chat Model*",
    },
    accessory: {
      type: "static_select",
      placeholder: {
        type: "plain_text",
        text: "Select a model",
        emoji: true,
      },
      options: [],
      action_id: SLACK_ACTION_TYPES.CHAT_MODEL,
    },
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Preset chat style*",
    },
    accessory: {
      type: "static_select",
      placeholder: {
        type: "plain_text",
        text: "Select an item",
        emoji: true,
      },
      options: [
        {
          text: {
            type: "plain_text",
            text: "Default",
            emoji: true,
          },
          value: "default",
        },
        {
          text: {
            type: "plain_text",
            text: "Sarcastic",
            emoji: true,
          },
          value: "sarcasm",
        },
        {
          text: {
            type: "plain_text",
            text: "Rhymes Too Much",
            emoji: true,
          },
          value: "rhymes",
        },
        {
          text: {
            type: "plain_text",
            text: "Overly Excited",
            emoji: true,
          },
          value: "overly_excited",
        },
        {
          text: {
            type: "plain_text",
            text: "Purposely Lie",
            emoji: true,
          },
          value: "liar",
        },
        {
          text: {
            type: "plain_text",
            text: "Very Happy",
            emoji: true,
          },
          value: "happy",
        },
      ],
      action_id: SLACK_ACTION_TYPES.CHAT_STYLE_PRESET,
    },
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "*Custom chat style instructions*",
      },
    ],
  },
  {
    dispatch_action: true,
    type: "input",
    element: {
      type: "plain_text_input",
      action_id: "chat_style_overrides",
    },
    label: {
      type: "plain_text",
      text: " ",
      emoji: true,
    },
  },
  {
    type: "divider",
  },
  {
    type: "actions",
    elements: [
      {
        type: "checkboxes",
        options: [
          {
            text: {
              type: "mrkdwn",
              text: "*Don't remind about settings*",
            },
            description: {
              type: "mrkdwn",
              text: "*You won't be reminded about settings when using `Prompt for Images or Chat`.*",
            },
            value: SLACK_ACTION_TYPES.NO_SETTINGS_TOGGLE,
          },
        ],
        action_id: SLACK_ACTION_TYPES.NO_SETTINGS_REMINDER,
      },
    ],
  },
  /*
  
    {
      type: "divider",
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Close Settings",
            emoji: true,
          },
          value: "done",
          action_id: SLACK_ACTION_TYPES.CLOSE_SETTINGS,
        },
      ],
    },
    */
];