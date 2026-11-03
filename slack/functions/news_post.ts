/**
 * Pure helpers that turn a Slack form submission into a news post laid out
 * the way CONVENTIONS.md describes (filenames, frontmatter, image folders).
 * Nothing here talks to Slack or GitHub, so it is easy to unit test.
 */

export const ALL_MEMBER = "All Member";

const SLUG_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIQUID_RE = /\{\{|\{%/;
const PLAIN_YAML_RE = /^[A-Za-z][A-Za-z .,'-]*$/;
// Hangul syllables and jamo. The site is English-only; other symbols such as
// curly quotes or ■ are still fine.
const HANGUL_RE =
  /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]/;
// Separators people use instead of a comma between names.
const MEMBER_SEPARATOR_RE = /\band\b|[&;/·、]/i;

// A line of its own such as `[photo1]`, `[photo1 100%]` or `[photo2 photo3]`.
const PHOTO_MARKER_RE = /^\[\s*photo\s*\d+[^\]]*\]$/i;
const PHOTO_REF_RE = /photo\s*(\d+)/gi;
const PHOTO_WIDTH_RE = /(\d+)\s*%/;
const PHOTO_MARKER_EXAMPLES = "[photo1], [photo1 100%], [photo2 photo3]";

// Same wrapper the existing news posts use around each figure.
const FIGURE_WRAPPER_OPEN =
  '<div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-top: 1em; margin-bottom: 1em;">';

const IMAGE_EXTENSIONS: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  gif: "gif",
};

export interface NewsPostInput {
  title: string;
  date: string;
  slug: string;
  author: string;
  member: string;
  body: string;
}

interface PhotoMarker {
  text: string;
  /** 1-based photo numbers, in the order they appear. */
  photos: number[];
  width?: number;
  valid: boolean;
}

// Words left out of a file name made from the title.
const SLUG_SKIP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "at",
  "on",
  "for",
  "to",
  "and",
  "with",
  "from",
  "by",
  "as",
  "its",
  "our",
  "is",
  "are",
  "harco",
  "lab",
]);
const SLUG_MAX_WORDS = 5;
const SLUG_MAX_LENGTH = 40;

/**
 * A file name from the title: lowercase ASCII words joined with `_`, without
 * filler words or the lab name, at most 5 words and 40 characters.
 * e.g. "HARCO Lab Participated in AIM 2026" -> `participated_aim_2026`.
 */
export function slugFromTitle(title: string): string {
  const words = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().split(/[^a-z0-9]+/)
    .filter((word) => word && !SLUG_SKIP_WORDS.has(word))
    .slice(0, SLUG_MAX_WORDS);
  let slug = "";
  for (const word of words) {
    const next = slug ? `${slug}_${word}` : word;
    if (next.length > SLUG_MAX_LENGTH) break;
    slug = next;
  }
  return slug || (words[0] ?? "").slice(0, SLUG_MAX_LENGTH);
}

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Comma-separated names, e.g. `Prof. Wansoo Kim, Oh Jihwan`, re-spaced. */
export function normalizeMember(raw: string): string {
  const value = memberNames(raw).join(", ");
  return value.toLowerCase() === ALL_MEMBER.toLowerCase() ? ALL_MEMBER : value;
}

function memberNames(member: string): string[] {
  return member.split(",").map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function memberProblems(member: string): string[] {
  if (member === ALL_MEMBER) return [];
  const names = memberNames(member);
  const problems: string[] = [];
  if (names.some((name) => name.toLowerCase() === ALL_MEMBER.toLowerCase())) {
    problems.push(
      "All Member는 다른 멤버와 함께 쓰지 말고 단독으로 적어 주십시오.",
    );
  }
  if (names.some((name) => MEMBER_SEPARATOR_RE.test(name))) {
    problems.push(
      "관련 멤버는 , 로 구분해 주십시오 (예: Prof. Wansoo Kim, Oh Jihwan).",
    );
  }
  return problems;
}

/** Each field that contains Hangul, with the first such body line. */
function hangulProblems(post: NewsPostInput): string[] {
  const fields: [string, string][] = [
    ["제목", post.title],
    ["작성자", post.author],
    ["관련 멤버", post.member],
  ];
  const problems = fields.filter(([, value]) => HANGUL_RE.test(value)).map((
    [label],
  ) => `${label}에 한글이 있습니다. 영문으로만 작성해 주십시오.`);
  const line = post.body.split("\n").find((text) => HANGUL_RE.test(text));
  if (line) {
    const excerpt = line.trim();
    problems.push(
      `본문에 한글이 있습니다. 영문으로만 작성해 주십시오: "${
        excerpt.length > 40 ? `${excerpt.slice(0, 40)}…` : excerpt
      }"`,
    );
  }
  return problems;
}

/** The form splits the body over several fields (Slack caps each at 3,000). */
export function joinBodyParts(parts: (string | undefined)[]): string {
  return parts.map((part) => part?.trim() ?? "").filter(Boolean).join("\n\n");
}

export function normalizeInput(input: NewsPostInput): NewsPostInput {
  return {
    title: input.title.trim(),
    date: input.date.trim(),
    slug: normalizeSlug(input.slug) || slugFromTitle(input.title),
    author: input.author.trim(),
    member: normalizeMember(input.member),
    body: input.body.replace(/\r\n?/g, "\n").trim(),
  };
}

function parsePhotoMarker(line: string): PhotoMarker | undefined {
  const text = line.trim();
  if (!PHOTO_MARKER_RE.test(text)) return undefined;
  const inner = text.slice(1, -1);
  const width = inner.match(PHOTO_WIDTH_RE);
  const rest = inner.replace(PHOTO_REF_RE, "").replace(PHOTO_WIDTH_RE, "");
  return {
    text,
    photos: [...inner.matchAll(PHOTO_REF_RE)].map((match) => Number(match[1])),
    width: width ? Number(width[1]) : undefined,
    valid: /^[\s,]*$/.test(rest),
  };
}

function photoMarkers(body: string): PhotoMarker[] {
  return body.split("\n").map(parsePhotoMarker).filter((
    marker,
  ): marker is PhotoMarker => marker !== undefined);
}

function photoMarkerProblems(body: string, photoCount: number): string[] {
  const problems: string[] = [];
  const placed = new Set<number>();
  for (const marker of photoMarkers(body)) {
    if (!marker.valid) {
      problems.push(
        `사진 표시를 알아볼 수 없습니다: ${marker.text} (예: ${PHOTO_MARKER_EXAMPLES})`,
      );
      continue;
    }
    if (
      marker.width !== undefined && (marker.width < 1 || marker.width > 100)
    ) {
      problems.push(`사진 폭은 1%~100%로 적어 주십시오: ${marker.text}`);
    }
    for (const photo of marker.photos) {
      if (photo < 1 || photo > photoCount) {
        problems.push(
          `${marker.text}: ${photo}번 사진이 없습니다 (올린 사진 ${photoCount}장)`,
        );
      } else if (placed.has(photo)) {
        problems.push(
          `${photo}번 사진을 본문에 두 번 넣었습니다: ${marker.text}`,
        );
      }
      placed.add(photo);
    }
  }
  return problems;
}

/** Problems to show the submitter; empty when the post can be created. */
export function validateInput(
  post: NewsPostInput,
  photoCount: number,
): string[] {
  const problems: string[] = [];
  if (!post.title) problems.push("제목이 비어 있습니다.");
  if (!DATE_RE.test(post.date)) {
    problems.push(`날짜 형식이 올바르지 않습니다: ${post.date}`);
  }
  if (!post.slug) {
    problems.push(
      "제목으로 파일 이름을 만들 수 없습니다. 파일 이름을 직접 적어 주십시오. (예: aim2026)",
    );
  } else if (!SLUG_RE.test(post.slug)) {
    problems.push(
      "파일 이름은 영문 소문자, 숫자, _ 만 쓸 수 있습니다. 비워 두면 제목으로 만듭니다. (예: aim2026, kroc2026_award)",
    );
  }
  if (!post.author) problems.push("작성자가 비어 있습니다.");
  if (!post.member) {
    problems.push(
      "관련 멤버가 비어 있습니다. 연구실 전체 소식이면 All Member 로 적어 주십시오.",
    );
  }
  problems.push(...memberProblems(post.member));
  if (!post.body) problems.push("본문이 비어 있습니다.");
  problems.push(...hangulProblems(post));
  if (LIQUID_RE.test(post.body)) {
    problems.push(
      "본문에 `{{` 나 `{%` 가 있으면 사이트 빌드가 깨집니다. 빼고 다시 제출하거나, PR에서 직접 넣어 주십시오.",
    );
  }
  problems.push(...photoMarkerProblems(post.body, photoCount));
  return problems;
}

export function postPath(post: NewsPostInput): string {
  return `_posts/news/${post.date}-news_${post.slug}.md`;
}

export function branchName(post: NewsPostInput): string {
  return `content/slack/${post.date}-news_${post.slug}`;
}

/** e.g. `images/news/260707_aim2026`, matching the existing folders. */
export function imageDir(post: NewsPostInput): string {
  const yymmdd = post.date.slice(2).replaceAll("-", "");
  return `images/news/${yymmdd}_${post.slug}`;
}

/** Site-safe extension for a Slack `filetype`, or undefined if unsupported. */
export function imageExtension(filetype: string): string | undefined {
  return IMAGE_EXTENSIONS[filetype.toLowerCase()];
}

/** `index` is 1-based, as CONVENTIONS.md asks for numbered series. */
export function imagePath(
  post: NewsPostInput,
  index: number,
  extension: string,
): string {
  return `${imageDir(post)}/${post.slug}_${index}.${extension}`;
}

function yamlScalar(value: string): string {
  return PLAIN_YAML_RE.test(value) ? value : JSON.stringify(value);
}

/** One row of figures; side-by-side photos share the width (45% for two). */
function renderFigures(paths: string[], width?: number): string {
  const percent = width ??
    (paths.length === 1 ? 80 : Math.floor(90 / paths.length));
  return [
    FIGURE_WRAPPER_OPEN,
    ...paths.map((path) =>
      `{% include figure.html image="${path}" width="${percent}%" %}`
    ),
    "</div>",
  ].join("\n");
}

export type BodySegment =
  | { kind: "text"; text: string }
  | { kind: "photos"; photos: number[]; width?: number };

/**
 * Splits the body at valid photo marker lines. Shared by the post and the
 * Slack preview so both place photos the same way.
 */
export function bodySegments(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let lines: string[] = [];
  const flushText = () => {
    while (lines.length > 0 && !lines[0].trim()) lines.shift();
    while (lines.length > 0 && !lines.at(-1)!.trim()) lines.pop();
    if (lines.length > 0) {
      segments.push({ kind: "text", text: lines.join("\n") });
    }
    lines = [];
  };
  for (const line of body.split("\n")) {
    const marker = parsePhotoMarker(line);
    if (marker?.valid) {
      flushText();
      segments.push({
        kind: "photos",
        photos: marker.photos,
        width: marker.width,
      });
    } else {
      lines.push(line);
    }
  }
  flushText();
  return segments;
}

/** 1-based numbers of the photos no marker mentions; they go at the end. */
export function unplacedPhotos(
  segments: BodySegment[],
  photoCount: number,
): number[] {
  const placed = new Set(
    segments.flatMap((segment) =>
      segment.kind === "photos" ? segment.photos : []
    ),
  );
  return Array.from({ length: photoCount }, (_, i) => i + 1).filter((photo) =>
    !placed.has(photo)
  );
}

/**
 * Replaces each photo marker with its figures as a separate paragraph so
 * Markdown treats them as HTML blocks, then appends the unplaced photos.
 */
function renderBody(body: string, imagePaths: string[]): string[] {
  const segments = bodySegments(body);
  return [
    ...segments.map((segment) =>
      segment.kind === "text" ? segment.text : renderFigures(
        segment.photos.map((photo) => imagePaths[photo - 1]),
        segment.width,
      )
    ),
    ...unplacedPhotos(segments, imagePaths.length).map((photo) =>
      renderFigures([imagePaths[photo - 1]])
    ),
  ];
}

export function renderPost(post: NewsPostInput, imagePaths: string[]): string {
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(post.title)}`,
    `date: ${post.date}`,
    `author: ${yamlScalar(post.author)}`,
    `member: ${yamlScalar(post.member)}`,
    "group: news",
    "---",
  ].join("\n");

  return [frontmatter, ...renderBody(post.body, imagePaths)].join("\n\n") +
    "\n";
}

export function renderPullRequestBody(
  post: NewsPostInput,
  imagePaths: string[],
  submitter: string,
): string {
  const lines = [
    "## Summary",
    "",
    `- News post submitted from the Slack news form: **${post.title}**`,
    `- Post: \`${postPath(post)}\``,
  ];
  if (imagePaths.length > 0) {
    lines.push(`- Images (${imagePaths.length}): \`${imageDir(post)}/\``);
  }
  lines.push(
    `- Author: ${post.author} (Slack user \`${submitter}\`)`,
    "",
    "Photos go where the body has a `[photoN]` marker; photos without one are appended at the end. Move them, or edit the text, in this PR before merging.",
    "",
    "## Checks",
    "",
    "- [ ] I followed `CONVENTIONS.md` for new or renamed content files.",
    "- [ ] I ran `bundle exec jekyll build`, or documented why it could not run.",
    "- [ ] I checked updated links and image paths.",
  );
  return lines.join("\n");
}
