import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalPage, { Author, Contact } from "../../components/legal/LegalPage";

export const metadata: Metadata = { title: "Mentions légales · Fifty" };

// Logo TMDB obligatoire (developer.themoviedb.org/docs/faq) : fichier officiel à déposer dans
// public/branding/tmdb-logo.svg. Vérifié au build ; tant qu'il manque, seule la mention texte s'affiche.
const hasTmdbLogo = fs.existsSync(path.join(process.cwd(), "public", "branding", "tmdb-logo.svg"));

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      lede={
        <p>
          Fifty est un projet personnel, sans but lucratif, que je fabrique sur mon temps libre. Voici qui fait quoi,
          où ça tourne et d&apos;où viennent les données.
        </p>
      }
    >
      <h2>Éditeur</h2>
      <p>
        Le site 50films.fr (« Fifty ») est édité à titre non professionnel par une personne physique, sous le pseudonyme{" "}
        <Author />, qui en est aussi le directeur de la publication.
      </p>
      <p>
        Conformément à l&apos;article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
        l&apos;économie numérique (LCEN), l&apos;éditeur a choisi de ne pas rendre public son nom : ses coordonnées
        ont été communiquées à l&apos;hébergeur.
      </p>
      <p>
        Contact : <Contact />
      </p>

      <h2>Hébergement</h2>
      <ul>
        <li>
          <strong>Site</strong> : Vercel Inc., 440 North Barranca Avenue, Suite 4133, Covina, CA 91723, États-Unis ·
          +1 951 383 6898 · vercel.com
        </li>
        <li>
          <strong>Base de données</strong> : Neon, serveurs Amazon Web Services situés à Londres
          (Royaume-Uni, région eu-west-2) · neon.tech
        </li>
        <li>
          <strong>Calcul des profils</strong> : GitHub Actions, GitHub Inc., 88 Colin P. Kelly Jr. Street, San
          Francisco, CA 94107, États-Unis · github.com
        </li>
        <li>
          <strong>Nom de domaine</strong> : OVH SAS, 2 rue Kellermann, 59100 Roubaix, France · ovhcloud.com
        </li>
      </ul>

      <h2>D&apos;où viennent les données</h2>
      <ul>
        <li>
          <strong>Letterboxd</strong> : Fifty lit le flux RSS public du pseudo que tu saisis (les 50 derniers films
          enregistrés). Fifty est un projet indépendant, <strong>non affilié à Letterboxd</strong>, ni approuvé ou
          soutenu par Letterboxd. « Letterboxd » est une marque de Letterboxd Limited.
        </li>
        <li>
          <strong>TMDB</strong> : les informations sur les films (genres, pays, réalisateurs, durées) et les
          recommandations viennent de l&apos;API de The Movie Database.
          <span className="legalTmdb">
            {hasTmdbLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/branding/tmdb-logo.svg" alt="The Movie Database (TMDB)" width={120} height={16} />
            ) : null}
            <span lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
          </span>
        </li>
        <li>
          <strong>Moyennes Letterboxd et popularité des films</strong> : une base d&apos;environ 10 000 films (la
          « Megabank »), complétée par des relevés faits à la main.
        </li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, le logo « 50 · Fifty » et l&apos;interface sont l&apos;œuvre de l&apos;éditeur. Les affiches,
        titres et images de films, ainsi que les images des fonds d&apos;écran, appartiennent à leurs ayants droit
        respectifs et ne sont affichés qu&apos;à titre d&apos;illustration. Tout ayant droit qui souhaite le retrait
        d&apos;un contenu peut écrire à <Contact /> : il sera retiré rapidement. Les polices Besley, Schibsted Grotesk
        et Caveat sont distribuées sous licence SIL Open Font License 1.1.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Les profils, classements et recommandations sont calculés automatiquement, à partir de données publiques et
        de bases de films incomplètes. Ils sont donnés à titre ludique et indicatif, sans garantie d&apos;exactitude.
        Fifty n&apos;utilise aucune intelligence artificielle pour calculer un profil.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Tout est détaillé dans la page <a href="/confidentialite">Confidentialité et cookies</a>.
      </p>
    </LegalPage>
  );
}
