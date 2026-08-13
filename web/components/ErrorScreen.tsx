// Écran générique pour un job en `error`. Volontairement unique et simple :
// les 5 error_code distincts (user_not_found, profile_private, no_films,
// rate_limited, internal_error) avec un écran dédié chacun sont prévus
// phase 6 (architecture-v1-dynamique.md section 6) — pas anticipés ici.
export default function ErrorScreen() {
  return (
    <div className="loadingShell">
      <div className="loadingErrorCard">
        <h1>Quelque chose s’est mal passé</h1>
        <p>
          On n’a pas réussi à générer ce profil. Vérifie l’orthographe du pseudo ou réessaie dans quelques
          instants.
        </p>
        <a href="/">Essayer un autre pseudo</a>
      </div>
    </div>
  );
}
