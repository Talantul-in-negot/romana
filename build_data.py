"""Merge u1..u5.json (extracted from the textbook) into data.js and report problems.
Usage: python -I -X utf8 build_data.py <dir with uN.json>
"""
import json, sys, pathlib

src = pathlib.Path(sys.argv[1])
units, problems = [], []
for n in range(1, 6):
    f = src / f"u{n}.json"
    if not f.exists():
        problems.append(f"missing {f.name}")
        continue
    d = json.loads(f.read_text(encoding="utf-8"))
    for l in d["lessons"]:
        l.setdefault("theory", []); l.setdefault("flashcards", []); l.setdefault("quiz", [])
        for i, q in enumerate(l["quiz"]):
            t = q.get("type")
            ok = (
                (t == "mcq" and isinstance(q.get("answer"), int) and 0 <= q["answer"] < len(q.get("options", [])))
                or (t == "tf" and isinstance(q.get("answer"), bool))
                or (t == "fill" and q.get("answers"))
                or (t == "match" and len(q.get("pairs", [])) >= 2)
                or (t == "classify" and q.get("items") and all(0 <= it["c"] < len(q["categories"]) for it in q["items"]))
            )
            if not ok:
                problems.append(f"{l['id']} quiz[{i}] invalid ({t})")
    units.append(d)

out = pathlib.Path(__file__).parent / "data.js"
out.write_text("window.DATA = " + json.dumps({"units": units}, ensure_ascii=False) + ";\n", encoding="utf-8")
th = sum(len(l["theory"]) for u in units for l in u["lessons"])
qz = sum(len(l["quiz"]) for u in units for l in u["lessons"])
print(f"units={len(units)} lessons={sum(len(u['lessons']) for u in units)} theory={th} quiz={qz}")
print("\n".join(problems) or "no problems")
