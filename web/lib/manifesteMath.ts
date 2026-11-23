// Constantes des schémas du Manifeste : copie de scripts/mainstream_estimate.py et de
// build_profile_metrics.py (10/11/2026). À mettre à jour en même temps qu'eux.

export type Era = "pre1980" | "1980_99" | "2000_14" | "2015p";

/** log10(vues) = a + b · log10(rang dans l'année), par époque de sortie. */
export const RANK_TO_VIEWS: Record<Era, [number, number]> = {
  pre1980: [5.91, -0.74],
  "1980_99": [6.61, -0.84],
  "2000_14": [6.86, -0.75],
  "2015p": [7.17, -0.87],
};

export const VIEW_CUTS = [104_080, 194_390, 321_052, 796_013] as const;
export const AGE_CUTS = [18.8, 16.8, 13.3, 10.3] as const;
export const REVIEW_CUTS = [8, 17, 29, 42] as const;

export const REFERENCE_MEDIAN_VIEWS = [
  71720, 92247, 104080, 135814, 163731, 191770, 193239, 194390, 213184, 216487, 220597, 228884, 234819, 255337, 279934,
  298974, 318193, 321052, 344535, 405112, 477186, 771993, 796013, 860600, 876907, 1484396,
] as const;
export const REFERENCE_AGES = [
  4.4, 6.3, 10.3, 10.4, 10.4, 10.7, 11.4, 12.3, 13.2, 13.6, 14.1, 14.1, 14.3, 14.4, 14.7, 15.2, 15.4, 15.7, 16.9, 17.0,
  17.6, 18.2, 18.4, 19.0, 21.6, 25.4,
] as const;
export const REFERENCE_REVIEW_COUNTS = [
  0, 0, 0, 0, 1, 3, 3, 9, 12, 12, 18, 18, 19, 20, 26, 27, 27, 28, 28, 31, 32, 36, 40, 41, 44, 47, 48, 49, 50,
] as const;

/** Part des profils de référence sous la valeur (égalités pour moitié), comme comparison() côté Python. */
export function comparisonShare(value: number, reference: readonly number[]): number {
  const below = reference.filter((ref) => ref < value).length + reference.filter((ref) => ref === value).length / 2;
  return Math.round((100 * below) / reference.length);
}
