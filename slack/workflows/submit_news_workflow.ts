import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { CreateNewsPrDefinition } from "../functions/create_news_pr.ts";
import { MEMBER_HINT, SLUG_HINT } from "../functions/news_draft.ts";

const SubmitNewsWorkflow = DefineWorkflow({
  callback_id: "submit_news_workflow",
  title: "HARCO 뉴스 게시물 올리기",
  description:
    "폼으로 뉴스 게시물을 작성하고 미리보기를 확인하면 사이트 저장소에 PR을 만듭니다. 검토 후 병합하면 사이트에 게시됩니다.",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel: { type: Schema.slack.types.channel_id },
      user: { type: Schema.slack.types.user_id },
    },
    required: ["interactivity", "channel", "user"],
  },
});

const form = SubmitNewsWorkflow.addStep(Schema.slack.functions.OpenForm, {
  title: "HARCO 뉴스 게시물",
  submit_label: "미리보기",
  interactivity: SubmitNewsWorkflow.inputs.interactivity,
  fields: {
    elements: [
      {
        name: "title",
        title: "제목 (영문)",
        type: Schema.types.string,
        description:
          "영문으로만 작성해 주십시오. 예: HARCO Lab Participated in AIM 2026",
      },
      {
        name: "date",
        title: "날짜",
        type: Schema.slack.types.date,
      },
      {
        name: "slug",
        title: "파일 이름 (선택)",
        type: Schema.types.string,
        description: SLUG_HINT,
      },
      {
        name: "author",
        title: "작성자 (영문 이름)",
        type: Schema.types.string,
        description: "영문으로만 작성해 주십시오. 예: Seongmin Ha",
      },
      {
        name: "member",
        title: "관련 멤버",
        type: Schema.types.string,
        default: "All Member",
        description: MEMBER_HINT,
      },
      {
        name: "body",
        title: "본문 1 (Markdown, 영문)",
        type: Schema.types.string,
        long: true,
        description:
          "영문으로만, 최대 3000자까지 작성해 주십시오. 사진을 넣을 자리에 [photo1] 처럼 한 줄로 적어 주십시오. [photo1 100%] 는 폭 지정, [photo2 photo3] 은 나란히 배치입니다. 표시하지 않은 사진은 맨 끝에 붙습니다.",
      },
      {
        name: "body2",
        title: "본문 2 (선택)",
        type: Schema.types.string,
        long: true,
        description:
          "본문 1에 다 들어가지 않으면 이어서 써 주십시오. 최대 3000자입니다.",
      },
      {
        name: "body3",
        title: "본문 3 (선택)",
        type: Schema.types.string,
        long: true,
        description: "본문 2에 이어서 써 주십시오. 최대 3000자입니다.",
      },
      {
        name: "images",
        title: "사진",
        type: Schema.types.array,
        maxItems: 10,
        items: {
          type: Schema.slack.types.file_id,
          allowed_filetypes_group: "IMAGES_ONLY",
        },
        description:
          "JPG, PNG, GIF / 장당 10MB 이하 / 최대 10장. 올린 순서대로 photo1, photo2 … 입니다.",
      },
    ],
    required: ["title", "date", "author", "member", "body"],
  },
});

SubmitNewsWorkflow.addStep(CreateNewsPrDefinition, {
  title: form.outputs.fields.title,
  date: form.outputs.fields.date,
  slug: form.outputs.fields.slug,
  author: form.outputs.fields.author,
  member: form.outputs.fields.member,
  body: form.outputs.fields.body,
  body2: form.outputs.fields.body2,
  body3: form.outputs.fields.body3,
  images: form.outputs.fields.images,
  submitter: SubmitNewsWorkflow.inputs.user,
  channel: SubmitNewsWorkflow.inputs.channel,
});

export default SubmitNewsWorkflow;
