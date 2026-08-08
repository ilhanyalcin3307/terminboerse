import type { Metadata } from "next";
import doctorsJson from "@/data/doctors.json";
import { ArztDashboard } from "@/components/arztbereich/ArztDashboard";
import { normalizeDoctorsData } from "@/lib/doctors";

export const metadata: Metadata = {
  title: "Arztbereich | Terminboerse.at",
  description: "MVP-Bereich fuer Aerztinnen und Aerzte zur Profilpflege und Anfrageverwaltung.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ArztbereichPage() {
  const doctors = normalizeDoctorsData(doctorsJson).map((doctor) => ({
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    district: doctor.district,
    address: doctor.address,
    providerType: doctor.providerType,
    phone: doctor.phone,
    email: doctor.email,
    website: doctor.website,
  }));

  return <ArztDashboard doctors={doctors} />;
}
