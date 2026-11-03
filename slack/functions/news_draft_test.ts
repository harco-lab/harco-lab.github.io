import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  CANCEL_ACTION,
  CREATE_PR_ACTION,
  draftFromView,
  EDIT_ACTION,
  EDIT_VIEW,
  editView,
  type NewsDraft,
  previewBlocks,
} from "./news_draft.ts";

const draft: NewsDraft = {
  title: "HARCO Lab Participated in AIM 2026",
  date: "2026-07-07",
  slug: "aim2026",
  author: "Seongmin Ha",
  member: "Prof. Wansoo Kim, Oh Jihwan",
  bodyParts: [
    "Intro with **bold**.\n\n[photo2 100%]\n\nMiddle.",
    "[photo1 photo3]",
    "",
  ],
  imageIds: ["F1", "F2", "F3", "F4"],
};
const fileNames = ["a.jpg", "b.jpg", "c.jpg", "d.jpg"];

// deno-lint-ignore no-explicit-any
type Block = Record<string, any>;

function actionIds(blocks: Block[]): string[] {
  return blocks.filter((block) => block.type === "actions")
    .flatMap((block) =>
      block.elements.map((element: Block) => element.action_id)
    );
}

/** The body part of the preview, as compact `kind:value` strings. */
function bodyOutline(blocks: Block[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === "markdown") return [`md:${block.text}`];
    if (block.type === "image") {
      return [`image:${block.slack_file.id}:${block.title.text}`];
    }
    if (block.type === "context" && !block.elements[0].text.includes("PR")) {
      return [`context:${block.elements[0].text}`];
    }
    return [];
  }).filter((line) => !line.startsWith("context:`"));
}

Deno.test("previewBlocks shows the body with photos where the markers are", () => {
  const blocks = previewBlocks({ draft, fileNames, mode: "full" });
  assertEquals(bodyOutline(blocks), [
    "md:Intro with **bold**.",
    "image:F2:사진 2 · 폭 100%",
    "md:Middle.",
    "image:F1:사진 1 · 나란히",
    "image:F3:사진 3 · 나란히",
    "image:F4:사진 4 · 맨 끝",
  ]);
  assertEquals(actionIds(blocks), [
    CREATE_PR_ACTION,
    EDIT_ACTION,
    CANCEL_ACTION,
  ]);
});

Deno.test("previewBlocks hides the PR button while there are problems", () => {
  const blocks = previewBlocks({
    draft,
    fileNames,
    mode: "full",
    problems: ["slug는 영문 소문자, 숫자, _ 만 쓸 수 있습니다."],
  });
  const text = JSON.stringify(blocks);
  assertStringIncludes(text, "고칠 점이 있습니다");
  assertStringIncludes(text, "slug는 영문 소문자");
  assertEquals(actionIds(blocks), [EDIT_ACTION, CANCEL_ACTION]);
});

Deno.test("previewBlocks keeps the PR button for a retryable error", () => {
  const blocks = previewBlocks({
    draft,
    fileNames,
    mode: "full",
    error: "PR을 만들지 못했습니다: GitHub POST /pulls failed (502)",
  });
  assertStringIncludes(JSON.stringify(blocks), "다시 시도하려면 PR 만들기를");
  assertEquals(actionIds(blocks), [
    CREATE_PR_ACTION,
    EDIT_ACTION,
    CANCEL_ACTION,
  ]);
});

Deno.test("previewBlocks falls back to file names, then drops the body", () => {
  const noPhotos = previewBlocks({
    draft,
    fileNames,
    mode: "no_photos",
  });
  assertEquals(noPhotos.filter((block) => block.type === "image"), []);
  assertStringIncludes(JSON.stringify(noPhotos), "사진 2 · 폭 100%: b.jpg");

  const summary = previewBlocks({ draft, fileNames, mode: "summary" });
  assertEquals(summary.filter((block) => block.type === "markdown"), []);
  assertStringIncludes(
    JSON.stringify(summary),
    "본문 미리보기를 Slack에 표시하지 못했습니다",
  );
});

Deno.test("previewBlocks replaces the buttons with a status", () => {
  const blocks = previewBlocks({
    draft,
    fileNames,
    mode: "full",
    status: "PR을 만들고 있습니다…",
  });
  assertEquals(actionIds(blocks), []);
  assertEquals(blocks.at(-1)!.elements[0].text, "PR을 만들고 있습니다…");
});

Deno.test("editView is filled with the draft", () => {
  const view = editView(draft, "Fx123");
  assertEquals(view.callback_id, EDIT_VIEW);
  assertEquals(view.private_metadata, "Fx123");
  const byId = Object.fromEntries(
    view.blocks.map((block: Block) => [block.block_id, block.element]),
  );
  assertEquals(byId.title.initial_value, draft.title);
  assertEquals(byId.date.initial_date, "2026-07-07");
  assertEquals(byId.author.initial_value, draft.author);
  assertEquals(byId.member.initial_value, draft.member);
  assertEquals(byId.body1.initial_value, draft.bodyParts[0]);
  assertEquals(byId.body2.initial_value, "[photo1 photo3]");
  assert(!("initial_value" in byId.body3));
  assertEquals(byId.images.type, "file_input");
});

Deno.test("draftFromView keeps the photos unless new ones are uploaded", () => {
  const values = {
    title: { value: { value: "New title" } },
    date: { value: { selected_date: "2026-07-08" } },
    slug: { value: { value: "aim2026" } },
    author: { value: { value: "Seongmin Ha" } },
    member: { value: { value: "All Member" } },
    body1: { value: { value: "Body" } },
    body2: { value: { value: null } },
    body3: { value: { value: null } },
    images: { value: { files: [] } },
  };
  const kept = draftFromView(values, draft);
  assertEquals(kept.title, "New title");
  assertEquals(kept.date, "2026-07-08");
  assertEquals(kept.member, "All Member");
  assertEquals(kept.bodyParts, ["Body", "", ""]);
  assertEquals(kept.imageIds, draft.imageIds);

  const replaced = draftFromView({
    ...values,
    images: { value: { files: [{ id: "F9" }] } },
  }, draft);
  assertEquals(replaced.imageIds, ["F9"]);
});
