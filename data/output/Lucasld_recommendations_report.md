# Recommendations for Lucasld

## Scoring notes

- Candidates come from a live TMDB pool (seed similar/recommendations, profile-based discover, now_playing/upcoming/trending) not present in the user's last 50 RSS films.
- safe_pick ("La Pépite"): strong genre/country/director proximity, low popularity within this run's pool, released 3+ years ago.
- wild_card ("Le Pari"): departs from usual habits, well-rated with enough votes to trust the rating, popularity a notch above safe_pick, released this year or last.
- deep_cut ("Le Détour"): a production country the user hasn't seen yet, filtered to picks that still fit their usual genre/country taste, with a quality floor.
- Each slot relaxes its own criteria progressively (popularity/date first, thematic proximity preserved longest) if nothing satisfies the full criteria -- see candidate_pool_stats and diversity_checks.relaxation_used (0 = no relaxation needed).

## Slot rationale

- safe_pick: Lupin the Third: Farewell to Nostradamus — low-popularity, older pick close to the user's usual genres/countries ("La Pépite").
  Countries: Japan (non-USA).
  Primary genres: Animation, Action.
  Popularity: low (tmdb_vote_count=69.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Takeshi Shirato, runtime=100.0, year=1995.
- wild_card: Remarkably Bright Creatures — recent, well-rated pick that departs a bit from usual habits ("Le Pari").
  Countries: USA (USA).
  Primary genres: Drama, Mystery.
  Popularity: mid (tmdb_vote_count=820.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Olivia Newman, runtime=114.0, year=2026.
- deep_cut: The 100 Year-Old Man Who Climbed Out the Window and Disappeared — a production country new to the user, filtered to stay close to their usual taste ("Le Détour").
  Countries: Sweden, Hungary, Croatia, Turkey, Denmark, Netherlands, France (non-USA).
  Primary genres: Adventure, Comedy.
  Popularity: high (tmdb_vote_count=1029.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Felix Herngren, runtime=115.0, year=2013.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation found: yes
- Directors: Takeshi Shirato, Olivia Newman, Felix Herngren
- Primary genres: Animation, Action | Drama, Mystery | Adventure, Comedy
- Duplicate director rejections: None
- Title/franchise proximity rejections: None

### Eligibility exclusions

- 180 | tmdb-1659087-2026 | tv_movie_genre
- My Super Heroine | tmdb-1380356-2024 | short_runtime
- Star Wars: Episode II - Attack of the Clones | tmdb-1894-2002 | tv_or_series_signal
- Dead Man's Folly | tmdb-6105-1986 | tv_movie_genre
- LOCALS | tmdb-1188134-2023 | short_runtime
- CHASE | tmdb-1558114-2025 | short_runtime
- Murder, But Epic! | tmdb-1380186-2024 | short_runtime
- Astarté | tmdb-1187769-2023 | short_runtime
- Nový život | tmdb-1187705-1973 | short_runtime
- Conspiracy of Silence | tmdb-223235-1993 | tv_movie_genre
- Mordnacht | tmdb-1174422-2024 | tv_movie_genre
- The Miracle Season | tmdb-425373-2018 | tv_or_series_signal
- Cheaters | tmdb-15869-2000 | tv_movie_genre
- Hide and Seek | tmdb-1559353-2025 | short_runtime
- Dû bist mîn ich bin dîn | tmdb-1559387-2024 | short_runtime
- Ring of the Nibelungs | tmdb-11188-2004 | tv_movie_genre
- Game with Me | tmdb-1190963-2023 | short_runtime
- The Ewok Adventure | tmdb-1884-1984 | tv_movie_genre
- Wizards of Waverly Place: The Movie | tmdb-26736-2009 | tv_movie_genre
- The Suite Life Movie | tmdb-60803-2011 | tv_movie_genre

## Picks

### safe_pick: Lupin the Third: Farewell to Nostradamus

- Score: 0.4383
- Year: 1995
- Slug: tmdb-31049-1995
- Genres: Animation, Action, Adventure, Drama, Crime, Comedy
- Countries: Japan
- Director: Takeshi Shirato
- Reason codes: genre_match, runtime_match, non_us_angle, low_popularity_gem
- Reason: Un film proche de tes genres favoris, plus confidentiel et sorti depuis un moment — mérite d’être redécouvert.

### wild_card: Remarkably Bright Creatures

- Score: 0.7676
- Year: 2026
- Slug: tmdb-1330021-2026
- Genres: Drama, Mystery
- Countries: USA
- Director: Olivia Newman
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, decade_shift, fresh_acclaimed
- Reason: Un pari récent et bien accueilli, qui prend un peu de distance avec tes habitudes.

### deep_cut: The 100 Year-Old Man Who Climbed Out the Window and Disappeared

- Score: 0.4207
- Year: 2013
- Slug: tmdb-145247-2013
- Genres: Adventure, Comedy, Drama
- Countries: Sweden, Hungary, Croatia, Turkey, Denmark, Netherlands, France
- Director: Felix Herngren
- Reason codes: genre_match, country_match, runtime_match, non_us_angle, new_country_discovery
- Reason: Un détour vers un pays que tu n’as pas encore exploré, tout en restant proche de tes goûts habituels.
