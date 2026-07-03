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
- deep_cut: The Young Girls of Rochefort — compatible pick with a less obvious popularity profile.
  Countries: France (non-USA).
  Primary genres: Romance, Comedy.
  Popularity: mid (watches=117024.0).
  Difference: director=Jacques Demy, runtime=126.0, year=None.
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
- Directors: Robert Altman, Jacques Demy, Christopher Nolan
- Primary genres: Crime, Thriller | Romance, Comedy | Science Fiction, Drama
- Duplicate director rejections: 3 Women (Robert Altman), Nashville (Robert Altman), California Split (Robert Altman), McCabe & Mrs. Miller (Robert Altman), Thieves Like Us (Robert Altman), Brewster McCloud (Robert Altman), The Player (Robert Altman), Images (Robert Altman), HealtH (Robert Altman), Short Cuts (Robert Altman), Popeye (Robert Altman), The Gingerbread Man (Robert Altman), The Umbrellas of Cherbourg (Jacques Demy), Images (Robert Altman), Nashville (Robert Altman), California Split (Robert Altman), Short Cuts (Robert Altman), 3 Women (Robert Altman), Brewster McCloud (Robert Altman), McCabe & Mrs. Miller (Robert Altman), HealtH (Robert Altman), The Player (Robert Altman), Thieves Like Us (Robert Altman), The Gingerbread Man (Robert Altman), Popeye (Robert Altman)
- Title/franchise proximity rejections: The 33, The 7.39, The V.I.P.s, The Ex, The 33, The 7.39, The V.I.P.s, The Ex

### Rejected candidates

- deep_cut: 3 Women | Robert Altman | USA | 0.6783 | duplicate_director
- deep_cut: Nashville | Robert Altman | USA | 0.6719 | duplicate_director
- deep_cut: California Split | Robert Altman | USA | 0.6521 | duplicate_director
- deep_cut: McCabe & Mrs. Miller | Robert Altman | USA | 0.6404 | duplicate_director
- deep_cut: Thieves Like Us | Robert Altman | USA | 0.6281 | duplicate_director
- deep_cut: Brewster McCloud | Robert Altman | USA | 0.625 | duplicate_director
- deep_cut: The Player | Robert Altman | USA | 0.5911 | duplicate_director
- deep_cut: Images | Robert Altman | UK, USA | 0.5849 | duplicate_director
- deep_cut: HealtH | Robert Altman | USA | 0.5609 | duplicate_director
- deep_cut: Short Cuts | Robert Altman | USA | 0.5399 | duplicate_director
- deep_cut: Popeye | Robert Altman | USA | 0.5287 | duplicate_director
- deep_cut: The Gingerbread Man | Robert Altman | USA | 0.4687 | duplicate_director
- deep_cut: The 33 | Patricia Riggen | Chile, Colombia, Spain, USA | 0.3908 | title_or_franchise_proximity
- deep_cut: The 7.39 | John Alexander | UK, USA | 0.3864 | title_or_franchise_proximity
- deep_cut: The V.I.P.s | Anthony Asquith | UK | 0.3637 | title_or_franchise_proximity
- deep_cut: The Ex | Jesse Peretz | USA | 0.3208 | title_or_franchise_proximity
- deep_cut: The Cure | Peter Horton | USA | 0.7868 | replaced_by_non_us_diversity
- wild_card: The Umbrellas of Cherbourg | Jacques Demy | France, Germany | 0.539 | duplicate_director
- wild_card: Images | Robert Altman | UK, USA | 0.5162 | duplicate_director
- wild_card: Nashville | Robert Altman | USA | 0.5631 | duplicate_director

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

- Score: 0.8401
- Year: None
- Slug: the-long-goodbye
- Genres: Crime, Thriller, Mystery, Drama, Comedy
- Countries: USA
- Director: Robert Altman
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, director_affinity, fans_watches_signal
- Reason: Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes.

### deep_cut: The Young Girls of Rochefort

- Score: 0.7392
- Year: None
- Slug: the-young-girls-of-rochefort
- Genres: Romance, Comedy, Drama
- Countries: France
- Director: Jacques Demy
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, fans_watches_signal, non_us_angle, deep_cut
- Reason: Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles.

### wild_card: Interstellar

- Score: 0.598
- Year: None
- Slug: interstellar
- Genres: Science Fiction, Drama, Adventure
- Countries: UK, USA
- Director: Christopher Nolan
- Reason codes: genre_match, country_match, high_community_rating, fans_watches_signal, non_us_angle, wild_card_contrast
- Reason: Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents.
