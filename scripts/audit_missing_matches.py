import json
import difflib
import re
from pathlib import Path
from typing import List, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"
MEGABANK_JSON = BASE_DIR / "data" / "processed" / "megabank_clean.json"


def normalize_title(t: str) -> str:
    if not t:
        return ""
    s = str(t).lower()
    s = re.sub(r"\(.*?\)", "", s)  # remove parentheses (years)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def title_without_year(t: str) -> str:
    if not t:
        return ""
    # remove trailing year patterns like ' - 2022' or '(2022)'
    s = re.sub(r"[-\(]\s*\d{4}\s*[\)]?$", "", t)
    return s.strip()


def best_matches(target: str, candidates: List[Tuple[str, str]], n: int = 5) -> List[Tuple[str, str, float]]:
    """Return top n matches (title, slug, score) using difflib ratio."""
    results = []
    for title, slug in candidates:
        score = difflib.SequenceMatcher(None, target, title).ratio()
        results.append((title, slug, score))
    results.sort(key=lambda x: x[2], reverse=True)
    return results[:n]


def load_megabank_candidates():
    with open(MEGABANK_JSON, "r", encoding="utf-8") as f:
        records = json.load(f)
    candidates = []
    for r in records:
        title = r.get("title") or ""
        slug = r.get("letterboxd_slug") or ""
        candidates.append((normalize_title(title), slug))
    return candidates


def audit(username: str):
    in_path = OUTPUT_DIR / f"{username}_wrapped.json"
    if not in_path.exists():
        raise FileNotFoundError(f"Wrapped file not found: {in_path}")
    with open(in_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    films = data.get("films", [])
    missing = [f for f in films if not f.get("matched")]
    candidates = load_megabank_candidates()

    report_lines = []
    report_lines.append(f"# Missing match audit for {username}\n")
    report_lines.append(f"Wrapped file: {in_path}\n")
    report_lines.append(f"Missing films: {len(missing)}\n\n")

    for m in missing:
        title = m.get("rss_title") or ""
        slug = m.get("letterboxd_slug") or ""
        url = m.get("letterboxd_url") or ""
        norm = normalize_title(title)
        norm_no_year = normalize_title(title_without_year(title))

        # candidates by normalized title exact
        exacts = [c for c in candidates if c[0] == norm or c[0] == norm_no_year]

        best = best_matches(norm, candidates, n=5)

        report_lines.append(f"## {title} \n")
        report_lines.append(f"- RSS slug: {slug}\n")
        report_lines.append(f"- RSS URL: {url}\n")
        if exacts:
            report_lines.append(f"- Exact normalized title matches found: {len(exacts)}\n")
            for t, s in exacts:
                report_lines.append(f"  - candidate slug: {s} (title: {t})\n")
        report_lines.append("- Top fuzzy matches:\n")
        for t, s, score in best:
            report_lines.append(f"  - {t} — slug: {s} — score: {score:.3f}\n")

        # decide recommendation
        top_score = best[0][2] if best else 0
        if top_score > 0.92:
            rec = "probable_slug_mismatch"
        elif top_score > 0.75:
            rec = "uncertain"
        else:
            rec = "probably_absent_from_megabank"
        report_lines.append(f"- Recommendation: {rec}\n\n")

    out_md = OUTPUT_DIR / f"{username}_missing_match_audit.md"
    with out_md.open("w", encoding="utf-8") as r:
        r.writelines([line + "\n" if not line.endswith("\n") else line for line in report_lines])

    print(f"Wrote audit: {out_md}")


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python scripts/audit_missing_matches.py <username>")
        raise SystemExit(2)
    audit(sys.argv[1])
