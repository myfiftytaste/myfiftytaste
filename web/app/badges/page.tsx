import type { Metadata } from "next";
import MyBadges from "../../components/MyBadges";

export const metadata: Metadata = { title: "Mes badges · Fifty" };

export default function MesBadgesPage() {
  return <MyBadges />;
}
