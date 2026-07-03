# Audit des seuils du radar

Date d'audit : 2026-06-25  
Profil audité : `tanguytare`  
Sources : `scripts/build_profile_metrics.py`, `scripts/build_display_profile.py`, `scripts/validate_display_profile.py`, `data/output/tanguytare_profile_metrics.json`, `data/output/tanguytare_display_profile.json` et `data/config/radar_archetypes_20.json`.

## Règle commune

Les quatre axes produisent désormais directement un entier de **1/5 à 5/5**. Aucun calcul ne renvoie `0/5`.

Le display profile utilise directement `value_5` pour `radar_editorial.axes.<axis>.cran`. Il n’y a plus de champ `raw_cran` ni de correction éditoriale du type `max(1, ...)`. La validation impose aussi `1 <= value_5 <= 5` et vérifie que chaque `cran` est identique au score correspondant.

## Résultat actuel — tanguytare

| Axe technique | Valeur brute | Score | Cran éditorial | Titre éditorial actuel |
| --- | ---: | ---: | ---: | --- |
| `mainstreamness` | popularité moyenne 83.7474 / 100 | 4/5 | 4/5 | Iencli assumé |
| `oldness` | âge moyen 27.08 ans ; année moyenne 1998.92 | 3/5 | 3/5 | Entre deux époques |
| `endurance` / `staminess` | durée moyenne 111.39 min (arrondie à 111) | 3/5 | 3/5 | Consommateur mesuré |
| `reviewness` | 40 reviews sur 50 | 4/5 | 4/5 | Critique intarissable |

## Mainstreamness

### Définition et formule

Les données utilisées sont les `watches` des 36 films avec données sociales Megabank. Chaque film reçoit un score logarithmique de niche :

```text
niche(w) = clamp((log10(1 000 000) - log10(w))
                 / (log10(1 000 000) - log10(1 000)) * 100, 0, 100)
niche_index = mean(niche(w))
mainstream_raw = 100 - niche_index
```

Ce n’est ni la moyenne ni la médiane directe des `watches`, ni un percentile. Pour `tanguytare`, `niche_index = 16.2526`, donc `mainstream_raw = 83.7474`.

### Seuils 1–5

| Popularité moyenne (`mainstream_raw`) | Score |
| --- | ---: |
| 0–25 | 1/5 |
| >25–50 | 2/5 |
| >50–70 | 3/5 |
| >70–90 | 4/5 |
| >90–100 | 5/5 |

Valeur actuelle : `83.7474` → **4/5**.

## Oldness

### Définition et formule

Les données sont les années de sortie des 50 films détectés, avec repli sur l’année extraite du titre RSS. Le score ne dépend ni des décennies ni d’un percentile.

```text
average_age = current_year - mean(years)
```

Pour `tanguytare`, l’année moyenne est `1998.92` et l’âge moyen est `27.08` ans en 2026.

### Seuils 1–5

| Âge moyen | Score |
| --- | ---: |
| 0–10 ans | 1/5 |
| >10–22 ans | 2/5 |
| >22–35 ans | 3/5 |
| >35–50 ans | 4/5 |
| >50 ans | 5/5 |

Valeur actuelle : `27.08` ans → **3/5**.

## Endurance / Staminess

### Définition et formule

`endurance` est l’ID technique ; `staminess` est l’axe éditorial qui le référence comme alias. Le score utilise la moyenne des `runtime` strictement positifs des 47 films à métadonnées confirmées.

```text
runtime_minutes = int(round(runtime_average))
```

Il n’existe pas de `long_gap`, de `short_gap`, de comparaison des notes entre films longs et courts, ni de fallback de ce type. Pour `tanguytare`, `runtime_average = 111.3913`, donc `runtime_minutes = 111`.

### Seuils 1–5

| Durée moyenne arrondie | Score |
| --- | ---: |
| 0–95 min | 1/5 |
| 96–105 min | 2/5 |
| 106–120 min | 3/5 |
| 121–135 min | 4/5 |
| 136 min et plus | 5/5 |

Valeur actuelle : `111` min (environ 1 h 51) → **3/5**.

## Reviewness

### Définition et formule

Le score est un comptage des films ayant `has_review == true` parmi les 50 derniers films RSS. Il n’est pas pondéré par la longueur des critiques.

```text
review_count = count(film.has_review == true)
```

### Seuils 1–5

| Nombre de reviews | Score |
| --- | ---: |
| 0–8 | 1/5 |
| 9–17 | 2/5 |
| 18–29 | 3/5 |
| 30–42 | 4/5 |
| 43–50 | 5/5 |

Valeur actuelle : `40/50` → **4/5**.

## Conclusion

Les distributions sont désormais natives sur 1–5 et le score, le cran éditorial et le texte sélectionné sont alignés. Les intitulés et descriptions des archétypes n’ont pas été réécrits dans cette modification ; seuls les crans qui les sélectionnent ont changé.
