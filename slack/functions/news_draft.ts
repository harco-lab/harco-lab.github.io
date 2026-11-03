/**
 * The Slack side of a submission: the draft as the submitter typed it, its
 * preview message and the pre-filled edit form. Nothing here calls Slack or
 * GitHub, so it is easy to unit test.
 */

import {
  type BodySegment,
  bodySegments,
  joinBodyParts,
  type NewsPostInput,
  normalizeInput,
  postPath,
  unplacedPhotos,
} from "./news_post.ts";

export const CREATE_PR_ACTION = "create_pr";
export const EDIT_ACTION = "edit_draft";
export const CANCEL_ACTION = "cancel_draft";
export const EDIT_VIEW = "edit_news_draft";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHOTO_FILETYPES = ["jpg", "jpeg", "png", "gif"];
const BODY_FIELD_MAX = 3000;
export const SLUG_HINT =
  "비워 두면 제목으로 만듭니다 (예: participated_aim_2026). 짧게 하려면 영문 소문자, 숫자, _ 로 적어 주십시오 (예: aim2026).";
export const MEMBER_HINT =
  "멤버 이름을 , 로 구분해 영문으로 적어 주십시오 (예: Prof. Wansoo Kim, Oh Jihwan). 연구실 전체 소식이면 All Member.";

/** The form fields exactly as typed, plus the attached photos in order. */
export interface NewsDraft {
  title: string;
  date: string;
  slug: string;
  author: string;
  member: string;
  bodyParts: string[];
  imageIds: string[];
}

/** How much Slack accepted: photos may be rejected first, then the body. */
export type PreviewMode = "full" | "no_photos" | "summary";

export interface PreviewOptions {
  draft: NewsDraft;
  fileNames: string[];
  mode: PreviewMode;
  problems?: string[];
  /** A failure that a retry may fix; unlike problems it keeps the PR button. */
  error?: string;
  /** Shown instead of the buttons, e.g. while the PR is being created. */
  status?: string;
}

// deno-lint-ignore no-explicit-any
type Block = Record<string, any>;

interface ViewValue {
  value?: string | null;
  selected_date?: string | null;
  files?: { id: string }[];
}

export type ViewValues = Record<string, Record<string, ViewValue>>;

export function draftFromInputs(inputs: {
  title: string;
  date: string;
  slug?: string;
  author: string;
  member: string;
  body: string;
  body2?: string;
  body3?: string;
  images?: string[];
}): NewsDraft {
  return {
    title: inputs.title,
    date: inputs.date,
    slug: inputs.slug ?? "",
    author: inputs.author,
    member: inputs.member,
    bodyParts: [inputs.body, inputs.body2 ?? "", inputs.body3 ?? ""],
    imageIds: inputs.images ?? [],
  };
}

export function draftToPost(draft: NewsDraft): NewsPostInput {
  return normalizeInput({
    title: draft.title,
    date: draft.date,
    slug: draft.slug,
    author: draft.author,
    member: draft.member,
    body: joinBodyParts(draft.bodyParts),
  });
}

export function escapeSlack(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
    ">",
    "&gt;",
  );
}

function plainText(text: string) {
  return { type: "plain_text", text };
}

function context(text: string): Block {
  return { type: "context", elements: [{ type: "mrkdwn", text }] };
}

function button(actionId: string, text: string, style?: string): Block {
  return {
    type: "button",
    action_id: actionId,
    text: plainText(text),
    ...(style ? { style } : {}),
  };
}

function photoLabel(segment: BodySegment & { kind: "photos" }): string {
  const parts = [];
  if (segment.photos.length > 1) parts.push("나란히");
  if (segment.width !== undefined) parts.push(`폭 ${segment.width}%`);
  return parts.join(" · ");
}

function photoBlocks(
  photos: number[],
  label: string,
  { draft, fileNames, mode }: PreviewOptions,
): Block[] {
  return photos.map((photo) => {
    const title = [`사진 ${photo}`, label].filter(Boolean).join(" · ");
    const id = draft.imageIds[photo - 1];
    if (!id) return context(`:warning: ${title}: 올린 사진이 없습니다`);
    if (mode === "full") {
      return {
        type: "image",
        slack_file: { id },
        alt_text: title,
        title: plainText(title),
      };
    }
    return context(
      `:frame_with_picture: ${title}: ${
        escapeSlack(fileNames[photo - 1] ?? id)
      }`,
    );
  });
}

function actionsBlock(canCreate: boolean): Block {
  return {
    type: "actions",
    elements: [
      ...(canCreate ? [button(CREATE_PR_ACTION, "PR 만들기", "primary")] : []),
      button(EDIT_ACTION, "수정하기"),
      {
        ...button(CANCEL_ACTION, "취소", "danger"),
        confirm: {
          title: plainText("제출을 취소하시겠습니까?"),
          text: plainText(
            "PR을 만들지 않고 끝냅니다. 미리보기는 이 메시지에 남습니다.",
          ),
          confirm: plainText("취소하기"),
          deny: plainText("돌아가기"),
        },
      },
    ],
  };
}

/**
 * The preview DM: post details, problems, the body with photos where their
 * markers are, then the buttons (or `status` once they no longer apply).
 * Problems hide the PR button so only a clean draft can be submitted.
 */
export function previewBlocks(options: PreviewOptions): Block[] {
  const { draft, mode, problems = [], error, status } = options;
  const post = draftToPost(draft);
  const blocks: Block[] = [
    { type: "header", text: plainText("📝 뉴스 게시물 미리보기") },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escapeSlack(post.title || "(제목 없음)")}*\n${post.date} · ${
          escapeSlack(post.author)
        } · 관련 멤버: ${escapeSlack(post.member)}`,
      },
    },
    context(
      `\`${postPath(post)}\`${
        draft.slug.trim()
          ? ""
          : " · 제목으로 만든 파일 이름입니다. 바꾸려면 수정하기에서 파일 이름을 적어 주십시오."
      }`,
    ),
  ];
  if (problems.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          ":warning: *고칠 점이 있습니다. 수정하기를 눌러 고쳐 주십시오.*",
          ...problems.map((problem) => `• ${escapeSlack(problem)}`),
        ].join("\n"),
      },
    });
  }
  if (error) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:x: ${
          escapeSlack(error)
        }\n다시 시도하려면 PR 만들기를 눌러 주십시오. 계속 실패하면 관리자에게 알려 주십시오.`,
      },
    });
  }
  blocks.push({ type: "divider" });

  if (mode === "summary") {
    blocks.push(
      context(
        "본문 미리보기를 Slack에 표시하지 못했습니다. 내용은 수정하기에서 볼 수 있습니다.",
      ),
    );
  } else {
    const segments = bodySegments(post.body);
    for (const segment of segments) {
      blocks.push(
        ...(segment.kind === "text"
          ? [{ type: "markdown", text: segment.text }]
          : photoBlocks(segment.photos, photoLabel(segment), options)),
      );
    }
    blocks.push(
      ...photoBlocks(
        unplacedPhotos(segments, draft.imageIds.length),
        "맨 끝",
        options,
      ),
    );
  }

  blocks.push({ type: "divider" });
  if (status) {
    blocks.push(context(status));
  } else {
    blocks.push(
      actionsBlock(problems.length === 0),
      context(
        "실제 사이트의 사진 폭과 나란히 배치는 PR에서 확인할 수 있습니다. 관리자가 PR을 검토하고 병합하면 사이트에 게시됩니다.",
      ),
    );
  }
  return blocks;
}

function textInput(
  blockId: string,
  label: string,
  value: string,
  options: { multiline?: boolean; optional?: boolean; hint?: string } = {},
): Block {
  return {
    type: "input",
    block_id: blockId,
    optional: options.optional ?? false,
    label: plainText(label),
    ...(options.hint ? { hint: plainText(options.hint) } : {}),
    element: {
      type: "plain_text_input",
      action_id: "value",
      multiline: options.multiline ?? false,
      ...(options.multiline ? { max_length: BODY_FIELD_MAX } : {}),
      ...(value ? { initial_value: value } : {}),
    },
  };
}

/** The edit form, filled with the draft; `id` comes back in `private_metadata`. */
export function editView(draft: NewsDraft, id: string): Block {
  const [body1 = "", body2 = "", body3 = ""] = draft.bodyParts;
  return {
    type: "modal",
    callback_id: EDIT_VIEW,
    private_metadata: id,
    title: plainText("뉴스 게시물 수정"),
    submit: plainText("미리보기 다시 보기"),
    close: plainText("닫기"),
    blocks: [
      textInput("title", "제목 (영문)", draft.title),
      {
        type: "input",
        block_id: "date",
        label: plainText("날짜"),
        element: {
          type: "datepicker",
          action_id: "value",
          ...(DATE_RE.test(draft.date) ? { initial_date: draft.date } : {}),
        },
      },
      textInput("slug", "파일 이름 (선택)", draft.slug, {
        optional: true,
        hint: SLUG_HINT,
      }),
      textInput("author", "작성자 (영문 이름)", draft.author),
      textInput("member", "관련 멤버", draft.member, { hint: MEMBER_HINT }),
      textInput("body1", "본문 1 (Markdown, 영문)", body1, {
        multiline: true,
        hint:
          "[photo1] 처럼 한 줄로 적은 자리에 사진이 들어갑니다. [photo1 100%] 는 폭 지정, [photo2 photo3] 은 나란히 배치입니다.",
      }),
      textInput("body2", "본문 2 (선택)", body2, {
        multiline: true,
        optional: true,
      }),
      textInput("body3", "본문 3 (선택)", body3, {
        multiline: true,
        optional: true,
      }),
      {
        type: "input",
        block_id: "images",
        optional: true,
        label: plainText("사진 바꾸기 (선택)"),
        hint: plainText(
          `비워 두면 지금 사진 ${draft.imageIds.length}장을 그대로 씁니다. 새로 올리면 전부 바뀝니다. 올린 순서대로 photo1, photo2 … 입니다.`,
        ),
        element: {
          type: "file_input",
          action_id: "value",
          filetypes: PHOTO_FILETYPES,
          max_files: 10,
        },
      },
    ],
  };
}

/** Reads the submitted edit form; no new photos keeps the previous ones. */
export function draftFromView(
  values: ViewValues,
  previous: NewsDraft,
): NewsDraft {
  const text = (blockId: string) => values[blockId]?.value?.value ?? "";
  const files = values.images?.value?.files ?? [];
  return {
    title: text("title"),
    date: values.date?.value?.selected_date ?? "",
    slug: text("slug"),
    author: text("author"),
    member: text("member"),
    bodyParts: [text("body1"), text("body2"), text("body3")],
    imageIds: files.length > 0
      ? files.map((file) => file.id)
      : previous.imageIds,
  };
}
