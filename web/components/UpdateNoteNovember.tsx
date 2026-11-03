import {
  Circled,
  DoodleFixettes,
  DoodleGuess,
  DoodlePendulum,
  DoodlePodium,
  DoodleSoon,
  DoodleTabBar,
  DoodleThanks,
} from "./UpdateNoteDoodles";

// Note de la V3 (novembre 2026), texte de Tanguy du 03/11/2026. Le détail du calibrage du
// Triangle est renvoyé au Manifeste à venir.
export default function UpdateNoteNovember() {
  return (
    <>
      <p>Hey. Nous y revoilà&nbsp;!</p>
      <p>
        En août, je vous promettais que l&apos;identité du site allait «&nbsp;bouger les prochains jours&nbsp;»…
        Deux mois plus tard, voici la V3, mise en ligne ce lundi 2 novembre après trois journées de maintenance
        (toutes mes excuses si vous aviez cherché à vous connecter à ce moment).
      </p>
      <DoodlePendulum />
      <p>
        Première nouvelle, Fifty a enfin sa maison&nbsp;: <Circled>www.50films.fr</Circled>. L&apos;occasion aussi de
        revisiter le logo pour un «&nbsp;50&nbsp;» plus minimaliste, et l&apos;écran de chargement, dont les couleurs ne
        vous sont sans doute pas étrangères.
      </p>
      <p>
        J&apos;ai aussi voulu éviter de scroller pendant 2 minutes pour tout parcourir&nbsp;: une barre d&apos;onglets en
        bas réunit les différentes fonctions du site (Mon Wrapped, Ma liste, Hall of Fame, FiftyGuess, Divers).
      </p>
      <DoodleTabBar />

      <p>Le wrapped a lui-même changé&nbsp;:</p>
      <ul>
        <li>
          Les modules incluent davantage de moyennes et de repères par rapport à la communauté pour mieux se situer.
        </li>
        <li>
          La jauge Sévère / Indulgent a désormais deux billes&nbsp;: la dorée, ta moyenne, et l&apos;autre, celle de
          Letterboxd.
        </li>
        <li>
          Le Triangle a entièrement été recalibré (j&apos;espère que certaines personnes dont on taira le nom seront
          heureuses de voir qu&apos;elles sont moins mainstream que le mois précédent). Plus sérieusement, oldness et
          mainstreamness étaient des mesures de fait assez exigeantes. Tous les détails sur le calibrage de ces calculs
          seront donnés de façon transparente dans le Manifeste à venir, qui sera publié dans «&nbsp;Divers&nbsp;».
        </li>
        <DoodleFixettes />
        <li>
          Les modules ont aussi fait peau neuve, tant dans leur nom que dans leur design&nbsp;! La Constellation, Le
          Passeport, Les Recos, Le Carrousel accueillent d&apos;ailleurs de nouvelles venues&nbsp;: Les Fixettes, avec la
          ou le cinéaste et l&apos;interprète qui sont revenu·e·s parmi vos 50 derniers films, et la tant demandée part de
          tes films réalisés par au moins une femme ou une personne non binaire.
        </li>
      </ul>

      <p>
        J&apos;ai également travaillé à un onglet à part entière&nbsp;: Ma liste. Celle-ci a deux modes d&apos;affichage,
        par affiche ou par barre horizontale. Vous pouvez vous amuser à trier vos 50 derniers films par date de
        visionnage ou de réalisation, par note personnelle, par durée, par popularité ou par ordre alphabétique, et ce
        de façon croissante ou décroissante. Bientôt, vous pourrez aussi effectuer une recherche dans ces 50 films, ou
        les filtrer par genre, par décennie de réalisation et plus encore.
      </p>

      <DoodlePodium />
      <p>
        Concernant le Hall of Fame, je vous invite vivement à aller voir la saison d&apos;octobre&nbsp;: peut-être
        êtes-vous la ou le Top Niche (ou peut-être le Top Europe…). Vous pouvez d&apos;ailleurs, depuis le menu Divers,
        choisir quels badges votre profil affichera. Enfin, il est possible de consulter les saisons des mois
        précédents.
      </p>
      <p>
        Je réfléchis aussi actuellement à la sécurité et à l&apos;intimité des données au sein de Fifty&nbsp;: désormais,
        personne ne peut t&apos;inscrire à ta place dans le Hall of Fame. Seul le navigateur depuis lequel tu as généré
        ton wrapped peut t&apos;y inscrire, choisir tes badges ou jouer à FiftyGuess en ton nom.
      </p>

      <DoodleGuess />
      <p>
        Mais alors quel est ce mystérieux 4<sup>e</sup> onglet&nbsp;? FiftyGuess, c&apos;est un jeu hebdomadaire&nbsp;: une
        affiche chaque lundi, un cercle d&apos;abord minuscule, qui grandit pour progressivement révéler l&apos;affiche.
        Deux modes&nbsp;: chrono (compétitif) ou zen (non compétitif). Les règles vous y sont détaillées. Peut-être
        y a-t-il même une surprise pour les personnes qui auront joué chaque semaine, qui sait&nbsp;?
      </p>

      <p>
        Le bug du scroll est corrigé&nbsp;; si d&apos;autres devaient apparaître, n&apos;hésitez pas à me le signaler
        (onglet Divers, «&nbsp;Donner mon avis&nbsp;»). Ce même menu recense désormais les mentions légales et la
        politique de confidentialité (sans traceur tiers).
      </p>
      <DoodleSoon />
      <p>
        J&apos;ai hâte de ce qui est à venir&nbsp;! Merci de m&apos;avoir donné votre avis, beaucoup des choses changées
        le sont grâce à vous. Les Préférences arrivent, et avec elles la possibilité de choisir votre ambiance, votre
        fond de film.
      </p>

      <DoodleThanks />
      <p className="updateNoteSign">— Tanguytare</p>
    </>
  );
}
