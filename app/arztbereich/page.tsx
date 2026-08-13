import type { Metadata } from "next";
import { ArztbereichAccessGate } from "@/components/arztbereich/ArztbereichAccessGate";

export const metadata: Metadata = {
  title: "Arztbereich | Terminboerse.at",
  description: "MVP-Bereich fuer Aerztinnen und Aerzte zur Profilpflege und Anfrageverwaltung.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ArztbereichPage() {
  return <ArztbereichAccessGate doctors={[]} />;
}