# Recommendations for mathouix

## Scoring notes

- Candidates come from a live TMDB pool (seed similar/recommendations, profile-based discover, now_playing/upcoming/trending) not present in the user's last 50 RSS films.
- safe_pick ("La Pépite"): strong genre/country/director proximity, low popularity within this run's pool, released 3+ years ago.
- wild_card ("Le Pari"): departs from usual habits, well-rated with enough votes to trust the rating, popularity a notch above safe_pick, released this year or last.
- deep_cut ("Le Détour"): a production country the user hasn't seen yet, filtered to picks that still fit their usual genre/country taste, with a quality floor.
- Each slot relaxes its own criteria progressively (popularity/date first, thematic proximity preserved longest) if nothing satisfies the full criteria -- see candidate_pool_stats and diversity_checks.relaxation_used (0 = no relaxation needed).

## Slot rationale

- safe_pick: Lowlife — low-popularity, older pick close to the user's usual genres/countries ("La Pépite").
  Countries: USA (USA).
  Primary genres: Crime, Thriller.
  Popularity: low (tmdb_vote_count=82.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Ryan Prows, runtime=98.0, year=2017.
- wild_card: Avatar Aang: The Last Airbender — recent, well-rated pick that departs a bit from usual habits ("Le Pari").
  Countries: USA, South Korea, Australia (non-USA).
  Primary genres: Animation, Action.
  Popularity: high (tmdb_vote_count=798.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Lauren Montgomery, runtime=99.0, year=2026.
- deep_cut: The Last Circus — a production country new to the user, filtered to stay close to their usual taste ("Le Détour").
  Countries: Italy, Belgium, France, Spain (non-USA).
  Primary genres: Adventure, Comedy.
  Popularity: high (tmdb_vote_count=449.0).
  Relaxation steps used: 0 (0 = full criteria satisfied).
  Difference: director=Álex de la Iglesia, runtime=106.0, year=2010.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation found: yes
- Directors: Ryan Prows, Lauren Montgomery, Álex de la Iglesia
- Primary genres: Crime, Thriller | Animation, Action | Adventure, Comedy
- Duplicate director rejections: None
- Title/franchise proximity rejections: None

### Eligibility exclusions

- Nice Coloured Girls | tmdb-259667-1987 | short_runtime
- Julie, chevalier de Maupin | tmdb-259704-2005 | tv_movie_genre
- The Thief | tmdb-259682-2011 | short_runtime
- Clara s'en va mourir | tmdb-259556-2012 | tv_movie_genre
- Refuge | tmdb-440014-2018 | short_runtime
- Artemio's Loneliness Vol. 1 | tmdb-620583-2020 | short_runtime
- Her Satanic Majesty | tmdb-813923-2016 | short_runtime
- Annabelle's Wish | tmdb-13664-1997 | short_runtime
- Čertův švagr | tmdb-269111-1984 | tv_movie_genre
- Dead Dogs Still Bark | tmdb-1391901-2023 | short_runtime
- Steadfast Stanley | tmdb-269587-2014 | short_runtime
- The Tube | tmdb-1390210-2025 | short_runtime
- Why We Fight: Prelude to War | tmdb-23336-1942 | short_runtime
- Under the Sea 3D | tmdb-36123-2009 | short_runtime
- The Making of Star Wars | tmdb-72694-1977 | tv_movie_genre
- The Memphis Belle | tmdb-41355-1944 | short_runtime
- Deep Sea 3D | tmdb-17700-2006 | short_runtime
- Suzanne | tmdb-1189383-2005 | short_runtime
- Zdobyć miasto | tmdb-621395-1994 | short_runtime
- Before the Raid | tmdb-621709-1944 | short_runtime

## Picks

### safe_pick: Lowlife

- Score: 0.45
- Year: 2017
- Slug: tmdb-461773-2017
- Genres: Crime, Thriller, Comedy, Horror, Drama
- Countries: USA
- Director: Ryan Prows
- Reason codes: genre_match, country_match, low_popularity_gem
- Reason: Un film proche de tes genres favoris, plus confidentiel et sorti depuis un moment — mérite d’être redécouvert.

### wild_card: Avatar Aang: The Last Airbender

- Score: 0.8545
- Year: 2026
- Slug: tmdb-980431-2026
- Genres: Animation, Action, Adventure, Fantasy
- Countries: USA, South Korea, Australia
- Director: Lauren Montgomery
- Reason codes: genre_match, country_match, high_community_rating, non_us_angle, fresh_acclaimed
- Reason: Un pari récent et bien accueilli, qui prend un peu de distance avec tes habitudes.

### deep_cut: The Last Circus

- Score: 0.4135
- Year: 2010
- Slug: tmdb-56812-2010
- Genres: Adventure, Comedy, Drama, Horror, Thriller
- Countries: Italy, Belgium, France, Spain
- Director: Álex de la Iglesia
- Reason codes: genre_match, country_match, runtime_match, non_us_angle, new_country_discovery
- Reason: Un détour vers un pays que tu n’as pas encore exploré, tout en restant proche de tes goûts habituels.
