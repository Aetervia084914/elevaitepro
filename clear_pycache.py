import os
import shutil

def clear_pycache(root_dir="."):
    for root, dirs, files in os.walk(root_dir):
        for d in dirs:
            if d == "__pycache__":
                path = os.path.join(root, d)
                shutil.rmtree(path, ignore_errors=True)
                print(f"Deleted: {path}")

if __name__ == "__main__":
    clear_pycache()