import { LandingPage } from "@/components/landing/LandingPage";
import doctorsJson from "@/data/doctors.json";
import { normalizeDoctorsData } from "@/lib/doctors";

export default function HomePage() {
  const doctors = normalizeDoctorsData(doctorsJson);
  return <LandingPage doctors={doctors} />;
}
