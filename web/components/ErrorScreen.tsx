// Un écran par error_code (architecture-v1-dynamique.md section 6) : message
// en français dans la DA du site, avec une sortie adaptée au cas. Les 3 codes
// qui tiennent à ce pseudo précis ("réessayer" n'y changerait rien) ne
// proposent que "essayer un autre pseudo" ; les 2 codes transitoires
// (rate_limited, internal_error) proposent aussi "réessayer" en premier.

type ErrorCode = "user_not_found" | "profile_private" | "no_films" | "rate_limited" | "internal_error";

const ERROR_CONTENT: Record<ErrorCode, { title: string; message: string; showRetry: boolean }> = {
  user_not_found: {
    title: "Pseudo introuvable",
    message: "Ce pseudo n’existe pas sur Letterboxd. Vérifie l’orthographe et réessaie.",
    showRetry: false,
  },
  profile_private: {
    title: "Ce profil n’est pas public",
    message:
      "Ce compte Letterboxd est privé, ou son flux n’est pas accessible. Passe-le en public pour générer ton profil.",
    showRetry: false,
  },
  no_films: {
    title: "Rien à raconter pour l’instant",
    message: "Ce profil Letterboxd n’a aucun film loggé pour le moment — impossible d’en tirer un profil.",
    showRetry: false,
  },
  rate_limited: {
    title: "Letterboxd nous ralentit",
    message: "Trop de requêtes en ce moment. Ça arrive, rien de cassé — réessaie dans quelques minutes.",
    showRetry: true,
  },
  internal_error: {
    title: "Quelque chose s’est mal passé",
    message: "On n’a pas réussi à générer ce profil. Réessaie, et si ça persiste, dis-le-nous via le feedback.",
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
            Essayer un autre pseudo
          </a>
        </div>
      </div>
    </div>
  );
}
