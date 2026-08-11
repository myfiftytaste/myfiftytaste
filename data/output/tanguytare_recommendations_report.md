# Recommendations for tanguytare

## Scoring notes

- Candidates come from a live TMDB pool (seed similar/recommendations, profile-based discover, now_playing/upcoming/trending) not present in the user's last 50 RSS films.
- safe_pick ("La Pépite"): strong genre/country/director proximity, low popularity within this run's pool, released 3+ years ago.
- wild_card ("Le Pari"): departs from usual habits, well-rated with enough votes to trust the rating, popularity a notch above safe_pick, released this year or last.
- deep_cut ("Le Détour"): a production country the user hasn't seen yet, filtered to picks that still fit their usual genre/country taste, with a quality floor.
- Each slot relaxes its own criteria progressively (popularity/date first, thematic proximity preserved longest) if nothing satisfies the full criteria -- see candidate_pool_stats and diversity_checks.relaxation_used (0 = no relaxation needed).

## Slot rationale

- safe_pick: The Curve — low-popularity, older pick close to the user's usual genres/countries ("La Pépite").
  Countries: USA (USA).
  Primary genres: Drama, Horror.
  Popularity: low (tmdb_vote_count=86.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Dan Rosen, runtime=91.0, year=1998.
- wild_card: Demon Slayer: Kimetsu no Yaiba Infinity Castle — recent, well-rated pick that departs a bit from usual habits ("Le Pari").
  Countries: Japan (non-USA).
  Primary genres: Animation, Action.
  Popularity: high (tmdb_vote_count=1774.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Haruo Sotozaki, runtime=156.0, year=2025.
- deep_cut: The Devil's Backbone — a production country new to the user, filtered to stay close to their usual taste ("Le Détour").
  Countries: Mexico, Spain (non-USA).
  Primary genres: Fantasy, Drama.
  Popularity: high (tmdb_vote_count=1384.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Guillermo del Toro, runtime=108.0, year=2001.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation found: yes
- Directors: Dan Rosen, Haruo Sotozaki, Guillermo del Toro
- Primary genres: Drama, Horror | Animation, Action | Fantasy, Drama
- Duplicate director rejections: None
- Title/franchise proximity rejections: None

### Eligibility exclusions

- Walker, Texas Ranger: Trial by Fire | tmdb-6958-2005 | tv_movie_genre
- Green Light | tmdb-1190460-2023 | short_runtime
- Aging Out | tmdb-1194366-2023 | short_runtime
- Nights and Days | tmdb-1564187-2025 | short_runtime
- En La Cima | tmdb-1390381-2024 | short_runtime
- Currents | tmdb-1567691-2025 | short_runtime
- Cigarettes | tmdb-1591457-2025 | short_runtime
- 2CRUNK | tmdb-1594290-2025 | short_runtime
- SO36 | tmdb-1415489-2026 | short_runtime
- Party Invitation | tmdb-1205710 | short_runtime
- The Stroller | tmdb-1205372-2023 | short_runtime
- Boys In The Better Land | tmdb-1027149-2020 | short_runtime
- The Sun Rises Differently | tmdb-1029279-2022 | short_runtime
- Night of Our Lives | tmdb-1222523-2023 | short_runtime
- Cluedo | tmdb-1211471-2022 | short_runtime
- Cannabis Cannibals | tmdb-1413793-2017 | short_runtime
- Chime | tmdb-1219556-2024 | short_runtime
- Beast | tmdb-1189352-2023 | short_runtime
- South Park (Not Suitable for Children) | tmdb-1219926-2023 | tv_movie_genre
- South Park: The End of Obesity | tmdb-1290938-2024 | tv_movie_genre

## Picks

### safe_pick: The Curve

- Score: 0.3782
- Year: 1998
- Slug: tmdb-44625-1998
- Genres: Drama, Horror, Mystery, Thriller
- Countries: USA
- Director: Dan Rosen
- Reason codes: genre_match, country_match, runtime_match, low_popularity_gem
- Reason: Un film proche de tes genres favoris, plus confidentiel et sorti depuis un moment — mérite d’être redécouvert.

### wild_card: Demon Slayer: Kimetsu no Yaiba Infinity Castle

- Score: 0.7697
- Year: 2025
- Slug: tmdb-1311031-2025
- Genres: Animation, Action, Fantasy
- Countries: Japan
- Director: Haruo Sotozaki
- Reason codes: genre_match, country_match, high_community_rating, non_us_angle, decade_shift, fresh_acclaimed
- Reason: Un pari récent et bien accueilli, qui prend un peu de distance avec tes habitudes.

### deep_cut: The Devil's Backbone

- Score: 0.3407
- Year: 2001
- Slug: tmdb-1433-2001
- Genres: Fantasy, Drama, Horror, Thriller
- Countries: Mexico, Spain
- Director: Guillermo del Toro
- Reason codes: genre_match, country_match, runtime_match, non_us_angle, new_country_discovery
- Reason: Un détour vers un pays que tu n’as pas encore exploré, tout en restant proche de tes goûts habituels.
