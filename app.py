#!/usr/bin/env python3
"""Alternative entrypoint for Vercel and local dev."""
import os
from server import StudioHandler, handler, run

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    run(port)
