import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import doctorsJson from "@/data/doctors.json";
import { getLandingDoctorData, normalizeDoctorsData } from "@/lib/doctors";

export const metadata: Metadata = {
  title: "Seite nicht verfügbar | Terminbörse.at",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HandwerkerPage() {
  const doctors = normalizeDoctorsData(doctorsJson);
  const landingData = getLandingDoctorData(doctors);
  return (
    <LandingPage
      initialCategory="Elektriker"
      doctorSpecialties={landingData.specialties}
      doctorDistricts={landingData.districts}
      tickerItems={landingData.tickerItems}
    />
  );
}
