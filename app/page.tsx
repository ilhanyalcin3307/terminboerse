import { LandingPage } from "@/components/landing/LandingPage";
import doctorsJson from "@/data/doctors.json";
import { getLandingDoctorData, normalizeDoctorsData } from "@/lib/doctors";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Wie finde ich schnell einen freien Arzttermin in Wien?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wähle Bezirk und Fachbereich oder nutze die Suche auf Terminbörse.at. Danach siehst du passende Einträge und kannst direkt Kontakt aufnehmen.",
      },
    },
    {
      "@type": "Question",
      name: "Kostet die Nutzung von Terminbörse.at etwas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nein. Die Suche und Termin-Anfrage für Patientinnen und Patienten ist kostenfrei.",
      },
    },
    {
      "@type": "Question",
      name: "Wie funktioniert der Termin-Alarm?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Du hinterlegst E-Mail und gewünschten Fachbereich. Sobald passende Optionen verfügbar sind, informieren wir dich zuerst.",
      },
    },
    {
      "@type": "Question",
      name: "Ich bin Ärztin/Arzt in Wien. Wie erhalte ich Anfragen?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Über den Button Profil kostenlos beanspruchen kannst du Kontakt aufnehmen und dein Profil für direkte Termin-Anfragen aktivieren.",
      },
    },
  ],
};

export default function HomePage() {
  const doctors = normalizeDoctorsData(doctorsJson);
  const landingData = getLandingDoctorData(doctors);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <LandingPage
        doctorSpecialties={landingData.specialties}
        doctorDistricts={landingData.districts}
        tickerItems={landingData.tickerItems}
        totalDoctors={landingData.totalDoctors}
        byCategory={landingData.byCategory}
        byDistrictCategory={landingData.byDistrictCategory}
      />
    </>
  );
}
