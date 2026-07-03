# Smoke test V1 — picolifl

Date : 2026-07-02  
Profil : `https://letterboxd.com/picolifl/`  
Résultat final : **succès — display profile valide et JSON strict**

## Couverture

| Vérification | Résultat |
| --- | ---: |
| Films détectés | 49/50 |
| Films notés | 48/49 |
| Reviews détectées | 48/49 |
| Metadata confirmée | 47/49 — 96% |
| Social coverage Megabank | 22/49 — 45% |
| Posters RSS Letterboxd trouvés | 49/49 |
| Pays de production distincts | 18 |
| Genres distincts | 18 |

## Radar

| Axe | Score |
| --- | ---: |
| `mainstreamness` | 5/5 |
| `oldness` | 2/5 |
| `endurance` / `staminess` | 3/5 |
| `reviewness` | 5/5 |

## Recommandations

- `safe_pick` — *The Dark Knight*
- `deep_cut` — *The Young Girls of Rochefort*
- `wild_card` — *Pride*

## Modules

- Hero : présent
- Radar : présent
- Heure de log : présent
- Constellation des genres : présent
- Passeport cinéma : présent
- Recommandations : présent
- Highlights : présent
- Synthèse : présent

Modules manquants : aucun.

## Warnings non bloquants

- Profil calculé sur 49 films détectés. C’est assez pour esquisser une tendance, mais certaines conclusions peuvent encore bouger avec plus de films.
- Social stats are based only on films present in the Megabank.
- 2 affiche(s) non vérifiée(s) dans l'enrichissement display : *The Dark Knight*, *The Young Girls of Rochefort*.

## Validation

- Validation du display profile : réussie.
- JSON strict : `wrapped`, `profile_metrics`, `recommendations` et `display_profile` valides.
