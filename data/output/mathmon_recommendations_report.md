# Recommendations for mathmon

## Scoring notes

- Candidates come from a live TMDB pool (seed similar/recommendations, profile-based discover, now_playing/upcoming/trending) not present in the user's last 50 RSS films.
- safe_pick ("La Pépite"): strong genre/country/director proximity, low popularity within this run's pool, released 3+ years ago.
- wild_card ("Le Pari"): departs from usual habits, well-rated with enough votes to trust the rating, popularity a notch above safe_pick, released this year or last.
- deep_cut ("Le Détour"): a production country the user hasn't seen yet, filtered to picks that still fit their usual genre/country taste, with a quality floor.
- Each slot relaxes its own criteria progressively (popularity/date first, thematic proximity preserved longest) if nothing satisfies the full criteria -- see candidate_pool_stats and diversity_checks.relaxation_used (0 = no relaxation needed).

## Slot rationale

- safe_pick: Love Lesson — low-popularity, older pick close to the user's usual genres/countries ("La Pépite").
  Countries: South Korea (non-USA).
  Primary genres: Romance, Drama.
  Popularity: low (tmdb_vote_count=43.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Ko Kyeong-Ah, runtime=80.0, year=2013.
- wild_card: Avatar Aang: The Last Airbender — recent, well-rated pick that departs a bit from usual habits ("Le Pari").
  Countries: USA, South Korea, Australia (non-USA).
  Primary genres: Animation, Action.
  Popularity: mid (tmdb_vote_count=798.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Lauren Montgomery, runtime=99.0, year=2026.
- deep_cut: The Lobster — a production country new to the user, filtered to stay close to their usual taste ("Le Détour").
  Countries: France, Greece, Ireland, Netherlands, UK (non-USA).
  Primary genres: Comedy, Drama.
  Popularity: high (tmdb_vote_count=6996.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Yorgos Lanthimos, runtime=119.0, year=2015.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation found: yes
- Directors: Ko Kyeong-Ah, Lauren Montgomery, Yorgos Lanthimos
- Primary genres: Romance, Drama | Animation, Action | Comedy, Drama
- Duplicate director rejections: None
- Title/franchise proximity rejections: None

### Eligibility exclusions

- Blue Lagoon: The Awakening | tmdb-115290-2012 | tv_movie_genre
- Big City Greens the Movie: Spacecation | tmdb-929563-2024 | tv_movie_genre
- JLA Adventures: Trapped in Time | tmdb-251768-2014 | short_runtime
- La Jetée | tmdb-662-1962 | short_runtime
- Going Bananas | tmdb-1559297-2024 | short_runtime
- Owners of Time | tmdb-1189208-2024 | short_runtime
- The Hatchling | tmdb-1191058-2023 | short_runtime
- Genius Loci | tmdb-663881-2020 | short_runtime
- The Hunchback | tmdb-148636-1997 | tv_movie_genre
- Joseph | tmdb-2405-1995 | tv_movie_genre
- Shedding Blood For China | tmdb-1003419-1980 | short_runtime
- Return Home | tmdb-1003436-1983 | short_runtime
- Hide and Seek | tmdb-1559353-2025 | short_runtime
- Ximen Family | tmdb-1003426-1989 | short_runtime
- Kill A Criminal in His Marriage Ceremony | tmdb-1003430-1987 | short_runtime
- Cobalt Blue | tmdb-622161-2019 | short_runtime
- Tombé du ciel | tmdb-1564831-2026 | short_runtime
- Tad and The Magic Lamp | tmdb-1187326-2026 | short_runtime
- La Nirvana | tmdb-1566470-2026 | short_runtime
- Milky☆Subway: The Galactic Limited Express - the Movie | tmdb-1598785-2026 | short_runtime

## Picks

### safe_pick: Love Lesson

- Score: 0.4083
- Year: 2013
- Slug: tmdb-286687-2013
- Genres: Romance, Drama, Comedy
- Countries: South Korea
- Director: Ko Kyeong-Ah
- Reason codes: genre_match, non_us_angle, low_popularity_gem
- Reason: Un film proche de tes genres favoris, plus confidentiel et sorti depuis un moment — mérite d’être redécouvert.

### wild_card: Avatar Aang: The Last Airbender

- Score: 0.8214
- Year: 2026
- Slug: tmdb-980431-2026
- Genres: Animation, Action, Adventure, Fantasy
- Countries: USA, South Korea, Australia
- Director: Lauren Montgomery
- Reason codes: country_match, runtime_match, high_community_rating, non_us_angle, fresh_acclaimed
- Reason: Un pari récent et bien accueilli, qui prend un peu de distance avec tes habitudes.

### deep_cut: The Lobster

- Score: 0.4663
- Year: 2015
- Slug: tmdb-254320-2015
- Genres: Comedy, Drama, Romance
- Countries: France, Greece, Ireland, Netherlands, UK
- Director: Yorgos Lanthimos
- Reason codes: genre_match, country_match, runtime_match, non_us_angle, new_country_discovery
- Reason: Un détour vers un pays que tu n’as pas encore exploré, tout en restant proche de tes goûts habituels.
