import { ArztDirectory } from "@/components/arzt/ArztDirectory";
import doctorsJson from "@/data/doctors.json";
import { normalizeDoctorsData } from "@/lib/doctors";

export default function ArztPage() {
  const doctors = normalizeDoctorsData(doctorsJson);
  return <ArztDirectory doctors={doctors} />;
}
