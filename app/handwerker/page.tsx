import { LandingPage } from "@/components/landing/LandingPage";
import doctorsJson from "@/data/doctors.json";
import { normalizeDoctorsData } from "@/lib/doctors";

export default function HandwerkerPage() {
  const doctors = normalizeDoctorsData(doctorsJson);
  return <LandingPage initialCategory="Elektriker" doctors={doctors} />;
}
