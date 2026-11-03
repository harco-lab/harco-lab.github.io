import { Manifest } from "deno-slack-sdk/mod.ts";
import SubmitNewsWorkflow from "./workflows/submit_news_workflow.ts";
import { NewsDraftsDatastore } from "./datastores/news_drafts.ts";

export default Manifest({
  name: "HARCO News",
  description: "Slack 폼으로 harco.hanyang.ac.kr 뉴스 게시물 PR을 만듭니다.",
  icon: "assets/icon.png",
  workflows: [SubmitNewsWorkflow],
  datastores: [NewsDraftsDatastore],
  outgoingDomains: ["api.github.com", "files.slack.com"],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "files:read",
    "datastore:read",
    "datastore:write",
  ],
});
