# Recommendations for crazykungfu

## Scoring notes

- Candidates come from a live TMDB pool (seed similar/recommendations, profile-based discover, now_playing/upcoming/trending) not present in the user's last 50 RSS films.
- safe_pick ("La Pépite"): strong genre/country/director proximity, low popularity within this run's pool, released 3+ years ago.
- wild_card ("Le Pari"): departs from usual habits, well-rated with enough votes to trust the rating, popularity a notch above safe_pick, released this year or last.
- deep_cut ("Le Détour"): a production country the user hasn't seen yet, filtered to picks that still fit their usual genre/country taste, with a quality floor.
- Each slot relaxes its own criteria progressively (popularity/date first, thematic proximity preserved longest) if nothing satisfies the full criteria -- see candidate_pool_stats and diversity_checks.relaxation_used (0 = no relaxation needed).

## Slot rationale

- safe_pick: No Code of Conduct — low-popularity, older pick close to the user's usual genres/countries ("La Pépite").
  Countries: USA (USA).
  Primary genres: Action, Drama.
  Popularity: low (tmdb_vote_count=36.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Bret Michaels, runtime=93.0, year=1999.
- wild_card: Remarkably Bright Creatures — recent, well-rated pick that departs a bit from usual habits ("Le Pari").
  Countries: USA (USA).
  Primary genres: Drama, Mystery.
  Popularity: high (tmdb_vote_count=820.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Olivia Newman, runtime=114.0, year=2026.
- deep_cut: Boyka: Undisputed IV — a production country new to the user, filtered to stay close to their usual taste ("Le Détour").
  Countries: Bulgaria, USA (non-USA).
  Primary genres: Action, Drama.
  Popularity: high (tmdb_vote_count=1485.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Todor Chapkanov, runtime=87.0, year=2016.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation found: yes
- Directors: Bret Michaels, Olivia Newman, Todor Chapkanov
- Primary genres: Action, Drama | Drama, Mystery | Action, Drama
- Duplicate director rejections: None
- Title/franchise proximity rejections: None

### Eligibility exclusions

- Fail Safe | tmdb-31067-2000 | tv_movie_genre
- By Dawn's Early Light | tmdb-20674-1990 | tv_movie_genre
- The Scarlet and the Black | tmdb-44691-1983 | tv_movie_genre
- Path to War | tmdb-31018-2003 | tv_movie_genre
- Girl in the Basement | tmdb-801335-2021 | tv_movie_genre
- Memento Mori | tmdb-631427-2019 | short_runtime
- Butterfly in the Typewriter | tmdb-451091 | short_runtime
- Hulk vs. Wolverine | tmdb-15257-2009 | short_runtime
- Hellboy Animated: Sword of Storms | tmdb-16774-2006 | tv_movie_genre
- Le dos au mur | tmdb-451185-2001 | short_runtime
- Chaos Core | tmdb-819133-2021 | short_runtime
- Illumination 7 Mini-Movie Collection | tmdb-269250-2014 | short_runtime
- The Aeronauts | tmdb-451025-2016 | short_runtime
- Salvation Has No Name | tmdb-1012243-2022 | short_runtime
- At Both Ends | tmdb-1200225-2023 | short_runtime
- PUSSYCAT | tmdb-451692-2010 | short_runtime
- Avatar: The Deep Dive - A Special Edition of 20/20 | tmdb-1059673-2022 | short_runtime
- Being James Bond | tmdb-869250-2021 | short_runtime
- The Walking Dead: The Return | tmdb-1246596-2024 | short_runtime
- Andre the Giant | tmdb-446663-2018 | tv_movie_genre

## Picks

### safe_pick: No Code of Conduct

- Score: 0.3319
- Year: 1999
- Slug: tmdb-1711-1999
- Genres: Action, Drama, Thriller
- Countries: USA
- Director: Bret Michaels
- Reason codes: genre_match, country_match, low_popularity_gem
- Reason: Un film proche de tes genres favoris, plus confidentiel et sorti depuis un moment — mérite d’être redécouvert.

### wild_card: Remarkably Bright Creatures

- Score: 0.7662
- Year: 2026
- Slug: tmdb-1330021-2026
- Genres: Drama, Mystery
- Countries: USA
- Director: Olivia Newman
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, decade_shift, fresh_acclaimed
- Reason: Un pari récent et bien accueilli, qui prend un peu de distance avec tes habitudes.

### deep_cut: Boyka: Undisputed IV

- Score: 0.4218
- Year: 2016
- Slug: tmdb-348893-2016
- Genres: Action, Drama, Thriller, Crime
- Countries: Bulgaria, USA
- Director: Todor Chapkanov
- Reason codes: genre_match, country_match, non_us_angle, new_country_discovery
- Reason: Un détour vers un pays que tu n’as pas encore exploré, tout en restant proche de tes goûts habituels.
