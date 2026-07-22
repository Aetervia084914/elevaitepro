"""
Copy Elevaite_Prod project files to E:\ElevaiteDocs\Elevaite_Prod,
excluding .venv, .next, node_modules, and __pycache__ folders.
"""

import shutil
from pathlib import Path

SRC = Path(r"G:\Projects\Elevaite_Prod")
DST = Path(r"E:\ElevaiteDocs\Elevaite_Prod")

EXCLUDE_DIRS = {".venv", ".next", "node_modules", "__pycache__"}


def should_exclude(path: Path) -> bool:
    return any(part in EXCLUDE_DIRS for part in path.parts)


def copy_project():
    if DST.exists():
        print(f"Removing existing destination: {DST}")
        shutil.rmtree(DST)

    DST.mkdir(parents=True, exist_ok=True)

    copied = 0
    skipped_dirs = 0

    for item in SRC.rglob("*"):
        rel = item.relative_to(SRC)

        if should_exclude(rel):
            if item.is_dir():
                skipped_dirs += 1
            continue

        dest_path = DST / rel

        if item.is_dir():
            dest_path.mkdir(parents=True, exist_ok=True)
        else:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest_path)
            copied += 1

    print(f"Done — {copied} files copied, {skipped_dirs} excluded directories skipped.")
    print(f"Destination: {DST}")


if __name__ == "__main__":
    copy_project()
