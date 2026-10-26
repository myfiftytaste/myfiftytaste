// Genres TMDB et pays arrivent en anglais depuis le pipeline : traduits à l'affichage seulement,
// les noms anglais restent les clés internes (survol, liens entre bulles et barres).

const GENRES_FR: Record<string, string> = {
  Action: "Action",
  Adventure: "Aventure",
  Animation: "Animation",
  Comedy: "Comédie",
  Crime: "Crime",
  Documentary: "Documentaire",
  Drama: "Drame",
  Family: "Familial",
  Fantasy: "Fantastique",
  History: "Histoire",
  Horror: "Horreur",
  Music: "Musique",
  Mystery: "Mystère",
  Romance: "Romance",
  "Science Fiction": "Science-fiction",
  "TV Movie": "Téléfilm",
  Thriller: "Thriller",
  War: "Guerre",
  Western: "Western",
};

export function genreFr(genre: string): string {
  return GENRES_FR[genre] ?? genre;
}

const regionFr = new Intl.DisplayNames(["fr"], { type: "region" });
const regionEn = new Intl.DisplayNames(["en"], { type: "region" });
// Nom anglais -> code ISO, tiré des noms de pays du navigateur ; USA et UK sont les noms raccourcis du pipeline.
const isoByEnglishName = new Map<string, string>([
  ["USA", "US"],
  ["UK", "GB"],
]);
for (let first = 65; first <= 90; first += 1) {
  for (let second = 65; second <= 90; second += 1) {
    const code = String.fromCharCode(first, second);
    const name = regionEn.of(code);
    if (name && name !== code && !isoByEnglishName.has(name)) isoByEnglishName.set(name, code);
  }
}

// Noms TMDB absents du navigateur, ou qu'il traduit mal (« R.A.S. chinoise de Hong Kong »).
const COUNTRY_OVERRIDES_FR: Record<string, string> = {
  "Hong Kong": "Hong Kong",
  "Czech Republic": "République tchèque",
  "Soviet Union": "URSS",
  Yugoslavia: "Yougoslavie",
  Czechoslovakia: "Tchécoslovaquie",
  "East Germany": "RDA",
  Turkey: "Turquie",
  Macao: "Macao",
  "Palestinian Territory": "Palestine",
  "Serbia and Montenegro": "Serbie-et-Monténégro",
  "Côte D'Ivoire": "Côte d’Ivoire",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  "Libyan Arab Jamahiriya": "Libye",
  "Syrian Arab Republic": "Syrie",
};

export function countryFr(name: string, iso2?: string | null): string {
  if (COUNTRY_OVERRIDES_FR[name]) return COUNTRY_OVERRIDES_FR[name];
  const code = iso2 ?? isoByEnglishName.get(name);
  return (code && regionFr.of(code)) || name;
}
