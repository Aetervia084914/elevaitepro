import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.skill_extract import engine


def test_extract_skills_returns_exact_and_fuzzy_matches():
    class DummySkill:
        def __init__(self, skill_id, canonical_name, skill_type):
            self.skill_id = skill_id
            self.canonical_name = canonical_name
            self.skill_type = skill_type

    class DummyIndex:
        def __init__(self):
            self._all_names = ["python", "aws", "docker"]
            self._by_name = {
                "python": DummySkill(1, "Python", "language"),
                "aws": DummySkill(2, "AWS", "platform"),
                "docker": DummySkill(3, "Docker", "tool"),
            }
            self._by_alias = {}
            self._ready = True

        def extract_keywords(self, text):
            return [("python", 0, 6)]

        def resolve(self, name):
            return self._by_name.get(name.lower())

    index = DummyIndex()
    result = __import__('asyncio').run(engine.extract_skills("I know python and aws", index, use_llm=False))

    assert result.stages_used == ["exact", "fuzzy"]
    assert any(m.canonical_name == "Python" for m in result.skills)
    assert any(m.canonical_name == "AWS" for m in result.skills)
