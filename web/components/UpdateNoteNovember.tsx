import {
  Circled,
  DoodleCrans,
  DoodleGauge,
  DoodleGuess,
  DoodleLaurel,
  DoodleMiddleFilm,
  DoodlePendulum,
  DoodleTabBar,
  Underlined,
} from "./UpdateNoteDoodles";

// Note de la V3 (novembre 2026). Les changements de méthode de calcul y sont expliqués
// exactement (consigne de Tanguy) : axe mainstream, axe époque, jauge Sévère / Indulgent.
export default function UpdateNoteNovember() {
  return (
    <>
      <p>Hey</p>
      <p>Re-nous voilà.</p>
      <p>
        En août, je vous promettais que l&apos;identité du site allait «&nbsp;bouger les prochains jours&nbsp;».
        Elle a bougé pendant deux mois, et elle n&apos;a pas bougé seule&nbsp;: voici la V3, mise en ligne d&apos;un
        bloc après une demi-journée de maintenance.
      </p>

      <h4>Une adresse, un nom</h4>
      <p>
        Fifty a enfin sa maison&nbsp;: <Circled>50films.fr</Circled>. En haut à gauche, il s&apos;écrit désormais en
        toutes lettres, <em>Fiftyfilms</em>, avec un «&nbsp;50&nbsp;» provisoire en guise de logo (un vrai graphiste
        s&apos;en chargera plus tard). Nouvelles polices aussi, choisies pour se lire sans faire «&nbsp;généré&nbsp;».
      </p>

      <h4>Se repérer</h4>
      <p>
        Une barre d&apos;onglets reste en bas de l&apos;écran&nbsp;: Mon Wrapped, Ma liste, Hall of Fame, Jeu et Divers.
        Divers range le reste&nbsp;: tes badges, cette note, le formulaire d&apos;avis, les mentions légales.
      </p>
      <DoodleTabBar />

      <h4>Le haut du profil</h4>
      <DoodleGauge />
      <ul>
        <li>
          Ta note moyenne, et à côté ta durée moyenne sur une pellicule&nbsp;: plus elle est remplie, plus tes films sont
          longs par rapport aux autres profils Fifty. Le trait pointillé marque la moyenne Fifty.
        </li>
        <li>
          La jauge Sévère / Indulgent a deux billes. La dorée, c&apos;est ta moyenne&nbsp;; l&apos;autre, aux couleurs de
          Letterboxd, la moyenne de la communauté <Underlined>sur exactement les mêmes films</Underlined>. Film par film,
          on fait la différence entre ta note et celle de Letterboxd, puis la moyenne de ces écarts&nbsp;: moins de 0,1
          étoile, c&apos;est «&nbsp;Juste&nbsp;», sinon «&nbsp;Sévère&nbsp;» ou «&nbsp;Indulgent&nbsp;».
        </li>
        <li>
          On ne compare que ce qui est comparable&nbsp;: les films dont Fifty connaît la moyenne Letterboxd (près de 10 000
          films, plus 44 sorties récentes relevées à la main). La phrase sous la jauge dit sur combien de tes films la
          comparaison est faite. J&apos;ai testé une formule pour deviner la moyenne des autres films à partir de TMDB&nbsp;:
          sur les films récents, elle se trompait d&apos;un tiers d&apos;étoile. Recalée.
        </li>
      </ul>

      <h4>Le Triangle (ex-radar)</h4>
      <p>
        Trois axes au lieu de quatre&nbsp;: la durée est montée en haut du profil. Et deux axes ont changé de méthode.
        Si ton cran a bougé depuis octobre, voici pourquoi.
      </p>
      <DoodleMiddleFilm />
      <p>
        <strong>Mainstream.</strong> Avant, Fifty ne regardait que les films présents dans sa base Letterboxd, une
        quinzaine sur 50 en moyenne&nbsp;: tes sorties récentes passaient à la trappe. Et au-delà d&apos;un million de vues,
        un film comptait comme «&nbsp;100&nbsp;% grand public&nbsp;»&nbsp;: presque tout le monde finissait en haut de
        l&apos;échelle. Désormais, chacun de tes films compte&nbsp;:
      </p>
      <ul>
        <li>
          si Fifty connaît ses vues Letterboxd, on les prend telles quelles&nbsp;;
        </li>
        <li>
          sinon (souvent une sortie récente), on regarde son rang parmi les films sortis la même année, d&apos;après le
          nombre de votes TMDB, et on en déduit ses vues Letterboxd probables, grâce à une correspondance réglée époque
          par époque sur plus de 300 films connus des deux côtés. Comparer un film à ceux de son année évite de pénaliser
          une sortie qui n&apos;a pas encore eu le temps d&apos;accumuler des votes&nbsp;;
        </li>
        <li>
          ton score, ce sont les vues de ton film «&nbsp;du milieu&nbsp;»&nbsp;: un blockbuster isolé ou une rareté isolée
          ne déforme plus ton profil.
        </li>
      </ul>
      <DoodleCrans />
      <p>
        <strong>Ton cran est relatif.</strong> 10&nbsp;% des profils Fifty au cran 1, 20&nbsp;% au 2, 40&nbsp;% au 3,
        20&nbsp;% au 4, 10&nbsp;% au 5. Les seuils ont été calculés une fois, le 1<sup>er</sup> novembre, puis figés
        pour que ton profil reste comparable d&apos;un mois à l&apos;autre&nbsp;: film du milieu sous 104&nbsp;000 vues,
        jusqu&apos;à 194&nbsp;000, 321&nbsp;000, 796&nbsp;000, au-delà.
      </p>
      <p>
        <strong>Époque.</strong> Même principe&nbsp;: on mesure l&apos;âge moyen de tes films (combien d&apos;années se
        sont écoulées depuis leur sortie), puis on te situe parmi les autres profils, avec la même répartition. Seuils&nbsp;:
        19 ans et plus, 17, 13, 10, moins de 10.
      </p>
      <p>
        Chaque axe te dit maintenant où tu te situes&nbsp;: «&nbsp;plus mainstream que 62&nbsp;% des profils Fifty&nbsp;»,
        par exemple. Limite assumée&nbsp;: une estimation reste une estimation (un facteur 1,5 à 1,8 d&apos;écart typique
        sur un film), mais sur cinquante films, les écarts se compensent.
      </p>

      <h4>Les modules</h4>
      <ul>
        <li>
          Ils ont tous un nom&nbsp;: <em>La Constellation</em> (tes genres en bulles), <em>Le Passeport</em> (tes pays,
          tamponnés), <em>Les Recos</em>, <em>Le Carrousel</em>.
        </li>
        <li>
          Les Recos se retournent comme des cartes&nbsp;: une pépite, un pari, un détour. Toujours calculées sans IA.
        </li>
        <li>
          Nouveau&nbsp;: <em>Les Fixettes</em>. Le cinéaste et l&apos;interprète (parmi les quatre premiers rôles) qui
          reviennent au moins deux fois dans tes 50 films. Et une ligne de faits&nbsp;: la part de tes films réalisés par au
          moins une femme ou une personne non binaire, d&apos;après TMDB, sur les films dont on connaît l&apos;équipe.
        </li>
        <li>
          Nouveau aussi&nbsp;: <em>Ma liste</em>, tes 50 films en affiches ou en liste, six façons de les trier, et un lien
          vers la fiche Letterboxd de chacun.
        </li>
      </ul>

      <h4>Hall of Fame et badges</h4>
      <DoodleLaurel />
      <ul>
        <li>
          Seul le navigateur qui a lancé ton profil peut t&apos;inscrire au Hall of Fame ou t&apos;en retirer&nbsp;: personne
          ne peut le faire à ta place.
        </li>
        <li>
          Les badges tombent tout seuls le 1<sup>er</sup> du mois. Une saison ne compte qu&apos;à partir de 3 inscrits, et
          un badge de continent demande au moins 3 films de ce continent. Octobre&nbsp;: 22 badges pour 9 participants.
        </li>
        <li>
          Les saisons passées restent consultables, podiums couronnés de lauriers. Dans Divers › Mes badges, tu choisis
          les trois qui s&apos;affichent sur ton profil.
        </li>
      </ul>

      <h4>Fiftyguess, le jeu</h4>
      <DoodleGuess />
      <p>
        Chaque lundi, une affiche à deviner. Un cercle s&apos;ouvre dessus et grandit&nbsp;: elle est entière au bout de 50
        secondes. En mode compétitif, chrono et classement de la semaine&nbsp;; chaque erreur coûte 1, puis 3, puis 5
        secondes, et la partie s&apos;arrête à 2 minutes. En mode zen, pas de chrono. Tu as joué toutes les semaines du
        mois&nbsp;? Une affiche bonus, plus dure, s&apos;ouvre le dernier vendredi. Badges du mois pour le meilleur temps
        moyen et pour la série.
      </p>

      <h4>En coulisses</h4>
      <DoodlePendulum />
      <ul>
        <li>Pendant le calcul, un pendule de Newton remplace les trois points qui tournaient.</li>
        <li>
          Le bug qui faisait remonter la page en plein défilement est trouvé et corrigé&nbsp;: une consigne de retour en
          haut restait en attente et se déclenchait au mauvais moment.
        </li>
        <li>
          Les mentions légales et la page confidentialité sont en ligne&nbsp;: pas de compte, pas de pub, aucun traceur tiers.
          Les adresses IP ne sont jamais stockées en clair, et chaque donnée a une durée de conservation écrite noir sur
          blanc.
        </li>
        <li>Un profil commencé le 31 au soir compte bien pour la nouvelle saison le 1<sup>er</sup>.</li>
        <li>Une sentinelle surveille le moteur toutes les heures et me prévient s&apos;il cale.</li>
      </ul>

      <h4>Ce qui arrive</h4>
      <ul>
        <li>Le Manifeste, toujours en écriture&nbsp;: genèse, éthique, méthodologie.</li>
        <li>Les Préférences&nbsp;: trois ambiances de couleurs, et le choix du film en fond.</li>
        <li>Fifty installable sur ton écran d&apos;accueil.</li>
        <li>La recherche et les filtres dans Ma liste.</li>
      </ul>

      <h4>Sur la méthode</h4>
      <p>
        Rien ne change&nbsp;: le code est écrit avec l&apos;IA (Claude, surtout), les choix restent les miens, et aucune IA
        n&apos;est appelée quand tu génères ton profil.
      </p>

      <h4>Feedbacks</h4>
      <p>
        Le formulaire est maintenant dans Divers › Donner mon avis. Vos retours ont façonné une bonne moitié de cette
        note&nbsp;: continuez.
      </p>
      <p>Merci, encore</p>

      <p className="updateNoteSign">— Tanguytare</p>
      <p className="updateNotePs">
        P.S. Si tu as perdu un cran sur l&apos;axe mainstream, ce n&apos;est pas toi qui as changé, c&apos;est la règle.
        Enfin, peut-être un peu toi.
      </p>
    </>
  );
}
