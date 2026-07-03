"""Enrich missing films from a per-user missing queue using TMDB.

Usage: python scripts/enrich_missing_with_tmdb.py <username> [--force] [--debug]

This script reads `data/output/<username>_missing_metadata_queue.csv`, searches TMDB,
caches search/results under `data/cache/`, and writes `data/processed/supplemental_metadata.json`.
"""
import csv
import json
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
QUEUE_DIR = BASE_DIR / "data" / "output"
CACHE_DIR = BASE_DIR / "data" / "cache"
SUPPLEMENTAL_JSON = BASE_DIR / "data" / "processed" / "supplemental_metadata.json"

# Regex to extract title and year from RSS entry like "Look Back, 2024 - ★★★½"
TITLE_YEAR_REGEX = re.compile(r"^(?P<title>.*),\s*(?P<year>\d{4})(?:\s*-\s*[★½]+)?\s*$")


def ensure_dirs():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (BASE_DIR / "data" / "processed").mkdir(parents=True, exist_ok=True)


def load_queue(username: str):
    path = QUEUE_DIR / f"{username}_missing_metadata_queue.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing queue file: {path}")
    rows = []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
    return rows


def extract_title_and_year(rss_title: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract title and year from RSS entry like 'Look Back, 2024 - ★★★½' or 'Bouchra, 2025'."""
    if not rss_title:
        return None, None
    
    m = TITLE_YEAR_REGEX.match(rss_title.strip())
    if m:
        title = m.group("title").strip()
        year = m.group("year")
        return title, year
    
    # Fallback: try to extract year at the end
    year_match = re.search(r"(\d{4})(?:\s*-|$)", rss_title)
    if year_match:
        year = year_match.group(1)
        # Extract title up to the year
        title = rss_title[:year_match.start()].strip()
        if title.endswith(","):
            title = title[:-1].strip()
        return title, year
    
    return None, None


def tmdb_search(title: str, api_key: str, year: Optional[str] = None, 
                use_primary_release_year: bool = False, debug: bool = False):
    """Search TMDB with progressive fallback strategy."""
    params = {"api_key": api_key, "query": title}
    
    # Try different search strategies
    strategies = []
    if year:
        if use_primary_release_year:
            strategies.append(({"query": title, "primary_release_year": year}, "with primary_release_year"))
        else:
            strategies.append(({"query": title, "year": year}, "with year"))
    strategies.append(({"query": title}, "without year"))
    
    for search_params, desc in strategies:
        search_params["api_key"] = api_key
        if debug:
            # Show params without API key
            display_params = {k: v for k, v in search_params.items() if k != "api_key"}
            print(f"    Searching TMDB {desc}: {display_params}")
        
        try:
            resp = requests.get("https://api.themoviedb.org/3/search/movie", 
                              params=search_params, timeout=10)
            if resp.status_code != 200:
                raise RuntimeError(f"TMDB search failed with status {resp.status_code}: {resp.text}")
            
            data = resp.json()
            results = data.get("results", [])
            if debug:
                print(f"    Status: {resp.status_code}, Results: {len(results)}")
            
            if results:
                return results
        except Exception as e:
            if debug:
                print(f"    Error: {e}")
            raise
    
    return []


def tmdb_details(tmdb_id: int, api_key: str):
    params = {"api_key": api_key, "append_to_response": "credits"}
    resp = requests.get(f"https://api.themoviedb.org/3/movie/{tmdb_id}", 
                       params=params, timeout=10)
    if resp.status_code != 200:
        raise RuntimeError(f"TMDB details failed with status {resp.status_code}: {resp.text}")
    return resp.json()


def load_json_cache(fn: Path) -> Dict[str, Any]:
    if fn.exists():
        try:
            return json.loads(fn.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_json_cache(fn: Path, data: Dict[str, Any]):
    fn.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_title_for_scoring(t: str) -> str:
    """Normalize title for comparison: lowercase, remove punctuation."""
    if not t:
        return ""
    s = t.lower().strip()
    # Remove punctuation but keep spaces
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def score_candidate(rss_title: str, cand_title: Optional[str], cand_original_title: Optional[str], 
                   rss_year: Optional[str], cand_year: Optional[str]) -> float:
    """Score a TMDB candidate against the RSS entry.
    
    Base score from title matching, bonus/malus from year matching.
    """
    if not rss_title or (not cand_title and not cand_original_title):
        return 0.0
    
    rss_norm = normalize_title_for_scoring(rss_title)
    
    # Compare against both title and original_title, take the best
    score = 0.0
    
    for candidate_title in [cand_title, cand_original_title]:
        if not candidate_title:
            continue
        cand_norm = normalize_title_for_scoring(candidate_title)
        
        # Title matching
        if rss_norm == cand_norm:
            title_score = 0.8
        elif rss_norm in cand_norm or cand_norm in rss_norm:
            title_score = 0.6
        else:
            # Token overlap
            rss_tokens = set(rss_norm.split())
            cand_tokens = set(cand_norm.split())
            overlap = len(rss_tokens & cand_tokens)
            total_tokens = len(rss_tokens)
            if total_tokens > 0 and overlap > 0:
                title_score = min(0.5, overlap / total_tokens)
            else:
                title_score = 0.0
        
        # Year matching: bonus if same, small malus if different
        year_score = 0.0
        if rss_year and cand_year:
            try:
                if int(rss_year) == int(cand_year):
                    year_score = 0.2  # Strong bonus
                else:
                    year_score = -0.05  # Small malus
            except Exception:
                pass
        
        candidate_score = title_score + year_score
        score = max(score, candidate_score)
    
    return min(1.0, max(0.0, score))


def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python scripts/enrich_missing_with_tmdb.py <username> [--force] [--debug]")
        raise SystemExit(2)
    
    username = sys.argv[1]
    force = "--force" in sys.argv
    debug = "--debug" in sys.argv
    
    ensure_dirs()
    load_dotenv(BASE_DIR / ".env")
    api_key = os.environ.get("TMDB_API_KEY")
    if not api_key:
        raise RuntimeError("TMDB_API_KEY not set in environment. Copy .env.example to .env and set it.")

    queue = load_queue(username)

    search_cache_fn = CACHE_DIR / "tmdb_search_cache.json"
    details_cache_fn = CACHE_DIR / "tmdb_details_cache.json"
    search_cache = load_json_cache(search_cache_fn)
    details_cache = load_json_cache(details_cache_fn)

    supplemental = {}
    if SUPPLEMENTAL_JSON.exists():
        try:
            supplemental = json.loads(SUPPLEMENTAL_JSON.read_text(encoding="utf-8"))
        except Exception:
            supplemental = {}

    report = {
        "queue_size": len(queue),
        "already_present": 0,
        "confirmed": 0,
        "needs_review": 0,
        "not_found": 0,
        "items": [],
    }

    for row in queue:
        slug = row.get("letterboxd_slug")
        rss_title = row.get("rss_title") or row.get("title")
        
        if debug:
            print(f"\n=== Processing {slug} ===")
            print(f"  RSS title (original): {rss_title}")
        
        # Skip if already confirmed and not forcing
        if slug in supplemental and supplemental[slug].get("status") == "confirmed" and not force:
            if debug:
                print(f"  Already confirmed, skipping")
            report["already_present"] += 1
            continue
        
        # Extract title and year
        title, year = extract_title_and_year(rss_title)
        if debug:
            print(f"  Extracted title: {title}")
            print(f"  Extracted year: {year}")
        
        if not title:
            if debug:
                print(f"  Could not extract title, marking as not_found")
            report["not_found"] += 1
            report["items"].append({"slug": slug, "choice": None, "score": 0.0})
            continue
        
        # Try to get from cache or search
        cache_key = f"{title}|||{year or ''}"
        if cache_key in search_cache:
            results = search_cache[cache_key]
            if debug:
                print(f"  Found in cache: {len(results)} results")
        else:
            try:
                # Progressive search strategy: with year, then with primary_release_year, then without
                results = tmdb_search(title, api_key, year, use_primary_release_year=False, debug=debug)
                if not results and year:
                    results = tmdb_search(title, api_key, year, use_primary_release_year=True, debug=debug)
                search_cache[cache_key] = results
            except Exception as e:
                print(f"ERROR searching TMDB for {slug} ({title}, {year}): {e}")
                raise
        
        # Score candidates
        best = None
        best_score = 0.0
        
        if debug and results:
            print(f"  Top 5 TMDB results:")
        
        for i, cand in enumerate(results[:5]):
            cand_title = cand.get("title")
            cand_orig_title = cand.get("original_title")
            cand_year = (cand.get("release_date") or "")[:4]
            cand_id = cand.get("id")
            
            sc = score_candidate(title, cand_title, cand_orig_title, year, cand_year)
            
            if debug:
                print(f"    [{i+1}] id={cand_id}, title='{cand_title}', original='{cand_orig_title}', "
                      f"year={cand_year}, score={sc:.3f}")
            
            if sc > best_score:
                best_score = sc
                best = cand
        
        if debug:
            print(f"  Best score: {best_score:.3f}")
        
        # Classify and store
        if best and best_score >= 0.88:
            if debug:
                print(f"  Status: CONFIRMED")
            
            # Fetch details
            tmdb_id = best.get("id")
            details = details_cache.get(str(tmdb_id))
            if not details:
                try:
                    details = tmdb_details(tmdb_id, api_key)
                    details_cache[str(tmdb_id)] = details
                except Exception as e:
                    print(f"WARNING: Could not fetch details for TMDB ID {tmdb_id}: {e}")
                    details = best
            
            # Build supplemental entry
            entry = {
                "letterboxd_slug": slug,
                "title": details.get("title") or best.get("title"),
                "original_title": details.get("original_title"),
                "year": (details.get("release_date") or "")[:4],
                "runtime": details.get("runtime"),
                "genres": [g.get("name") for g in details.get("genres") or []],
                "countries": [c.get("name") for c in details.get("production_countries") or []],
                "original_language": details.get("original_language"),
                "tmdb_id": tmdb_id,
                "tmdb_score": best_score,
                "status": "confirmed",
                "needs_manual_review": False,
            }
            supplemental[slug] = entry
            report["confirmed"] += 1
            report["items"].append({"slug": slug, "choice": entry["title"], "score": best_score})
        
        elif best and best_score >= 0.7:
            if debug:
                print(f"  Status: NEEDS_REVIEW")
            
            report["needs_review"] += 1
            report["items"].append({
                "slug": slug, 
                "choice": best.get("title"), 
                "score": best_score, 
                "tmdb_id": best.get("id")
            })
        else:
            if debug:
                print(f"  Status: NOT_FOUND")
            
            report["not_found"] += 1
            report["items"].append({"slug": slug, "choice": None, "score": best_score or 0.0})

    # Persist caches and supplemental
    save_json_cache(search_cache_fn, search_cache)
    save_json_cache(details_cache_fn, details_cache)
    save_json_cache(SUPPLEMENTAL_JSON, supplemental)

    # Write report
    out_md = QUEUE_DIR / f"{username}_tmdb_enrichment_report.md"
    with out_md.open("w", encoding="utf-8") as r:
        r.write(f"# TMDB enrichment report for {username}\n\n")
        r.write(f"- Queue size: {report['queue_size']}\n")
        r.write(f"- Already present: {report['already_present']}\n")
        r.write(f"- Confirmed: {report['confirmed']}\n")
        r.write(f"- Needs review: {report['needs_review']}\n")
        r.write(f"- Not found: {report['not_found']}\n\n")
        r.write("## Items\n\n")
        for it in report["items"]:
            r.write(f"- {it.get('slug')}: {it.get('choice')} (score: {it.get('score')})\n")

    print(f"\nEnrichment complete. Report: {out_md}")
    print(f"Summary: {report['confirmed']} confirmed, {report['needs_review']} needs_review, {report['not_found']} not_found")


if __name__ == '__main__':
    main()
