#!/usr/bin/env python3
"""Unified entrypoint for LinkedIn Skills Studio.

Runs natively as a WSGI application on Vercel, and as a standalone server on localhost:8000.
"""

from __future__ import annotations

import json
import mimetypes
import os
import pathlib
import re
import subprocess
import sys
from urllib.parse import parse_qs

ROOT = pathlib.Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "public" if (ROOT / "public").is_dir() else ROOT / "dashboard" / "static"

# Load environment if .env exists
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

# Ensure lib can be imported
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def parse_skills_metadata() -> list[dict]:
    """Parse all 12 skills in skills/ directory."""
    skills_dir = ROOT / "skills"
    result = []
    if not skills_dir.exists():
        return result

    for item in sorted(skills_dir.iterdir()):
        if item.is_dir() and (item / "SKILL.md").is_file():
            skill_md = (item / "SKILL.md").read_text(encoding="utf-8", errors="replace")
            desc = ""
            name = item.name
            fm_match = re.search(r"^---\s*\n(.*?)\n---", skill_md, re.DOTALL)
            if fm_match:
                for line in fm_match.group(1).splitlines():
                    if line.startswith("description:"):
                        desc = line.split("description:", 1)[1].strip().strip('"\'')
                    elif line.startswith("name:"):
                        name = line.split("name:", 1)[1].strip()

            category = "Creation"
            if "comment" in name or "reply" in name or "thread" in name:
                category = "Engagement"
            elif "humanizer" in name or "hook" in name:
                category = "Optimization"
            elif "analytics" in name or "advocacy" in name or "planner" in name:
                category = "Strategy"

            result.append({
                "id": item.name,
                "name": name,
                "category": category,
                "description": desc,
                "path": f"skills/{item.name}/SKILL.md"
            })
    return result


def parse_hook_formulas() -> list[dict]:
    """Parse canonical 20 hook formulas from references/hook-formulas.md."""
    hooks_file = ROOT / "references" / "hook-formulas.md"
    if not hooks_file.is_file():
        return []

    content = hooks_file.read_text(encoding="utf-8", errors="replace")
    formulas = []

    pattern = re.compile(
        r"^##\s+(F\d+)\s+[—\-]\s+(.*?)\n(.*?)(?=\n##\s+F\d+|\n##\s+Engagement|\Z)",
        re.MULTILINE | re.DOTALL,
    )

    for m in pattern.finditer(content):
        fid, title, body = m.group(1), m.group(2).strip(), m.group(3).strip()

        skeleton_match = re.search(r"```(?:\w+)?\n(.*?)```", body, re.DOTALL)
        skeleton = skeleton_match.group(1).strip() if skeleton_match else ""

        lines = [l.strip() for l in body.splitlines() if l.strip() and not l.startswith("```")]
        summary = lines[0] if lines else ""

        formulas.append({
            "id": fid,
            "title": f"{fid}: {title}",
            "name": title,
            "summary": summary,
            "skeleton": skeleton,
        })

    return formulas


def audit_and_humanize(text: str) -> dict:
    """Analyze text for AI tells and return humanized rewrite with statistics."""
    if not text:
        return {
            "score": 100,
            "rating": "Clean",
            "issues": [],
            "humanized": "",
            "stats": {"words": 0, "chars": 0, "paragraphs": 0, "em_dashes": 0}
        }

    issues = []
    
    phrase_blacklist = [
        ("in today's fast-paced world", "Overused corporate/AI opener.", "recently"),
        ("it's not just x, it's y", "Negative parallelism tell.", "both X and Y matter"),
        ("the result?", "Formulaic reveal bridge.", "Here is what happened:"),
        ("the catch?", "Formulaic reveal bridge.", "The trade-off:"),
        ("the kicker?", "Formulaic reveal bridge.", "The unexpected part:"),
        ("game-changer", "Hyped cliché.", "breakthrough"),
        ("deep dive", "Exhausted cliché.", "thorough breakdown"),
        ("move the needle", "Corporate buzzword.", "make an impact"),
        ("at the end of the day", "Filler phrase.", "ultimately"),
        ("paradigm shift", "Jargon cliché.", "fundamental shift"),
        ("in the age of ai", "AI trope opener.", "With modern tools"),
        ("let that sink in", "Pretentious LinkedIn reveal.", ""),
        ("let me be honest", "False vulnerability tell.", "truth is"),
        ("what do you think?", "Dead algorithm engagement question.", "How are you handling this in your team?"),
    ]

    vocab_markers = [
        "delve", "tapestry", "realm", "journey", "testament", "streamline", "robust",
        "seamless", "leverage", "utilize", "harness", "foster", "cultivate",
        "crucial", "notably", "comprehensive", "multifaceted", "holistic",
        "elevate", "empower", "nuanced", "landscape"
    ]

    words = re.findall(r"\b\w+\b", text)
    word_count = len(words)
    char_count = len(text)
    paragraphs = [p for p in text.split("\n\n") if p.strip()]
    em_dashes = text.count("—")

    humanized_text = text
    for phrase, reason, replacement in phrase_blacklist:
        matches = list(re.finditer(re.escape(phrase), text, re.IGNORECASE))
        if matches:
            for m in matches:
                issues.append({
                    "type": "phrase",
                    "marker": m.group(0),
                    "reason": reason,
                    "suggestion": replacement or "Remove entirely",
                    "severity": "high",
                })
            if replacement:
                humanized_text = re.sub(re.escape(phrase), replacement, humanized_text, flags=re.IGNORECASE)
            else:
                humanized_text = re.sub(re.escape(phrase) + r"\s*", "", humanized_text, flags=re.IGNORECASE)

    for w in vocab_markers:
        matches = list(re.finditer(rf"\b{w}(?:s|d|ed|ing|tion)?\b", text, re.IGNORECASE))
        if matches:
            for m in matches:
                issues.append({
                    "type": "vocabulary",
                    "marker": m.group(0),
                    "reason": "Durable AI writing marker (frequency 3-5x human baseline).",
                    "suggestion": "Replace with concrete noun or simpler verb",
                    "severity": "medium",
                })

    vocab_subs = {
        r"\bdelve into\b": "explore",
        r"\bdelve\b": "dig into",
        r"\btapestry\b": "mix",
        r"\brealm\b": "area",
        r"\brobust\b": "reliable",
        r"\bseamless\b": "smooth",
        r"\bleverage\b": "use",
        r"\butilize\b": "use",
        r"\bharness\b": "use",
        r"\bfoster\b": "build",
        r"\bcultivate\b": "grow",
        r"\bstreamline\b": "simplify",
        r"\belevate\b": "improve",
        r"\bnuanced\b": "specific",
        r"\blandscape\b": "market",
    }
    for pat, rep in vocab_subs.items():
        humanized_text = re.sub(pat, rep, humanized_text, flags=re.IGNORECASE)

    expected_max_em_dashes = max(1, word_count // 100)
    if em_dashes > expected_max_em_dashes:
        issues.append({
            "type": "punctuation",
            "marker": f"{em_dashes} em dashes",
            "reason": f"Em dash density ({em_dashes}) exceeds the human baseline (~1 per 100 words).",
            "suggestion": "Replace excess with a comma, colon, or natural parentheses.",
            "severity": "medium"
        })
        dash_count = 0
        def _dash_repl(m):
            nonlocal dash_count
            dash_count += 1
            if dash_count > 1:
                return ", "
            return " — "
        humanized_text = re.sub(r"\s*—\s*", _dash_repl, humanized_text)

    if "“" in humanized_text or "”" in humanized_text or "’" in humanized_text:
        humanized_text = humanized_text.replace("“", '"').replace("”", '"').replace("’", "'")

    staccato_match = re.search(r"\b([A-Z][a-z]+)\.\s+([A-Z][a-z]+)\.\s+([A-Z][a-z]+)\.", text)
    if staccato_match:
        issues.append({
            "type": "rhythm",
            "marker": staccato_match.group(0),
            "reason": "Forced staccato burstiness — 2026 AI tell.",
            "suggestion": "Blend into a natural sentence clause.",
            "severity": "high"
        })

    penalty = min(90, (len([i for i in issues if i["severity"] == "high"]) * 20) + (len([i for i in issues if i["severity"] == "medium"]) * 8))
    score = max(10, 100 - penalty)
    
    if score >= 85:
        rating = "Natural Human Voice"
    elif score >= 60:
        rating = "Moderate AI Markers Detected"
    else:
        rating = "Heavy AI Footprint"

    return {
        "score": score,
        "rating": rating,
        "issues": issues,
        "humanized": humanized_text,
        "stats": {
            "words": word_count,
            "chars": char_count,
            "paragraphs": len(paragraphs),
            "em_dashes": em_dashes,
        }
    }


def app(environ: dict, start_response):
    """Universal WSGI application callable for Vercel and local dev."""
    raw_path = environ.get("PATH_INFO", "/")
    # Normalize path
    path = "/" + raw_path.strip("/")
    method = environ.get("REQUEST_METHOD", "GET").upper()

    def send_json(data: dict | list, status="200 OK"):
        body = json.dumps(data, indent=2).encode("utf-8")
        headers = [
            ("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Access-Control-Allow-Origin", "*"),
        ]
        start_response(status, headers)
        return [body]

    def send_file(file_path: pathlib.Path):
        if not file_path.is_file():
            start_response("404 Not Found", [("Content-Type", "text/plain")])
            return [b"Not Found"]
        content = file_path.read_bytes()
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "text/plain"
        if mime_type.startswith("text/") or mime_type in ("application/javascript", "application/json"):
            mime_type += "; charset=utf-8"
        headers = [
            ("Content-Type", mime_type),
            ("Content-Length", str(len(content))),
            ("Access-Control-Allow-Origin", "*"),
        ]
        start_response("200 OK", headers)
        return [content]

    # Handle API Endpoints
    if path == "/api/skills":
        return send_json(parse_skills_metadata())

    elif path == "/api/hooks":
        return send_json(parse_hook_formulas())

    elif path == "/api/status":
        env_file = ROOT / ".env"
        status_data = {
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "has_env": env_file.is_file(),
            "credentials": {
                "APIFY_TOKEN": bool(os.getenv("APIFY_TOKEN")),
                "PUBLORA_API_KEY": bool(os.getenv("PUBLORA_API_KEY")),
                "PIXFARO_TOKEN": bool(os.getenv("PIXFARO_TOKEN")),
                "LINKEDIN_PLATFORM_ID": bool(os.getenv("LINKEDIN_PLATFORM_ID")),
            },
            "total_skills": 12,
        }
        return send_json(status_data)

    elif path == "/api/humanize" and method == "POST":
        try:
            content_length = int(environ.get("CONTENT_LENGTH", 0))
            raw_body = environ["wsgi.input"].read(content_length).decode("utf-8") if content_length > 0 else "{}"
            payload = json.loads(raw_body)
        except Exception:
            payload = {}
        result = audit_and_humanize(payload.get("text", ""))
        return send_json(result)

    elif path == "/api/selftest" and method == "POST":
        try:
            proc = subprocess.run(
                [sys.executable, str(ROOT / "scripts" / "selftest.py")],
                cwd=str(ROOT),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=30,
            )
            return send_json({"exit_code": proc.returncode, "output": proc.stdout})
        except Exception as e:
            return send_json({"exit_code": 1, "output": str(e)}, status="500 Internal Server Error")

    elif path == "/api/save-config" and method == "POST":
        try:
            content_length = int(environ.get("CONTENT_LENGTH", 0))
            raw_body = environ["wsgi.input"].read(content_length).decode("utf-8") if content_length > 0 else "{}"
            data = json.loads(raw_body)
            keys = ["APIFY_TOKEN", "PUBLORA_API_KEY", "PIXFARO_TOKEN", "LINKEDIN_PLATFORM_ID"]
            env_file = ROOT / ".env"
            existing = {}
            if env_file.is_file():
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    if "=" in line and not line.strip().startswith("#"):
                        k, v = line.split("=", 1)
                        existing[k.strip()] = v.strip()
            for k in keys:
                if k in data and data[k]:
                    existing[k] = data[k]
                    os.environ[k] = data[k]
            output_lines = [f"{k}={v}" for k, v in existing.items()]
            env_file.write_text("\n".join(output_lines) + "\n", encoding="utf-8")
            return send_json({"success": True, "saved_keys": list(existing.keys())})
        except Exception as e:
            return send_json({"success": False, "error": str(e)}, status="500 Internal Server Error")

    # Serve Static Assets
    if path in ("/", ""):
        return send_file(PUBLIC_DIR / "index.html")
    elif path == "/style.css":
        return send_file(PUBLIC_DIR / "style.css")
    elif path == "/app.js":
        return send_file(PUBLIC_DIR / "app.js")

    target_file = PUBLIC_DIR / path.lstrip("/")
    if target_file.is_file():
        return send_file(target_file)

    start_response("404 Not Found", [("Content-Type", "text/plain")])
    return [b"Not Found"]


# Top-level exports for Vercel
application = app
handler = app


if __name__ == "__main__":
    from wsgiref.simple_server import make_server
    port = int(os.environ.get("PORT", 8000))
    print(f"\n=======================================================")
    print(f" LinkedIn Skills Studio running at: http://localhost:{port}")
    print(f" Press Ctrl+C to stop.")
    print(f"=======================================================\n")
    server = make_server("127.0.0.1", port, app)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
