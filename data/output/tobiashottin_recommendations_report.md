# Recommendations for tobiashottin

## Scoring notes

- Candidates come from a live TMDB pool (seed similar/recommendations, profile-based discover, now_playing/upcoming/trending) not present in the user's last 50 RSS films.
- safe_pick ("La Pépite"): strong genre/country/director proximity, low popularity within this run's pool, released 3+ years ago.
- wild_card ("Le Pari"): departs from usual habits, well-rated with enough votes to trust the rating, popularity a notch above safe_pick, released this year or last.
- deep_cut ("Le Détour"): a production country the user hasn't seen yet, filtered to picks that still fit their usual genre/country taste, with a quality floor.
- Each slot relaxes its own criteria progressively (popularity/date first, thematic proximity preserved longest) if nothing satisfies the full criteria -- see candidate_pool_stats and diversity_checks.relaxation_used (0 = no relaxation needed).

## Slot rationale

- safe_pick: Elsa & Fred — low-popularity, older pick close to the user's usual genres/countries ("La Pépite").
  Countries: USA (USA).
  Primary genres: Drama, Comedy.
  Popularity: low (tmdb_vote_count=99.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Michael Radford, runtime=97.0, year=2014.
- wild_card: Remarkably Bright Creatures — recent, well-rated pick that departs a bit from usual habits ("Le Pari").
  Countries: USA (USA).
  Primary genres: Drama, Mystery.
  Popularity: mid (tmdb_vote_count=820.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Olivia Newman, runtime=114.0, year=2026.
- deep_cut: Maria Full of Grace — a production country new to the user, filtered to stay close to their usual taste ("Le Détour").
  Countries: Colombia, USA (non-USA).
  Primary genres: Drama, Thriller.
  Popularity: mid (tmdb_vote_count=435.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Joshua Marston, runtime=101.0, year=2004.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation found: yes
- Directors: Michael Radford, Olivia Newman, Joshua Marston
- Primary genres: Drama, Comedy | Drama, Mystery | Drama, Thriller
- Duplicate director rejections: None
- Title/franchise proximity rejections: None

### Eligibility exclusions

- South Park (Not Suitable for Children) | tmdb-1219926-2023 | tv_movie_genre
- South Park: The End of Obesity | tmdb-1290938-2024 | tv_movie_genre
- South Park the Streaming Wars | tmdb-974691-2022 | tv_movie_genre
- DC Showcase - Batman: Death in the Family | tmdb-618353-2020 | short_runtime
- South Park: Joining the Panderverse | tmdb-1190012-2023 | tv_movie_genre
- Muggenseizoen | tmdb-1383418-2017 | short_runtime
- Aging Out | tmdb-1194366-2023 | short_runtime
- La Jetée | tmdb-662-1962 | short_runtime
- Going Bananas | tmdb-1559297-2024 | short_runtime
- Martyrdom | tmdb-1569607-2026 | short_runtime
- At Both Ends | tmdb-1200225-2023 | short_runtime
- Viral | tmdb-1570053-2026 | short_runtime
- Nurture of the Beast | tmdb-816899-2016 | short_runtime
- Deathfarm | tmdb-1390069-2024 | short_runtime
- Reba McEntire's The Hammer | tmdb-1011869-2023 | tv_movie_genre
- Cocoon | tmdb-449628-2017 | short_runtime
- Debris | tmdb-1570741-2025 | short_runtime
- Till the End of the World | tmdb-633602-2018 | short_runtime
- Suzanne | tmdb-1189383-2005 | short_runtime
- ḤARĀM | tmdb-451137-2017 | short_runtime

## Picks

### safe_pick: Elsa & Fred

- Score: 0.3767
- Year: 2014
- Slug: tmdb-268171-2014
- Genres: Drama, Comedy, Romance
- Countries: USA
- Director: Michael Radford
- Reason codes: genre_match, country_match, runtime_match, low_popularity_gem
- Reason: Un film proche de tes genres favoris, plus confidentiel et sorti depuis un moment — mérite d’être redécouvert.

### wild_card: Remarkably Bright Creatures

- Score: 0.7694
- Year: 2026
- Slug: tmdb-1330021-2026
- Genres: Drama, Mystery
- Countries: USA
- Director: Olivia Newman
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, decade_shift, fresh_acclaimed
- Reason: Un pari récent et bien accueilli, qui prend un peu de distance avec tes habitudes.

### deep_cut: Maria Full of Grace

- Score: 0.319
- Year: 2004
- Slug: tmdb-436-2004
- Genres: Drama, Thriller, Crime
- Countries: Colombia, USA
- Director: Joshua Marston
- Reason codes: genre_match, country_match, runtime_match, non_us_angle, new_country_discovery
- Reason: Un détour vers un pays que tu n’as pas encore exploré, tout en restant proche de tes goûts habituels.
