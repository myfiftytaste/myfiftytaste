import Image from "next/image";
import ProfileView from "../../../components/ProfileView";
import { getAvailableUsernames, getProfile } from "../../../lib/profiles";

export function generateStaticParams() {
  return getAvailableUsernames().map((username) => ({ username }));
}

export default function ProfilePage({ params }: { params: { username: string } }) {
  const profile = getProfile(decodeURIComponent(params.username));

  if (profile) {
    return <ProfileView profile={profile} />;
  }

  return (
    <main className="profileUnavailableShell">
      <section className="profileUnavailable">
        <Image
          src="/branding/logoV1-transparent.png"
          alt="MyFiftyTaste"
          width={1013}
          height={708}
          priority
          className="profileUnavailableLogo"
        />
        <h1>Ce profil n’est pas encore disponible dans la V1.</h1>
        <p>Pour cette première version, seuls quelques profils ont été pré-générés.</p>
        <a href="/">Essayer un autre pseudo</a>
      </section>
    </main>
  );
}
