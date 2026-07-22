import os
import shutil
from pathlib import Path

def remove_pycache(root: Path, dry_run: bool = False) -> int:
    """
    Recursively remove all __pycache__ directories under root.

    Args:
        root (Path): Root directory to scan
        dry_run (bool): If True, only prints what would be deleted

    Returns:
        int: Number of __pycache__ directories found
    """
    count = 0

    for path in root.rglob("__pycache__"):
        if path.is_dir():
            count += 1
            if dry_run:
                print(f"[DRY RUN] Would remove: {path}")
            else:
                try:
                    shutil.rmtree(path)
                    print(f"Removed: {path}")
                except Exception as e:
                    print(f"Error removing {path}: {e}")

    return count


if __name__ == "__main__":
    ROOT_DIR = Path(__file__).parent.resolve()  # script location = project root

    print(f"Scanning: {ROOT_DIR}\n")

    # Set to True if you want preview first
    DRY_RUN = False

    total = remove_pycache(ROOT_DIR, dry_run=DRY_RUN)

    print("\nDone.")
    print(f"Total __pycache__ folders {'found' if DRY_RUN else 'removed'}: {total}")