import importlib
import unittest

changes = importlib.import_module("scripts.publication_changes")


class PublicationChangesTest(unittest.TestCase):
    def test_lists_added_and_removed_publications_by_title(self):
        before = [
            {"title": "Kept Paper", "year": 2025},
            {"title": "Dropped Paper", "year": 2024},
        ]
        after = [
            {"title": "kept paper.", "year": 2025},
            {
                "title": "New Paper",
                "year": 2026,
                "journal": "Intelligent Service Robotics",
                "authors": "Wenqi Li, Wansoo Kim",
                "doi": "10.1007/example",
            },
        ]

        summary = changes.summarize(before, after, "openalex")

        self.assertIn("from `openalex`: 2 → 2 publications", summary)
        self.assertIn("### Added (1)", summary)
        self.assertIn("- 2026 · New Paper · _Intelligent Service Robotics_", summary)
        self.assertIn("Wenqi Li, Wansoo Kim", summary)
        self.assertIn("https://doi.org/10.1007/example", summary)
        self.assertIn("### Removed (1)", summary)
        self.assertIn("- 2024 · Dropped Paper", summary)
        self.assertNotIn("Kept Paper", summary)

    def test_says_none_when_nothing_changed(self):
        papers = [{"title": "Same", "year": 2025}]

        summary = changes.summarize(papers, papers, "openalex")

        self.assertIn("### Added (0)\n\nNone.", summary)
        self.assertIn("### Removed (0)\n\nNone.", summary)


if __name__ == "__main__":
    unittest.main()
