# Smoke test V1 — mathouix

Date : 2026-07-01  
Profil : `https://letterboxd.com/mathouix/`  
Résultat final : **succès — display profile valide et JSON strict**

## Couverture

| Vérification | Résultat |
| --- | ---: |
| Films détectés | 50/50 |
| Films notés | 48/50 |
| Reviews détectées | 29/50 |
| Metadata confirmée | 46/50 — 92% |
| Social coverage Megabank | 26/50 — 52% |
| Posters RSS Letterboxd trouvés | 50/50 |
| Pays de production distincts | 16 |
| Genres distincts | 15 |

## Radar

| Axe | Score |
| --- | ---: |
| `mainstreamness` | 5/5 |
| `oldness` | 2/5 |
| `endurance` / `staminess` | 4/5 |
| `reviewness` | 3/5 |

## Recommandations

- `safe_pick` — *Whiplash*
- `deep_cut` — *Wings of Desire*
- `wild_card` — *Waves*

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
- 4 correspondance(s) metadata en revue manuelle : `ride-away-2024`, `wake-up-dead-man`, `adolescence-2025`, `riverboom`.
- 1 affiche(s) non vérifiée(s) dans l'enrichissement display : *Wings of Desire*.

## Validation

- Validation du display profile : réussie.
- JSON strict : `wrapped`, `profile_metrics`, `recommendations` et `display_profile` valides.
