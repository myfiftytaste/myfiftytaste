import json
import csv
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "output"
PROCESSED_DIR = BASE_DIR / "data" / "processed"


CSV_COLUMNS = [
    "rss_title",
    "letterboxd_slug",
    "letterboxd_url",
    "watched_at",
    "user_rating",
    "status",
    "notes",
    "tmdb_id",
    "title",
    "year",
    "directors",
    "genres",
    "countries",
    "runtime",
    "original_language",
    "poster_url",
]


def stringify(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, list):
        return "; ".join(str(x) for x in v)
    return str(v)


def build_queue(username: str):
    wrapped_path = OUTPUT_DIR / f"{username}_wrapped.json"
    if not wrapped_path.exists():
        raise FileNotFoundError(f"Wrapped file not found: {wrapped_path}")

    with wrapped_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    films = data.get("films", [])
    missing = [f for f in films if not f.get("matched")]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    csv_path = OUTPUT_DIR / f"{username}_missing_metadata_queue.csv"
    md_path = OUTPUT_DIR / f"{username}_missing_metadata_queue.md"

    # write CSV
    with csv_path.open("w", encoding="utf-8", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        for m in missing:
            row = {
                "rss_title": m.get("rss_title", ""),
                "letterboxd_slug": m.get("letterboxd_slug", ""),
                "letterboxd_url": m.get("letterboxd_url", ""),
                "watched_at": m.get("watched_at", ""),
                "user_rating": m.get("user_rating", ""),
                "status": "needs_metadata",
                "notes": "",
                "tmdb_id": "",
                "title": "",
                "year": "",
                "directors": stringify(m.get("directors")),
                "genres": stringify(m.get("genres")),
                "countries": stringify(m.get("countries")),
                "runtime": stringify(m.get("runtime")),
                "original_language": m.get("original_language", ""),
                "poster_url": "",
            }
            writer.writerow(row)

    # write markdown report
    with md_path.open("w", encoding="utf-8") as r:
        r.write(f"# Missing metadata queue for {username}\n\n")
        r.write(f"- Wrapped file: {wrapped_path}\n")
        r.write(f"- Missing films: {len(missing)}\n\n")
        r.write("## Films list\n\n")
        for m in missing:
            r.write(f"- {m.get('rss_title')} | slug: {m.get('letterboxd_slug')} | url: {m.get('letterboxd_url')}\n")
        r.write("\n## Notes\n\n")
        r.write("- These films are absent from `megabank_clean.json` and therefore have no community stats in the Megabank.\n")
        r.write("- They can be enriched later (TMDB/manual) to provide genres, countries, runtimes, directors, original_language, poster_url.\n")
        r.write("- The CSV `" + str(csv_path.name) + "` is provided for manual enrichment.\n")

    print(f"Wrote CSV queue: {csv_path}")
    print(f"Wrote report: {md_path}")


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python scripts/build_missing_metadata_queue.py <username>")
        raise SystemExit(2)
    build_queue(sys.argv[1])
