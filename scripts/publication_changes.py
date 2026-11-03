#!/usr/bin/env python3
"""Write a Markdown summary of the publications added or removed by an update.

Used as the body of the pull request that the scheduled publication workflow
opens, so reviewers can check every new entry before it reaches the site.
"""

import json
import re
import sys
from pathlib import Path


def title_key(publication: dict) -> str:
    return re.sub(r"\W", "", (publication.get("title") or "").lower())


def describe(publication: dict) -> str:
    parts = [str(publication.get("year") or "????"), publication.get("title") or "(untitled)"]
    venue = publication.get("journal") or publication.get("venue")
    if venue:
        parts.append(f"_{venue}_")
    line = " · ".join(parts)
    if publication.get("authors"):
        line += f"  \n  {publication['authors']}"
    if publication.get("doi"):
        line += f"  \n  https://doi.org/{publication['doi']}"
    return f"- {line}"


def summarize(before: list, after: list, source: str) -> str:
    before_keys = {title_key(p) for p in before}
    after_keys = {title_key(p) for p in after}
    added = [p for p in after if title_key(p) not in before_keys]
    removed = [p for p in before if title_key(p) not in after_keys]

    lines = [
        "## Summary",
        "",
        f"- Weekly publication update from `{source}`: {len(before)} → {len(after)} publications.",
        "",
        f"### Added ({len(added)})",
        "",
        *([describe(p) for p in added] or ["None."]),
        "",
        f"### Removed ({len(removed)})",
        "",
        *([describe(p) for p in removed] or ["None."]),
        "",
        "## Checks",
        "",
        "- [ ] Every added paper belongs to the lab. The source can also return papers by other people with the same name, or from before the lab started.",
        "- [ ] Titles, years and venues look right on the publication page.",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: publication_changes.py BEFORE.json AFTER.json SOURCE", file=sys.stderr)
        return 2
    before = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    after = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    sys.stdout.write(summarize(before, after, sys.argv[3]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
