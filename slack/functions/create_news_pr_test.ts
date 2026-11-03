import { SlackFunctionTester } from "deno-slack-sdk/mod.ts";
import { SlackAPI } from "deno-slack-api/mod.ts";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";
import CreateNewsPr, {
  cancelDraft,
  createPullRequest,
  openEditor,
  saveEdits,
} from "./create_news_pr.ts";

const { createContext } = SlackFunctionTester("create_news_pr");

const env = { GITHUB_TOKEN: "github-token" };
const token = "xoxb-test";
const inputs = {
  title: "HARCO Lab Participated in AIM 2026",
  date: "2026-07-07",
  slug: "aim2026",
  author: "Seongmin Ha",
  member: "Prof. Wansoo Kim, Oh Jihwan",
  body: "Members of **HARCO Lab** attended AIM 2026.",
  body2: "[photo1 100%]\n\nThey presented a pulley module.",
  images: ["F123"],
  submitter: "U123",
  channel: "C123",
};
const POST_PATH = "_posts/news/2026-07-07-news_aim2026.md";

interface Call {
  method: string;
  url: URL;
  body: string;
}

// deno-lint-ignore no-explicit-any
type Params = Record<string, any>;

/**
 * Fakes the Slack Web API (including the datastore), Slack file downloads and
 * the GitHub REST API. `existingPaths` can be changed between steps.
 */
function fakeApis(
  options: {
    existingPaths?: string[];
    downloadType?: string;
    rejectImageBlocks?: boolean;
  } = {},
) {
  const existingPaths = options.existingPaths ?? [];
  const calls: Call[] = [];
  const store = new Map<string, Params>();
  let blobCount = 0;

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    });

  const fetchStub = stub(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request
        ? input
        : new Request(input, init);
      const url = new URL(request.url);
      const body = request.method === "GET" ? "" : await request.text();
      calls.push({ method: request.method, url, body });

      if (url.host === "slack.com") {
        const params: Params = Object.fromEntries(new URLSearchParams(body));
        switch (url.pathname) {
          case "/api/files.info":
            return json({
              ok: true,
              file: {
                id: "F123",
                name: "IMG_0001.JPG",
                filetype: "jpg",
                size: 4,
                url_private:
                  "https://files.slack.com/files-pri/T1-F123/img.jpg",
                url_private_download:
                  "https://files.slack.com/files-pri/T1-F123/download/img.jpg",
              },
            });
          case "/api/chat.postMessage":
          case "/api/chat.update":
            if (
              options.rejectImageBlocks &&
              params.blocks?.includes('"type":"image"')
            ) {
              return json({ ok: false, error: "invalid_blocks" });
            }
            return json({
              ok: true,
              channel: params.channel.startsWith("U") ? "D123" : params.channel,
              ts: params.ts ?? "111.222",
            });
          case "/api/views.open":
          case "/api/functions.completeSuccess":
            return json({ ok: true });
          case "/api/apps.datastore.put": {
            const item = JSON.parse(params.item);
            store.set(item.id, item);
            return json({ ok: true, item });
          }
          case "/api/apps.datastore.get":
            return json({ ok: true, item: store.get(params.id) ?? {} });
          case "/api/apps.datastore.delete":
            store.delete(params.id);
            return json({ ok: true });
        }
      }
      if (url.host === "files.slack.com") {
        return new Response(new Uint8Array([1, 2, 3, 4]), {
          headers: { "content-type": options.downloadType ?? "image/jpeg" },
        });
      }

      const path = url.pathname.replace(
        "/repos/harco-lab/harco-lab.github.io",
        "",
      );
      const route = `${request.method} ${path}`;
      if (route.startsWith("GET /contents/")) {
        const repoPath = decodeURIComponent(path.slice("/contents/".length));
        return existingPaths.includes(repoPath)
          ? json({ path: repoPath })
          : json({ message: "Not Found" }, 404);
      }
      if (route === "GET /git/ref/heads/main") {
        return json({ object: { sha: "base-sha" } });
      }
      if (route.startsWith("GET /git/ref/heads/")) {
        return json({ message: "Not Found" }, 404);
      }
      if (route === "GET /git/commits/base-sha") {
        return json({ tree: { sha: "base-tree" } });
      }
      if (route === "POST /git/blobs") {
        return json({ sha: `blob-${++blobCount}` });
      }
      if (route === "POST /git/trees") return json({ sha: "new-tree" });
      if (route === "POST /git/commits") return json({ sha: "new-commit" });
      if (route === "POST /git/refs") return json({ ref: "ok" });
      if (route === "POST /pulls") {
        return json({
          html_url: "https://github.com/harco-lab/harco-lab.github.io/pull/56",
          number: 56,
        });
      }
      throw new Error(`Unexpected request: ${route}`);
    },
  );

  const find = (method: string, pathname: string) =>
    calls.filter((call) =>
      call.method === method && call.url.pathname.endsWith(pathname)
    );
  /** Slack API calls to `method`, with `blocks` and `view` decoded. */
  const slack = (method: string): Params[] =>
    find("POST", `/api/${method}`).map((call) => {
      const params: Params = Object.fromEntries(new URLSearchParams(call.body));
      for (const key of ["blocks", "view", "outputs"]) {
        if (params[key]) params[key] = JSON.parse(params[key]);
      }
      return params;
    });
  const githubWrites = () =>
    calls.filter((call) =>
      call.url.host === "api.github.com" && call.method === "POST"
    );
  const draftState = () => {
    const [item] = [...store.values()];
    return item ? JSON.parse(item.state) : undefined;
  };
  const draftId = () => [...store.keys()][0];

  return {
    fetchStub,
    existingPaths,
    store,
    find,
    slack,
    githubWrites,
    draftState,
    draftId,
  };
}

type Api = ReturnType<typeof fakeApis>;

/** Runs the workflow step: it should post the preview and keep running. */
async function submit(api: Api, overrides: Params = {}) {
  const result = await CreateNewsPr(
    createContext({ inputs: { ...inputs, ...overrides }, env, token }),
  );
  assertEquals(result, { completed: false });
  return api.draftId();
}

function actionArgs(id: string) {
  return {
    body: {
      function_data: { execution_id: id },
      interactivity: { interactivity_pointer: "pointer-1" },
      channel: { id: "D123" },
      message: { ts: "111.222" },
    },
    client: SlackAPI(token),
    env,
    token,
  };
}

// deno-lint-ignore no-explicit-any
function actionIds(blocks: any[]): string[] {
  return blocks.filter((block) => block.type === "actions")
    .flatMap((block) =>
      // deno-lint-ignore no-explicit-any
      block.elements.map((element: any) => element.action_id)
    );
}

Deno.test("posts a preview DM and waits without touching GitHub", async () => {
  const api = fakeApis();
  using _fetch = api.fetchStub;

  await submit(api);

  assertEquals(api.githubWrites(), []);
  const [preview] = api.slack("chat.postMessage");
  assertEquals(preview.channel, "U123");
  const text = JSON.stringify(preview.blocks);
  assertStringIncludes(text, "Members of **HARCO Lab** attended AIM 2026.");
  assertStringIncludes(
    text,
    "Seongmin Ha · 관련 멤버: Prof. Wansoo Kim, Oh Jihwan",
  );
  assertStringIncludes(text, '"slack_file":{"id":"F123"}');
  assertEquals(actionIds(preview.blocks), [
    "create_pr",
    "edit_draft",
    "cancel_draft",
  ]);
  const state = api.draftState();
  assertEquals(state.status, "draft");
  assertEquals(state.messageTs, "111.222");
  assertEquals(state.dmChannel, "D123");
});

Deno.test("names the files after the title when no file name is given", async () => {
  const api = fakeApis();
  using _fetch = api.fetchStub;
  const id = await submit(api, { slug: undefined });

  const [preview] = api.slack("chat.postMessage");
  assertStringIncludes(
    JSON.stringify(preview.blocks),
    "2026-07-07-news_participated_aim_2026.md` · 제목으로 만든 파일 이름입니다.",
  );
  await createPullRequest(actionArgs(id));

  const tree = JSON.parse(api.find("POST", "/git/trees")[0].body);
  assertEquals(
    tree.tree.map((entry: { path: string }) => entry.path),
    [
      "_posts/news/2026-07-07-news_participated_aim_2026.md",
      "images/news/260707_participated_aim_2026/participated_aim_2026_1.jpg",
    ],
  );
});

Deno.test("lists every problem without a PR button", async () => {
  const api = fakeApis({ existingPaths: [] });
  using _fetch = api.fetchStub;

  await submit(api, { slug: "에이아이엠", body: "Use {{ site.title }}" });

  assertEquals(api.githubWrites(), []);
  const [preview] = api.slack("chat.postMessage");
  const text = JSON.stringify(preview.blocks);
  assertStringIncludes(text, "파일 이름은 영문 소문자");
  assertStringIncludes(text, "사이트 빌드가 깨집니다");
  assertEquals(actionIds(preview.blocks), ["edit_draft", "cancel_draft"]);
});

Deno.test("flags Korean text and members not separated by commas", async () => {
  const api = fakeApis();
  using _fetch = api.fetchStub;

  await submit(api, {
    member: "Prof. Wansoo Kim and Oh Jihwan",
    body2: "연구실 소식입니다.",
  });

  assertEquals(api.githubWrites(), []);
  const [preview] = api.slack("chat.postMessage");
  const text = JSON.stringify(preview.blocks);
  assertStringIncludes(text, "본문에 한글이 있습니다");
  assertStringIncludes(text, "관련 멤버는 , 로 구분해 주십시오");
  assertEquals(actionIds(preview.blocks), ["edit_draft", "cancel_draft"]);
});

Deno.test("PR 만들기 opens the PR, announces it and completes the step", async () => {
  const api = fakeApis();
  using _fetch = api.fetchStub;
  const id = await submit(api);

  await createPullRequest(actionArgs(id));

  const tree = JSON.parse(api.find("POST", "/git/trees")[0].body);
  assertEquals(
    tree.tree.map((entry: { path: string }) => entry.path),
    [POST_PATH, "images/news/260707_aim2026/aim2026_1.jpg"],
  );
  const blobs = api.find("POST", "/git/blobs").map((call) =>
    JSON.parse(call.body)
  );
  const post = blobs.find((blob) => blob.encoding === "utf-8");
  assertStringIncludes(post.content, "date: 2026-07-07");
  assertStringIncludes(post.content, "author: Seongmin Ha");
  assertStringIncludes(post.content, "member: Prof. Wansoo Kim, Oh Jihwan");
  assertStringIncludes(
    post.content,
    'aim2026_1.jpg" width="100%" %}\n</div>\n\nThey presented a pulley module.\n',
  );
  const image = blobs.find((blob) => blob.encoding === "base64");
  assertEquals(image.content, btoa(String.fromCharCode(1, 2, 3, 4)));
  const ref = JSON.parse(api.find("POST", "/git/refs")[0].body);
  assertEquals(ref.ref, "refs/heads/content/slack/2026-07-07-news_aim2026");

  const announcement = api.slack("chat.postMessage").find((message) =>
    message.channel === "C123"
  )!;
  assertStringIncludes(announcement.text, "pull/56");
  const done = api.slack("chat.update").at(-1)!;
  assertEquals(actionIds(done.blocks), []);
  assertStringIncludes(JSON.stringify(done.blocks), "PR #56");
  const [completed] = api.slack("functions.completeSuccess");
  assertEquals(completed.function_execution_id, id);
  assertEquals(
    completed.outputs.pr_url,
    "https://github.com/harco-lab/harco-lab.github.io/pull/56",
  );
  assertEquals(api.store.size, 0);
});

Deno.test("PR 만들기 re-checks and keeps the draft when the post now exists", async () => {
  const api = fakeApis();
  using _fetch = api.fetchStub;
  const id = await submit(api);
  api.existingPaths.push(POST_PATH);

  await createPullRequest(actionArgs(id));

  assertEquals(api.githubWrites(), []);
  const shown = api.slack("chat.update").at(-1)!;
  assertStringIncludes(
    JSON.stringify(shown.blocks),
    "같은 게시물이 이미 있습니다",
  );
  assertEquals(actionIds(shown.blocks), ["edit_draft", "cancel_draft"]);
  assertEquals(api.draftState().status, "draft");
  assertEquals(api.slack("functions.completeSuccess"), []);
});

Deno.test("PR 만들기 shows the error and keeps the buttons when a photo fails", async () => {
  const api = fakeApis({ downloadType: "text/html; charset=utf-8" });
  using _fetch = api.fetchStub;
  const id = await submit(api);

  await createPullRequest(actionArgs(id));

  assertEquals(api.find("POST", "/pulls"), []);
  const shown = api.slack("chat.update").at(-1)!;
  assertStringIncludes(
    JSON.stringify(shown.blocks),
    "Slack 파일을 받지 못했습니다",
  );
  assertEquals(actionIds(shown.blocks), [
    "create_pr",
    "edit_draft",
    "cancel_draft",
  ]);
  assertEquals(api.draftState().status, "draft");
});

Deno.test("수정하기 opens a filled form and saving refreshes the preview", async () => {
  const api = fakeApis();
  using _fetch = api.fetchStub;
  const id = await submit(api);

  await openEditor(actionArgs(id));
  const [opened] = api.slack("views.open");
  assertEquals(opened.interactivity_pointer, "pointer-1");
  assertEquals(opened.view.private_metadata, id);
  assertEquals(opened.view.blocks[0].element.initial_value, inputs.title);

  const values = {
    title: { value: { value: "AIM 2026 (edited)" } },
    date: { value: { selected_date: "2026-07-07" } },
    slug: { value: { value: "aim2026" } },
    author: { value: { value: "Seongmin Ha" } },
    member: { value: { value: "All Member" } },
    body1: { value: { value: "Edited body.\n\n[photo1]" } },
    body2: { value: { value: null } },
    body3: { value: { value: null } },
    images: { value: { files: [] } },
  };
  const response = await saveEdits({
    view: { private_metadata: id, state: { values } },
    client: SlackAPI(token),
    env,
  });

  assertEquals(response, undefined);
  const updated = api.slack("chat.update").at(-1)!;
  assertEquals(updated.ts, "111.222");
  assertStringIncludes(JSON.stringify(updated.blocks), "AIM 2026 (edited)");
  assertStringIncludes(
    JSON.stringify(updated.blocks),
    "Seongmin Ha · 관련 멤버: All Member",
  );
  const state = api.draftState();
  assertEquals(state.draft.title, "AIM 2026 (edited)");
  assertEquals(state.draft.imageIds, ["F123"]);
});

Deno.test("취소 keeps the preview, removes the buttons and completes the step", async () => {
  const api = fakeApis();
  using _fetch = api.fetchStub;
  const id = await submit(api);

  await cancelDraft(actionArgs(id));

  const shown = api.slack("chat.update").at(-1)!;
  assertEquals(actionIds(shown.blocks), []);
  assertStringIncludes(
    JSON.stringify(shown.blocks),
    "Members of **HARCO Lab**",
  );
  assertStringIncludes(JSON.stringify(shown.blocks), "제출을 취소했습니다");
  assertEquals(api.slack("functions.completeSuccess").length, 1);
  assertEquals(api.store.size, 0);
  assertEquals(api.githubWrites(), []);
});

Deno.test("buttons on an expired preview say so", async () => {
  const api = fakeApis();
  using _fetch = api.fetchStub;

  await createPullRequest(actionArgs("Fx-gone"));

  const [shown] = api.slack("chat.update");
  assertStringIncludes(shown.text, "만료되었습니다");
  assertEquals(api.githubWrites(), []);
});

Deno.test("falls back to file names when Slack rejects the photo blocks", async () => {
  const api = fakeApis({ rejectImageBlocks: true });
  using _fetch = api.fetchStub;

  await submit(api);

  const [rejected, accepted] = api.slack("chat.postMessage");
  assert(JSON.stringify(rejected.blocks).includes('"type":"image"'));
  assertStringIncludes(
    JSON.stringify(accepted.blocks),
    "사진 1 · 폭 100%: IMG_0001.JPG",
  );
  assertEquals(api.draftState().messageTs, "111.222");
});
