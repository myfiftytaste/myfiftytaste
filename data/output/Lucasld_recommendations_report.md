# Recommendations for Lucasld

## Scoring notes

- Candidates are Megabank films not present in the user's last 50 RSS films.
- Compatibility combines genre, country, language, runtime, era, mainstream fit, community rating, fans/watches, repeat director, and title redundancy.
- safe_pick boosts global compatibility and community rating.
- deep_cut boosts niche score and fans/watches, with a penalty for very high watch counts.
- wild_card uses partial compatibility plus secondary/oblique signals instead of selecting the third-best global score.

## Slot rationale

- safe_pick: Parasite — highest-confidence fit for the current profile.
  Countries: South Korea (non-USA).
  Primary genres: Comedy, Thriller.
  Popularity: high (watches=5015041.0).
  Difference: director=Bong Joon Ho, runtime=133.0, year=2019.
- deep_cut: Phantom of the Paradise — compatible pick with a less obvious popularity profile.
  Countries: USA (USA).
  Primary genres: Drama, Comedy.
  Popularity: low (watches=137565.0).
  Difference: director=Brian De Palma, runtime=92.0, year=None.
- wild_card: Heat — contrast pick with wild_card_contrast_score=6.
  Countries: USA (USA).
  Primary genres: Crime, Action.
  Popularity: mid (watches=968046.0).
  Difference: director=Michael Mann, runtime=170.0, year=1995.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation sought: no
- Non-USA recommendation found: yes
- Wild card contrast score: 6
- Directors: Bong Joon Ho, Brian De Palma, Michael Mann
- Primary genres: Comedy, Thriller | Drama, Comedy | Crime, Action
- Duplicate director rejections: Mother (Bong Joon Ho), Tokyo! (Bong Joon Ho), Barking Dogs Never Bite (Bong Joon Ho), Okja (Bong Joon Ho), The Host (Bong Joon Ho), Snowpiercer (Bong Joon Ho), Scarface (Brian De Palma), Carrie (Brian De Palma), Dressed to Kill (Brian De Palma), Blow Out (Brian De Palma), Sisters (Brian De Palma), Snake Eyes (Brian De Palma), The Untouchables (Brian De Palma), Body Double (Brian De Palma), Obsession (Brian De Palma), The Fury (Brian De Palma), Okja (Bong Joon Ho), Passion (Brian De Palma), Femme Fatale (Brian De Palma), Mother (Bong Joon Ho), Tokyo! (Bong Joon Ho), The Host (Bong Joon Ho), Snowpiercer (Bong Joon Ho), Barking Dogs Never Bite (Bong Joon Ho)
- Title/franchise proximity rejections: Parasite, Parasite, Paradise, The Phantom, The 7.39, The 33, Paradise, The Ex, The V.I.P.s

### Rejected candidates

- deep_cut: Mother | Bong Joon Ho | South Korea | 0.673 | duplicate_director
- deep_cut: Tokyo! | Bong Joon Ho | France, Germany, Japan, South Korea | 0.6529 | duplicate_director
- deep_cut: Barking Dogs Never Bite | Bong Joon Ho | South Korea | 0.6267 | duplicate_director
- deep_cut: Okja | Bong Joon Ho | South Korea, USA | 0.6131 | duplicate_director
- deep_cut: The Host | Bong Joon Ho | South Korea | 0.5684 | duplicate_director
- deep_cut: Snowpiercer | Bong Joon Ho | South Korea | 0.5229 | duplicate_director
- deep_cut: Parasite | Charles Band | USA | 0.4624 | title_or_franchise_proximity
- wild_card: Scarface | Brian De Palma | USA | 0.627 | duplicate_director
- wild_card: Carrie | Brian De Palma | USA | 0.572 | duplicate_director
- wild_card: Dressed to Kill | Brian De Palma | USA | 0.5475 | duplicate_director
- wild_card: Blow Out | Brian De Palma | USA | 0.5646 | duplicate_director
- wild_card: Sisters | Brian De Palma | USA | 0.5389 | duplicate_director
- wild_card: Snake Eyes | Brian De Palma | USA | 0.5286 | duplicate_director
- wild_card: The Untouchables | Brian De Palma | USA | 0.5891 | duplicate_director
- wild_card: Body Double | Brian De Palma | USA | 0.5888 | duplicate_director
- wild_card: Obsession | Brian De Palma | USA | 0.4248 | duplicate_director
- wild_card: Parasite | Charles Band | USA | 0.4691 | title_or_franchise_proximity
- wild_card: The Fury | Brian De Palma | USA | 0.5337 | duplicate_director
- wild_card: Paradise | Diablo Cody | USA | 0.4387 | title_or_franchise_proximity
- wild_card: Okja | Bong Joon Ho | South Korea, USA | 0.583 | duplicate_director

### Notable eligibility exclusions

- Twin Peaks | twin-peaks | tv_or_series_signal

### Eligibility exclusions

- #1 Fan: A Darkomentary | 1-fan-a-darkomentary | short_runtime
- 12 Angry Men | 12-angry-men-1997 | tv_movie_genre
- 12th Assistant Deacon | 12th-assistant-deacon | short_runtime
- 7 Days in Hell | 7-days-in-hell | tv_movie_genre
- 8 Ball Bunny | 8-ball-bunny | short_runtime
- 8: SIDA | 8-sida | short_runtime
- 9 | 9-2005 | short_runtime
- A Beautiful Planet | a-beautiful-planet | short_runtime
- A Brief History of John Baldessari | a-brief-history-of-john-baldessari | short_runtime
- A Charlie Brown Christmas | a-charlie-brown-christmas | tv_movie_genre
- A Charlie Brown Thanksgiving | a-charlie-brown-thanksgiving | tv_movie_genre
- A Christmas Carol | a-christmas-carol-2004 | tv_movie_genre
- A Close Shave | a-close-shave-1995 | short_runtime
- A Cold Night's Death | a-cold-nights-death | tv_movie_genre
- A Fairly Odd Movie: Grow Up, Timmy Turner! | a-fairly-odd-movie-grow-up-timmy-turner | tv_movie_genre
- A Girl in the River: The Price of Forgiveness | a-girl-in-the-river-the-price-of-forgiveness | short_runtime
- A Hypnotic Television Experience | a-hypnotic-television-experience | short_runtime
- A Is for Acid | a-is-for-acid | tv_movie_genre
- A Killer Among Friends | a-killer-among-friends | tv_movie_genre
- A Kitten for Hitler | a-kitten-for-hitler | short_runtime

## Picks

### safe_pick: Parasite

- Score: 0.8404
- Year: 2019
- Slug: parasite-2019
- Genres: Comedy, Thriller, Drama
- Countries: South Korea
- Director: Bong Joon Ho
- Reason codes: genre_match, runtime_match, high_community_rating, director_affinity, fans_watches_signal, non_us_angle
- Reason: Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes.

### deep_cut: Phantom of the Paradise

- Score: 0.8927
- Year: None
- Slug: phantom-of-the-paradise
- Genres: Drama, Comedy, Horror, Fantasy, Thriller, Music, Romance
- Countries: USA
- Director: Brian De Palma
- Reason codes: genre_match, country_match, director_affinity, fans_watches_signal, deep_cut
- Reason: Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles.

### wild_card: Heat

- Score: 0.6491
- Year: 1995
- Slug: heat-1995
- Genres: Crime, Action, Drama
- Countries: USA
- Director: Michael Mann
- Reason codes: genre_match, country_match, high_community_rating, fans_watches_signal, wild_card_contrast
- Reason: Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents.
