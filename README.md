# MyFiftyTaste

Profil cinéphile généré à partir des ~50 derniers films loggés sur Letterboxd.

Le dépôt est un monorepo :

| Dossier | Contenu |
|---|---|
| `scripts/` | pipeline Python (8 étapes, cf. `PIPELINE_STEPS` dans `build_full_profile.py`) |
| `migrations/` | migrations SQL versionnées |
| `data/` | entrées, caches et sorties du pipeline |
| `web/` | frontend Next.js (voir `web/README.md`) |

## Prérequis

```bash
pip install -r requirements.txt
```

## Variables d'environnement

Elles se déclarent dans un fichier `.env` à la racine du dépôt. **Ce fichier
est ignoré par git et ne doit jamais être committé** — `.env.example` sert de
modèle.

| Variable | Utilisée par | Remarque |
|---|---|---|
| `TMDB_API_KEY` | pipeline (étapes 3 et 4) | jamais exposée au frontend |
| `DATABASE_URL` | migrations, worker, routes API | Postgres |

En production, ces variables se saisissent dans les panneaux « Variables » de
l'hébergeur, jamais dans le code :

- **Railway** (worker) : `DATABASE_URL` (chaîne Neon **directe**) + `TMDB_API_KEY`
- **Vercel** (frontend) : `DATABASE_URL` (chaîne Neon **poolée**) uniquement

La distinction poolée / directe compte : le pooler évite la saturation de
connexions depuis les fonctions serverless, mais supporte mal le DDL et les
transactions longues.

## Migrations de base de données

Le schéma se pilote par fichiers SQL versionnés dans `migrations/`, jamais par
des `CREATE TABLE` tapés dans une console. L'état appliqué est suivi dans une
table `schema_migrations`.

### Lancer les migrations

```bash
python scripts/migrate.py
```

Applique, dans l'ordre, les migrations pas encore passées. Chaque fichier
s'exécute dans sa propre transaction : en cas d'échec, cette migration est
intégralement annulée et les précédentes restent appliquées.

Utilise la chaîne de connexion **directe** (non poolée).

### Voir l'état sans rien appliquer

```bash
python scripts/migrate.py --status
```

Liste chaque migration avec son état (`applique` / `EN ATTENTE`). Utile pour
vérifier ce qui va tourner avant de le lancer.

### Ajouter une migration

Créer un fichier `migrations/00N_description.sql`, en incrémentant le préfixe
numérique — le tri alphabétique fait l'ordre d'exécution.

Deux règles :

- **Pas de `BEGIN` / `COMMIT` dans le fichier.** Le runner ouvre la
  transaction et y inscrit aussi la ligne de suivi ; un `COMMIT` interne
  casserait cette atomicité.
- **Ne jamais modifier une migration déjà appliquée.** Le runner enregistre
  une somme de contrôle et signalera la divergence, mais la base restera dans
  l'état de l'ancienne version. Écrire une nouvelle migration à la place.

### Schéma actuel

`001_initial_schema.sql` crée cinq tables :

| Table | Rôle |
|---|---|
| `job` | file d'attente du worker (pas de Redis : cette table *est* la file) |
| `profile_cache` | sortie du pipeline, source de vérité en production |
| `monthly_snapshot` | gel mensuel du Hall of Fame |
| `badge` | badges mensuels attribués à la clôture d'une saison |
| `feedback` | retours utilisateurs (tags + message + pseudo optionnel) |

Les pseudos sont stockés en minuscules, avec une contrainte `CHECK` qui le
garantit au niveau base : un `lower()` oublié côté applicatif échoue à
l'insertion au lieu de créer silencieusement un doublon `Lucasld` / `lucasld`.
La casse d'origine est conservée à part, dans `display_username`, uniquement
pour l'affichage.

## Pipeline

```bash
python scripts/build_full_profile.py <pseudo>
```

Enchaîne les 8 étapes et écrit dans `data/output/`.
