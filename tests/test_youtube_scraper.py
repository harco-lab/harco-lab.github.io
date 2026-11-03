import importlib
import io
import json
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

scraper = importlib.import_module("scripts.scrape_youtube")

FEED = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/">
  <entry>
    <yt:videoId>older</yt:videoId>
    <title>Older video</title>
    <published>2026-10-01T00:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>newer</yt:videoId>
    <title> Newer video </title>
    <published>2026-11-01T00:00:00+00:00</published>
  </entry>
</feed>
"""
EMPTY_FEED = '<feed xmlns="http://www.w3.org/2005/Atom"></feed>'


def response(text):
    return mock.MagicMock(__enter__=lambda self: io.BytesIO(text.encode("utf-8")))


def http_error(code):
    return urllib.error.HTTPError(scraper.FEED_URL, code, "error", {}, None)


class YouTubeScraperTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.output = Path(directory.name) / "youtube.json"
        self.output.write_text('[{"id": "existing"}]', encoding="utf-8")
        self.addCleanup(mock.patch.stopall)
        mock.patch.object(scraper, "OUTPUT_PATH", self.output).start()
        self.sleep = mock.patch.object(scraper.time, "sleep").start()

    def run_main(self, side_effect):
        with mock.patch.object(scraper.urllib.request, "urlopen", side_effect=side_effect) as urlopen:
            stdout = io.StringIO()
            with redirect_stdout(stdout), mock.patch("sys.stderr", io.StringIO()):
                self.assertEqual(scraper.main() or 0, 0)
        return urlopen, stdout.getvalue()

    def test_writes_the_newest_videos_first(self):
        self.run_main([response(FEED)])

        videos = json.loads(self.output.read_text(encoding="utf-8"))
        self.assertEqual([video["id"] for video in videos], ["newer", "older"])
        self.assertEqual(videos[0]["title"], "Newer video")

    def test_retries_until_the_feed_answers(self):
        urlopen, _ = self.run_main([http_error(404), http_error(500), response(FEED)])

        self.assertEqual(urlopen.call_count, 3)
        self.assertEqual(self.sleep.call_count, 2)
        self.assertEqual(len(json.loads(self.output.read_text(encoding="utf-8"))), 2)

    def test_keeps_existing_data_with_a_warning_while_the_feed_is_down(self):
        urlopen, stdout = self.run_main([http_error(404)] * 3)

        self.assertEqual(urlopen.call_count, 3)
        self.assertIn("::warning", stdout)
        self.assertIn("HTTP Error 404", stdout)
        self.assertEqual(self.output.read_text(encoding="utf-8"), '[{"id": "existing"}]')

    def test_keeps_existing_data_when_the_feed_is_empty(self):
        _, stdout = self.run_main([response(EMPTY_FEED)])

        self.assertIn("::warning", stdout)
        self.assertEqual(self.output.read_text(encoding="utf-8"), '[{"id": "existing"}]')


if __name__ == "__main__":
    unittest.main()
