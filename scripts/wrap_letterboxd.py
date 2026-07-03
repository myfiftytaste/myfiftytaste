import json
import re
from pathlib import Path
from typing import Dict, Any, Optional

import feedparser
import requests


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MEGABANK_JSON = PROCESSED_DIR / "megabank_clean.json"


def extract_slug(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    s = str(url).strip().rstrip("/")
    if not s:
        return None
    # Simple extraction: take last path segment
    if "/" in s:
        return s.split("/")[-1]
    return s


def normalize_title(t: Optional[str]) -> str:
    if not t:
        return ""
    s = str(t).lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load_megabank() -> Dict[str, Dict[str, Any]]:
    if not MEGABANK_JSON.exists():
        raise FileNotFoundError(f"Megabank file not found: {MEGABANK_JSON}")
    with MEGABANK_JSON.open("r", encoding="utf-8") as f:
        records = json.load(f)
    by_slug = {}
    by_title = {}
    for r in records:
        slug = r.get("letterboxd_slug")
        title = r.get("title")
        if slug:
            by_slug[slug] = r
        if title:
            by_title[normalize_title(title)] = r
    return {"by_slug": by_slug, "by_title": by_title}


def fetch_user_rss(username: str):
    # Try common RSS endpoints
    candidates = [
        f"https://letterboxd.com/{username}/rss/",
        f"https://letterboxd.com/{username}/films/rss/",
        f"https://letterboxd.com/{username}/rss/films/",
    ]
    for url in candidates:
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200 and r.text.strip():
                feed = feedparser.parse(r.text)
                if feed and feed.entries:
                    return feed
        except Exception:
            continue
    # Last fallback: raise
    raise RuntimeError(f"Could not fetch RSS for user '{username}' from tried endpoints.")


def match_entries(feed, megabank_index, limit: int = 50):
    wrapped = []
    by_slug = megabank_index["by_slug"]
    by_title = megabank_index["by_title"]
    for entry in feed.entries[:limit]:
        link = entry.get("link") or entry.get("id")
        slug = extract_slug(link)
        title = entry.get("title")
        matched = None
        if slug and slug in by_slug:
            matched = by_slug[slug]
            match_type = "slug"
        else:
            norm = normalize_title(title)
            if norm and norm in by_title:
                matched = by_title[norm]
                match_type = "title"
            else:
                match_type = "none"

        wrapped.append({
            "entry_title": title,
            "entry_link": link,
            "entry_published": entry.get("published"),
            "letterboxd_slug": slug,
            "match_type": match_type,
            "megabank": matched,
        })
    return wrapped


def main(username: str):
    print(f"Wrapping Letterboxd user: {username}")
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    megabank_index = load_megabank()
    feed = fetch_user_rss(username)
    wrapped = match_entries(feed, megabank_index, limit=50)
    out_path = PROCESSED_DIR / f"{username}_wrapped.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump({"user": username, "count": len(wrapped), "items": wrapped}, f, ensure_ascii=False, indent=2, default=str)
    matched = sum(1 for w in wrapped if w.get("megabank"))
    print(f"Wrote {out_path} ({len(wrapped)} items, {matched} matched to megabank)")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python scripts/wrap_letterboxd.py <letterboxd_username>")
        raise SystemExit(2)
    user = sys.argv[1]
    main(user)
