import type { Metadata } from "next";
import LegalPage, { Author, Contact } from "../../components/legal/LegalPage";
import { AMBIANCES_OPEN } from "../../lib/ambiance";

export const metadata: Metadata = { title: "Confidentialité et cookies · Fifty" };

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Confidentialité et cookies"
      lede={
        <>
          <p>
            En bref : Fifty ne te demande ni compte, ni e-mail, ni mot de passe. Pas de publicité, pas de mesure
            d&apos;audience, aucun traceur tiers. Le site lit ce que ton profil Letterboxd montre déjà publiquement,
            le transforme en wrapped, et en garde le strict nécessaire, pour une durée limitée.
          </p>
          <p>Le détail, sans jargon inutile, est ci-dessous.</p>
        </>
      }
    >
      <h2>Qui est responsable</h2>
      <p>
        Le responsable du traitement est l&apos;éditeur du site, <Author /> (voir les{" "}
        <a href="/mentions-legales">mentions légales</a>). Pour toute question ou demande : <Contact />.
      </p>

      <h2>Ce que Fifty traite, pourquoi, et combien de temps</h2>
      <div className="legalTableWrap">
        <table className="legalTable">
          <thead>
            <tr>
              <th scope="col">Données</th>
              <th scope="col">Pourquoi</th>
              <th scope="col">Base légale</th>
              <th scope="col">Conservation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Données">
                Le pseudo Letterboxd saisi et le contenu public de son flux RSS : les 50 derniers films enregistrés,
                leurs dates, notes, « j&apos;aime », revisionnages, et la longueur des critiques (le texte des
                critiques n&apos;est pas conservé).
              </td>
              <td data-label="Pourquoi">Calculer et afficher le profil (le wrapped).</td>
              <td data-label="Base légale">Intérêt légitime : fournir le service demandé, à partir de données rendues publiques.</td>
              <td data-label="Conservation">
                Profil en cache : <strong>6 mois</strong> après son dernier calcul. Un profil consulté plus de 24 h
                après son calcul est recalculé.
              </td>
            </tr>
            <tr>
              <td data-label="Données">
                Historique des calculs : pseudo, indicateurs du profil (moyennes, genres, pays…) et liste des films
                analysés.
              </td>
              <td data-label="Pourquoi">
                Statistiques de la communauté (par exemple « la moyenne sur Fifty »), réglage et amélioration des
                calculs.
              </td>
              <td data-label="Base légale">Intérêt légitime.</td>
              <td data-label="Conservation">
                <strong>24 mois</strong>.
              </td>
            </tr>
            <tr>
              <td data-label="Données">Journal technique des calculs : pseudo, statut, étape, code d&apos;erreur.</td>
              <td data-label="Pourquoi">Faire tourner la file d&apos;attente et diagnostiquer les pannes.</td>
              <td data-label="Base légale">Intérêt légitime.</td>
              <td data-label="Conservation">
                <strong>30 jours</strong>.
              </td>
            </tr>
            <tr>
              <td data-label="Données">
                Hall of Fame : chaque mois, un instantané des indicateurs du profil est figé au premier calcul. Ton
                pseudo n&apos;apparaît dans les classements et les badges <strong>que si tu as choisi « Je veux ma
                place »</strong>.
              </td>
              <td data-label="Pourquoi">Classements mensuels et badges.</td>
              <td data-label="Base légale">
                Consentement pour la publication du pseudo, retirable à tout moment (« Me retirer » dans
                l&apos;onglet Hall of Fame). Intérêt légitime pour l&apos;instantané non publié.
              </td>
              <td data-label="Conservation">Conservé comme archive des saisons, supprimé sur simple demande.</td>
            </tr>
            <tr>
              <td data-label="Données">
                Formulaire « Donner mon avis » : tes réponses, ton pseudo si tu le donnes, le type d&apos;appareil
                (mobile ou ordinateur) et la page d&apos;où tu viens.
              </td>
              <td data-label="Pourquoi">Améliorer le site.</td>
              <td data-label="Base légale">Intérêt légitime.</td>
              <td data-label="Conservation">
                <strong>24 mois</strong>.
              </td>
            </tr>
            <tr>
              <td data-label="Données">
                Protection contre les abus : une empreinte de ton adresse IP (hachage salé et irréversible, jamais
                l&apos;adresse en clair) et un compteur de requêtes.
              </td>
              <td data-label="Pourquoi">Limiter le nombre de profils lancés et de retours envoyés depuis une même connexion.</td>
              <td data-label="Base légale">Intérêt légitime : sécurité du service.</td>
              <td data-label="Conservation">
                <strong>24 heures</strong>.
              </td>
            </tr>
            <tr>
              <td data-label="Données">Journaux techniques de l&apos;hébergeur Vercel (adresse IP, navigateur, page demandée).</td>
              <td data-label="Pourquoi">Sécurité et bon fonctionnement de l&apos;hébergement.</td>
              <td data-label="Base légale">Intérêt légitime.</td>
              <td data-label="Conservation">Durée courte fixée par Vercel.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Fifty ne vend, ne loue et ne cède aucune donnée. Aucune décision produisant des effets juridiques n&apos;est
        prise à partir de ton profil : les archétypes et classements sont un jeu.
      </p>

      <h2>Si c&apos;est ton pseudo qu&apos;on a saisi</h2>
      <p>
        N&apos;importe qui peut saisir un pseudo Letterboxd public, y compris le tien. Si tu ne veux pas que Fifty
        conserve ton profil, écris à <Contact /> depuis une adresse qui permet de vérifier que le compte est le tien
        (ou en me contactant sur Letterboxd) : tes données seront supprimées de toutes les tables, et ton pseudo
        ajouté à une liste d&apos;exclusion pour qu&apos;il ne soit plus jamais calculé, même si quelqu&apos;un le
        saisit à nouveau.
      </p>

      <h2>Cookies et stockage dans ton navigateur</h2>
      <p>
        Fifty n&apos;utilise que des éléments <strong>strictement nécessaires</strong> à des fonctions que tu
        demandes. Ils sont exemptés de consentement (article 82 de la loi Informatique et Libertés, lignes
        directrices de la CNIL) : c&apos;est pour ça qu&apos;il n&apos;y a pas de bandeau cookies.
      </p>
      <div className="legalTableWrap">
        <table className="legalTable">
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Type</th>
              <th scope="col">À quoi il sert</th>
              <th scope="col">Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Nom">
                <code>fifty_pseudo</code>
              </td>
              <td data-label="Type">Cookie</td>
              <td data-label="À quoi il sert">Retenir le pseudo saisi sur l&apos;accueil, pour l&apos;onglet « Mon Wrapped ».</td>
              <td data-label="Durée">1 an</td>
            </tr>
            <tr>
              <td data-label="Nom">
                <code>fifty_owner</code>
              </td>
              <td data-label="Type">Cookie signé, illisible par les scripts de la page</td>
              <td data-label="À quoi il sert">
                Prouver que ce navigateur a lui-même lancé le profil, pour que personne d&apos;autre ne puisse
                t&apos;inscrire au Hall of Fame ou t&apos;en retirer.
              </td>
              <td data-label="Durée">400 jours</td>
            </tr>
            {AMBIANCES_OPEN ? (
              <tr>
                <td data-label="Nom">
                  <code>fifty_ambiance</code>
                </td>
                <td data-label="Type">Cookie</td>
                <td data-label="À quoi il sert">Retenir l&apos;ambiance de couleurs choisie dans Préférences.</td>
                <td data-label="Durée">1 an</td>
              </tr>
            ) : null}
            <tr>
              <td data-label="Nom">
                <code>fifty-tip-closed</code>
              </td>
              <td data-label="Type">Stockage local</td>
              <td data-label="À quoi il sert">Se souvenir que tu as fermé la bulle d&apos;astuce.</td>
              <td data-label="Durée">Jusqu&apos;à ce que tu vides les données du site</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Tu peux supprimer ces éléments à tout moment depuis les réglages de ton navigateur. Le site fonctionne
        toujours, il oublie simplement ton pseudo.
      </p>

      <h2>Contenus chargés depuis d&apos;autres sites</h2>
      <p>
        Les affiches de films sont chargées directement depuis Letterboxd (a.ltrbxd.com) et TMDB (image.tmdb.org).
        Comme pour toute image, ces services reçoivent alors ton adresse IP et les informations techniques de ton
        navigateur. Les polices, elles, sont hébergées par Fifty.
      </p>

      <h2>Où sont les données, et qui y a accès</h2>
      <ul>
        <li>
          <strong>Neon</strong> (base de données) : serveurs à Londres, au Royaume-Uni, pays reconnu par l&apos;Union
          européenne comme offrant une protection adéquate.
        </li>
        <li>
          <strong>Vercel</strong> (site) et <strong>GitHub</strong> (calcul des profils) : États-Unis. Ces transferts
          sont encadrés par les garanties de ces prestataires (cadre de protection des données UE–États-Unis ou
          clauses contractuelles types de la Commission européenne).
        </li>
        <li>
          <strong>Resend</strong> (États-Unis) transmet chaque retour du formulaire par e-mail à l&apos;éditeur, aux
          mêmes conditions de transfert.
        </li>
        <li>
          <strong>TMDB</strong> reçoit des titres et années de films, jamais de pseudo ni de donnée personnelle.
        </li>
      </ul>
      <p>
        Seul l&apos;éditeur a accès à la base de données. Les échanges sont chiffrés (HTTPS) et les clés d&apos;accès
        ne figurent jamais dans le code.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux demander à accéder à tes données, à les corriger, à les supprimer, à en limiter l&apos;usage, à
        t&apos;opposer à leur traitement ou à les récupérer, en écrivant à <Contact />. Réponse sous un mois au plus.
        Si tu estimes que ta demande n&apos;a pas été traitée correctement, tu peux saisir la CNIL (cnil.fr).
      </p>

      <h2>Évolutions</h2>
      <p>
        Cette page sera mise à jour si Fifty change sa façon de traiter les données. Fifty ne rapporte rien
        aujourd&apos;hui ; si un modèle économique apparaît un jour, ces pages seront revues avant.
      </p>
    </LegalPage>
  );
}
