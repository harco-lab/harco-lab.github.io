#!/usr/bin/env python3
"""Fetch latest videos from the HARCO Lab YouTube channel RSS feed and write to _data/youtube.json.

YouTube's RSS endpoint sometimes answers 404 or 5xx for hours, even for channels
that exist. The fetch is retried, and if the feed is still unavailable or empty
the existing data is kept and a GitHub Actions warning is printed instead of
failing the scheduled run.
"""

import json
import sys
import time
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

CHANNEL_ID = "UCsosxxmWD4mQdyjWRXQsuyA"
FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "_data" / "youtube.json"
LIMIT = 8
# Seconds to wait before each retry.
RETRY_DELAYS = (15, 45)

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def fetch_feed(url: str) -> str:
    last_error = None
    for attempt, delay in enumerate((0, *RETRY_DELAYS), start=1):
        if delay:
            time.sleep(delay)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8")
        except OSError as error:  # URLError, HTTPError and timeouts
            last_error = error
            print(f"Attempt {attempt} failed: {error}", file=sys.stderr)
    raise last_error


def parse_entries(xml_text: str):
    root = ET.fromstring(xml_text)
    entries = []
    for entry in root.findall("atom:entry", NS):
        video_id = entry.findtext("yt:videoId", default="", namespaces=NS)
        title = entry.findtext("atom:title", default="", namespaces=NS)
        published = entry.findtext("atom:published", default="", namespaces=NS)
        thumb_el = entry.find("media:group/media:thumbnail", NS)
        thumb_url = thumb_el.attrib.get("url") if thumb_el is not None else ""
        if not video_id:
            continue
        entries.append({
            "id": video_id,
            "title": title.strip(),
            "published": published,
            "date": published.split("T")[0] if published else "",
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "thumbnail": thumb_url or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        })
    return entries


def warn(message: str) -> None:
    """Print a warning that GitHub Actions shows on the run summary."""
    print(f"::warning title=YouTube feed::{message}")


def main():
    print(f"Fetching {FEED_URL}")
    try:
        entries = parse_entries(fetch_feed(FEED_URL))
    except (OSError, ET.ParseError) as error:
        warn(f"Feed unavailable ({error}); keeping {OUTPUT_PATH.name} unchanged.")
        return 0
    if not entries:
        warn(f"Feed returned no videos; keeping {OUTPUT_PATH.name} unchanged.")
        return 0

    entries.sort(key=lambda e: e["published"], reverse=True)
    entries = entries[:LIMIT]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(entries)} videos to {OUTPUT_PATH}")


if __name__ == "__main__":
    sys.exit(main() or 0)
