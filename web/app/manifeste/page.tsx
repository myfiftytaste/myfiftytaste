import type { Metadata } from "next";
import BrandLockup from "../../components/BrandLockup";
import {
  CransDemo,
  EstimationDemo,
  GaugeDemo,
  MedianDemo,
  RecoDemo,
  RuntimeDemo,
  SeasonDemo,
} from "../../components/manifeste/ManifesteWidgets";
import { getRuntimeStats } from "../../lib/fiftyStats";

// Aperçu du Manifeste (10/11/2026), partie Méthode : premier jet de texte à réécrire par Tanguy,
// chaque règle accompagnée d'un schéma qui la rejoue. Pas encore lié depuis Divers.
export const metadata: Metadata = { title: "Le Manifeste · Fifty", robots: { index: false } };
export const revalidate = 3600;

const SECTIONS = [
  ["note", "Ta note face à Letterboxd"],
  ["duree", "La durée"],
  ["median", "Le film médian"],
  ["estimation", "Estimer les vues d'un film récent"],
  ["crans", "Les crans du Triangle"],
  ["modules", "Constellation, Passeport, Fixettes"],
  ["recos", "Les recos"],
  ["hall", "Hall of Fame et badges"],
  ["jeu", "FiftyGuess"],
] as const;

export default async function ManifestePage() {
  const stats = await getRuntimeStats();
  const scale = stats ? { average: stats.average, low: stats.low, high: stats.high } : { average: 114, low: 95, high: 125 };

  return (
    <main className="pageShell mfShell">
      <header className="siteHeader">
        <BrandLockup />
      </header>

      <header className="mfHero">
        <p className="mfEyebrow">Aperçu · partie Méthode</p>
        <h1>Le Manifeste</h1>
        <p className="mfLede">
          Tout ce que Fifty calcule part de tes 50 derniers films loggés sur Letterboxd, lus dans ton flux RSS public.
          Pour chaque film, Fifty cherche ses vues et sa moyenne Letterboxd dans une base d&apos;environ 10&nbsp;000 films
          (la Megabank), puis sa fiche TMDB : genres, pays, durée, équipe, nombre de votes. Aucune IA n&apos;intervient
          quand ton profil est calculé : ce sont des règles fixes, les mêmes pour tout le monde. Les voici, une par une.
        </p>
        <nav className="mfToc" aria-label="Sommaire">
          {SECTIONS.map(([id, title], index) => (
            <a key={id} href={`#${id}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {title}
            </a>
          ))}
        </nav>
      </header>

      <section id="note" className="mfSection">
        <div className="mfText">
          <h2>Ta note face à Letterboxd</h2>
          <p>
            L&apos;étoile du haut, c&apos;est la moyenne de toutes les notes que tu as mises sur tes 50 derniers films.
          </p>
          <p>
            La jauge Sévère / Indulgent, elle, compare film par film. Pour chaque film que tu as noté et dont Fifty connaît
            la moyenne Letterboxd, on calcule l&apos;écart entre ta note et celle de la communauté, puis la moyenne de ces
            écarts. Moins de 0,1 étoile d&apos;écart : tu es <b>Juste</b>. En dessous : <b>Sévère</b>. Au-dessus :{" "}
            <b>Indulgent</b>.
          </p>
          <p>
            Les deux billes sont donc deux moyennes sur exactement les mêmes films : la dorée pour toi, l&apos;autre pour
            Letterboxd. C&apos;est pour ça que la bille dorée peut différer un peu de l&apos;étoile du haut.
          </p>
          <p>
            On ne compare que ce qui est comparable. La phrase sous la jauge dit sur combien de tes films la comparaison
            porte. J&apos;ai testé une formule pour deviner la moyenne Letterboxd des autres films à partir de TMDB : sur les
            films récents, elle se trompait d&apos;un tiers d&apos;étoile en moyenne. Pour un verdict à 0,1 près, c&apos;était
            trop. Recalée.
          </p>
        </div>
        <GaugeDemo />
      </section>

      <section id="duree" className="mfSection">
        <div className="mfText">
          <h2>La durée</h2>
          <p>Ta durée moyenne, c&apos;est la moyenne des durées de tes films, d&apos;après TMDB.</p>
          <p>
            La pellicule te situe parmi les profils Fifty. Elle va du profil aux films les plus courts au profil aux
            films les plus longs, en écartant les 5&nbsp;% les plus extrêmes de chaque côté. Le trait pointillé marque la
            moyenne de tous les profils Fifty. Les deux bornes et la moyenne sont recalculées chaque heure, à partir de la
            dernière génération de chaque profil : elles bougent un peu à mesure que la communauté grandit.
          </p>
        </div>
        <RuntimeDemo scale={scale} />
      </section>

      <section id="median" className="mfSection">
        <div className="mfText">
          <h2>Le film médian</h2>
          <p>
            L&apos;axe Mainstream du Triangle mesure à quel point tes films sont vus. On range tes films du moins vu au plus
            vu, d&apos;après le nombre de membres Letterboxd qui les ont vus, et on prend celui du milieu : ton{" "}
            <b>film médian</b>.
          </p>
          <p>
            Pourquoi le médian et pas la moyenne&nbsp;? Parce qu&apos;un seul blockbuster à plusieurs millions de vues
            ferait exploser une moyenne, alors qu&apos;il ne déplace le film du milieu que d&apos;une place. Un film isolé,
            très vu ou très rare, ne déforme plus ton profil.
          </p>
          <p>
            Avant novembre 2026, Fifty ne comptait que les films présents dans la Megabank, une quinzaine sur 50 en
            moyenne, et tout film au-delà d&apos;un million de vues comptait comme « 100&nbsp;% grand public ». Presque
            tout le monde finissait en haut de l&apos;échelle. Désormais, chacun de tes films compte.
          </p>
        </div>
        <MedianDemo />
      </section>

      <section id="estimation" className="mfSection">
        <div className="mfText">
          <h2>Estimer les vues d&apos;un film récent</h2>
          <p>
            Quand un film n&apos;est pas dans la Megabank (c&apos;est souvent une sortie récente), Fifty estime ses vues
            Letterboxd. Il regarde son rang parmi les films sortis la même année, classés par nombre de votes TMDB, puis
            convertit ce rang en vues grâce à une correspondance réglée époque par époque, sur 333 films connus des deux
            côtés.
          </p>
          <p>
            Comparer un film à ceux de son année évite deux pièges : pénaliser une sortie qui n&apos;a pas encore eu le
            temps d&apos;accumuler des votes, et avantager un classique parce que son année comptait moins de films.
          </p>
          <p>
            Une estimation reste une estimation : pour un film donné, l&apos;écart habituel avec la réalité est d&apos;un
            facteur 1,5 à 1,8. Mais sur cinquante films, les écarts se compensent, et seul le film médian compte au bout.
          </p>
        </div>
        <EstimationDemo />
      </section>

      <section id="crans" className="mfSection">
        <div className="mfText">
          <h2>Les crans du Triangle</h2>
          <p>
            Chaque axe du Triangle te place sur un cran de 1 à 5. Pour Mainstream et Époque, le cran est{" "}
            <b>relatif aux profils Fifty</b> : 10&nbsp;% des profils au cran 1, 20&nbsp;% au 2, 40&nbsp;% au 3, 20&nbsp;% au
            4, 10&nbsp;% au 5. La plupart des gens sont au milieu ; seuls les profils les plus marqués atteignent les bords.
          </p>
          <p>
            Les seuils ont été calculés sur 26 profils d&apos;au moins 20 films, puis figés le 1<sup>er</sup> novembre 2026,
            pour que ton profil reste comparable d&apos;un mois à l&apos;autre. L&apos;axe Époque utilise l&apos;âge moyen de
            tes films (combien d&apos;années se sont écoulées depuis leur sortie), pour que les seuils ne vieillissent pas.
          </p>
          <p>
            Pour les reviews, les crans sont fixes : c&apos;est un simple compte sur tes 50 films. La phrase « plus … que X
            % des profils Fifty » se calcule sur les mêmes profils de référence, figés eux aussi.
          </p>
          <p>
            Ces seuils seront revérifiés fin décembre, quand la communauté aura grandi. S&apos;ils changent, ce sera une
            seule fois, et annoncé.
          </p>
        </div>
        <CransDemo />
      </section>

      <section id="modules" className="mfSection mfSectionText">
        <div className="mfText">
          <h2>Constellation, Passeport, Fixettes</h2>
          <p>
            <b>La Constellation</b> compte les genres de tes films. Un film qui est à la fois un drame et un thriller
            compte pour les deux ; les pourcentages se lisent sur l&apos;ensemble des genres cités. Les 12 genres les plus
            présents deviennent des bulles.
          </p>
          <p>
            <b>Le Passeport</b> suit la même logique avec les pays de production : une coproduction franco-belge
            tamponne la France et la Belgique.
          </p>
          <p>
            <b>Les Fixettes</b> cherchent le cinéaste et l&apos;interprète qui reviennent au moins deux fois dans tes 50
            films. Pour les interprètes, seuls comptent les quatre premiers rôles de chaque film sur TMDB, pour ne pas
            retenir un figurant. <b>Les facts</b> donnent la part de tes films réalisés par au moins une femme ou une
            personne non binaire, d&apos;après le genre renseigné sur TMDB, et seulement sur les films dont l&apos;équipe
            est connue. Les autres apparaissent en pointillés.
          </p>
        </div>
      </section>

      <section id="recos" className="mfSection">
        <div className="mfText">
          <h2>Les recos</h2>
          <p>
            Trois cartes, trois intentions, calculées sans IA à partir de tes 50 films.{" "}
            <b>La Pépite</b> est un film proche de tes thèmes, peu vu et sorti il y a au moins trois ans. <b>Le Pari</b>{" "}
            part d&apos;un genre que tu ne regardes presque jamais, mais qui accompagne souvent un genre que tu aimes,
            d&apos;après les associations réelles entre genres dans les 10&nbsp;000 films de la Megabank : un drame de guerre
            pour qui aime les drames, par exemple. <b>Le Détour</b> choisit d&apos;abord un pays absent de tes films, de
            préférence un pays qu&apos;ont aimé les profils Fifty aux goûts proches des tiens, puis ses films les plus vus
            dans tes genres. Seul le pays principal du film compte.
          </p>
          <p>
            La qualité se juge sur la moyenne Letterboxd quand on la connaît. Sinon, sur la note TMDB, ramenée vers la
            moyenne générale quand un film a peu de votes : un 9 sur 40 votes ne passe plus pour un chef-d&apos;œuvre.
          </p>
          <p>
            Chaque carte est tirée parmi les meilleurs candidats, avec un tirage qui change chaque mois, et jamais un film
            qu&apos;on t&apos;a déjà proposé lors de tes trois dernières générations.
          </p>
        </div>
        <RecoDemo />
      </section>

      <section id="hall" className="mfSection">
        <div className="mfText">
          <h2>Hall of Fame et badges</h2>
          <p>
            Le Hall of Fame est une saison d&apos;un mois. Ton premier passage du mois fige un instantané de ton profil :
            c&apos;est lui qui compte pour les classements, même si tes films changent ensuite.
          </p>
          <p>
            Y figurer est un choix : personne ne peut t&apos;y inscrire à ta place, seul le navigateur depuis lequel tu as
            généré ton wrapped peut le faire, et tu peux te retirer à tout moment.
          </p>
          <p>
            Les badges tombent le 1<sup>er</sup> du mois suivant, à deux conditions : au moins 3 inscrits dans la saison,
            et au moins 3 films d&apos;un continent pour un top continent. On peut gagner plusieurs badges le même mois.
          </p>
        </div>
        <SeasonDemo />
      </section>

      <section id="jeu" className="mfSection mfSectionText">
        <div className="mfText">
          <h2>FiftyGuess</h2>
          <p>
            Une affiche chaque lundi. Un cercle s&apos;ouvre au hasard dessus et grandit : au bout de 50 secondes,
            l&apos;affiche est entière. En mode compétitif, chaque erreur coûte du temps (1 seconde, puis 3, puis 5 à chaque
            nouvelle erreur), et la partie s&apos;arrête à 2 minutes. Le classement est celui de la semaine, et seulement de
            la semaine. Les films sont choisis parmi les plus vus de Letterboxd, et chaque affiche est vérifiée à la main
            avant d&apos;être programmée.
          </p>
        </div>
      </section>
    </main>
  );
}
