#!/usr/bin/env python
import subprocess
import sys
import time
import os

# Change to project directory
os.chdir("d:/Apps/My Experiments/4. TaxGPT")

print("Starting TaxGPT app...")
print("=" * 50)

# Start backend
print("\n[1/2] Starting FastAPI backend on http://localhost:8000")
backend_proc = subprocess.Popen(
    [sys.executable, "api/main.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

time.sleep(2)

# Start frontend
print("[2/2] Starting React frontend on http://localhost:5173")
frontend_proc = subprocess.Popen(
    [sys.executable, "-m", "npm", "run", "dev"],
    cwd="frontend",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

print("\n" + "=" * 50)
print("TaxGPT is starting up!")
print("Backend:  http://localhost:8000")
print("Frontend: http://localhost:5173")
print("=" * 50)

# Keep running
try:
    backend_proc.wait()
except KeyboardInterrupt:
    print("\nShutting down...")
    backend_proc.terminate()
    frontend_proc.terminate()
    sys.exit(0)
