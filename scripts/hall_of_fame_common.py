"""Shared helpers for the Hall of Fame feature (monthly snapshots, rankings, badges).

Country -> continent lookup deliberately covers both the small canonical
names produced by `build_profile_metrics.normalize_country_name` (USA, UK, ...)
and the raw English country names TMDB returns in `production_countries`,
since a film's `countries` list in `{username}_wrapped.json` is stored
*before* that normalization is applied.
"""

from __future__ import annotations

CONTINENTS: list[str] = [
    "Europe",
    "Asie",
    "Afrique",
    "Amérique du Nord",
    "Amérique du Sud",
    "Océanie",
]

# English country names as TMDB commonly returns them, plus the handful of
# canonical short forms already produced by normalize_country_name.
COUNTRY_TO_CONTINENT: dict[str, str] = {
    # --- Europe ---
    "UK": "Europe",
    "United Kingdom": "Europe",
    "France": "Europe",
    "Germany": "Europe",
    "Italy": "Europe",
    "Spain": "Europe",
    "Portugal": "Europe",
    "Ireland": "Europe",
    "Sweden": "Europe",
    "Norway": "Europe",
    "Denmark": "Europe",
    "Finland": "Europe",
    "Iceland": "Europe",
    "Netherlands": "Europe",
    "Belgium": "Europe",
    "Switzerland": "Europe",
    "Austria": "Europe",
    "Luxembourg": "Europe",
    "Poland": "Europe",
    "Czech Republic": "Europe",
    "Czechia": "Europe",
    "Slovakia": "Europe",
    "Hungary": "Europe",
    "Romania": "Europe",
    "Bulgaria": "Europe",
    "Greece": "Europe",
    "Croatia": "Europe",
    "Serbia": "Europe",
    "Slovenia": "Europe",
    "Bosnia and Herzegovina": "Europe",
    "Montenegro": "Europe",
    "North Macedonia": "Europe",
    "Macedonia": "Europe",
    "Albania": "Europe",
    "Kosovo": "Europe",
    "Ukraine": "Europe",
    "Belarus": "Europe",
    "Moldova": "Europe",
    "Lithuania": "Europe",
    "Latvia": "Europe",
    "Estonia": "Europe",
    "Russia": "Europe",
    "Malta": "Europe",
    "Cyprus": "Europe",
    "Monaco": "Europe",
    "Andorra": "Europe",
    "San Marino": "Europe",
    "Liechtenstein": "Europe",
    "Vatican City": "Europe",
    "Georgia": "Europe",
    "Armenia": "Europe",
    # --- Asie ---
    "Japan": "Asie",
    "South Korea": "Asie",
    "North Korea": "Asie",
    "China": "Asie",
    "Hong Kong": "Asie",
    "Taiwan": "Asie",
    "Macao": "Asie",
    "Macau": "Asie",
    "India": "Asie",
    "Pakistan": "Asie",
    "Bangladesh": "Asie",
    "Sri Lanka": "Asie",
    "Nepal": "Asie",
    "Bhutan": "Asie",
    "Afghanistan": "Asie",
    "Thailand": "Asie",
    "Vietnam": "Asie",
    "Cambodia": "Asie",
    "Laos": "Asie",
    "Myanmar": "Asie",
    "Malaysia": "Asie",
    "Singapore": "Asie",
    "Indonesia": "Asie",
    "Philippines": "Asie",
    "Brunei": "Asie",
    "Timor-Leste": "Asie",
    "Mongolia": "Asie",
    "Kazakhstan": "Asie",
    "Uzbekistan": "Asie",
    "Turkmenistan": "Asie",
    "Kyrgyzstan": "Asie",
    "Tajikistan": "Asie",
    "Azerbaijan": "Asie",
    "Turkey": "Asie",
    "Israel": "Asie",
    "Palestine": "Asie",
    "Palestinian Territory": "Asie",
    "Lebanon": "Asie",
    "Syria": "Asie",
    "Jordan": "Asie",
    "Iraq": "Asie",
    "Iran": "Asie",
    "Saudi Arabia": "Asie",
    "Yemen": "Asie",
    "Oman": "Asie",
    "United Arab Emirates": "Asie",
    "Qatar": "Asie",
    "Bahrain": "Asie",
    "Kuwait": "Asie",
    # --- Afrique ---
    "Nigeria": "Afrique",
    "South Africa": "Afrique",
    "Egypt": "Afrique",
    "Morocco": "Afrique",
    "Algeria": "Afrique",
    "Tunisia": "Afrique",
    "Libya": "Afrique",
    "Sudan": "Afrique",
    "South Sudan": "Afrique",
    "Ethiopia": "Afrique",
    "Eritrea": "Afrique",
    "Djibouti": "Afrique",
    "Somalia": "Afrique",
    "Kenya": "Afrique",
    "Tanzania": "Afrique",
    "Uganda": "Afrique",
    "Rwanda": "Afrique",
    "Burundi": "Afrique",
    "Democratic Republic of the Congo": "Afrique",
    "Congo": "Afrique",
    "Republic of the Congo": "Afrique",
    "Gabon": "Afrique",
    "Equatorial Guinea": "Afrique",
    "Cameroon": "Afrique",
    "Central African Republic": "Afrique",
    "Chad": "Afrique",
    "Niger": "Afrique",
    "Mali": "Afrique",
    "Mauritania": "Afrique",
    "Senegal": "Afrique",
    "Gambia": "Afrique",
    "Guinea-Bissau": "Afrique",
    "Guinea": "Afrique",
    "Sierra Leone": "Afrique",
    "Liberia": "Afrique",
    "Ivory Coast": "Afrique",
    "Côte d'Ivoire": "Afrique",
    "Ghana": "Afrique",
    "Togo": "Afrique",
    "Benin": "Afrique",
    "Burkina Faso": "Afrique",
    "Zambia": "Afrique",
    "Zimbabwe": "Afrique",
    "Malawi": "Afrique",
    "Mozambique": "Afrique",
    "Botswana": "Afrique",
    "Namibia": "Afrique",
    "Angola": "Afrique",
    "Lesotho": "Afrique",
    "Eswatini": "Afrique",
    "Swaziland": "Afrique",
    "Madagascar": "Afrique",
    "Mauritius": "Afrique",
    "Seychelles": "Afrique",
    "Comoros": "Afrique",
    "Cape Verde": "Afrique",
    # --- Amérique du Nord (includes Central America + Caribbean) ---
    "USA": "Amérique du Nord",
    "United States of America": "Amérique du Nord",
    "United States": "Amérique du Nord",
    "Canada": "Amérique du Nord",
    "Mexico": "Amérique du Nord",
    "Guatemala": "Amérique du Nord",
    "Belize": "Amérique du Nord",
    "Honduras": "Amérique du Nord",
    "El Salvador": "Amérique du Nord",
    "Nicaragua": "Amérique du Nord",
    "Costa Rica": "Amérique du Nord",
    "Panama": "Amérique du Nord",
    "Cuba": "Amérique du Nord",
    "Jamaica": "Amérique du Nord",
    "Haiti": "Amérique du Nord",
    "Dominican Republic": "Amérique du Nord",
    "Puerto Rico": "Amérique du Nord",
    "Bahamas": "Amérique du Nord",
    "Trinidad and Tobago": "Amérique du Nord",
    "Barbados": "Amérique du Nord",
    "Greenland": "Amérique du Nord",
    # --- Amérique du Sud ---
    "Brazil": "Amérique du Sud",
    "Argentina": "Amérique du Sud",
    "Chile": "Amérique du Sud",
    "Colombia": "Amérique du Sud",
    "Peru": "Amérique du Sud",
    "Venezuela": "Amérique du Sud",
    "Ecuador": "Amérique du Sud",
    "Bolivia": "Amérique du Sud",
    "Paraguay": "Amérique du Sud",
    "Uruguay": "Amérique du Sud",
    "Guyana": "Amérique du Sud",
    "Suriname": "Amérique du Sud",
    # --- Océanie ---
    "Australia": "Océanie",
    "New Zealand": "Océanie",
    "Fiji": "Océanie",
    "Papua New Guinea": "Océanie",
    "Solomon Islands": "Océanie",
    "Vanuatu": "Océanie",
    "New Caledonia": "Océanie",
    "Samoa": "Océanie",
    "Tonga": "Océanie",
}


def continent_for_country(raw_name: object, normalize) -> str | None:
    """Resolve a raw film country string to one of CONTINENTS, or None if unknown.

    `normalize` is `build_profile_metrics.normalize_country_name`, applied
    first so the handful of canonical short forms (USA, UK, ...) resolve the
    same way the rest of the pipeline already does.
    """
    if not raw_name:
        return None
    normalized = normalize(raw_name) or str(raw_name).strip()
    return COUNTRY_TO_CONTINENT.get(normalized) or COUNTRY_TO_CONTINENT.get(str(raw_name).strip())


def continent_breakdown_for_films(films: list[dict], normalize) -> dict[str, list[dict]]:
    """Group films by continent (a film with countries spanning several
    continents appears once under each — never double-counted within one
    continent). Films keep their display order (most recently logged first,
    same as the wrapped film list) so "first 4 films" downstream means
    something consistent.
    """
    by_continent: dict[str, list[dict]] = {continent: [] for continent in CONTINENTS}
    for film in films:
        raw_countries = film.get("countries")
        if not isinstance(raw_countries, list):
            continue
        continents_touched: set[str] = set()
        for raw_country in raw_countries:
            continent = continent_for_country(raw_country, normalize)
            if continent:
                continents_touched.add(continent)
        for continent in continents_touched:
            by_continent[continent].append(
                {
                    "title": film.get("title") or film.get("rss_title"),
                    "year": film.get("year"),
                    "slug": film.get("letterboxd_slug"),
                }
            )
    return by_continent


def continent_consumption_for_films(films: list[dict], normalize) -> dict[str, int]:
    """Count, per continent, how many films had at least one production
    country in that continent. A film with countries spanning several
    continents counts once for each (never more than once per continent).
    """
    breakdown = continent_breakdown_for_films(films, normalize)
    return {continent: len(films_in_continent) for continent, films_in_continent in breakdown.items()}
