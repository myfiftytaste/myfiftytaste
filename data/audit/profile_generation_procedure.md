# Générer un profil MyFiftyTaste complet

Cette procédure part d'un username Letterboxd public et doit être lancée depuis la racine du projet `letterboxd-wrapped`.

## Prérequis

- Installer les dépendances avec `pip install -r requirements.txt`.
- Définir `TMDB_API_KEY` dans `.env`.
- Le profil Letterboxd doit exposer un flux RSS public.

## Commande unique

```powershell
python scripts/build_full_profile.py {username}
```

Pour générer aussi le rapport `data/audit/{username}_v1_smoke_test.md` :

```powershell
python scripts/build_full_profile.py {username} --smoke-test
```

## Étapes exécutées

Le script exécute cette séquence et s'arrête immédiatement si une étape échoue :

```powershell
python scripts/build_user_wrapped.py {username}
python scripts/build_missing_metadata_queue.py {username}
python scripts/enrich_missing_with_tmdb.py {username} --force

# L'enrichissement écrit dans supplemental_metadata.json. Cette seconde passe
# est nécessaire pour propager les nouveaux matches TMDB dans le wrapped.
python scripts/build_user_wrapped.py {username}

python scripts/build_profile_metrics.py {username}
python scripts/build_recommendations.py {username}
python scripts/build_display_profile.py {username}
python scripts/validate_display_profile.py {username}
```

## Résultats attendus

Les sorties sont écrites dans `data/output/` :

- `{username}_wrapped.json` et son rapport ;
- `{username}_missing_metadata_queue.csv` et son rapport ;
- `{username}_tmdb_enrichment_report.md` ;
- `{username}_profile_metrics.json` et son rapport ;
- `{username}_recommendations.json` et son rapport ;
- `{username}_display_profile.json` et son rapport.

La commande de validation doit finir par :

```text
Display profile is valid for {username}.
```

## Interprétation des cas ambigus

`supplemental_review` n'est pas un échec du pipeline : le candidat TMDB est conservé pour contrôle manuel, mais il n'entre pas dans la couverture metadata confirmée. Ne pas confirmer automatiquement ces lignes sans vérifier le titre, l'année et le slug Letterboxd.
