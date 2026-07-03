# Profile Threshold QA

- PASS qa_50_films: count=50, status=normal, warning=no, cards=4
- PASS qa_25_films: count=25, status=partial, warning=yes, cards=4
- PASS qa_5_films: count=5, status=very_limited, warning=yes, cards=4
- PASS qa_0_films: clean error=Aucun film détecté. Le profil ne peut pas être calculé.
- PASS qa_sparse_recommendations: recommendations unavailable cleanly
