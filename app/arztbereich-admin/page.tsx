import type { Metadata } from "next";
import { AdminDashboardGate } from "@/components/arztbereich/AdminDashboardGate";

export const metadata: Metadata = {
  title: "Admin Arztbereich | Terminboerse.at",
  description: "Admin-Bereich für Freischaltungen und Profilverwaltung.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ArztbereichAdminPage() {
  return <AdminDashboardGate />;
}
