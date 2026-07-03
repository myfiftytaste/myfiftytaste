import json
import math
import re
from html import unescape
from html.parser import HTMLParser
from collections import Counter, defaultdict
from datetime import UTC, datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from statistics import mean, median
from typing import Any, Dict, List, Optional, Tuple

import feedparser
import requests


BASE_DIR = Path(__file__).resolve().parent.parent
MEGABANK_JSON = BASE_DIR / "data" / "processed" / "megabank_clean.json"
ALIASES_JSON = BASE_DIR / "data" / "processed" / "slug_aliases.json"
OUTPUT_DIR = BASE_DIR / "data" / "output"
SUPPLEMENTAL_JSON = BASE_DIR / "data" / "processed" / "supplemental_metadata.json"
SUPPLEMENTAL_OVERRIDES_JSON = BASE_DIR / "data" / "processed" / "supplemental_overrides.json"
TMDB_DETAILS_CACHE_JSON = BASE_DIR / "data" / "cache" / "tmdb_details_cache.json"


COUNTRY_NAME_MAP = {
    "US": "USA",
    "USA": "USA",
    "United States": "USA",
    "United States of America": "USA",
    "GB": "UK",
    "UK": "UK",
    "United Kingdom": "UK",
    "JP": "Japan",
    "JPN": "Japan",
    "Japan": "Japan",
    "FR": "France",
    "FRA": "France",
    "France": "France",
    "KR": "South Korea",
    "KOR": "South Korea",
    "South Korea": "South Korea",
    "ES": "Spain",
    "ESP": "Spain",
    "Spain": "Spain",
    "IT": "Italy",
    "ITA": "Italy",
    "Italy": "Italy",
    "SE": "Sweden",
    "SWE": "Sweden",
    "Sweden": "Sweden",
    "DE": "Germany",
    "DEU": "Germany",
    "Germany": "Germany",
    "CA": "Canada",
    "CAN": "Canada",
    "Canada": "Canada",
    "IE": "Ireland",
    "IRL": "Ireland",
    "Ireland": "Ireland",
    "NG": "Nigeria",
    "NGA": "Nigeria",
    "Nigeria": "Nigeria",
}

LANGUAGE_NAME_MAP = {
    "en": "English",
    "eng": "English",
    "English": "English",
    "fr": "French",
    "fre": "French",
    "fra": "French",
    "French": "French",
    "ja": "Japanese",
    "jpn": "Japanese",
    "Japanese": "Japanese",
    "ko": "Korean",
    "kor": "Korean",
    "Korean": "Korean",
    "es": "Spanish",
    "spa": "Spanish",
    "Spanish": "Spanish",
    "it": "Italian",
    "ita": "Italian",
    "Italian": "Italian",
    "sv": "Swedish",
    "swe": "Swedish",
    "Swedish": "Swedish",
    "de": "German",
    "ger": "German",
    "deu": "German",
    "German": "German",
}


def fetch_rss(username: str) -> feedparser.FeedParserDict:
    url = f"https://letterboxd.com/{username}/rss/"
    resp = requests.get(url, timeout=10)
    if resp.status_code != 200:
        raise RuntimeError(f"RSS fetch failed ({resp.status_code}) for {url}")
    feed = feedparser.parse(resp.text)
    return feed


def parse_logged_at(entry: Dict[str, Any], raw_value: Optional[str]) -> Dict[str, Any]:
    """Extract structured log time from Letterboxd RSS pubDate/published fields."""
    dt: Optional[datetime] = None
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        try:
            dt = datetime(*parsed[:6], tzinfo=timezone.utc)
        except Exception:
            dt = None
    if dt is None and raw_value:
        try:
            dt = parsedate_to_datetime(raw_value)
        except Exception:
            dt = None
    if dt is None:
        return {
            "logged_at_raw": raw_value,
            "logged_at_iso": None,
            "logged_hour": None,
            "logged_minute": None,
        }
    return {
        "logged_at_raw": raw_value,
        "logged_at_iso": dt.isoformat(),
        "logged_hour": dt.hour,
        "logged_minute": dt.minute,
    }


def extract_slug_from_link(link: Optional[str]) -> Optional[str]:
    if not link:
        return None
    s = link.rstrip("/")
    parts = s.split("/")
    if "film" in parts:
        # slug is the segment after 'film'
        try:
            idx = parts.index("film")
            return parts[idx + 1]
        except Exception:
            return parts[-1]
    # fallback: last segment
    return parts[-1]


def parse_user_rating_from_title(title: str) -> Optional[float]:
    if not title:
        return None
    # find contiguous run of stars and halves like '★★★½' or '★½' anywhere
    m = re.search(r"[★½]{1,5}", title)
    if not m:
        return None
    s = m.group(0)
    stars = s.count("★")
    halves = s.count("½")
    return stars + 0.5 * halves


def parse_year_from_title(title: str) -> Optional[int]:
    if not title:
        return None
    match = re.search(r",\s*(\d{4})(?:\s*-|$)", title)
    if not match:
        match = re.search(r"\b(18\d{2}|19\d{2}|20\d{2})\b", title)
    if not match:
        return None
    try:
        return int(match.group(1))
    except Exception:
        return None


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value or "")).strip()


class ParagraphTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._in_paragraph = False
        self._current: List[str] = []
        self.paragraphs: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if tag.lower() == "p":
            self._in_paragraph = True
            self._current = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "p" and self._in_paragraph:
            text = normalize_space(" ".join(self._current))
            if text:
                self.paragraphs.append(text)
            self._in_paragraph = False
            self._current = []

    def handle_data(self, data: str) -> None:
        if self._in_paragraph and data:
            self._current.append(data)


class FirstImageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.src: Optional[str] = None

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if self.src or tag.lower() != "img":
            return
        attr_map = {key.lower(): value for key, value in attrs if key}
        src = attr_map.get("src")
        if src:
            self.src = unescape(src)


def rss_poster_from_entry(entry: Dict[str, Any]) -> Optional[str]:
    parser = FirstImageParser()
    html_parts: List[str] = []
    for key in ("summary", "description"):
        value = entry.get(key)
        if value:
            html_parts.append(str(value))
    for content in entry.get("content") or []:
        if isinstance(content, dict) and content.get("value"):
            html_parts.append(str(content.get("value")))
    for html in html_parts:
        try:
            parser.feed(html)
        except Exception:
            continue
        if parser.src:
            return parser.src
    return None


def strip_rating_from_title(title: str) -> str:
    return normalize_space(re.sub(r"\s*-\s*[â˜…Â½★½]+\s*$", "", title or ""))


def review_text_from_entry(entry: Dict[str, Any], rss_title: str) -> str:
    html_parts: List[str] = []
    for key in ("summary", "description"):
        value = entry.get(key)
        if value:
            html_parts.append(str(value))
    for content in entry.get("content") or []:
        if isinstance(content, dict) and content.get("value"):
            html_parts.append(str(content.get("value")))

    parser = ParagraphTextParser()
    for html in html_parts:
        try:
            parser.feed(html)
        except Exception:
            continue

    title_without_rating = strip_rating_from_title(rss_title).lower()
    review_parts: List[str] = []
    for paragraph in parser.paragraphs:
        text = normalize_space(paragraph)
        lowered = text.lower()
        compact = re.sub(r"[\s,.-]+", "", text)
        if not text:
            continue
        if lowered == title_without_rating:
            continue
        if re.fullmatch(r"[â˜…Â½★½]+", compact):
            continue
        if lowered.startswith(("watched ", "rewatched ", "rated ")):
            continue
        if "letterboxd" in lowered:
            continue
        if lowered in {"liked", "watched"}:
            continue
        if lowered.startswith("this review may contain spoilers"):
            continue
        review_parts.append(text)

    return normalize_space(" ".join(review_parts))


def review_word_count(text: str) -> int:
    return len(re.findall(r"[^\W_]+(?:['’][^\W_]+)?", text, flags=re.UNICODE))


def film_sample_quality(count: int) -> Dict[str, Any]:
    if count <= 0:
        status = "impossible"
        warning = "Aucun film détecté. Le profil ne peut pas être calculé."
    elif count < 10:
        status = "very_limited"
        warning = (
            f"Profil très limité : seulement {count} films détectés. "
            "Certaines sections peuvent être indisponibles."
        )
    elif count < 50:
        status = "partial"
        warning = (
            f"Profil calculé sur {count} films détectés. C’est assez pour esquisser "
            "une tendance, mais certaines conclusions peuvent encore bouger avec plus de films."
        )
    else:
        status = "normal"
        warning = None
    return {
        "detected_films_count": count,
        "target_films_count": 50,
        "status": status,
        "is_partial": 0 < count < 50,
        "warning": warning,
    }


def normalize_title(t: Optional[str]) -> str:
    if not t:
        return ""
    s = str(t).lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def to_number(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    try:
        s = str(v).strip()
        if s.lower() in ("nan", "none", ""):
            return None
        return float(s)
    except Exception:
        return None


def safe_float(value: Any) -> Optional[float]:
    """Return a finite float or None for invalid/NaN-like values."""
    if value is None:
        return None
    # numeric types
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            f = float(value)
            if math.isnan(f) or not math.isfinite(f):
                return None
            return f
        except Exception:
            return None
    # strings
    try:
        s = str(value).strip()
        if s == "":
            return None
        if s.lower() == "nan":
            return None
        f = float(s)
        if math.isnan(f) or not math.isfinite(f):
            return None
        return f
    except Exception:
        return None


def json_safe(value: Any) -> Any:
    """Recursively replace non-finite floats with JSON-compatible nulls."""
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [json_safe(item) for item in value]
    return value


def normalize_country_name(value: Any) -> Optional[str]:
    if value is None:
        return None
    country = str(value).strip()
    if not country:
        return None
    return COUNTRY_NAME_MAP.get(country, country)


def normalize_language(value: Any) -> Optional[str]:
    if value is None:
        return None
    language = str(value).strip()
    if not language:
        return None
    return LANGUAGE_NAME_MAP.get(language, LANGUAGE_NAME_MAP.get(language.lower(), language))


def load_supplemental_metadata() -> Dict[str, Dict]:
    if not SUPPLEMENTAL_JSON.exists():
        return {}
    try:
        with SUPPLEMENTAL_JSON.open("r", encoding="utf-8") as sf:
            data = json.load(sf)
            if isinstance(data, dict):
                return data
    except Exception:
        return {}
    return {}


def load_supplemental_overrides() -> Dict[str, Dict]:
    if not SUPPLEMENTAL_OVERRIDES_JSON.exists():
        return {}
    try:
        with SUPPLEMENTAL_OVERRIDES_JSON.open("r", encoding="utf-8") as sf:
            data = json.load(sf)
            if isinstance(data, dict):
                return data
    except Exception:
        return {}
    return {}


def load_tmdb_details_cache() -> Dict[str, Dict[str, Any]]:
    if not TMDB_DETAILS_CACHE_JSON.exists():
        return {}
    try:
        data = json.loads(TMDB_DETAILS_CACHE_JSON.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def tmdb_directors(details: Any) -> List[str]:
    """Extract credited directors from a TMDB details payload with credits."""
    if not isinstance(details, dict):
        return []
    credits = details.get("credits")
    crew = credits.get("crew") if isinstance(credits, dict) else None
    if not isinstance(crew, list):
        return []
    return [
        person["name"]
        for person in crew
        if isinstance(person, dict)
        and person.get("job") == "Director"
        and isinstance(person.get("name"), str)
        and person["name"].strip()
    ]


def load_tmdb_review_candidates(username: str) -> Dict[str, Dict[str, Any]]:
    """Read the enrichment report for candidates below confirmation threshold."""
    report_path = OUTPUT_DIR / f"{username}_tmdb_enrichment_report.md"
    if not report_path.exists():
        return {}

    review_candidates: Dict[str, Dict[str, Any]] = {}
    pattern = re.compile(r"^- (?P<slug>[^:]+): (?P<title>.*) \(score: (?P<score>[0-9.]+)\)")
    try:
        for line in report_path.read_text(encoding="utf-8").splitlines():
            match = pattern.match(line.strip())
            if not match:
                continue
            score = safe_float(match.group("score"))
            if score is None or score < 0.7 or score >= 0.88:
                continue
            review_candidates[match.group("slug")] = {
                "title": match.group("title"),
                "tmdb_score": score,
                "tmdb_id": None,
                "reason": "score below confirmation threshold",
            }
    except Exception:
        return {}
    return review_candidates


def load_megabank_index() -> Tuple[Dict[str, Dict], Dict[str, Dict]]:
    if not MEGABANK_JSON.exists():
        raise FileNotFoundError(f"Missing megabank file: {MEGABANK_JSON}")
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
    return by_slug, by_title


def load_aliases() -> Dict[str, str]:
    if ALIASES_JSON.exists():
        try:
            with ALIASES_JSON.open("r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            return {}
    return {}


def build_user_profile(username: str) -> Dict:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Fetch RSS
    try:
        feed = fetch_rss(username)
    except Exception as e:
        raise RuntimeError(f"Failed to fetch/parse RSS for '{username}': {e}")

    # Parse items and keep only /film/ links
    items = []
    seen_slugs = set()
    for entry in feed.entries:
        link = entry.get("link") or entry.get("id")
        if not link or "/film/" not in link:
            continue
        slug = extract_slug_from_link(link)
        if not slug:
            continue
        if slug in seen_slugs:
            continue
        title = entry.get("title") or ""
        published = entry.get("published") or entry.get("updated")
        user_rating = parse_user_rating_from_title(title)
        year = parse_year_from_title(title)
        review_text = review_text_from_entry(entry, title)
        word_count = review_word_count(review_text)
        logged_at = parse_logged_at(entry, published)
        rss_poster_url = rss_poster_from_entry(entry)
        items.append({
            "rss_title": title,
            "letterboxd_url": link,
            "letterboxd_slug": slug,
            "watched_at": published,
            **logged_at,
            "rss_poster_url": rss_poster_url,
            "letterboxd_poster_url": rss_poster_url,
            "user_rating": user_rating,
            "year": year,
            "has_review": word_count > 0,
            "review_word_count": word_count,
        })
        seen_slugs.add(slug)
        if len(items) >= 50:
            break

    if not items:
        raise RuntimeError(f"No /film/ items found in RSS for '{username}'")

    # Load megabank index
    by_slug, by_title = load_megabank_index()

    # Load aliases
    aliases = load_aliases()
    supplemental = load_supplemental_metadata()
    supplemental_overrides = load_supplemental_overrides()
    tmdb_review_candidates = load_tmdb_review_candidates(username)
    tmdb_details_cache = load_tmdb_details_cache()

    # Match items
    films = []
    megabank_social_count = 0
    supplemental_confirmed_count = 0
    supplemental_review_count = 0
    supplemental_rejected_count = 0
    missing_count = 0
    manual_confirmed_films = []
    manual_rejected_films = []
    manual_replace_films = []
    community_ratings = []
    runtimes = []
    watches_list = []
    likes_list = []
    fans_list = []
    genre_counter = Counter()
    country_counter = Counter()
    language_counter = Counter()
    director_counter = Counter()

    for it in items:
        slug = it["letterboxd_slug"]
        # apply alias mapping if present
        lookup_slug = aliases.get(slug, slug)
        matched = by_slug.get(lookup_slug)
        match_type = "slug"
        if not matched:
            # fallback by normalized title
            norm = normalize_title(it["rss_title"])
            matched = by_title.get(norm)
            if matched:
                match_type = "title"
            else:
                match_type = "none"

        entry = {
            "rss_title": it["rss_title"],
            "letterboxd_url": it["letterboxd_url"],
            "letterboxd_slug": slug,
            "watched_at": it["watched_at"],
            "logged_at_raw": it.get("logged_at_raw"),
            "logged_at_iso": it.get("logged_at_iso"),
            "logged_hour": it.get("logged_hour"),
            "logged_minute": it.get("logged_minute"),
            "rss_poster_url": it.get("rss_poster_url"),
            "letterboxd_poster_url": it.get("letterboxd_poster_url"),
            "user_rating": it["user_rating"],
            "year": it["year"],
            "has_review": it["has_review"],
            "review_word_count": it["review_word_count"],
            "matched": False,
            "source": "missing",
            "has_social_stats": False,
            "has_metadata": False,
        }

        # First, match against Megabank (social authoritative)
        if matched:
            megabank_social_count += 1
            entry.update({"matched": True, "source": "megabank", "has_social_stats": True, "has_metadata": True})
            # copy requested fields
            for k in [
                "title",
                "directors",
                "genres",
                "countries",
                "original_language",
                "runtime",
                "average_rating",
                "watches",
                "likes",
                "fans",
                "total_ratings",
            ]:
                entry[k] = matched.get(k)

            # social stats only come from Megabank
            ar = safe_float(matched.get("average_rating"))
            if ar is not None:
                community_ratings.append(ar)
            rt = to_number(matched.get("runtime"))
            if rt is not None:
                runtimes.append(rt)
            w = to_number(matched.get("watches"))
            if w is not None:
                watches_list.append(w)
            lk = to_number(matched.get("likes"))
            if lk is not None:
                likes_list.append(lk)
            fn = to_number(matched.get("fans"))
            if fn is not None:
                fans_list.append(fn)

            # counters (metadata)
            gens = matched.get("genres") or []
            if isinstance(gens, list):
                genre_counter.update([g for g in gens if g])
            cts = matched.get("countries") or []
            if isinstance(cts, list):
                country_counter.update([c for c in (normalize_country_name(c) for c in cts) if c])
            lang = matched.get("original_language")
            if lang:
                normalized_lang = normalize_language(lang)
                if normalized_lang:
                    language_counter.update([normalized_lang])
            dirs = matched.get("directors") or []
            if isinstance(dirs, list):
                director_counter.update([d for d in dirs if d])
        else:
            # check supplemental metadata
            sup = supplemental.get(slug) or supplemental.get(lookup_slug) or {}
            override = supplemental_overrides.get(slug) or supplemental_overrides.get(lookup_slug) or {}
            override_action = str(override.get("action") or "").strip().lower()
            if override:
                entry["manual_override"] = override

            def apply_supplemental_metadata(metadata: Dict[str, Any], manual: bool = False) -> None:
                entry.update({
                    "matched": True,
                    "source": "supplemental",
                    "has_social_stats": False,
                    "has_metadata": True,
                })
                if manual:
                    entry["manual_review_status"] = "confirmed"
                for k in ["title", "directors", "genres", "countries", "original_language", "runtime", "tmdb_id"]:
                    entry[k] = metadata.get(k)

                # Supplemental metadata is a confirmed identity match.  It must
                # not lose its director merely because the Megabank has no row.
                # The details cache is populated with append_to_response=credits
                # by the TMDB enrichment step.
                supplied_directors = entry.get("directors")
                if not isinstance(supplied_directors, list) or not supplied_directors:
                    cached_details = tmdb_details_cache.get(str(metadata.get("tmdb_id")))
                    cached_directors = tmdb_directors(cached_details)
                    if cached_directors:
                        entry["directors"] = cached_directors
                        entry["director_source"] = "tmdb_details_cache"

                gens = metadata.get("genres") or []
                if isinstance(gens, list):
                    genre_counter.update([g for g in gens if g])
                cts = metadata.get("countries") or []
                if isinstance(cts, list):
                    country_counter.update([c for c in (normalize_country_name(c) for c in cts) if c])
                lang = metadata.get("original_language")
                if lang:
                    normalized_lang = normalize_language(lang)
                    if normalized_lang:
                        language_counter.update([normalized_lang])
                dirs = metadata.get("directors") or []
                if isinstance(dirs, list):
                    director_counter.update([d for d in dirs if d])

            if sup:
                status = sup.get("status")
                needs_review = bool(sup.get("needs_manual_review"))
                if override_action == "reject":
                    supplemental_rejected_count += 1
                    entry.update({
                        "matched": False,
                        "source": "supplemental_rejected",
                        "has_social_stats": False,
                        "has_metadata": False,
                        "title": sup.get("title"),
                        "tmdb_candidate_title": sup.get("title"),
                        "tmdb_score": sup.get("tmdb_score"),
                        "tmdb_id": sup.get("tmdb_id"),
                        "review_reason": override.get("notes") or "rejected manually",
                        "manual_review_status": "rejected",
                    })
                    manual_rejected_films.append(entry)
                elif override_action == "replace":
                    supplemental_review_count += 1
                    entry.update({
                        "matched": False,
                        "source": "supplemental_review",
                        "has_social_stats": False,
                        "has_metadata": False,
                        "title": sup.get("title"),
                        "tmdb_candidate_title": sup.get("title"),
                        "tmdb_score": sup.get("tmdb_score"),
                        "tmdb_id": override.get("tmdb_id"),
                        "review_reason": override.get("notes") or "manual replacement requested; rerun enrichment",
                        "manual_review_status": "replace_requested",
                    })
                    manual_replace_films.append(entry)
                elif override_action == "confirm" or (status == "confirmed" and not needs_review):
                    supplemental_confirmed_count += 1
                    apply_supplemental_metadata(sup, manual=override_action == "confirm")
                    if override_action == "confirm":
                        manual_confirmed_films.append(entry)
                else:
                    supplemental_review_count += 1
                    entry.update({
                        "matched": False,
                        "source": "supplemental_review",
                        "has_social_stats": False,
                        "has_metadata": False,
                        "title": sup.get("title"),
                        "tmdb_candidate_title": sup.get("title"),
                        "tmdb_score": sup.get("tmdb_score"),
                        "tmdb_id": sup.get("tmdb_id"),
                        "review_reason": "score below confirmation threshold",
                    })
            else:
                review = tmdb_review_candidates.get(slug) or tmdb_review_candidates.get(lookup_slug)
                if review:
                    if override_action == "reject":
                        supplemental_rejected_count += 1
                        entry.update({
                            "matched": False,
                            "source": "supplemental_rejected",
                            "has_social_stats": False,
                            "has_metadata": False,
                            "title": review.get("title"),
                            "tmdb_candidate_title": review.get("title"),
                            "tmdb_score": review.get("tmdb_score"),
                            "tmdb_id": review.get("tmdb_id"),
                            "review_reason": override.get("notes") or "rejected manually",
                            "manual_review_status": "rejected",
                        })
                        manual_rejected_films.append(entry)
                    elif override_action == "replace":
                        supplemental_review_count += 1
                        entry.update({
                            "matched": False,
                            "source": "supplemental_review",
                            "has_social_stats": False,
                            "has_metadata": False,
                            "title": review.get("title"),
                            "tmdb_candidate_title": review.get("title"),
                            "tmdb_score": review.get("tmdb_score"),
                            "tmdb_id": override.get("tmdb_id"),
                            "review_reason": override.get("notes") or "manual replacement requested; rerun enrichment",
                            "manual_review_status": "replace_requested",
                        })
                        manual_replace_films.append(entry)
                    elif override_action == "confirm":
                        missing_count += 1
                        entry.update({
                            "source": "missing",
                            "review_reason": "manual confirm requested but no supplemental metadata entry exists",
                            "manual_review_status": "confirm_unavailable",
                        })
                    else:
                        supplemental_review_count += 1
                        entry.update({
                            "matched": False,
                            "source": "supplemental_review",
                            "has_social_stats": False,
                            "has_metadata": False,
                            "title": review.get("title"),
                            "tmdb_candidate_title": review.get("title"),
                            "tmdb_score": review.get("tmdb_score"),
                            "tmdb_id": review.get("tmdb_id"),
                            "review_reason": review.get("reason"),
                        })
                else:
                    missing_count += 1

        normalized_directors = entry.get("directors")
        if isinstance(normalized_directors, list):
            normalized_directors = [
                director for director in normalized_directors
                if isinstance(director, str) and director.strip()
            ]
        else:
            normalized_directors = []
        entry["directors"] = normalized_directors
        entry["director"] = normalized_directors[0] if normalized_directors else None
        if entry["director"] and not entry.get("director_source"):
            entry["director_source"] = "megabank" if entry.get("source") == "megabank" else "supplemental"
        films.append(entry)

    # Profile summary
    total_analyzed = len(items)
    films_analyzed = total_analyzed
    sample_quality = film_sample_quality(films_analyzed)
    social_coverage = megabank_social_count / films_analyzed if films_analyzed else 0
    metadata_coverage_confirmed = (
        (megabank_social_count + supplemental_confirmed_count) / films_analyzed
        if films_analyzed
        else 0
    )
    metadata_coverage_potential = (
        (
            megabank_social_count
            + supplemental_confirmed_count
            + supplemental_review_count
        )
        / films_analyzed
        if films_analyzed
        else 0
    )

    user_ratings = [r for r in (it["user_rating"] for it in films) if r is not None]
    user_avg = mean(user_ratings) if user_ratings else None
    community_avg = mean(community_ratings) if community_ratings else None
    avg_diff = None
    if user_avg is not None and community_avg is not None:
        avg_diff = user_avg - community_avg

    runtime_avg = mean(runtimes) if runtimes else None
    watches_mean = mean(watches_list) if watches_list else None
    watches_median = median(watches_list) if watches_list else None
    likes_mean = mean(likes_list) if likes_list else None
    fans_mean = mean(fans_list) if fans_list else None

    top_genres = genre_counter.most_common(10)
    top_countries = country_counter.most_common(10)
    top_languages = language_counter.most_common(10)
    top_directors = director_counter.most_common(10)

    # Highlights (among the 50)
    def pick_best(keyfunc):
        candidates = [(f, keyfunc(f)) for f in films if f.get("matched") and keyfunc(f) is not None]
        if not candidates:
            return None
        best = max(candidates, key=lambda x: x[1])[0]
        return best

    def pick_worst(keyfunc):
        candidates = [(f, keyfunc(f)) for f in films if f.get("matched") and keyfunc(f) is not None]
        if not candidates:
            return None
        worst = min(candidates, key=lambda x: x[1])[0]
        return worst

    most_popular = pick_best(lambda f: to_number(f.get("watches")) or 0)
    most_niche = pick_worst(lambda f: to_number(f.get("watches")) if to_number(f.get("watches")) is not None else float('inf'))
    most_fans = pick_best(lambda f: to_number(f.get("fans")) or 0)
    best_fans_ratio = None
    ratios = []
    for f in films:
        w = to_number(f.get("watches"))
        fn = to_number(f.get("fans"))
        if w and w > 0 and fn is not None:
            ratios.append(((fn / w), f))
    if ratios:
        ratios.sort(key=lambda x: x[0], reverse=True)
        best_fans_ratio = ratios[0][1]
    longest = pick_best(lambda f: to_number(f.get("runtime")) or 0)
    shortest = pick_worst(lambda f: to_number(f.get("runtime")) if to_number(f.get("runtime")) is not None else float('inf'))

    profile_summary = {
        "films_analyzed": films_analyzed,
        "megabank_social_count": megabank_social_count,
        "supplemental_confirmed_count": supplemental_confirmed_count,
        "supplemental_review_count": supplemental_review_count,
        "supplemental_rejected_count": supplemental_rejected_count,
        "missing_count": missing_count,
        "social_coverage": social_coverage,
        "metadata_coverage_confirmed": metadata_coverage_confirmed,
        "metadata_coverage_potential": metadata_coverage_potential,
        "total_analyzed": films_analyzed,
        "matched_count": megabank_social_count,
        "absent_count": supplemental_confirmed_count + supplemental_review_count + supplemental_rejected_count + missing_count,
        "coverage": social_coverage,
        "user_average_rating": user_avg,
        "community_average_rating": community_avg,
        "average_difference": avg_diff,
        "runtime_average": runtime_avg,
        "watches_mean": watches_mean,
        "watches_median": watches_median,
        "likes_mean": likes_mean,
        "fans_mean": fans_mean,
        "top_genres": top_genres,
        "top_countries": top_countries,
        "top_languages": top_languages,
        "top_directors": top_directors,
        "profile_quality": sample_quality,
    }

    highlights = {
        "most_popular": most_popular,
        "most_niche": most_niche,
        "most_fans": most_fans,
        "best_fans_ratio": best_fans_ratio,
        "longest": longest,
        "shortest": shortest,
    }

    wrapped = json_safe({
        "user": username,
        "rss_url": f"https://letterboxd.com/{username}/rss/",
        "generated_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "films": films,
        "profile_summary": profile_summary,
        "profile_quality": sample_quality,
        "highlights": highlights,
    })

    # Write outputs
    out_json = OUTPUT_DIR / f"{username}_wrapped.json"
    out_md = OUTPUT_DIR / f"{username}_wrapped_report.md"
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(wrapped, f, ensure_ascii=False, indent=2, allow_nan=False, default=str)

    # Markdown report
    with out_md.open("w", encoding="utf-8") as r:
        r.write(f"# Wrapped profile for {username}\n\n")
        r.write(f"- RSS URL: https://letterboxd.com/{username}/rss/\n")
        r.write(f"- films_analyzed: {films_analyzed}\n")
        r.write(f"- profile_quality: {sample_quality['status']}\n")
        if sample_quality.get("warning"):
            r.write(f"- warning: {sample_quality['warning']}\n")
        r.write(f"- megabank_social_count: {megabank_social_count}\n")
        r.write(f"- supplemental_confirmed_count: {supplemental_confirmed_count}\n")
        r.write(f"- supplemental_review_count: {supplemental_review_count}\n")
        r.write(f"- supplemental_rejected_count: {supplemental_rejected_count}\n")
        r.write(f"- missing_count: {missing_count}\n")
        r.write(f"- social_coverage: {social_coverage:.2%}\n")
        r.write(f"- metadata_coverage_confirmed: {metadata_coverage_confirmed:.2%}\n")
        r.write(f"- metadata_coverage_potential: {metadata_coverage_potential:.2%}\n")
        r.write("\n")
        r.write("Megabank coverage tracks films with social stats. Supplemental TMDB metadata can enrich films that are absent from Megabank, but it does not provide watches, likes, fans, or Letterboxd average stats.\n\n")

        r.write("## Summary statistics\n\n")
        r.write(f"- User average rating: {user_avg}\n")
        r.write(f"- Community average rating (matched): {community_avg}\n")
        r.write(f"- Average difference (user - community): {avg_diff}\n")
        r.write(f"- Average runtime (min): {runtime_avg}\n")
        r.write(f"- Watches mean: {watches_mean}\n")
        r.write(f"- Watches median: {watches_median}\n")
        r.write(f"- Likes mean: {likes_mean}\n")
        r.write(f"- Fans mean: {fans_mean}\n\n")

        r.write("## Highlights\n\n")
        def shortfilm(f):
            if not f:
                return "-"
            return f"{f.get('rss_title')} (slug: {f.get('letterboxd_slug')})"

        r.write(f"- Most popular: {shortfilm(most_popular)}\n")
        r.write(f"- Most niche: {shortfilm(most_niche)}\n")
        r.write(f"- Most fans: {shortfilm(most_fans)}\n")
        r.write(f"- Best fans/watches ratio: {shortfilm(best_fans_ratio)}\n")
        r.write(f"- Longest: {shortfilm(longest)}\n")
        r.write(f"- Shortest: {shortfilm(shortest)}\n\n")

        r.write("## Top genres\n\n")
        for g, cnt in top_genres:
            r.write(f"- {g}: {cnt}\n")

        r.write("\n## Top countries\n\n")
        for c, cnt in top_countries:
            r.write(f"- {c}: {cnt}\n")

        r.write("\n## Top languages\n\n")
        for lang, cnt in top_languages:
            r.write(f"- {lang}: {cnt}\n")

        r.write("\n## Top directors\n\n")
        for d, cnt in top_directors:
            r.write(f"- {d}: {cnt}\n")

        r.write("\n## Needs manual review\n\n")
        review_films = [f for f in films if f.get("source") == "supplemental_review"]
        if review_films:
            for f in review_films:
                r.write(
                    f"- {f.get('rss_title')} | slug: {f.get('letterboxd_slug')} | "
                    f"TMDB candidate title: {f.get('tmdb_candidate_title') or f.get('title') or ''} | "
                    f"confidence score: {f.get('tmdb_score')} | "
                    f"TMDB ID: {f.get('tmdb_id') or ''} | "
                    f"reason: {f.get('review_reason') or 'score below confirmation threshold'}\n"
                )
        else:
            r.write("- None\n")

        r.write("\n## Manual review status\n\n")

        def write_review_list(title, rows):
            r.write(f"### {title}\n\n")
            if rows:
                for f in rows:
                    r.write(
                        f"- {f.get('rss_title')} | slug: {f.get('letterboxd_slug')} | "
                        f"source: {f.get('source')} | TMDB candidate title: "
                        f"{f.get('tmdb_candidate_title') or f.get('title') or ''} | "
                        f"TMDB ID: {f.get('tmdb_id') or ''} | "
                        f"notes: {(f.get('manual_override') or {}).get('notes') or f.get('review_reason') or ''}\n"
                    )
            else:
                r.write("- None\n")
            r.write("\n")

        write_review_list("Films still in review", review_films)
        write_review_list("Films manually confirmed", manual_confirmed_films)
        write_review_list("Films manually rejected", manual_rejected_films)
        write_review_list("Films with replacement requested", manual_replace_films)

        r.write(f"\n## Films ({films_analyzed})\n\n")
        for f in films:
            matched_title = f.get("title") or f.get("tmdb_candidate_title") or ""
            social = "yes" if f.get("has_social_stats") else "no"
            metadata = "yes" if f.get("has_metadata") else "no"
            r.write(
                f"- {f.get('rss_title')} | slug: {f.get('letterboxd_slug')} | "
                f"source: {f.get('source')} | metadata: {metadata} | "
                f"social: {social} | matched_title: {matched_title}\n"
            )

    return out_json, out_md


def main():
    import sys
    if len(sys.argv) < 2:
        print("Usage: python scripts/build_user_wrapped.py <letterboxd_username>")
        raise SystemExit(2)
    username = sys.argv[1]
    try:
        out_json, out_md = build_user_profile(username)
        print(f"Wrote {out_json}")
        print(f"Wrote {out_md}")
    except Exception as e:
        print("Error:", e)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
