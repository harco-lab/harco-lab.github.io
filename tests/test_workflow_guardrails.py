import re
import unittest
from pathlib import Path


class WorkflowGuardrailTest(unittest.TestCase):
    def test_gitlab_sync_requires_explicit_enable_variable(self):
        workflow = Path(".github/workflows/sync_gitlab.yml").read_text(encoding="utf-8")

        self.assertIn("if: ${{ vars.ENABLE_GITLAB_SYNC == 'true' }}", workflow)
        self.assertIn("ENABLE_GITLAB_SYNC", workflow)

    def test_github_publication_update_is_manual_only(self):
        workflow = Path(".github/workflows/update-publications.yml").read_text(encoding="utf-8")

        self.assertIn("workflow_dispatch:", workflow)
        self.assertNotIn("schedule:", workflow)
        self.assertNotIn("push:", workflow)

    def test_gitlab_sync_does_not_persist_github_credentials(self):
        workflow = Path(".github/workflows/sync_gitlab.yml").read_text(encoding="utf-8")

        self.assertIn("persist-credentials: false", workflow)

    def test_network_workflows_have_job_timeouts(self):
        for path in (
            ".github/workflows/sync_gitlab.yml",
            ".github/workflows/update-publications.yml",
            ".github/workflows/update-youtube.yml",
        ):
            with self.subTest(path=path):
                workflow = Path(path).read_text(encoding="utf-8")
                self.assertIn("timeout-minutes:", workflow)

    def test_workflows_use_node24_action_versions(self):
        minimum_majors = {
            "actions/checkout": 7,
            "actions/setup-python": 7,
            "stefanzweifel/git-auto-commit-action": 7,
            "peter-evans/create-pull-request": 8,
        }
        for path in sorted(Path(".github/workflows").glob("*.yml")):
            workflow = path.read_text(encoding="utf-8")
            for action, major in re.findall(r"uses:\s*([\w.-]+/[\w.-]+)@v(\d+)", workflow):
                with self.subTest(path=path.name, action=action):
                    self.assertIn(action, minimum_majors)
                    self.assertGreaterEqual(int(major), minimum_majors[action])



if __name__ == "__main__":
    unittest.main()
