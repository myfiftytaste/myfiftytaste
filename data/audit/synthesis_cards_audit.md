# Synthesis cards audit — tanguytare

Generated from:

- `data/output/tanguytare_wrapped.json`
- `data/output/tanguytare_profile_metrics.json`
- `data/output/tanguytare_display_profile.json`

Scope: audit only. No Python script, generated JSON, score, or frontend change was made.

## Rating gap audit

### A. Moyenne utilisateur globale

Source: the 50 recent Letterboxd logs in `tanguytare_wrapped.json`.

```text
rated_count = 49
user_average_all_rated = 3.5408163265
```

One film among the 50 logs has no user rating and is excluded from this average.

### B. Moyenne communauté

Source: films with Megabank social stats and a usable Letterboxd community `average_rating`.

```text
social_count = 36
social_avg_rating_count = 27
community_average_social = 4.0440740741
```

Important nuance: `social_count = 36` means 36 films have Megabank social stats, but only 27 of those currently have a usable `average_rating`. The other 9 have `average_rating = NaN/null` in the generated wrapped data and are therefore excluded from the community average.

Films with `has_social_stats = true` but no usable `average_rating`:

| title | year | user_rating | runtime | source |
|---|---:|---:|---:|---|
| Ghost in the Shell | 1995 | 4.0 | 83 | megabank |
| Carlito's Way | 1993 | 3.5 | 144 | megabank |
| Persona | 1966 | 2.5 | 83 | megabank |
| The Taking of Pelham One Two Three | 1974 | 3.0 | 104 | megabank |
| Blow Out | 1981 | 4.5 | 108 | megabank |
| Phantom of the Paradise | 1974 | 3.5 | 92 | megabank |
| Blue Velvet | 1986 | 4.5 | 120 | megabank |
| Children of Men | 2006 | 3.0 | 109 | megabank |
| Salò, or the 120 Days of Sodom | 1975 | 3.0 | 116 | megabank |

### C. Écart actuellement affiché

Current display card:

```text
card_id = rating_personality
title = Sévère
displayed_value = -0.50
displayed_description = Tu notes environ 0.50 étoile(s) en dessous de la moyenne Letterboxd.
```

Current metric object:

```text
user_average_rating = 3.5408163265
community_average_rating = 4.0440740741
displayed_gap = average_difference
displayed_gap = user_average_all_rated - community_average_social
displayed_gap = 3.5408163265 - 4.0440740741
displayed_gap = -0.5032577475
rounded_displayed_gap = -0.50
```

Conclusion on current method: the current displayed `-0.50` does not compute a true film-by-film paired gap. It compares:

- the user's global average over all rated films in the 50 recent logs;
- against the community average only over films with usable Megabank `average_rating`.

So the two averages are not calculated on exactly the same film set.

### D. Écart recommandé, plus rigoureux

Recommended paired formula:

```text
paired_gap = mean(user_rating - average_rating)
```

Inclusion rule:

- `has_social_stats = true`
- usable `user_rating`
- usable `average_rating`

Result:

```text
paired_count = 27
paired_user_average = 3.4814814815
paired_community_average = 4.0440740741
paired_gap = -0.5625925926
rounded_paired_gap = -0.56
```

The paired community average is identical to `community_average_social` because every film with usable `average_rating` also has a user rating in this subset. The user average changes because it is now calculated on the same 27 films as the community average.

Paired films:

| title | year | user_rating | community_average | user_minus_community |
|---|---:|---:|---:|---:|
| Suspiria | 1977 | 4.5 | 3.93 | 0.57 |
| The Host | 2006 | 3.0 | 3.77 | -0.77 |
| Slumdog Millionaire | 2008 | 4.0 | 3.92 | 0.08 |
| The Menu | 2022 | 3.0 | 3.53 | -0.53 |
| Boogie Nights | 1997 | 4.5 | 4.21 | 0.29 |
| Enemy | 2013 | 3.0 | 3.61 | -0.61 |
| L'Argent | 1983 | 2.5 | 4.00 | -1.50 |
| The French Connection | 1971 | 3.0 | 4.00 | -1.00 |
| Sexy Beast | 2000 | 5.0 | 3.93 | 1.07 |
| PlayTime | 1967 | 3.0 | 4.21 | -1.21 |
| Cinema Paradiso | 1988 | 4.0 | 4.48 | -0.48 |
| Cries and Whispers | 1972 | 2.5 | 4.22 | -1.72 |
| Good Time | 2017 | 3.5 | 4.00 | -0.50 |
| Millennium Actress | 2001 | 3.0 | 4.23 | -1.23 |
| The Skin I Live In | 2011 | 4.0 | 3.82 | 0.18 |
| Rear Window | 1954 | 4.0 | 4.37 | -0.37 |
| Diabolique | 1955 | 4.0 | 4.18 | -0.18 |
| The Godfather Part II | 1974 | 4.5 | 4.59 | -0.09 |
| Videodrome | 1983 | 4.0 | 3.88 | 0.12 |
| Phantom Thread | 2017 | 4.0 | 4.15 | -0.15 |
| Kiki's Delivery Service | 1989 | 3.0 | 4.14 | -1.14 |
| Ready or Not | 2019 | 2.0 | 3.52 | -1.52 |
| Grizzly Man | 2005 | 2.5 | 4.13 | -1.63 |
| Wings of Desire | 1987 | 3.0 | 4.31 | -1.31 |
| Open Your Eyes | 1997 | 3.0 | 3.88 | -0.88 |
| Mind Game | 2004 | 3.0 | 4.18 | -1.18 |
| Eyes Wide Shut | 1999 | 4.5 | 4.00 | 0.50 |

### E. Conclusion

The currently displayed `-0.50` is confirmed as the value produced by the current method:

```text
3.5408163265 - 4.0440740741 = -0.5032577475
```

However, methodologically, it should be replaced by the paired gap for this card, because the paired gap compares the same films on both sides of the equation.

Recommended V1 display value for the `Sévère` card:

```text
paired_gap = -0.5625925926
display_value = -0.56
```

If rounded to one decimal instead of two, this would be `-0.6`. With the current two-decimal display pattern, the clean replacement is `-0.56`.

## Runtime average audit

### Inclusion rule audited

The displayed runtime card is based on confirmed metadata films with a usable positive runtime:

```text
included_if = has_metadata == true AND runtime is numeric AND runtime > 0
```

This means:

- Megabank metadata films with runtime are included;
- confirmed supplemental metadata films with runtime are included;
- `supplemental_review`, `missing`, and films without runtime are excluded;
- runtime `0` is treated as unusable and excluded.

### Counts

```text
total_films = 50
metadata_confirmed_count = 47
runtime_included_count = 46
runtime_excluded_count = 4
included_by_source = megabank: 36, supplemental: 10
```

Excluded films:

| title | slug | source | has_metadata | runtime | user_rating | exclusion reason |
|---|---|---|---:|---:|---:|---|
| Jim Queen | jim-queen | missing | false | — | 4.5 | missing metadata/runtime |
| Bouchra | bouchra | supplemental_review | false | — | — | review-only supplemental, no confirmed runtime |
| TRENTE | trente | supplemental | true | 0 | 1.0 | runtime is 0, treated as unusable |
| In the Lost Lands | lost-land-2025 | supplemental_review | false | — | 3.0 | review-only supplemental, no confirmed runtime |

### Runtime average

```text
runtime_average_minutes = 111.3913043478
runtime_average_rounded_minutes = 111
runtime_average_formatted = 1h51
runtime_median_minutes = 108.5
runtime_median_formatted = 1h49
```

Current display card:

```text
card_id = runtime_profile
title = Durée moyenne
displayed_value = 1h51
displayed_description = Les films que tu as vus durent en moyenne 1h51.
```

The displayed `1h51` is confirmed.

### Film le plus court

```text
shortest_film = Look Back
year = 2024
runtime = 58 min
source = supplemental
has_metadata = true
```

### Film le plus long

```text
longest_film = The Godfather Part II
year = 1974
runtime = 202 min
source = megabank
has_metadata = true
```

### 10 films les plus longs

| rank | title | year | runtime | source | has_metadata |
|---:|---|---:|---:|---|---:|
| 1 | The Godfather Part II | 1974 | 202 | megabank | true |
| 2 | Eyes Wide Shut | 1999 | 159 | megabank | true |
| 3 | Boogie Nights | 1997 | 156 | megabank | true |
| 4 | Cinema Paradiso | 1988 | 155 | megabank | true |
| 5 | Carlito's Way | 1993 | 144 | megabank | true |
| 6 | Society of the Snow | 2023 | 143 | supplemental | true |
| 7 | The Beloved | 2026 | 135 | supplemental | true |
| 8 | Phantom Thread | 2017 | 130 | megabank | true |
| 9 | Wings of Desire | 1987 | 128 | megabank | true |
| 10 | Club Kid | 2026 | 126 | supplemental | true |

### 10 films les plus courts

| rank | title | year | runtime | source | has_metadata |
|---:|---|---:|---:|---|---:|
| 1 | Look Back | 2024 | 58 | supplemental | true |
| 2 | Angel's Egg | 1985 | 71 | supplemental | true |
| 3 | Ghost in the Shell | 1995 | 83 | megabank | true |
| 4 | Persona | 1966 | 83 | megabank | true |
| 5 | L'Argent | 1983 | 85 | megabank | true |
| 6 | Millennium Actress | 2001 | 87 | megabank | true |
| 7 | Videodrome | 1983 | 88 | megabank | true |
| 8 | Sexy Beast | 2000 | 89 | megabank | true |
| 9 | Enemy | 2013 | 91 | megabank | true |
| 10 | Phantom of the Paradise | 1974 | 92 | megabank | true |

### Conclusion runtime

The displayed runtime average around `1h50 / 1h51` is confirmed more precisely as:

```text
111.3913043478 min = 1h51 after rounding to nearest minute
```

Films pulling the average upward include:

- `The Godfather Part II` at 202 min;
- `Eyes Wide Shut` at 159 min;
- `Boogie Nights` at 156 min;
- `Cinema Paradiso` at 155 min;
- `Carlito's Way` at 144 min;
- `Society of the Snow` at 143 min.

Films pulling the average downward include:

- `Look Back` at 58 min;
- `Angel's Egg` at 71 min;
- `Ghost in the Shell` and `Persona` at 83 min;
- `L'Argent` at 85 min;
- `Millennium Actress` at 87 min.

Potential anomaly:

- `TRENTE` has `has_metadata = true` but `runtime = 0`. It is correctly excluded from the runtime average by the positive-runtime rule. This runtime should be treated as suspect or incomplete metadata rather than as a real zero-minute film.

No included runtime looks obviously impossible. The long films are plausible feature runtimes; the shortest included films are plausible short/medium feature runtimes and influence the average normally.
