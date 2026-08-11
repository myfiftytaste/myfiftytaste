# Recommendations for picolifl

## Scoring notes

- Candidates come from a live TMDB pool (seed similar/recommendations, profile-based discover, now_playing/upcoming/trending) not present in the user's last 49 RSS films.
- safe_pick ("La Pépite"): strong genre/country/director proximity, low popularity within this run's pool, released 3+ years ago.
- wild_card ("Le Pari"): departs from usual habits, well-rated with enough votes to trust the rating, popularity a notch above safe_pick, released this year or last.
- deep_cut ("Le Détour"): a production country the user hasn't seen yet, filtered to picks that still fit their usual genre/country taste, with a quality floor.
- Each slot relaxes its own criteria progressively (popularity/date first, thematic proximity preserved longest) if nothing satisfies the full criteria -- see candidate_pool_stats and diversity_checks.relaxation_used (0 = no relaxation needed).

## Slot rationale

- safe_pick: Secret Beyond the Door — low-popularity, older pick close to the user's usual genres/countries ("La Pépite").
  Countries: USA (USA).
  Primary genres: Mystery, Thriller.
  Popularity: low (tmdb_vote_count=165.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Fritz Lang, runtime=99.0, year=1947.
- wild_card: Swapped — recent, well-rated pick that departs a bit from usual habits ("Le Pari").
  Countries: USA, Spain (non-USA).
  Primary genres: Adventure, Animation.
  Popularity: high (tmdb_vote_count=2085.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Nathan Greno, runtime=102.0, year=2026.
- deep_cut: The Baader Meinhof Complex — a production country new to the user, filtered to stay close to their usual taste ("Le Détour").
  Countries: Czech Republic, France, Germany (non-USA).
  Primary genres: Action, Crime.
  Popularity: mid (tmdb_vote_count=662.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Uli Edel, runtime=149.0, year=2008.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation found: yes
- Directors: Fritz Lang, Nathan Greno, Uli Edel
- Primary genres: Mystery, Thriller | Adventure, Animation | Action, Crime
- Duplicate director rejections: None
- Title/franchise proximity rejections: None

### Eligibility exclusions

- The Devil's Arithmetic | tmdb-22509-1999 | tv_movie_genre
- Uprising | tmdb-31010-2001 | tv_movie_genre
- On Top of the Earth | tmdb-441014-2007 | short_runtime
- The Moth | tmdb-1559375-2025 | short_runtime
- The Last Harvest | tmdb-1559486-2024 | short_runtime
- The God Can | tmdb-1189477-2021 | short_runtime
- LOCALS | tmdb-1188134-2023 | short_runtime
- AI Junko | tmdb-1380614-2024 | short_runtime
- Artemio's Loneliness Vol. 1 | tmdb-620583-2020 | short_runtime
- Alexandra | tmdb-1380525-2023 | short_runtime
- INT. CAFÉ – NIGHT | tmdb-440003-2014 | short_runtime
- Tombé du ciel | tmdb-1564831-2026 | short_runtime
- Tad and The Magic Lamp | tmdb-1187326-2026 | short_runtime
- La Nirvana | tmdb-1566470-2026 | short_runtime
- Milky☆Subway: The Galactic Limited Express - the Movie | tmdb-1598785-2026 | short_runtime
- Miraculous World: Tokyo, Stellar Force | tmdb-1147411-2025 | short_runtime
- Louis Theroux: The Settlers | tmdb-1466013-2025 | tv_movie_genre
- Squid Game: Making Season 2 | tmdb-1412113-2025 | tv_or_series_signal
- The Punisher: One Last Kill | tmdb-1439930-2026 | short_runtime
- Versa | tmdb-1500099-2025 | short_runtime

## Picks

### safe_pick: Secret Beyond the Door

- Score: 0.4456
- Year: 1947
- Slug: tmdb-560-1947
- Genres: Mystery, Thriller, Drama, Romance
- Countries: USA
- Director: Fritz Lang
- Reason codes: genre_match, country_match, decade_shift, low_popularity_gem
- Reason: Un film proche de tes genres favoris, plus confidentiel et sorti depuis un moment — mérite d’être redécouvert.

### wild_card: Swapped

- Score: 0.8268
- Year: 2026
- Slug: tmdb-1007757-2026
- Genres: Adventure, Animation, Family, Fantasy
- Countries: USA, Spain
- Director: Nathan Greno
- Reason codes: country_match, runtime_match, high_community_rating, non_us_angle, fresh_acclaimed
- Reason: Un pari récent et bien accueilli, qui prend un peu de distance avec tes habitudes.

### deep_cut: The Baader Meinhof Complex

- Score: 0.477
- Year: 2008
- Slug: tmdb-6968-2008
- Genres: Action, Crime, Drama, History, Thriller
- Countries: Czech Republic, France, Germany
- Director: Uli Edel
- Reason codes: genre_match, country_match, non_us_angle, new_country_discovery
- Reason: Un détour vers un pays que tu n’as pas encore exploré, tout en restant proche de tes goûts habituels.
