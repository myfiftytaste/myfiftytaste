# Smoke test V1 — mathmon

Date : 2026-07-02  
Profil : `https://letterboxd.com/mathmon/`  
Résultat final : **succès — display profile valide et JSON strict**

## Couverture

| Vérification | Résultat |
| --- | ---: |
| Films détectés | 50/50 |
| Films notés | 41/50 |
| Reviews détectées | 12/50 |
| Metadata confirmée | 44/50 — 88% |
| Social coverage Megabank | 9/50 — 18% |
| Posters RSS Letterboxd trouvés | 49/50 |
| Pays de production distincts | 29 |
| Genres distincts | 16 |

## Radar

| Axe | Score |
| --- | ---: |
| `mainstreamness` | 4/5 |
| `oldness` | 2/5 |
| `endurance` / `staminess` | 2/5 |
| `reviewness` | 2/5 |

## Recommandations

- `safe_pick` — *In the Mood for Love*
- `deep_cut` — *The Young Girls of Rochefort*
- `wild_card` — *Mulholland Drive*

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
- 6 correspondance(s) metadata en revue manuelle : `the-ties-that-bind-us`, `samuel-2024`, `the-blue-caftan`, `guru-2025`, `summer-beats-2025`, `men-lahm-wa-salb`.
- 3 affiche(s) non vérifiée(s) dans l'enrichissement display : *In the Mood for Love*, *The Young Girls of Rochefort*, *Mulholland Drive*.

## Validation

- Validation du display profile : réussie.
- JSON strict : `wrapped`, `profile_metrics`, `recommendations` et `display_profile` valides.
