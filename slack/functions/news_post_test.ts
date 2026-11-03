import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  ALL_MEMBER,
  branchName,
  imageExtension,
  imagePath,
  joinBodyParts,
  type NewsPostInput,
  normalizeInput,
  postPath,
  renderPost,
  slugFromTitle,
  validateInput,
} from "./news_post.ts";

const post: NewsPostInput = {
  title: "HARCO Lab Participated in AIM 2026",
  date: "2026-07-07",
  slug: "aim2026",
  author: "Seongmin Ha",
  member: "Prof. Wansoo Kim, Oh Jihwan",
  body: "Members of **HARCO Lab** attended AIM 2026.",
};

const WRAPPER_OPEN =
  '<div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-top: 1em; margin-bottom: 1em;">';

function figures(width: string, ...paths: string[]): string {
  return [
    WRAPPER_OPEN,
    ...paths.map((path) =>
      `{% include figure.html image="${path}" width="${width}" %}`
    ),
    "</div>",
  ].join("\n");
}

function bodyOf(rendered: string): string {
  return rendered.split("---\n\n")[1];
}

Deno.test("normalizeInput cleans slug, member and line endings", () => {
  const normalized = normalizeInput({
    ...post,
    slug: "  ICRA 2026 - Workshop ",
    member: "  Prof. Wansoo Kim,   Oh Jihwan ",
    body: "line 1\r\nline 2\r\n",
  });
  assertEquals(normalized.slug, "icra_2026_workshop");
  assertEquals(normalized.member, "Prof. Wansoo Kim, Oh Jihwan");
  assertEquals(normalized.body, "line 1\nline 2");
  assertEquals(
    normalizeInput({ ...post, member: "all member" }).member,
    ALL_MEMBER,
  );
});

Deno.test("joinBodyParts skips empty fields", () => {
  assertEquals(
    joinBodyParts([" part 1 ", undefined, "", "part 3\n"]),
    "part 1\n\npart 3",
  );
});

Deno.test("validateInput accepts a well-formed post", () => {
  assertEquals(validateInput(normalizeInput(post), 0), []);
  assertEquals(
    validateInput(normalizeInput({ ...post, member: "jungsoo_lee" }), 0),
    [],
  );
});

Deno.test("validateInput rejects non-ASCII slugs, empty members and Liquid", () => {
  const problems = validateInput(
    normalizeInput({
      ...post,
      slug: "에이아이엠",
      member: " ",
      body: "Use {{ site.title }} here",
    }),
    0,
  );
  assertEquals(problems.length, 3);
});

Deno.test("validateInput checks photo markers against the attached photos", () => {
  const problems = validateInput(
    normalizeInput({
      ...post,
      body: [
        "[photo1]",
        "[photo 2 100%]",
        "[photo3]",
        "[photo1 50%]",
        "[photo2 120%]",
        "[photo2 big]",
        "A [photo1] inside a sentence is plain text.",
      ].join("\n"),
    }),
    2,
  );
  assertEquals(problems, [
    "[photo3]: 3번 사진이 없습니다 (올린 사진 2장)",
    "1번 사진을 본문에 두 번 넣었습니다: [photo1 50%]",
    "사진 폭은 1%~100%로 적어 주십시오: [photo2 120%]",
    "2번 사진을 본문에 두 번 넣었습니다: [photo2 120%]",
    "사진 표시를 알아볼 수 없습니다: [photo2 big] (예: [photo1], [photo1 100%], [photo2 photo3])",
  ]);
});

Deno.test("slugFromTitle keeps the meaningful words, up to 5 and 40 characters", () => {
  assertEquals(
    slugFromTitle("HARCO Lab Participated in AIM 2026"),
    "participated_aim_2026",
  );
  assertEquals(
    slugFromTitle("Participated in the IROS 2025 in Hangzhou"),
    "participated_iros_2025_hangzhou",
  );
  assertEquals(
    slugFromTitle(
      "HARCO Lab Widely Active at KRoC 2026: From Core Tech to Human-Centric Vision",
    ),
    "widely_active_kroc_2026_core",
  );
  assertEquals(
    slugFromTitle("Seminar by Prof. Joohyung Kim (UIUC) - Robots"),
    "seminar_prof_joohyung_kim_uiuc",
  );
  assertEquals(slugFromTitle("Café Visit"), "cafe_visit");
  assertEquals(
    slugFromTitle(
      "Pneumonoultramicroscopicsilicovolcanoconiosis Awareness Day",
    ),
    "pneumonoultramicroscopicsilicovolcanocon",
  );
  assertEquals(slugFromTitle("The Lab"), "");
});

Deno.test("normalizeInput uses a typed file name, or one from the title", () => {
  assertEquals(
    normalizeInput({ ...post, slug: " AIM 2026 " }).slug,
    "aim_2026",
  );
  assertEquals(
    normalizeInput({ ...post, slug: "" }).slug,
    "participated_aim_2026",
  );
  assertEquals(
    validateInput(normalizeInput({ ...post, title: "The Lab", slug: "" }), 0),
    [
      "제목으로 파일 이름을 만들 수 없습니다. 파일 이름을 직접 적어 주십시오. (예: aim2026)",
    ],
  );
});

Deno.test("normalizeInput re-spaces comma-separated members", () => {
  assertEquals(
    normalizeInput({ ...post, member: "Prof. Wansoo Kim,Oh  Jihwan ,, " })
      .member,
    "Prof. Wansoo Kim, Oh Jihwan",
  );
});

Deno.test("validateInput accepts English only", () => {
  const problems = validateInput(
    normalizeInput({
      ...post,
      title: "AIM 2026 참가",
      author: "하성민",
      member: "김완수",
      body: "First line.\n연구실 멤버들이 AIM 2026 학회에 참가했습니다.",
    }),
    0,
  );
  assertEquals(problems, [
    "제목에 한글이 있습니다. 영문으로만 작성해 주십시오.",
    "작성자에 한글이 있습니다. 영문으로만 작성해 주십시오.",
    "관련 멤버에 한글이 있습니다. 영문으로만 작성해 주십시오.",
    '본문에 한글이 있습니다. 영문으로만 작성해 주십시오: "연구실 멤버들이 AIM 2026 학회에 참가했습니다."',
  ]);
  assertEquals(
    validateInput(
      normalizeInput({ ...post, body: "“Quoted” ■ Talk — Genoa, Italy" }),
      0,
    ),
    [],
  );
});

Deno.test("validateInput wants members separated by commas", () => {
  const problems = (member: string) =>
    validateInput(normalizeInput({ ...post, member }), 0);
  assertEquals(problems("Prof. Wansoo Kim and Oh Jihwan"), [
    "관련 멤버는 , 로 구분해 주십시오 (예: Prof. Wansoo Kim, Oh Jihwan).",
  ]);
  assertEquals(problems("Kai Li / Dong-gyu Lee").length, 1);
  assertEquals(problems("All Member, Kai Li"), [
    "All Member는 다른 멤버와 함께 쓰지 말고 단독으로 적어 주십시오.",
  ]);
  assertEquals(problems("Alexandra Anderson, Kai Li"), []);
});

Deno.test("paths follow CONVENTIONS.md", () => {
  assertEquals(postPath(post), "_posts/news/2026-07-07-news_aim2026.md");
  assertEquals(branchName(post), "content/slack/2026-07-07-news_aim2026");
  assertEquals(
    imagePath(post, 1, "jpg"),
    "images/news/260707_aim2026/aim2026_1.jpg",
  );
});

Deno.test("imageExtension normalizes and rejects unsupported types", () => {
  assertEquals(imageExtension("JPEG"), "jpg");
  assertEquals(imageExtension("png"), "png");
  assertEquals(imageExtension("heic"), undefined);
});

Deno.test("renderPost writes frontmatter and appends unplaced photos", () => {
  const rendered = renderPost(post, [
    "images/news/260707_aim2026/aim2026_1.jpg",
  ]);
  assertEquals(
    rendered.split("\n").slice(0, 7),
    [
      "---",
      'title: "HARCO Lab Participated in AIM 2026"',
      "date: 2026-07-07",
      "author: Seongmin Ha",
      "member: Prof. Wansoo Kim, Oh Jihwan",
      "group: news",
      "---",
    ],
  );
  assertEquals(
    bodyOf(rendered),
    [
      post.body,
      figures("80%", "images/news/260707_aim2026/aim2026_1.jpg"),
    ].join("\n\n") + "\n",
  );
});

Deno.test("renderPost places marked photos, side by side when grouped", () => {
  const rendered = renderPost({
    ...post,
    body: "Intro\n[photo2 100%]\nMiddle\n\n[photo1 photo3]\n\nEnd",
  }, ["p1.jpg", "p2.jpg", "p3.jpg", "p4.jpg"]);
  assertEquals(
    bodyOf(rendered),
    [
      "Intro",
      figures("100%", "p2.jpg"),
      "Middle",
      figures("45%", "p1.jpg", "p3.jpg"),
      "End",
      figures("80%", "p4.jpg"),
    ].join("\n\n") + "\n",
  );
});

Deno.test("renderPost quotes YAML values that need it", () => {
  const rendered = renderPost({
    ...post,
    title: 'Talk: "Robots" & People',
    author: "Kim: Guest",
    member: "Guest #1",
  }, []);
  assertStringIncludes(rendered, 'title: "Talk: \\"Robots\\" & People"');
  assertStringIncludes(rendered, 'author: "Kim: Guest"');
  assertStringIncludes(rendered, 'member: "Guest #1"');
});
