# Smoke test V1 — tobiashottin

Date : 2026-07-02  
Profil : `https://letterboxd.com/tobiashottin/`  
Résultat final : **succès — display profile valide et JSON strict**

## Couverture

| Vérification | Résultat |
| --- | ---: |
| Films détectés | 50/50 |
| Films notés | 50/50 |
| Reviews détectées | 49/50 |
| Metadata confirmée | 45/50 — 90% |
| Social coverage Megabank | 16/50 — 32% |
| Posters RSS Letterboxd trouvés | 50/50 |
| Pays de production distincts | 22 |
| Genres distincts | 18 |

## Radar

| Axe | Score |
| --- | ---: |
| `mainstreamness` | 4/5 |
| `oldness` | 3/5 |
| `endurance` / `staminess` | 3/5 |
| `reviewness` | 5/5 |

## Recommandations

- `safe_pick` — *The Long Goodbye*
- `deep_cut` — *The Young Girls of Rochefort*
- `wild_card` — *Interstellar*

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

- Social stats are based only on films present in the Megabank.
- Some films are waiting for manual metadata validation.
- 5 correspondance(s) metadata en revue manuelle : `a-year-of-school`, `the-banishment`, `bouchra`, `the-christophers`, `fata-morgana`.
- 3 affiche(s) non vérifiée(s) dans l'enrichissement display : *The Long Goodbye*, *The Young Girls of Rochefort*, *Interstellar*.

## Validation

- Validation du display profile : réussie.
- JSON strict : `wrapped`, `profile_metrics`, `recommendations` et `display_profile` valides.
