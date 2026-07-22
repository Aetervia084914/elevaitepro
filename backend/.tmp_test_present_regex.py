from app.services.skill_extract import profiling

samples = [
    "2018 - present",
    "2018 - Present",
    "2018 - till date",
    "2018 - Till Date",
    "2018 - till-date",
    "2018 - til date",
    "2018 – till date",
    "2018 to present",
    "2018 to till date",
    "2018 - today",
    "2018 - date",
]

for s in samples:
    found = False
    for pat in profiling._DATE_RANGE_PATTERNS:
        m = pat.search(s)
        if m:
            gd = m.groupdict()
            print(f"MATCH: {s!r} -> groups={gd}")
            found = True
            break
    if not found:
        print(f"NO MATCH: {s!r}")
