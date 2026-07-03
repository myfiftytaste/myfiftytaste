# Smoke test V1 — crazykungfu

Date : 2026-07-02  
Profil : `https://letterboxd.com/crazykungfu/`  
Résultat final : **succès — display profile valide et JSON strict**

## Couverture

| Vérification | Résultat |
| --- | ---: |
| Films détectés | 50/50 |
| Films notés | 50/50 |
| Reviews détectées | 49/50 |
| Metadata confirmée | 47/50 — 94% |
| Social coverage Megabank | 18/50 — 36% |
| Posters RSS Letterboxd trouvés | 50/50 |
| Pays de production distincts | 24 |
| Genres distincts | 18 |

## Radar

| Axe | Score |
| --- | ---: |
| `mainstreamness` | 4/5 |
| `oldness` | 2/5 |
| `endurance` / `staminess` | 3/5 |
| `reviewness` | 5/5 |

## Recommandations

- `safe_pick` — *Dog Day Afternoon*
- `deep_cut` — *Mind Game*
- `wild_card` — *Nowhere*

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
- 3 correspondance(s) metadata en revue manuelle : `lord-of-the-flies-2026`, `dead-mans-wire`, `empire-of-silence`.
- 3 affiche(s) non vérifiée(s) dans l'enrichissement display : *Dog Day Afternoon*, *Mind Game*, *Nowhere*.

## Validation

- Validation du display profile : réussie.
- JSON strict : `wrapped`, `profile_metrics`, `recommendations` et `display_profile` valides.
