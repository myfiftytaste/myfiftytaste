import Image from "next/image";
import Link from "next/link";

// Logo provisoire validé le 26/10/2026 (en attendant le graphiste) : la marque « 50 »
// et le nom, en haut à gauche de chaque page. L'ancien grand logo est dans public/branding/archive.
export default function BrandLockup() {
  return (
    <Link href="/" className="brandLockup" aria-label="Fifty, retour à l’accueil">
      <Image src="/branding/fifty-50.svg" alt="" width={44} height={24} priority unoptimized />
      <span>Fifty</span>
    </Link>
  );
}
