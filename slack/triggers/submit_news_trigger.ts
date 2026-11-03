import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SubmitNewsWorkflow from "../workflows/submit_news_workflow.ts";

/**
 * Link trigger. Bookmark the generated link in the news channel; the success
 * message is posted to whichever channel the link is clicked from.
 */
const submitNewsTrigger: Trigger<typeof SubmitNewsWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "뉴스 게시물 올리기",
  description: "harco.hanyang.ac.kr 뉴스 게시물을 작성해 PR로 올립니다.",
  workflow: `#/workflows/${SubmitNewsWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    channel: {
      value: TriggerContextData.Shortcut.channel_id,
    },
    user: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default submitNewsTrigger;
