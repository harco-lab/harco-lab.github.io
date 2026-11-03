import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * A submission waiting in its preview DM, keyed by the function execution ID
 * so the buttons and the edit form can pick it up. Slack deletes the item once
 * `expires_at` (Unix seconds) has passed.
 */
export const NewsDraftsDatastore = DefineDatastore({
  name: "news_drafts",
  primary_key: "id",
  time_to_live_attribute: "expires_at",
  attributes: {
    id: { type: Schema.types.string },
    state: { type: Schema.types.string },
    expires_at: { type: Schema.slack.types.timestamp },
  },
});
