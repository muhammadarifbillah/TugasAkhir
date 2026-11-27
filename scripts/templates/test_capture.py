"""Run: python -m unittest scripts/templates/test_capture.py"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from capture import run_actions  # noqa: E402


class FakeLocator:
    def __init__(self, count: int):
        self.count = count

    def evaluate_all(self, _js: str) -> int:
        return self.count


class FakePage:
    def __init__(self, count: int):
        self.count = count

    def locator(self, _sel: str) -> FakeLocator:
        return FakeLocator(self.count)


class RunActionsTest(unittest.TestCase):
    def test_required_hide_without_match_fails_hard(self):
        with self.assertRaisesRegex(RuntimeError, "hide .banner failed"):
            run_actions(FakePage(0), [{"do": "hide", "selector": ".banner"}])

    def test_optional_hide_without_match_is_ignored(self):
        run_actions(FakePage(0), [{"do": "hide", "selector": ".banner", "optional": True}])

    def test_hide_with_match_passes(self):
        run_actions(FakePage(2), [{"do": "hide", "selector": ".banner"}])


if __name__ == "__main__":
    unittest.main()
