# Recommendations for tanguytare

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
- deep_cut: Mind Game — compatible pick with a less obvious popularity profile.
  Countries: Japan (non-USA).
  Primary genres: Animation, Drama.
  Popularity: low (watches=59191.0).
  Difference: director=Masaaki Yuasa, runtime=103.0, year=None.
- wild_card: The Cure — contrast pick with wild_card_contrast_score=6.
  Countries: USA (USA).
  Primary genres: Drama, Family.
  Popularity: low (watches=19174.0).
  Difference: director=Peter Horton, runtime=97.0, year=1995.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation sought: yes
- Non-USA recommendation found: yes
- Wild card contrast score: 6
- Directors: Bong Joon Ho, Masaaki Yuasa, Peter Horton
- Primary genres: Comedy, Thriller | Animation, Drama | Drama, Family
- Duplicate director rejections: Tokyo! (Bong Joon Ho), Barking Dogs Never Bite (Bong Joon Ho), Mother (Bong Joon Ho), Memories of Murder (Bong Joon Ho), Okja (Bong Joon Ho), Snowpiercer (Bong Joon Ho), Okja (Bong Joon Ho), Memories of Murder (Bong Joon Ho), Tokyo! (Bong Joon Ho), Mother (Bong Joon Ho), Barking Dogs Never Bite (Bong Joon Ho), Snowpiercer (Bong Joon Ho)
- Title/franchise proximity rejections: Parasite, Parasite

### Rejected candidates

- deep_cut: Tokyo! | Bong Joon Ho | France, Germany, Japan, South Korea | 0.6495 | duplicate_director
- deep_cut: Barking Dogs Never Bite | Bong Joon Ho | South Korea | 0.6201 | duplicate_director
- deep_cut: Mother | Bong Joon Ho | South Korea | 0.6108 | duplicate_director
- deep_cut: Memories of Murder | Bong Joon Ho | South Korea | 0.5061 | duplicate_director
- deep_cut: Parasite | Charles Band | USA | 0.4924 | title_or_franchise_proximity
- deep_cut: Okja | Bong Joon Ho | South Korea, USA | 0.4454 | duplicate_director
- deep_cut: Snowpiercer | Bong Joon Ho | South Korea | 0.2684 | duplicate_director
- wild_card: Parasite | Charles Band | USA | 0.4177 | title_or_franchise_proximity
- wild_card: Okja | Bong Joon Ho | South Korea, USA | 0.5056 | duplicate_director
- wild_card: Memories of Murder | Bong Joon Ho | South Korea | 0.5756 | duplicate_director
- wild_card: Tokyo! | Bong Joon Ho | France, Germany, Japan, South Korea | 0.4823 | duplicate_director
- wild_card: Mother | Bong Joon Ho | South Korea | 0.5312 | duplicate_director
- wild_card: Barking Dogs Never Bite | Bong Joon Ho | South Korea | 0.4308 | duplicate_director
- wild_card: Snowpiercer | Bong Joon Ho | South Korea | 0.4341 | duplicate_director

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

- Score: 0.8042
- Year: 2019
- Slug: parasite-2019
- Genres: Comedy, Thriller, Drama
- Countries: South Korea
- Director: Bong Joon Ho
- Reason codes: genre_match, high_community_rating, director_affinity, fans_watches_signal, non_us_angle, decade_shift
- Reason: Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes.

### deep_cut: Mind Game

- Score: 0.8683
- Year: None
- Slug: mind-game
- Genres: Animation, Drama, Comedy, Romance, Fantasy
- Countries: Japan
- Director: Masaaki Yuasa
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, director_affinity, fans_watches_signal, non_us_angle, deep_cut
- Reason: Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles.

### wild_card: The Cure

- Score: 0.6129
- Year: 1995
- Slug: the-cure-1995
- Genres: Drama, Family
- Countries: USA
- Director: Peter Horton
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, fans_watches_signal, wild_card_contrast
- Reason: Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents.
