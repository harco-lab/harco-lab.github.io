# HARCO News Slack app

A Slack app (Deno Slack SDK, runs on Slack's infrastructure) that lets lab
members submit a news post from a Slack form. It opens a pull request on this
repository. When a reviewer merges the PR, GitHub Pages publishes the post.

```text
Link in the news channel ─▶ form ─▶ create_news_pr function
                                     ├─ validates input (slug, photo markers, CONVENTIONS.md rules)
                                     └─ DMs the submitter a preview with three buttons
                                          ├─ PR 만들기: re-checks, downloads the photos, commits post + photos
                                          │            to content/slack/<date>-news_<slug>, opens a PR against
                                          │            main and posts the PR link in the channel
                                          ├─ 수정하기: opens the form again, filled with the draft;
                                          │            saving refreshes the preview
                                          └─ 취소:     ends without a PR; the preview stays in the DM
```

The preview shows the body as Markdown with each photo where its marker is.
Font, photo width and side-by-side layout are only visible on the site, so check
those in the PR. While the draft has problems (bad slug, photo marker without a
photo, duplicate post, unsupported photo), the preview lists them and hides **PR
만들기**; nothing is written to GitHub until the submitter fixes them with
**수정하기**. In the edit form, leaving the photo field empty keeps the current
photos and uploading new ones replaces all of them.

Drafts are kept in the `news_drafts` datastore, keyed by the workflow step's
execution ID, and Slack deletes them after 7 days. Buttons on an older preview
reply that it has expired.

If Slack rejects the photo blocks, the preview lists the photo file names
instead. If it rejects the body too, the preview shows only the post details and
the buttons.

## What the form produces

| Form field            | Result                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Title (English)       | `title:`                                                                                           |
| Date                  | `date:`, filename date and image folder (`YYMMDD_`)                                                |
| File name (optional)  | `_posts/news/YYYY-MM-DD-news_<slug>.md`, `images/news/YYMMDD_<slug>/`                              |
| Author (English name) | `author:`                                                                                          |
| Related members       | `member:`, names separated by commas (e.g. `Prof. Wansoo Kim, Oh Jihwan`) or `All Member`          |
| Body 1–3 (Markdown)   | post body; the fields are joined with a blank line                                                 |
| Photos (0–10)         | `images/news/YYMMDD_<slug>/<slug>_<n>.jpg`, placed by `[photoN]` markers as `figure.html` includes |

Leave the file name empty to build it from the title: lowercase words joined
with `_`, without filler words (`the`, `in`, `at`, …) or `HARCO Lab`, at most 5
words and 40 characters, so "HARCO Lab Participated in AIM 2026" becomes
`participated_aim_2026`. The preview shows the result; type a shorter name such
as `aim2026` in **수정하기** if it reads oddly.

Write the title, author, related members and body in English: text with Hangul
is reported in the preview and blocks the PR. Separate related members with
commas; `and`, `/`, `;` or `&` between names is reported too. A `member:` that
is a single `_members/` filename (e.g. `jungsoo_lee`) links the author name to
that profile. Any other value is shown without a link.

### Placing photos

Photos are numbered in the order they were attached. Put a marker on a line of
its own where a photo should go:

| Marker            | Result                                 |
| ----------------- | -------------------------------------- |
| `[photo1]`        | photo 1 at 80% width                   |
| `[photo1 100%]`   | photo 1 at the given width (1–100%)    |
| `[photo2 photo3]` | photos 2 and 3 side by side (45% each) |

Photos without a marker are appended after the body at 80%. A marker for a photo
that was not attached, or a photo used twice, is reported in the DM.

## One-time setup

Requirements: a paid Slack plan, permission to install apps in the workspace,
the [Slack CLI](https://docs.slack.dev/tools/slack-cli/), and
[Deno](https://deno.com/).

1. **Create a GitHub token.** Create a fine-grained personal access token:
   - Resource owner: `harco-lab`
   - Repository access: only `harco-lab/harco-lab.github.io`
   - Permissions: **Contents: Read and write** and **Pull requests: Read and
     write**

   PRs are opened as the token's owner, so a shared lab account is a good
   choice. The org may need to approve fine-grained tokens first.

   If your account is an outside collaborator (not a `harco-lab` org member),
   GitHub won't let you use a fine-grained token on the org's repositories. In
   that case, use a **classic** token with only the `public_repo` scope and a
   short expiration. Note that it can write to every public repository your
   account can push to.

2. **Deploy the app** (from this folder):

   ```bash
   cd slack
   slack login
   slack deploy
   ```

3. **Store the token on Slack:**

   ```bash
   slack env set GITHUB_TOKEN "github_pat_..."
   # Optional overrides (defaults: harco-lab/harco-lab.github.io, main)
   slack env set GITHUB_REPO "harco-lab/harco-lab.github.io"
   slack env set GITHUB_BASE_BRANCH "main"
   ```

4. **Create the link trigger** and bookmark the printed link in the news
   channel:

   ```bash
   slack trigger create --trigger-def triggers/submit_news_trigger.ts
   ```

   To limit who can run it, see `slack trigger access --help`. If the channel is
   private, invite the app (`/invite @HARCO News`) so it can post the PR link.

5. **Do a test submission** with one photo. Check that the preview DM shows the
   photo, then press **PR 만들기** and check that the PR contains the image. If
   the preview says `Slack 파일을 받지 못했습니다`, the app cannot download
   files: run `slack deploy` again so the `files:read` scope is granted.

`.slack/apps.json` is created on the first deploy. Commit it so other
maintainers deploy to the same app.

## Development

```bash
deno task test   # fmt check + lint + unit tests (Slack and GitHub are mocked)
```

`slack run` starts a local dev copy. It reads `GITHUB_TOKEN` (and the optional
overrides) from `slack/.env`, which is git-ignored. A fine-grained token limited
to this repository cannot write to a fork, so test PRs land here: close them
without merging and delete their branch, or the same date and slug is rejected
as a duplicate. Functions run locally have a 15-second timeout, so test with
small photos.

| File                                | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `workflows/submit_news_workflow.ts` | Form fields and workflow steps                                |
| `functions/create_news_pr.ts`       | Preview DM, button and edit-form handlers, PR creation        |
| `functions/news_draft.ts`           | Preview blocks and the edit form (pure, unit-tested)          |
| `functions/news_post.ts`            | Filenames, frontmatter and body rendering (pure, unit-tested) |
| `datastores/news_drafts.ts`         | Drafts waiting in a preview DM                                |
| `functions/github.ts`               | Minimal GitHub REST client (one commit per PR)                |
| `triggers/submit_news_trigger.ts`   | Link trigger                                                  |

## Limits

- **News only.** Research and project posts are not supported.
- **Body is at most 3 × 3,000 characters.** Slack caps each text field at 3,000,
  so long posts are split over the three body fields. Continue anything longer
  in the PR.
- **Body cannot contain `{{` or `{%`.** Liquid tags would break the Pages build,
  so add includes in the PR instead.
- **Photos:** JPG, PNG or GIF, up to 10 MB each, up to 10 per post. Check the
  order in the PR: the numbering follows the order Slack received them.
- **Time limit:** each step (preview, PR 만들기, saving an edit) must finish
  within Slack's time limit for deployed functions (60 seconds); PR 만들기
  covers 10 typical phone photos. Slack expects the edit form's save to answer
  within a few seconds, so very slow GitHub or Slack responses can show an error
  in the form even though the preview still updates.
