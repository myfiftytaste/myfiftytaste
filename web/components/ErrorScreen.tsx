// Un écran par error_code (architecture-v1-dynamique.md section 6) : message
// en français dans la DA du site, avec une sortie adaptée au cas. Les 3 codes
// qui tiennent à ce pseudo précis ("réessayer" n'y changerait rien) ne
// proposent que "essayer un autre pseudo" ; les 2 codes transitoires
// (rate_limited, internal_error) proposent aussi "réessayer" en premier.

type ErrorCode = "user_not_found" | "profile_private" | "no_films" | "rate_limited" | "internal_error" | "timeout";

const ERROR_CONTENT: Record<ErrorCode, { title: string; message: string; showRetry: boolean }> = {
  user_not_found: {
    title: "Nice try, kiddo…",
    message: "Ce pseudo n’existe pas sur Letterboxd. Vérifie l’orthographe et réessaie.",
    showRetry: false,
  },
  profile_private: {
    title: "Who the hell are you?",
    message:
      "Ce compte Letterboxd est privé, ou son flux n’est pas accessible. Passe-le en public pour générer ton profil.",
    showRetry: false,
  },
  no_films: {
    title: "You’re new in town?",
    message: "Ce profil Letterboxd n’a aucun film loggé (pour l’instant !) — impossible d’en tirer un profil.",
    showRetry: false,
  },
  rate_limited: {
    title: "Letterboxd’s watching.",
    message:
      "Les serveurs Letterboxd freinent nos requêtes. Ça arrive même aux meilleurs : réessaie dans quelques minutes.",
    showRetry: true,
  },
  internal_error: {
    title: "We’ll be back.",
    message: "On n’arrive pas à générer ce profil. Si ça persiste, dis-le-nous via le feedback.",
    showRetry: true,
  },
  // Code posé côté navigateur par la page profil (plus de 10 min d'attente), pas par le worker.
  // Titre repris de internal_error : à ajuster si tu veux une accroche dédiée.
  timeout: {
    title: "We’ll be back.",
    message: "Le chargement prend plus de temps que prévu. Réessaie dans quelques minutes.",
    showRetry: true,
  },
};

export default function ErrorScreen({ username, errorCode }: { username: string; errorCode?: string }) {
  const content = ERROR_CONTENT[(errorCode as ErrorCode) in ERROR_CONTENT ? (errorCode as ErrorCode) : "internal_error"];

  return (
    <div className="loadingShell">
      <div className="loadingErrorCard">
        <h1>{content.title}</h1>
        <p>{content.message}</p>
        <div className="loadingErrorActions">
          {content.showRetry && (
            <a className="loadingErrorPrimary" href={`/profile/${encodeURIComponent(username)}`}>
              Réessayer
            </a>
          )}
          <a
            className={content.showRetry ? "loadingErrorSecondary" : "loadingErrorPrimary"}
            href="/"
          >
            Essaie un autre pseudo
          </a>
        </div>
      </div>
    </div>
  );
}
