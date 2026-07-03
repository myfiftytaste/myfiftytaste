# Smoke test V1 — Lucasld

Date : 2026-07-02  
Profil : `https://letterboxd.com/Lucasld/`  
Résultat final : **succès — display profile valide et JSON strict**

## Couverture

| Vérification | Résultat |
| --- | ---: |
| Films détectés | 50/50 |
| Films notés | 48/50 |
| Reviews détectées | 2/50 |
| Metadata confirmée | 50/50 — 100% |
| Social coverage Megabank | 28/50 — 56% |
| Posters RSS Letterboxd trouvés | 50/50 |
| Pays de production distincts | 12 |
| Genres distincts | 15 |

## Radar

| Axe | Score |
| --- | ---: |
| `mainstreamness` | 5/5 |
| `oldness` | 2/5 |
| `endurance` / `staminess` | 3/5 |
| `reviewness` | 1/5 |

## Recommandations

- `safe_pick` — *Parasite*
- `deep_cut` — *Phantom of the Paradise*
- `wild_card` — *Heat*

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
- 1 affiche(s) non vérifiée(s) dans l'enrichissement display : *Phantom of the Paradise*.

## Validation

- Validation du display profile : réussie.
- JSON strict : `wrapped`, `profile_metrics`, `recommendations` et `display_profile` valides.
