# MyFiftyTaste : consignes pour Claude

- Pour toute modification de code, applique le skill `ponytail` (niveau full) : le plus petit changement complet, réutiliser l'existant avant d'écrire du neuf.
- Avant un commit ou sur demande de relecture, lance `ponytail-review` sur le diff.
- Réponds en français.
- Ne committe jamais `.env` ; les clés (TMDB_API_KEY, DATABASE_URL) restent dans `.env` ou dans les variables Railway / Vercel.
