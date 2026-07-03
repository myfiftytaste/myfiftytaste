# Recommendations for mathmon

## Scoring notes

- Candidates are Megabank films not present in the user's last 50 RSS films.
- Compatibility combines genre, country, language, runtime, era, mainstream fit, community rating, fans/watches, repeat director, and title redundancy.
- safe_pick boosts global compatibility and community rating.
- deep_cut boosts niche score and fans/watches, with a penalty for very high watch counts.
- wild_card uses partial compatibility plus secondary/oblique signals instead of selecting the third-best global score.

## Slot rationale

- safe_pick: In the Mood for Love — highest-confidence fit for the current profile.
  Countries: Hong Kong, France (non-USA).
  Primary genres: Drama, Romance.
  Popularity: mid (watches=876907.0).
  Difference: director=Wong Kar-wai, runtime=99.0, year=None.
- deep_cut: The Young Girls of Rochefort — compatible pick with a less obvious popularity profile.
  Countries: France (non-USA).
  Primary genres: Romance, Comedy.
  Popularity: low (watches=117024.0).
  Difference: director=Jacques Demy, runtime=126.0, year=None.
- wild_card: Mulholland Drive — contrast pick with wild_card_contrast_score=5.
  Countries: France, USA (non-USA).
  Primary genres: Mystery, Drama.
  Popularity: high (watches=1172795.0).
  Difference: director=David Lynch, runtime=147.0, year=None.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation sought: yes
- Non-USA recommendation found: yes
- Wild card contrast score: 5
- Directors: Wong Kar-wai, Jacques Demy, David Lynch
- Primary genres: Drama, Romance | Romance, Comedy | Mystery, Drama
- Duplicate director rejections: As Tears Go By (Wong Kar-wai), My Blueberry Nights (Wong Kar-wai), Fallen Angels (Wong Kar-wai), 2046 (Wong Kar-wai), The Umbrellas of Cherbourg (Jacques Demy), 2046 (Wong Kar-wai), Fallen Angels (Wong Kar-wai), As Tears Go By (Wong Kar-wai), My Blueberry Nights (Wong Kar-wai)
- Title/franchise proximity rejections: In the Mood, For the Love of Spock, Love, I Am Love, The 33, The 7.39, The V.I.P.s, The Ex, Love, For the Love of Spock, In the Mood, The 33, I Am Love, The 7.39, The Ex, The V.I.P.s

### Rejected candidates

- deep_cut: As Tears Go By | Wong Kar-wai | Hong Kong | 0.658 | duplicate_director
- deep_cut: My Blueberry Nights | Wong Kar-wai | China, France, Hong Kong | 0.6492 | duplicate_director
- deep_cut: Fallen Angels | Wong Kar-wai | Hong Kong | 0.64 | duplicate_director
- deep_cut: 2046 | Wong Kar-wai | China, France, Germany, Hong Kong, Italy | 0.6285 | duplicate_director
- deep_cut: In the Mood | Phil Alden Robinson | USA | 0.5365 | title_or_franchise_proximity
- deep_cut: For the Love of Spock | Adam Nimoy | Canada, USA | 0.4939 | title_or_franchise_proximity
- deep_cut: Love | Gaspar Noé | Belgium, France | 0.464 | title_or_franchise_proximity
- deep_cut: I Am Love | Luca Guadagnino | Italy | 0.4475 | title_or_franchise_proximity
- deep_cut: The 33 | Patricia Riggen | Chile, Colombia, Spain, USA | 0.3999 | title_or_franchise_proximity
- deep_cut: The 7.39 | John Alexander | UK, USA | 0.3789 | title_or_franchise_proximity
- deep_cut: The V.I.P.s | Anthony Asquith | UK | 0.3672 | title_or_franchise_proximity
- deep_cut: The Ex | Jesse Peretz | USA | 0.3311 | title_or_franchise_proximity
- wild_card: Love | Gaspar Noé | Belgium, France | 0.4284 | title_or_franchise_proximity
- wild_card: The Umbrellas of Cherbourg | Jacques Demy | France, Germany | 0.5748 | duplicate_director
- wild_card: 2046 | Wong Kar-wai | China, France, Germany, Hong Kong, Italy | 0.4782 | duplicate_director
- wild_card: Fallen Angels | Wong Kar-wai | Hong Kong | 0.5817 | duplicate_director
- wild_card: For the Love of Spock | Adam Nimoy | Canada, USA | 0.4302 | title_or_franchise_proximity
- wild_card: In the Mood | Phil Alden Robinson | USA | 0.3954 | title_or_franchise_proximity
- wild_card: As Tears Go By | Wong Kar-wai | Hong Kong | 0.4255 | duplicate_director
- wild_card: My Blueberry Nights | Wong Kar-wai | China, France, Hong Kong | 0.4721 | duplicate_director

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

### safe_pick: In the Mood for Love

- Score: 0.8422
- Year: None
- Slug: in-the-mood-for-love
- Genres: Drama, Romance
- Countries: Hong Kong, France
- Director: Wong Kar-wai
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, director_affinity, fans_watches_signal, non_us_angle
- Reason: Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes.

### deep_cut: The Young Girls of Rochefort

- Score: 0.8311
- Year: None
- Slug: the-young-girls-of-rochefort
- Genres: Romance, Comedy, Drama
- Countries: France
- Director: Jacques Demy
- Reason codes: genre_match, country_match, high_community_rating, fans_watches_signal, non_us_angle, deep_cut
- Reason: Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles.

### wild_card: Mulholland Drive

- Score: 0.6217
- Year: None
- Slug: mulholland-drive
- Genres: Mystery, Drama, Thriller
- Countries: France, USA
- Director: David Lynch
- Reason codes: genre_match, country_match, high_community_rating, fans_watches_signal, non_us_angle, wild_card_contrast
- Reason: Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents.
