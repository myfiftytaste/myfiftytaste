import json
from pathlib import Path
from collections import Counter, defaultdict
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
AUDIT_DIR = BASE_DIR / "data" / "audit"

JSON_IN = PROCESSED_DIR / "megabank_clean.json"
CSV_IN = PROCESSED_DIR / "megabank_clean.csv"
REPORT_OUT = AUDIT_DIR / "megabank_validation_report.md"

EXPECTED_COUNT = 9971
TOLERANCE = 50


def to_number(v: Any):
    if v is None:
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return v
    try:
        # handle strings like 'nan'
        s = str(v).strip()
        if s.lower() in ("nan", "none", ""):
            return None
        return float(s)
    except Exception:
        return None


def is_list_json(v: Any) -> bool:
    return isinstance(v, list)


def validate():
    if not JSON_IN.exists():
        print(f"Missing file: {JSON_IN}")
        return 2

    with JSON_IN.open("r", encoding="utf-8") as f:
        data = json.load(f)

    n = len(data)

    errors = []

    # Basic count check
    ok_count = abs(n - EXPECTED_COUNT) <= TOLERANCE
    if not ok_count:
        errors.append(f"Unexpected film count: {n} (expected ~{EXPECTED_COUNT} ±{TOLERANCE})")

    # Required fields
    required = ["title", "letterboxd_url", "letterboxd_slug"]
    missing_counts = Counter()
    missing_examples = defaultdict(list)

    slugs = []
    for idx, film in enumerate(data):
        for r in required:
            v = film.get(r)
            if v is None or (isinstance(v, str) and v.strip() == ""):
                missing_counts[r] += 1
                if len(missing_examples[r]) < 5:
                    missing_examples[r].append({"index": idx, "value": v})
        slugs.append(film.get("letterboxd_slug"))

    for r, c in missing_counts.items():
        errors.append(f"Missing {r}: {c} films")

    # Duplicate slugs
    slug_counts = Counter(slugs)
    dup_slugs = [s for s, cnt in slug_counts.items() if s and cnt > 1]
    if dup_slugs:
        errors.append(f"Duplicate slugs found: {len(dup_slugs)}")

    # Numeric columns
    num_cols = ["average_rating", "runtime", "watches", "list_appearances", "likes", "fans", "total_ratings"]
    num_bad = defaultdict(int)
    for film in data:
        for c in num_cols:
            v = film.get(c)
            if v is None:
                # allow missing but count
                num_bad[c] += 1
            else:
                if to_number(v) is None:
                    num_bad[c] += 1

    for c, cnt in num_bad.items():
        if cnt:
            errors.append(f"Numeric column '{c}' has {cnt} non-numeric or missing values")

    # List columns
    list_cols = ["cast", "genres", "countries", "spoken_languages", "studios", "directors"]
    list_bad = defaultdict(int)
    for film in data:
        for c in list_cols:
            v = film.get(c)
            if not is_list_json(v):
                list_bad[c] += 1

    for c, cnt in list_bad.items():
        if cnt:
            errors.append(f"List column '{c}' has {cnt} non-list values")

    # Examples
    examples = []
    for film in data[:10]:
        examples.append({
            "title": film.get("title"),
            "slug": film.get("letterboxd_slug"),
            "directors": film.get("directors"),
            "genres": film.get("genres"),
            "countries": film.get("countries"),
            "watches": to_number(film.get("watches")),
            "likes": to_number(film.get("likes")),
            "fans": to_number(film.get("fans")),
            "average_rating": to_number(film.get("average_rating")),
        })

    # Top 10 most watched
    def safe_num(x):
        v = to_number(x)
        return v if v is not None else -1

    sorted_by_watches = sorted(data, key=lambda f: safe_num(f.get("watches")), reverse=True)
    top10_watched = [ (f.get("title"), f.get("letterboxd_slug"), safe_num(f.get("watches"))) for f in sorted_by_watches[:10] ]

    sorted_by_fans = sorted(data, key=lambda f: safe_num(f.get("fans")), reverse=True)
    top10_fans = [ (f.get("title"), f.get("letterboxd_slug"), safe_num(f.get("fans"))) for f in sorted_by_fans[:10] ]

    # Top genres and countries
    genre_counter = Counter()
    country_counter = Counter()
    for f in data:
        gens = f.get("genres") or []
        if isinstance(gens, list):
            genre_counter.update([g for g in gens if g])
        cts = f.get("countries") or []
        if isinstance(cts, list):
            country_counter.update([c for c in cts if c])

    top10_genres = genre_counter.most_common(10)
    top10_countries = country_counter.most_common(10)

    # Write report
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    with REPORT_OUT.open("w", encoding="utf-8") as r:
        r.write("# Megabank validation report\n\n")
        r.write(f"- Films validated: {n}\n")
        r.write(f"- Unique slugs: {len([s for s in slug_counts if s])}\n")
        r.write("\n## Errors / Warnings\n\n")
        if errors:
            for e in errors:
                r.write(f"- {e}\n")
        else:
            r.write("- No errors detected\n")

        r.write("\n## Examples\n\n")
        for ex in examples:
            r.write(f"- {ex['title']} — slug: {ex['slug']} — directors: {ex['directors']} — genres: {ex['genres']} — countries: {ex['countries']} — watches: {ex['watches']} — likes: {ex['likes']} — fans: {ex['fans']} — avg: {ex['average_rating']}\n")

        r.write("\n## Top 10 most watched\n\n")
        for t in top10_watched:
            r.write(f"- {t[0]} — {t[2]} watches — slug: {t[1]}\n")

        r.write("\n## Top 10 most fans\n\n")
        for t in top10_fans:
            r.write(f"- {t[0]} — {t[2]} fans — slug: {t[1]}\n")

        r.write("\n## Top 10 genres\n\n")
        for g, cnt in top10_genres:
            r.write(f"- {g}: {cnt}\n")

        r.write("\n## Top 10 countries\n\n")
        for c, cnt in top10_countries:
            r.write(f"- {c}: {cnt}\n")

    # Print summary
    print(f"Validated {n} films. Unique slugs: {len([s for s in slug_counts if s])}.")
    if errors:
        print("Errors/warnings detected:")
        for e in errors:
            print(" -", e)
    else:
        print("No errors detected.")

    print(f"Wrote validation report: {REPORT_OUT}")
    return 0


if __name__ == '__main__':
    raise SystemExit(validate())
