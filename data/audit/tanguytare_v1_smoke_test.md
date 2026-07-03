# Smoke test V1 — tanguytare

Date : 2026-07-01  
Profil : `https://letterboxd.com/tanguytare/`  
Résultat final : **succès — display profile valide et JSON strict**

## Couverture

| Vérification | Résultat |
| --- | ---: |
| Films détectés | 50/50 |
| Films notés | 48/50 |
| Reviews détectées | 37/50 |
| Metadata confirmée | 47/50 — 94% |
| Social coverage Megabank | 31/50 — 62% |
| Posters RSS Letterboxd trouvés | 50/50 |
| Pays de production distincts | 15 |
| Genres distincts | 15 |

## Radar

| Axe | Score |
| --- | ---: |
| `mainstreamness` | 4/5 |
| `oldness` | 3/5 |
| `endurance` / `staminess` | 3/5 |
| `reviewness` | 4/5 |

## Recommandations

- `safe_pick` — *Parasite*
- `deep_cut` — *Mind Game*
- `wild_card` — *The Cure*

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
- 3 correspondance(s) metadata en revue manuelle : `the-fire-within-a-requiem-for-katia-and-maurice`, `bouchra`, `lost-land-2025`.
- 1 affiche(s) non vérifiée(s) dans l'enrichissement display : *Mind Game*.

## Validation

- Validation du display profile : réussie.
- JSON strict : `wrapped`, `profile_metrics`, `recommendations` et `display_profile` valides.
