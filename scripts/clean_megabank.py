import ast
import json
from pathlib import Path
from urllib.parse import urlparse
import re

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
RAW_XLSX = BASE_DIR / "data" / "raw" / "Megabank.xlsx"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
AUDIT_DIR = BASE_DIR / "data" / "audit"


KEEP_COLUMNS = [
    "Film_title",
    "Director",
    "Cast",
    "Average_rating",
    "Genres",
    "Runtime",
    "Countries",
    "Original_language",
    "Spoken_languages",
    "Description",
    "Studios",
    "Watches",
    "List_appearances",
    "Likes",
    "Fans",
    "½",
    "★",
    "★½",
    "★★",
    "★★½",
    "★★★",
    "★★★½",
    "★★★★",
    "★★★★½",
    "★★★★★",
    "Total_ratings",
    "Film_URL",
]

DROP_COLUMNS = {
    "Release_year",
    "TMDB ID",
    "Mainstreamness",
    "Oldness",
    "Weirdness",
    "Colorness",
    "Speedness",
    "Year",
}

RENAME_MAP = {
    "Film_title": "title",
    "Director": "directors",
    "Cast": "cast",
    "Average_rating": "average_rating",
    "Genres": "genres",
    "Runtime": "runtime",
    "Countries": "countries",
    "Original_language": "original_language",
    "Spoken_languages": "spoken_languages",
    "Description": "description",
    "Studios": "studios",
    "Watches": "watches",
    "List_appearances": "list_appearances",
    "Likes": "likes",
    "Fans": "fans",
    "Total_ratings": "total_ratings",
    "Film_URL": "letterboxd_url",
}


def safe_literal_eval(val):
    if pd.isna(val):
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    s = str(val).strip()
    if not s:
        return []
    # If it already looks like a Python list, try to eval
    if s.startswith("[") and s.endswith("]"):
        try:
            parsed = ast.literal_eval(s)
            if isinstance(parsed, (list, tuple)):
                return list(parsed)
        except Exception:
            pass
    # Fallback: split on commas
    parts = [p.strip() for p in re.split(r",\s*", s) if p.strip()]
    return parts


def parse_directors(val):
    if pd.isna(val):
        return []
    s = str(val).strip()
    if not s:
        return []
    # Split on comma
    parts = [p.strip() for p in s.split(",") if p.strip()]
    return parts


def extract_slug(url):
    if pd.isna(url) or not str(url).strip():
        return None
    s = str(url).strip()
    # remove trailing slash
    s = s.rstrip("/")
    try:
        p = urlparse(s)
        path = p.path
        if not path:
            return None
        parts = [part for part in path.split("/") if part]
        if parts:
            # Usually last segment is film slug
            return parts[-1]
    except Exception:
        pass
    # Fallback: take last path-like segment
    if "/" in s:
        return s.rstrip("/").split("/")[-1]
    return s


def normalize_url(url):
    if pd.isna(url):
        return None
    s = str(url).strip()
    if not s:
        return None
    s = s.rstrip("/")
    return s


def to_numeric_series(s):
    # Remove commas and stray characters then coerce
    return pd.to_numeric(s.astype(str).str.replace(r"[^0-9.\-]", "", regex=True), errors="coerce")


def main():
    print("Starting Megabank cleaning...")

    if not RAW_XLSX.exists():
        print(f"Source file not found: {RAW_XLSX}")
        return

    df = pd.read_excel(RAW_XLSX, sheet_name="Movie_Data_File", dtype=object)
    input_count = len(df)

    # Drop unnamed/empty-header columns
    cols = [c for c in df.columns if not (pd.isna(c) or str(c).strip() == "" or str(c).startswith("Unnamed"))]
    df = df[cols]

    # Drop explicitly excluded columns if present
    for col in list(df.columns):
        if col in DROP_COLUMNS:
            df = df.drop(columns=[col])

    # Keep only requested columns if they exist
    keep = [c for c in KEEP_COLUMNS if c in df.columns]
    df = df[keep].copy()

    # Rename some columns
    df = df.rename(columns=RENAME_MAP)

    # Ensure processed dir exists
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)

    # Trim strings
    for col in df.select_dtypes(include=[object]).columns:
        df[col] = df[col].apply(lambda v: v.strip() if isinstance(v, str) else v)

    # Normalize URLs and extract slug
    if "letterboxd_url" in df.columns:
        df["letterboxd_url"] = df["letterboxd_url"].apply(normalize_url)
        df["letterboxd_slug"] = df["letterboxd_url"].apply(extract_slug)
    else:
        df["letterboxd_slug"] = None

    # Remove rows with empty title or empty url
    missing_title = df["title"].isna() | (df["title"].astype(str).str.strip() == "")
    missing_url = (~df["letterboxd_url"].notna()) | (df["letterboxd_url"].astype(str).str.strip() == "")
    to_drop = missing_title | missing_url
    dropped_missing = int(to_drop.sum())
    if to_drop.any():
        df = df.loc[~to_drop].copy()

    # Parse list-like columns
    list_cols = [c for c in ["cast", "genres", "countries", "spoken_languages", "studios"] if c in df.columns]
    for col in list_cols:
        df[col] = df[col].apply(safe_literal_eval)

    # Directors to list
    if "directors" in df.columns:
        df["directors"] = df["directors"].apply(parse_directors)

    # Numeric conversions
    num_cols = [c for c in ["average_rating", "runtime", "watches", "list_appearances", "likes", "fans", "total_ratings"] if c in df.columns]
    # also include distribution columns (stars)
    dist_cols = [c for c in df.columns if c in {"½","★","★½","★★","★★½","★★★","★★★½","★★★★","★★★★½","★★★★★"}]
    for c in num_cols + dist_cols:
        df[c] = to_numeric_series(df[c])

    # Deduplicate by slug keeping highest total_ratings
    if "letterboxd_slug" in df.columns:
        df["_total_ratings_for_sort"] = df.get("total_ratings", pd.Series([0]*len(df))).fillna(0)
        df = df.sort_values(by=["letterboxd_slug", "_total_ratings_for_sort"], ascending=[True, False])
        before_dup = len(df)
        df = df.drop_duplicates(subset=["letterboxd_slug"], keep="first")
        after_dup = len(df)
        dropped_duplicates = before_dup - after_dup
        df = df.drop(columns=["_total_ratings_for_sort"])
    else:
        dropped_duplicates = 0

    final_count = len(df)

    # Reorder columns to place slug last
    cols_final = list(df.columns)
    if "letterboxd_slug" in cols_final:
        cols_final = [c for c in cols_final if c != "letterboxd_slug"] + ["letterboxd_slug"]
    df = df[cols_final]

    # Save outputs
    csv_out = PROCESSED_DIR / "megabank_clean.csv"
    json_out = PROCESSED_DIR / "megabank_clean.json"
    df.to_csv(csv_out, index=False)
    # Convert lists to JSON-friendly (they already are) and write
    df_records = df.to_dict(orient="records")
    with json_out.open("w", encoding="utf-8") as f:
        json.dump(df_records, f, ensure_ascii=False, indent=2, default=str)

    # Generate audit report
    report_path = AUDIT_DIR / "megabank_cleaning_report.md"
    missing_counts = df.isna().sum().to_dict()
    final_columns = list(df.columns)

    examples = df.head(10).to_dict(orient="records")

    with report_path.open("w", encoding="utf-8") as r:
        r.write("# Megabank cleaning report\n\n")
        r.write(f"- Input rows: {input_count}\n")
        r.write(f"- Rows removed (missing title or URL): {dropped_missing}\n")
        r.write(f"- Duplicate rows removed (by letterboxd_slug): {dropped_duplicates}\n")
        r.write(f"- Final films: {final_count}\n\n")
        r.write("## Final columns\n\n")
        for c in final_columns:
            r.write(f"- {c}\n")
        r.write("\n## Examples (first 10 cleaned films)\n\n```")
        json.dump(examples, r, ensure_ascii=False, indent=2, default=str)
        r.write("```\n\n")
        r.write("## Missing values per column\n\n")
        for k, v in missing_counts.items():
            r.write(f"- {k}: {v}\n")

    print("Done.")
    print(f"Wrote: {csv_out}")
    print(f"Wrote: {json_out}")
    print(f"Wrote: {report_path}")


if __name__ == "__main__":
    main()
