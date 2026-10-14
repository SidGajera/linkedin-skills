#!/usr/bin/env python3
"""Vercel Serverless Function entrypoint."""
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server import StudioHandler, handler
