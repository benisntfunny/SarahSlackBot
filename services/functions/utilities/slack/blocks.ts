/** @format */

// Import SLACK_ACTION_TYPES from the static file
import { SLACK_ACTION_TYPES } from "../static";

// Define the 'prompt' object
export const prompt = {
  blocks: [
    // Add a section with markdown text
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "What can I help you with?",
      },
    },
    // Add action buttons for 'Image' and 'Chat'
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
    // Add a divider
    {
      type: "divider",
    },
    // Add 'Settings' button and a checkbox for 'Don't ask me again'
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            emoji: true,
            text: "Settings",
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

// Define 'settingsBlock' array
export const settingsBlock = [
  // Add a header for Chat Settings
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "Chat Settings",
      emoji: true,
    },
  },
  // Add context text about the options effect
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "These options will take effect on your next chat.",
      },
    ],
  },
  // Add a section for Chat Model selection
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
  // Add context text about custom chat style instructions
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "*Custom chat style instructions*",
      },
    ],
  },
  // Add plain text input for custom chat style overrides
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
  // Add a divider
  {
    type: "divider",
  },
  // Add a checkbox for 'Don't remind about settings'
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
];
