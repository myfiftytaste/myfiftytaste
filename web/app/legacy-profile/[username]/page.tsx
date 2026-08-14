import Image from "next/image";
import { notFound } from "next/navigation";
import ProfileView from "../../../components/ProfileView";
import { getBadgesForUser } from "../../../lib/badges";
import { getProfile } from "../../../lib/profiles";

// Ancien rendu statique (fichiers pré-générés de web/public/profiles/),
// conservé UNIQUEMENT le temps de comparer visuellement avec le nouveau
// parcours dynamique. Accessible en développement seulement — 404 en
// production, et jamais lié depuis l'UI (pas de generateStaticParams non
// plus : cette route ne doit rien produire au build de prod).
export default async function LegacyProfilePage({ params }: { params: { username: string } }) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const profile = getProfile(decodeURIComponent(params.username));

  if (profile) {
    const badges = await getBadgesForUser(profile.hero.username);
    return <ProfileView profile={profile} badges={badges} />;
  }

  return (
    <main className="profileUnavailableShell">
      <section className="profileUnavailable">
        <Image
          src="/branding/logoV1-transparent.png"
          alt="Fifty"
          width={1013}
          height={708}
          priority
          className="profileUnavailableLogo"
        />
        <h1>Ce profil pré-généré n’existe pas.</h1>
        <p>Route de comparaison (dev uniquement) — seuls les pseudos pré-générés V1 y répondent.</p>
        <a href="/">Retour à l’accueil</a>
      </section>
    </main>
  );
}
