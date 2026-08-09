# Recommendations for tobiashottin

## Scoring notes

- Candidates are Megabank films not present in the user's last 50 RSS films.
- Compatibility combines genre, country, language, runtime, era, mainstream fit, community rating, fans/watches, repeat director, and title redundancy.
- safe_pick boosts global compatibility and community rating.
- deep_cut boosts niche score and fans/watches, with a penalty for very high watch counts.
- wild_card uses partial compatibility plus secondary/oblique signals instead of selecting the third-best global score.

## Slot rationale

- safe_pick: The Long Goodbye — highest-confidence fit for the current profile.
  Countries: USA (USA).
  Primary genres: Crime, Thriller.
  Popularity: mid (watches=155427.0).
  Difference: director=Robert Altman, runtime=112.0, year=None.
- deep_cut: Mind Game — compatible pick with a less obvious popularity profile.
  Countries: Japan (non-USA).
  Primary genres: Animation, Drama.
  Popularity: low (watches=59191.0).
  Difference: director=Masaaki Yuasa, runtime=103.0, year=None.
- wild_card: Interstellar — contrast pick with wild_card_contrast_score=5.
  Countries: UK, USA (non-USA).
  Primary genres: Science Fiction, Drama.
  Popularity: high (watches=5044987.0).
  Difference: director=Christopher Nolan, runtime=169.0, year=None.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation sought: yes
- Non-USA recommendation found: yes
- Wild card contrast score: 5
- Directors: Robert Altman, Masaaki Yuasa, Christopher Nolan
- Primary genres: Crime, Thriller | Animation, Drama | Science Fiction, Drama
- Duplicate director rejections: 3 Women (Robert Altman), Nashville (Robert Altman), California Split (Robert Altman), McCabe & Mrs. Miller (Robert Altman), Thieves Like Us (Robert Altman), Brewster McCloud (Robert Altman), Images (Robert Altman), The Player (Robert Altman), HealtH (Robert Altman), Short Cuts (Robert Altman), Popeye (Robert Altman), The Gingerbread Man (Robert Altman), Images (Robert Altman), Nashville (Robert Altman), California Split (Robert Altman), Short Cuts (Robert Altman), Brewster McCloud (Robert Altman), 3 Women (Robert Altman), McCabe & Mrs. Miller (Robert Altman), HealtH (Robert Altman), Thieves Like Us (Robert Altman), The Player (Robert Altman), The Gingerbread Man (Robert Altman), Popeye (Robert Altman)
- Title/franchise proximity rejections: The 33, The 7.39, The V.I.P.s, The Ex, The 33, The 7.39, The V.I.P.s, The Ex

### Rejected candidates

- deep_cut: 3 Women | Robert Altman | USA | 0.6867 | duplicate_director
- deep_cut: Nashville | Robert Altman | USA | 0.679 | duplicate_director
- deep_cut: California Split | Robert Altman | USA | 0.6636 | duplicate_director
- deep_cut: McCabe & Mrs. Miller | Robert Altman | USA | 0.6496 | duplicate_director
- deep_cut: Thieves Like Us | Robert Altman | USA | 0.6396 | duplicate_director
- deep_cut: Brewster McCloud | Robert Altman | USA | 0.6365 | duplicate_director
- deep_cut: Images | Robert Altman | UK, USA | 0.5964 | duplicate_director
- deep_cut: The Player | Robert Altman | USA | 0.5893 | duplicate_director
- deep_cut: HealtH | Robert Altman | USA | 0.5724 | duplicate_director
- deep_cut: Short Cuts | Robert Altman | USA | 0.5515 | duplicate_director
- deep_cut: Popeye | Robert Altman | USA | 0.538 | duplicate_director
- deep_cut: The Gingerbread Man | Robert Altman | USA | 0.4802 | duplicate_director
- deep_cut: The 33 | Patricia Riggen | Chile, Colombia, Spain, USA | 0.4023 | title_or_franchise_proximity
- deep_cut: The 7.39 | John Alexander | UK, USA | 0.3979 | title_or_franchise_proximity
- deep_cut: The V.I.P.s | Anthony Asquith | UK | 0.3752 | title_or_franchise_proximity
- deep_cut: The Ex | Jesse Peretz | USA | 0.3323 | title_or_franchise_proximity
- deep_cut: The Cure | Peter Horton | USA | 0.7983 | replaced_by_non_us_diversity
- wild_card: Images | Robert Altman | UK, USA | 0.5229 | duplicate_director
- wild_card: Nashville | Robert Altman | USA | 0.5673 | duplicate_director
- wild_card: California Split | Robert Altman | USA | 0.5375 | duplicate_director

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

### safe_pick: The Long Goodbye

- Score: 0.8352
- Year: None
- Slug: the-long-goodbye
- Genres: Crime, Thriller, Mystery, Drama, Comedy
- Countries: USA
- Director: Robert Altman
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, director_affinity, fans_watches_signal
- Reason: Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes.

### deep_cut: Mind Game

- Score: 0.7449
- Year: None
- Slug: mind-game
- Genres: Animation, Drama, Comedy, Romance, Fantasy
- Countries: Japan
- Director: Masaaki Yuasa
- Reason codes: genre_match, runtime_match, high_community_rating, fans_watches_signal, non_us_angle, deep_cut
- Reason: Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles.

### wild_card: Interstellar

- Score: 0.5912
- Year: None
- Slug: interstellar
- Genres: Science Fiction, Drama, Adventure
- Countries: UK, USA
- Director: Christopher Nolan
- Reason codes: genre_match, country_match, high_community_rating, fans_watches_signal, non_us_angle, wild_card_contrast
- Reason: Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents.
