# Recommendations for mathouix

## Scoring notes

- Candidates are Megabank films not present in the user's last 50 RSS films.
- Compatibility combines genre, country, language, runtime, era, mainstream fit, community rating, fans/watches, repeat director, and title redundancy.
- safe_pick boosts global compatibility and community rating.
- deep_cut boosts niche score and fans/watches, with a penalty for very high watch counts.
- wild_card uses partial compatibility plus secondary/oblique signals instead of selecting the third-best global score.

## Slot rationale

- safe_pick: Whiplash — highest-confidence fit for the current profile.
  Countries: USA (USA).
  Primary genres: Drama, Music.
  Popularity: high (watches=3925603.0).
  Difference: director=Damien Chazelle, runtime=107.0, year=2014.
- deep_cut: Wings of Desire — compatible pick with a less obvious popularity profile.
  Countries: France, Germany (non-USA).
  Primary genres: Drama, Romance.
  Popularity: low (watches=204338.0).
  Difference: director=Wim Wenders, runtime=128.0, year=None.
- wild_card: Waves — contrast pick with wild_card_contrast_score=5.
  Countries: Canada, USA (non-USA).
  Primary genres: Romance, Drama.
  Popularity: low (watches=407861.0).
  Difference: director=Trey Edward Shults, runtime=135.0, year=2019.

## Diversity checks

- Distinct directors: yes
- Non-USA recommendation sought: yes
- Non-USA recommendation found: yes
- Wild card contrast score: 5
- Directors: Damien Chazelle, Wim Wenders, Trey Edward Shults
- Primary genres: Drama, Music | Drama, Romance | Romance, Drama
- Duplicate director rejections: Babylon (Damien Chazelle), First Man (Damien Chazelle), Paris, Texas (Wim Wenders), Buena Vista Social Club (Wim Wenders), Until the End of the World (Wim Wenders), Babylon (Damien Chazelle), The American Friend (Wim Wenders), First Man (Damien Chazelle), Kings of the Road (Wim Wenders), Every Thing Will Be Fine (Wim Wenders)
- Title/franchise proximity rejections: Wings

### Rejected candidates

- deep_cut: Babylon | Damien Chazelle | USA | 0.6572 | duplicate_director
- deep_cut: First Man | Damien Chazelle | USA | 0.5651 | duplicate_director
- deep_cut: Wings of Desire | Wim Wenders | France, Germany | 0.8039 | replaced_by_non_us_diversity
- wild_card: Paris, Texas | Wim Wenders | France, Germany, UK | 0.6547 | duplicate_director
- wild_card: Buena Vista Social Club | Wim Wenders | Cuba, France, Germany, UK, USA | 0.5984 | duplicate_director
- wild_card: Until the End of the World | Wim Wenders | Australia, France, Germany | 0.5314 | duplicate_director
- wild_card: Babylon | Damien Chazelle | USA | 0.5924 | duplicate_director
- wild_card: Wings | William A. Wellman | USA | 0.472 | title_or_franchise_proximity
- wild_card: The American Friend | Wim Wenders | France, Germany | 0.4527 | duplicate_director
- wild_card: First Man | Damien Chazelle | USA | 0.5117 | duplicate_director
- wild_card: Kings of the Road | Wim Wenders | Germany | 0.4267 | duplicate_director
- wild_card: Good Will Hunting | Gus Van Sant | USA | 0.6436 | wild_card_lacks_contrast
- wild_card: Dead Poets Society | Peter Weir | USA | 0.6403 | wild_card_lacks_contrast
- wild_card: Black Swan | Darren Aronofsky | USA | 0.6296 | wild_card_lacks_contrast
- wild_card: The Perks of Being a Wallflower | Stephen Chbosky | USA | 0.6002 | wild_card_lacks_contrast
- wild_card: The Social Network | David Fincher | USA | 0.5439 | wild_card_lacks_contrast
- wild_card: The Breakfast Club | John Hughes | USA | 0.5086 | wild_card_lacks_contrast
- wild_card: Every Thing Will Be Fine | Wim Wenders | Canada, Germany, Norway, Sweden | 0.3469 | duplicate_director

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

### safe_pick: Whiplash

- Score: 0.8526
- Year: 2014
- Slug: whiplash-2014
- Genres: Drama, Music
- Countries: USA
- Director: Damien Chazelle
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, director_affinity, fans_watches_signal
- Reason: Un choix proche de ton profil récent, avec des genres et une réception qui collent bien à tes habitudes.

### deep_cut: Wings of Desire

- Score: 0.8039
- Year: None
- Slug: wings-of-desire
- Genres: Drama, Romance, Fantasy
- Countries: France, Germany
- Director: Wim Wenders
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, director_affinity, fans_watches_signal, non_us_angle, deep_cut
- Reason: Un détour moins évident, retenu parce qu’il garde des points communs avec ton profil sans répéter les choix les plus visibles.

### wild_card: Waves

- Score: 0.6426
- Year: 2019
- Slug: waves-2019
- Genres: Romance, Drama
- Countries: Canada, USA
- Director: Trey Edward Shults
- Reason codes: genre_match, country_match, runtime_match, high_community_rating, fans_watches_signal, non_us_angle, wild_card_contrast
- Reason: Un pari plus oblique : il change d’angle tout en gardant un point d’accroche avec tes goûts récents.
