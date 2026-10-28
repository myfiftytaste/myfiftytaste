import type { Metadata } from "next";
import MyList from "../../components/MyList";

export const metadata: Metadata = { title: "Ma liste · Fifty" };

export default function MaListePage() {
  return <MyList />;
}
