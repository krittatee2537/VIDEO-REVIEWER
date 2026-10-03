"""
Starter script for Product Review Video Search Engine.
Automatically verifies dependencies, launches uvicorn server, and opens browser.
"""

import sys
import os
import time
import webbrowser
import subprocess

# Ensure stdout handles UTF-8 on Windows console
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Set working directory to project root
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(PROJECT_ROOT)

# Add backend directory to python path
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

def check_dependencies():
    print("[+] Checking system dependencies...")
    try:
        import fastapi
        import uvicorn
        import PIL
        import httpx
        print("[OK] All core packages detected.")
    except ImportError:
        print("[!] Installing required packages from backend/requirements.txt...")
        req_file = os.path.join(BACKEND_DIR, "requirements.txt")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_file])
        print("[OK] Dependencies installed successfully.")

def main():
    check_dependencies()

    host = "127.0.0.1"
    port = 8000
    url = f"http://{host}:{port}"

    print("\n" + "="*60)
    print(" Product Review Video Search System (China & International)")
    print(f" Running at: {url}")
    print("="*60 + "\n")

    # Auto open browser after a short delay
    def open_browser():
        time.sleep(1.5)
        try:
            webbrowser.open(url)
        except Exception:
            pass

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    import uvicorn
    uvicorn.run("main:app", host=host, port=port, reload=True, app_dir=BACKEND_DIR)

if __name__ == "__main__":
    main()
