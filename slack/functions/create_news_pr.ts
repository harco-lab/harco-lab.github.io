import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-api/types.ts";
import { NewsDraftsDatastore } from "../datastores/news_drafts.ts";
import { GitHubClient } from "./github.ts";
import {
  CANCEL_ACTION,
  CREATE_PR_ACTION,
  draftFromInputs,
  draftFromView,
  draftToPost,
  EDIT_ACTION,
  EDIT_VIEW,
  editView,
  escapeSlack,
  type NewsDraft,
  previewBlocks,
  type PreviewMode,
  type ViewValues,
} from "./news_draft.ts";
import {
  branchName,
  imageExtension,
  imagePath,
  type NewsPostInput,
  postPath,
  renderPost,
  renderPullRequestBody,
  validateInput,
} from "./news_post.ts";

const DEFAULT_REPO = "harco-lab/harco-lab.github.io";
const DEFAULT_BASE_BRANCH = "main";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DRAFT_TTL_SECONDS = 7 * 24 * 60 * 60;
const PREVIEW_MODES: PreviewMode[] = ["full", "no_photos", "summary"];
const EXPIRED_TEXT =
  "이 미리보기는 만료되었습니다. 뉴스 채널의 링크에서 폼을 다시 작성해 주십시오.";

type Env = Record<string, string>;

interface SlackFile {
  id: string;
  name: string;
  filetype: string;
  size: number;
  url_private: string;
  url_private_download?: string;
}

/** What the buttons and the edit form need between handler invocations. */
interface DraftState {
  draft: NewsDraft;
  submitter: string;
  /** Where the PR link is announced: the channel the form was opened from. */
  channel: string;
  fileNames: string[];
  status: "draft" | "creating";
  dmChannel?: string;
  messageTs?: string;
}

interface Review {
  post: NewsPostInput;
  problems: string[];
  files: SlackFile[];
}

interface ActionArgs {
  body: {
    function_data: { execution_id: string };
    interactivity: { interactivity_pointer: string };
    channel?: { id: string };
    message?: { ts: string };
  };
  client: SlackAPIClient;
  env: Env;
  token: string;
}

interface ViewArgs {
  view: { private_metadata?: string; state: { values: unknown } };
  client: SlackAPIClient;
  env: Env;
}

export const CreateNewsPrDefinition = DefineFunction({
  callback_id: "create_news_pr",
  title: "Create news post PR",
  description:
    "Preview a news post in a DM, let the submitter edit it, then commit it with its photos to a new branch of the site repository and open a pull request",
  source_file: "functions/create_news_pr.ts",
  input_parameters: {
    properties: {
      title: { type: Schema.types.string },
      date: { type: Schema.slack.types.date },
      slug: { type: Schema.types.string },
      author: { type: Schema.types.string },
      member: { type: Schema.types.string },
      body: { type: Schema.types.string },
      body2: { type: Schema.types.string },
      body3: { type: Schema.types.string },
      images: {
        type: Schema.types.array,
        items: { type: Schema.slack.types.file_id },
      },
      submitter: { type: Schema.slack.types.user_id },
      channel: { type: Schema.slack.types.channel_id },
    },
    required: [
      "title",
      "date",
      "author",
      "member",
      "body",
      "submitter",
      "channel",
    ],
  },
  output_parameters: {
    properties: {
      pr_url: { type: Schema.types.string },
    },
    required: [],
  },
});

/**
 * Sends the submitter a preview DM and leaves the step running. It completes
 * when the submitter creates the PR or cancels from that DM.
 */
export default SlackFunction(
  CreateNewsPrDefinition,
  async ({ inputs, env, client, event }) => {
    try {
      await refreshPreview(client, env, event.function_execution_id, {
        draft: draftFromInputs(inputs),
        submitter: inputs.submitter,
        channel: inputs.channel,
        fileNames: [],
        status: "draft",
      });
      return { completed: false };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  },
)
  .addBlockActionsHandler(CREATE_PR_ACTION, createPullRequest)
  .addBlockActionsHandler(EDIT_ACTION, openEditor)
  .addBlockActionsHandler(CANCEL_ACTION, cancelDraft)
  .addViewSubmissionHandler(EDIT_VIEW, saveEdits);

export async function createPullRequest(
  { body, client, env, token }: ActionArgs,
) {
  const id = body.function_data.execution_id;
  const state = await loadDraft(client, id);
  if (!state) return await showExpired(client, body);
  if (state.status === "creating") return;

  await saveDraft(client, id, { ...state, status: "creating" });
  await showPreview(client, state, {
    status: ":hourglass_flowing_sand: PR을 만들고 있습니다…",
  });
  try {
    // Re-check: the file name may have been taken since the preview was shown.
    const review = await reviewDraft(client, env, state.draft);
    if (review.problems.length > 0) {
      const shown = await showPreview(client, {
        ...state,
        fileNames: review.files.map((file) => file.name),
      }, { problems: review.problems });
      await saveDraft(client, id, shown);
      return;
    }

    const pr = await openPullRequest(env, token, review, state.submitter);
    await postMessage(
      client,
      state.channel,
      `:newspaper: <@${state.submitter}> 님이 뉴스 게시물 *${
        escapeSlack(review.post.title)
      }* 을(를) 제출했습니다. 검토 후 병합하면 사이트에 게시됩니다.\n<${pr.url}|PR #${pr.number} 보기>`,
    );
    await showPreview(client, state, {
      status:
        `:white_check_mark: <${pr.url}|PR #${pr.number}>을 만들었습니다. 관리자가 검토하고 병합하면 사이트에 게시됩니다.`,
    });
    await deleteDraft(client, id);
    await completeStep(client, id, { pr_url: pr.url });
  } catch (error) {
    const shown = await showPreview(client, state, {
      error: `PR을 만들지 못했습니다: ${errorMessage(error)}`,
    });
    await saveDraft(client, id, shown);
  }
}

export async function openEditor({ body, client }: ActionArgs) {
  const id = body.function_data.execution_id;
  const state = await loadDraft(client, id);
  if (!state) return await showExpired(client, body);
  if (state.status === "creating") return;

  const response = await client.views.open({
    interactivity_pointer: body.interactivity.interactivity_pointer,
    view: editView(state.draft, id),
  });
  if (!response.ok) {
    console.error(
      `views.open failed: ${response.error} ${
        JSON.stringify(response.response_metadata ?? {})
      }`,
    );
  }
}

export async function saveEdits({ view, client, env }: ViewArgs) {
  const id = view.private_metadata ?? "";
  const state = await loadDraft(client, id);
  if (!state || state.status === "creating") {
    return {
      response_action: "errors",
      errors: {
        title: state ? "PR을 만들고 있어서 수정할 수 없습니다." : EXPIRED_TEXT,
      },
    };
  }
  await refreshPreview(client, env, id, {
    ...state,
    draft: draftFromView(view.state.values as ViewValues, state.draft),
  });
}

export async function cancelDraft({ body, client }: ActionArgs) {
  const id = body.function_data.execution_id;
  const state = await loadDraft(client, id);
  if (!state) {
    await showExpired(client, body);
  } else if (state.status === "creating") {
    return;
  } else {
    await showPreview(client, state, {
      status:
        "제출을 취소했습니다. 다시 작성하려면 뉴스 채널의 링크에서 폼을 열어 주십시오.",
    });
    await deleteDraft(client, id);
  }
  await completeStep(client, id, {});
}

/** Re-checks the draft, then shows it with its problems and buttons. */
async function refreshPreview(
  client: SlackAPIClient,
  env: Env,
  id: string,
  state: DraftState,
) {
  let problems: string[];
  let fileNames = state.fileNames;
  try {
    const review = await reviewDraft(client, env, state.draft);
    problems = review.problems;
    fileNames = review.files.map((file) => file.name);
  } catch (error) {
    problems = [`확인하는 중에 문제가 생겼습니다: ${errorMessage(error)}`];
  }
  const shown = await showPreview(
    client,
    { ...state, fileNames, status: "draft" },
    { problems },
  );
  await saveDraft(client, id, shown);
}

async function reviewDraft(
  client: SlackAPIClient,
  env: Env,
  draft: NewsDraft,
): Promise<Review> {
  const post = draftToPost(draft);
  const problems = validateInput(post, draft.imageIds.length);
  const files = await Promise.all(
    draft.imageIds.map((id) => fetchFileInfo(client, id)),
  );
  problems.push(...files.flatMap(checkImage));
  if (problems.length === 0) {
    problems.push(
      ...await checkRepository(githubClient(env), post, baseBranch(env)),
    );
  }
  return { post, problems, files };
}

/**
 * Posts the preview DM, or updates it once it exists. If Slack rejects the
 * blocks, retries without the photos and then without the body.
 */
async function showPreview(
  client: SlackAPIClient,
  state: DraftState,
  options: { problems?: string[]; error?: string; status?: string },
): Promise<DraftState> {
  const text = `뉴스 게시물 미리보기: ${state.draft.title}`;
  let lastError = "";
  for (const mode of PREVIEW_MODES) {
    const blocks = previewBlocks({
      ...options,
      draft: state.draft,
      fileNames: state.fileNames,
      mode,
    });
    const response = state.messageTs
      ? await client.chat.update({
        channel: state.dmChannel!,
        ts: state.messageTs,
        text,
        blocks,
      })
      : await client.chat.postMessage({
        channel: state.submitter,
        text,
        blocks,
      });
    if (response.ok) {
      return { ...state, dmChannel: response.channel, messageTs: response.ts };
    }
    lastError = response.error ?? "unknown_error";
    console.error(
      `Preview (${mode}) rejected: ${response.error} ${
        JSON.stringify(response.response_metadata ?? {})
      }`,
    );
  }
  throw new Error(`미리보기를 보내지 못했습니다: ${lastError}`);
}

async function showExpired(
  client: SlackAPIClient,
  body: ActionArgs["body"],
) {
  if (!body.channel || !body.message) return;
  await client.chat.update({
    channel: body.channel.id,
    ts: body.message.ts,
    text: EXPIRED_TEXT,
    blocks: [],
  });
}

async function openPullRequest(
  env: Env,
  token: string,
  { post, files }: Review,
  submitter: string,
): Promise<{ url: string; number: number }> {
  const images = await Promise.all(files.map(async (file, i) => ({
    path: imagePath(post, i + 1, imageExtension(file.filetype)!),
    content: await downloadSlackFile(file, token),
  })));
  const imagePaths = images.map((image) => image.path);

  return await githubClient(env).openPullRequest({
    base: baseBranch(env),
    branch: branchName(post),
    title: `Add news post: ${post.title}`,
    body: renderPullRequestBody(post, imagePaths, submitter),
    commitMessage:
      `Add news post: ${post.title}\n\nSubmitted via the Slack news form.`,
    files: [
      { path: postPath(post), content: renderPost(post, imagePaths) },
      ...images,
    ],
  });
}

function githubClient(env: Env): GitHubClient {
  if (!env.GITHUB_TOKEN) {
    throw new Error(
      "GITHUB_TOKEN이 설정되지 않았습니다. 관리자에게 알려 주십시오 (`slack env set GITHUB_TOKEN`).",
    );
  }
  return new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO || DEFAULT_REPO);
}

function baseBranch(env: Env): string {
  return env.GITHUB_BASE_BRANCH || DEFAULT_BASE_BRANCH;
}

async function checkRepository(
  github: GitHubClient,
  post: NewsPostInput,
  base: string,
): Promise<string[]> {
  const [postTaken, branchTaken] = await Promise.all([
    github.pathExists(postPath(post), base),
    github.branchExists(branchName(post)),
  ]);

  const problems: string[] = [];
  if (postTaken) {
    problems.push(
      `같은 게시물이 이미 있습니다: ${
        postPath(post)
      } (파일 이름이나 날짜를 바꿔 주십시오)`,
    );
  }
  if (branchTaken) {
    problems.push(
      `이 게시물의 PR 브랜치가 이미 있습니다: ${
        branchName(post)
      } (열려 있는 PR을 확인해 주십시오)`,
    );
  }
  return problems;
}

async function loadDraft(
  client: SlackAPIClient,
  id: string,
): Promise<DraftState | undefined> {
  const response = await client.apps.datastore.get<
    typeof NewsDraftsDatastore.definition
  >({ datastore: NewsDraftsDatastore.name, id });
  if (!response.ok) {
    throw new Error(`Slack datastore get failed: ${response.error}`);
  }
  return response.item?.state ? JSON.parse(response.item.state) : undefined;
}

async function saveDraft(
  client: SlackAPIClient,
  id: string,
  state: DraftState,
) {
  const response = await client.apps.datastore.put<
    typeof NewsDraftsDatastore.definition
  >({
    datastore: NewsDraftsDatastore.name,
    item: {
      id,
      state: JSON.stringify(state),
      expires_at: Math.floor(Date.now() / 1000) + DRAFT_TTL_SECONDS,
    },
  });
  if (!response.ok) {
    throw new Error(`Slack datastore put failed: ${response.error}`);
  }
}

async function deleteDraft(client: SlackAPIClient, id: string) {
  const response = await client.apps.datastore.delete({
    datastore: NewsDraftsDatastore.name,
    id,
  });
  if (!response.ok) {
    console.error(`Slack datastore delete failed: ${response.error}`);
  }
}

async function completeStep(
  client: SlackAPIClient,
  id: string,
  outputs: Record<string, string>,
) {
  const response = await client.functions.completeSuccess({
    function_execution_id: id,
    outputs,
  });
  if (!response.ok) {
    console.error(`functions.completeSuccess failed: ${response.error}`);
  }
}

async function fetchFileInfo(
  client: SlackAPIClient,
  id: string,
): Promise<SlackFile> {
  const response = await client.files.info({ file: id });
  if (!response.ok) {
    throw new Error(`Slack files.info failed for ${id}: ${response.error}`);
  }
  return response.file as SlackFile;
}

function checkImage(file: SlackFile): string[] {
  if (!imageExtension(file.filetype)) {
    return [
      `${file.name}: JPG, PNG, GIF만 올릴 수 있습니다 (HEIC 등은 JPG로 바꿔 주십시오)`,
    ];
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return [`${file.name}: 사진은 장당 10MB 이하로 올려 주십시오`];
  }
  return [];
}

async function downloadSlackFile(
  file: SlackFile,
  token: string,
): Promise<Uint8Array> {
  const response = await fetch(file.url_private_download ?? file.url_private, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // A token without files:read gets a 200 with Slack's HTML login page.
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || contentType.startsWith("text/html")) {
    throw new Error(
      `Slack 파일을 받지 못했습니다: ${file.name} (${response.status} ${contentType})`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function postMessage(
  client: SlackAPIClient,
  channel: string,
  text: string,
) {
  const response = await client.chat.postMessage({ channel, text });
  if (!response.ok) {
    console.error(`chat.postMessage to ${channel} failed: ${response.error}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
