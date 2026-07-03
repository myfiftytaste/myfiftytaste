# Recommendations for picolifl

## Scoring notes

- Candidates are Megabank films not present in the user's last 49 RSS films.
- Compatibility combines genre, country, language, runtime, era, mainstream fit, community rating, fans/watches, repeat director, and title redundancy.
- safe_pick boosts global compatibility and community rating.
- deep_cut boosts niche score and fans/watches, with a penalty for very high watch counts.
- wild_card uses partial compatibility plus secondary/oblique signals instead of selecting the third-best global score.

## Slot rationale

- safe_pick: The Dark Knight — highest-confidence fit for the current profile.
  Countries: UK, USA (non-USA).
  Primary genres: Action, Drama.
  Popularity: high (watches=4488171.0).
  Difference: director=Christopher Nolan, runtime=152.0, year=None.
- deep_cut: The Young Girls of Rochefort — compatible pick with a less obvious popularity profile.
  Countries: France (non-USA).
  Primary genres: Romance, Comedy.
  Popularity: low (watches=117024.0).
  Difference: director=Jacques Demy, runtime=126.0, year=None.
- wild_card: Pride — contrast pick with wild_card_contrast_score=5.
  Countries: France, UK (non-USA).
  Primary genres: Drama, Comedy.
  Popularity: low (watches=166225.0).
  Difference: director=Matthew Warchus, runtime=120.0, year=2014.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation sought: yes
- Non-USA recommendation found: yes
- Wild card contrast score: 5
- Directors: Christopher Nolan, Jacques Demy, Matthew Warchus
- Primary genres: Action, Drama | Romance, Comedy | Drama, Comedy
- Duplicate director rejections: Insomnia (Christopher Nolan), Following (Christopher Nolan), The Prestige (Christopher Nolan), Interstellar (Christopher Nolan), Memento (Christopher Nolan), Dunkirk (Christopher Nolan), The Dark Knight Rises (Christopher Nolan), Tenet (Christopher Nolan), Oppenheimer (Christopher Nolan), The Umbrellas of Cherbourg (Jacques Demy), Insomnia (Christopher Nolan), Memento (Christopher Nolan), Oppenheimer (Christopher Nolan), Interstellar (Christopher Nolan), Following (Christopher Nolan), The Prestige (Christopher Nolan), Dunkirk (Christopher Nolan), The Dark Knight Rises (Christopher Nolan), Tenet (Christopher Nolan)
- Title/franchise proximity rejections: Batman: The Dark Knight Returns, Part 2, Batman: The Dark Knight Returns, Part 1, The 33, The 7.39, The V.I.P.s, The Ex, Batman: The Dark Knight Returns, Part 2, Batman: The Dark Knight Returns, Part 1, The 33, The V.I.P.s, The 7.39, The Ex

### Rejected candidates

- deep_cut: Insomnia | Christopher Nolan | USA | 0.6309 | duplicate_director
- deep_cut: Following | Christopher Nolan | UK, USA | 0.5752 | duplicate_director
- deep_cut: Batman: The Dark Knight Returns, Part 2 | Jay Oliva | USA | 0.4856 | title_or_franchise_proximity
- deep_cut: Batman: The Dark Knight Returns, Part 1 | Jay Oliva | USA | 0.4732 | title_or_franchise_proximity
- deep_cut: The Prestige | Christopher Nolan | UK, USA | 0.4618 | duplicate_director
- deep_cut: The 33 | Patricia Riggen | Chile, Colombia, Spain, USA | 0.4273 | title_or_franchise_proximity
- deep_cut: The 7.39 | John Alexander | UK, USA | 0.4001 | title_or_franchise_proximity
- deep_cut: The V.I.P.s | Anthony Asquith | UK | 0.3826 | title_or_franchise_proximity
- deep_cut: Interstellar | Christopher Nolan | UK, USA | 0.3719 | duplicate_director
- deep_cut: Memento | Christopher Nolan | USA | 0.3666 | duplicate_director
- deep_cut: Dunkirk | Christopher Nolan | UK, USA | 0.3662 | duplicate_director
- deep_cut: The Dark Knight Rises | Christopher Nolan | UK, USA | 0.3179 | duplicate_director
- deep_cut: The Ex | Jesse Peretz | USA | 0.2857 | title_or_franchise_proximity
- deep_cut: Tenet | Christopher Nolan | UK, USA | 0.2698 | duplicate_director
- deep_cut: Oppenheimer | Christopher Nolan | UK, USA | 0.2379 | duplicate_director
- wild_card: The Umbrellas of Cherbourg | Jacques Demy | France, Germany | 0.5508 | duplicate_director
- wild_card: Batman: The Dark Knight Returns, Part 2 | Jay Oliva | USA | 0.4526 | title_or_franchise_proximity
- wild_card: Batman: The Dark Knight Returns, Part 1 | Jay Oliva | USA | 0.4394 | title_or_franchise_proximity
- wild_card: Insomnia | Christopher Nolan | USA | 0.5102 | duplicate_director
- wild_card: Memento | Christopher Nolan | USA | 0.5704 | duplicate_director

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

### safe_pick: The Dark Knight

- Score: 0.8699
- Year: None
- Slug: the-dark-knight
- Genres: Action, Drama, Thriller, Crime
- Countries: UK, USA
- Director: Christopher Nolan
- Reason codes: genre_match, country_match, high_community_rating, director_affinity, fans_watches_signal, non_us_angle
- Reason: Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes.

### deep_cut: The Young Girls of Rochefort

- Score: 0.8207
- Year: None
- Slug: the-young-girls-of-rochefort
- Genres: Romance, Comedy, Drama
- Countries: France
- Director: Jacques Demy
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, fans_watches_signal, non_us_angle, deep_cut
- Reason: Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles.

### wild_card: Pride

- Score: 0.6614
- Year: 2014
- Slug: pride-2014
- Genres: Drama, Comedy
- Countries: France, UK
- Director: Matthew Warchus
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, fans_watches_signal, non_us_angle, wild_card_contrast
- Reason: Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents.
