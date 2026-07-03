# Recommendations for crazykungfu

## Scoring notes

- Candidates are Megabank films not present in the user's last 50 RSS films.
- Compatibility combines genre, country, language, runtime, era, mainstream fit, community rating, fans/watches, repeat director, and title redundancy.
- safe_pick boosts global compatibility and community rating.
- deep_cut boosts niche score and fans/watches, with a penalty for very high watch counts.
- wild_card uses partial compatibility plus secondary/oblique signals instead of selecting the third-best global score.

## Slot rationale

- safe_pick: Dog Day Afternoon — highest-confidence fit for the current profile.
  Countries: USA (USA).
  Primary genres: Crime, Drama.
  Popularity: high (watches=480772.0).
  Difference: director=Sidney Lumet, runtime=125.0, year=None.
- deep_cut: Mind Game — compatible pick with a less obvious popularity profile.
  Countries: Japan (non-USA).
  Primary genres: Animation, Drama.
  Popularity: low (watches=59191.0).
  Difference: director=Masaaki Yuasa, runtime=103.0, year=None.
- wild_card: Nowhere — contrast pick with wild_card_contrast_score=5.
  Countries: France, USA (non-USA).
  Primary genres: Drama, Comedy.
  Popularity: mid (watches=101094.0).
  Difference: director=Gregg Araki, runtime=83.0, year=None.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation sought: yes
- Non-USA recommendation found: yes
- Wild card contrast score: 5
- Directors: Sidney Lumet, Masaaki Yuasa, Gregg Araki
- Primary genres: Crime, Drama | Animation, Drama | Drama, Comedy
- Duplicate director rejections: The Anderson Tapes (Sidney Lumet), Family Business (Sidney Lumet), Prince of the City (Sidney Lumet), Before the Devil Knows You're Dead (Sidney Lumet), Guilty as Sin (Sidney Lumet), The Hill (Sidney Lumet), The Wiz (Sidney Lumet), Network (Sidney Lumet), Murder on the Orient Express (Sidney Lumet), Serpico (Sidney Lumet), 12 Angry Men (Sidney Lumet), 12 Angry Men (Sidney Lumet), Network (Sidney Lumet), Serpico (Sidney Lumet), Before the Devil Knows You're Dead (Sidney Lumet), Murder on the Orient Express (Sidney Lumet), The Wiz (Sidney Lumet), The Hill (Sidney Lumet), Prince of the City (Sidney Lumet), The Anderson Tapes (Sidney Lumet), Family Business (Sidney Lumet), Guilty as Sin (Sidney Lumet)
- Title/franchise proximity rejections: None

### Rejected candidates

- deep_cut: The Anderson Tapes | Sidney Lumet | USA | 0.6557 | duplicate_director
- deep_cut: Family Business | Sidney Lumet | USA | 0.617 | duplicate_director
- deep_cut: Prince of the City | Sidney Lumet | USA | 0.6086 | duplicate_director
- deep_cut: Before the Devil Knows You're Dead | Sidney Lumet | UK, USA | 0.593 | duplicate_director
- deep_cut: Guilty as Sin | Sidney Lumet | USA | 0.5817 | duplicate_director
- deep_cut: The Hill | Sidney Lumet | UK | 0.5747 | duplicate_director
- deep_cut: The Wiz | Sidney Lumet | USA | 0.571 | duplicate_director
- deep_cut: Network | Sidney Lumet | USA | 0.5384 | duplicate_director
- deep_cut: Murder on the Orient Express | Sidney Lumet | UK | 0.5301 | duplicate_director
- deep_cut: Serpico | Sidney Lumet | USA | 0.489 | duplicate_director
- deep_cut: 12 Angry Men | Sidney Lumet | USA | 0.3622 | duplicate_director
- deep_cut: Paid in Full | Charles Stone III | USA | 0.7789 | replaced_by_non_us_diversity
- wild_card: 12 Angry Men | Sidney Lumet | USA | 0.6666 | duplicate_director
- wild_card: Network | Sidney Lumet | USA | 0.5942 | duplicate_director
- wild_card: The Shawshank Redemption | Frank Darabont | USA | 0.6073 | wild_card_lacks_contrast
- wild_card: Serpico | Sidney Lumet | USA | 0.5295 | duplicate_director
- wild_card: Before the Devil Knows You're Dead | Sidney Lumet | UK, USA | 0.5262 | duplicate_director
- wild_card: Murder on the Orient Express | Sidney Lumet | UK | 0.437 | duplicate_director
- wild_card: Se7en | David Fincher | USA | 0.5819 | wild_card_lacks_contrast
- wild_card: The Wiz | Sidney Lumet | USA | 0.4994 | duplicate_director

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

### safe_pick: Dog Day Afternoon

- Score: 0.813
- Year: None
- Slug: dog-day-afternoon
- Genres: Crime, Drama, Thriller
- Countries: USA
- Director: Sidney Lumet
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, director_affinity, fans_watches_signal
- Reason: Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes.

### deep_cut: Mind Game

- Score: 0.7285
- Year: None
- Slug: mind-game
- Genres: Animation, Drama, Comedy, Romance, Fantasy
- Countries: Japan
- Director: Masaaki Yuasa
- Reason codes: genre_match, runtime_match, high_community_rating, fans_watches_signal, non_us_angle, deep_cut
- Reason: Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles.

### wild_card: Nowhere

- Score: 0.6202
- Year: None
- Slug: nowhere
- Genres: Drama, Comedy, Science Fiction
- Countries: France, USA
- Director: Gregg Araki
- Reason codes: genre_match, country_match, high_community_rating, fans_watches_signal, non_us_angle, wild_card_contrast
- Reason: Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents.
