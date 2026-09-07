import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin, Search, Stethoscope } from "lucide-react";

type Guide = {
  title: string;
  description: string;
  heading: string;
  intro: string;
  steps: Array<{ title: string; text: string }>;
  faqs: Array<{ question: string; answer: string }>;
  relatedLinks: Array<{ label: string; href: string }>;
};

const guides: Record<string, Guide> = {
  "arzttermin-wien": {
    title: "Arzttermin in Wien finden: So gehst du vor | Terminbörse.at",
    description: "Arzttermin in Wien finden: Fachbereich und Bezirk eingrenzen, Arztprofile vergleichen und direkt Kontakt aufnehmen.",
    heading: "Arzttermin in Wien finden: So gehst du vor",
    intro: "Ein passender Arzttermin hängt oft von Fachbereich, Bezirk und dem gewünschten Zeitpunkt ab. Mit einer klaren Suche findest du schneller eine Ordination, deren Kontaktwege und Angebot zu deinem Anliegen passen.",
    steps: [
      { title: "Fachbereich festlegen", text: "Starte mit dem Fachbereich, den du suchst. Für allgemeine Anliegen kann eine hausärztliche Ordination die passende erste Anlaufstelle sein; bei einer Überweisung suche gezielt nach der genannten Fachrichtung." },
      { title: "Bezirk und Erreichbarkeit einplanen", text: "Grenze die Suche nach einem Bezirk ein und prüfe Adresse, Telefonnummer, Website sowie den Anfahrtsweg. Das spart Zeit, wenn du eine Ordination in der Nähe brauchst." },
      { title: "Profile vergleichen", text: "Vergleiche die Angaben in mehreren Profilen. Falls eine Ordination freie Zeitfenster veröffentlicht hat, werden diese direkt im Profil angezeigt." },
      { title: "Direkt anfragen", text: "Nimm über die angegebenen Kontaktwege Kontakt auf und nenne kurz dein Anliegen sowie mögliche Zeitfenster. Die Ordination entscheidet über die Vergabe eines Termins." },
    ],
    faqs: [
      { question: "Kostet die Arztsuche auf Terminbörse.at etwas?", answer: "Nein. Die Suche und der Zugriff auf Arztprofile sind für Patientinnen und Patienten kostenlos." },
      { question: "Sind freie Termine verbindlich?", answer: "Ein veröffentlichtes Zeitfenster zeigt eine verfügbare Möglichkeit. Die konkrete Terminbestätigung erfolgt durch die jeweilige Ordination." },
      { question: "Was mache ich bei einem medizinischen Notfall?", answer: "Bei akuten oder lebensbedrohlichen Beschwerden rufe bitte 144 oder wende dich unmittelbar an eine geeignete Notfallversorgung." },
    ],
    relatedLinks: [
      { label: "Alle Ärzte in Wien durchsuchen", href: "/arzt" },
      { label: "Hausarzt in Wien finden", href: "/arzttermin-wien/hausarzt" },
      { label: "Freie Termine der nächsten 3 Tage", href: "/#freie-termine" },
    ],
  },
  "arzttermin-kurzfristig": {
    title: "Kurzfristig Arzttermin in Wien finden | Terminbörse.at",
    description: "Kurzfristigen Arzttermin in Wien finden: Suche nach Fachbereich und Bezirk, prüfe veröffentlichte Zeitfenster und kontaktiere passende Ordinationen.",
    heading: "Kurzfristig einen Arzttermin in Wien finden",
    intro: "Wenn du zeitnah einen Arzttermin suchst, helfen eine präzise Suche und direkte Kontaktaufnahme. Terminbörse.at zeigt Arztprofile in Wien und, sofern Ordinationen sie veröffentlichen, freie Zeitfenster für die nächsten drei Tage.",
    steps: [
      { title: "Suche möglichst konkret starten", text: "Wähle zuerst Fachbereich und Bezirk. Eine konkrete Suche liefert schneller relevante Profile als eine allgemeine Anfrage ohne Ortsbezug." },
      { title: "Freie Zeitfenster prüfen", text: "Nutze die Übersicht für freie Termine der nächsten drei Tage und öffne das jeweilige Profil. Dort findest du weitere Angaben zur Ordination und zur Kontaktaufnahme." },
      { title: "Mehrere passende Ordinationen vergleichen", text: "Wenn kein passendes Zeitfenster sichtbar ist, vergleiche mehrere Profile im gewünschten Bezirk. Telefon, Website und E-Mail können unterschiedliche Wege für eine Terminfrage bieten." },
      { title: "Anliegen klar formulieren", text: "Nenne bei der Anfrage den Fachbereich, ob es zeitlich dringend ist und wann du erreichbar bist. Medizinische Details gehören nur in dem Umfang in die Anfrage, der für die Terminorganisation nötig ist." },
    ],
    faqs: [
      { question: "Kann Terminbörse.at einen Soforttermin garantieren?", answer: "Nein. Die Plattform unterstützt bei Suche und Kontaktaufnahme. Die Terminvergabe liegt immer bei der jeweiligen Ordination." },
      { question: "Warum sehe ich nicht bei jedem Arzt freie Slots?", answer: "Freie Zeitfenster erscheinen nur, wenn eine Ordination sie aktiv veröffentlicht. Viele Profile bieten weiterhin direkte Kontaktwege für Terminfragen." },
      { question: "Was gilt außerhalb der Ordinationszeiten?", answer: "Bei Beschwerden außerhalb der Ordinationszeiten nutze bitte die zuständigen medizinischen Notfallangebote. Bei einem Notfall rufe 144." },
    ],
    relatedLinks: [
      { label: "Freie Termine der nächsten 3 Tage", href: "/#freie-termine" },
      { label: "Hautarzt in Wien finden", href: "/arzttermin-wien/hautarzt" },
      { label: "Frauenarzt in Wien finden", href: "/arzttermin-wien/frauenarzt" },
    ],
  },
  "facharzttermin-wien": {
    title: "Facharzttermin in Wien: Suche und Vorbereitung | Terminbörse.at",
    description: "Facharzttermin in Wien finden: Fachrichtung und Bezirk wählen, Profile vergleichen und für die Terminfrage gut vorbereitet sein.",
    heading: "Facharzttermin in Wien: Suche und Vorbereitung",
    intro: "Für einen Facharzttermin in Wien helfen die richtige Fachrichtung, eine gute Auswahl nach Bezirk und eine vorbereitete Anfrage. Auf Terminbörse.at kannst du Profile vergleichen und passende Ordinationen direkt kontaktieren.",
    steps: [
      { title: "Fachrichtung anhand deines Anliegens wählen", text: "Prüfe gegebenenfalls, welche Fachrichtung auf einer Überweisung genannt ist. Suche anschließend gezielt nach dieser Spezialisierung statt nur nach dem allgemeinen Begriff Arzt." },
      { title: "Informationen für die Anfrage bereitlegen", text: "Halte e-card, Überweisung falls vorhanden und mögliche Zeitfenster bereit. Die Ordination kann dir mitteilen, welche Unterlagen für einen Termin benötigt werden." },
      { title: "Profile im passenden Bezirk vergleichen", text: "Vergleiche Adresse, Kontaktwege, angebotene Leistungen und veröffentlichte Informationen. So findest du eine Ordination, die räumlich und organisatorisch passt." },
      { title: "Termin organisatorisch bestätigen", text: "Frage direkt bei der Ordination an und bestätige den vereinbarten Termin. Bei Änderungen oder Absagen informiere die Ordination möglichst frühzeitig." },
    ],
    faqs: [
      { question: "Brauche ich für jeden Facharzttermin eine Überweisung?", answer: "Das hängt von Fachrichtung, Versicherung und individueller Situation ab. Die jeweilige Ordination oder dein Versicherungsträger kann dir dazu verbindlich Auskunft geben." },
      { question: "Welche Angaben sollte ich in einer Terminfrage machen?", answer: "Nenne die gewünschte Fachrichtung, deinen bevorzugten Zeitraum und eine Rückrufmöglichkeit. Die Ordination informiert dich über weitere benötigte Angaben." },
      { question: "Wo finde ich die Fachrichtungen?", answer: "In der Arztliste kannst du nach Fachbereich filtern und anschließend die Profile einzelner Ordinationen öffnen." },
    ],
    relatedLinks: [
      { label: "Arztliste nach Fachbereich filtern", href: "/arzt" },
      { label: "Zahnarzt in Wien finden", href: "/arzttermin-wien/zahnarzt" },
      { label: "Kinderarzt in Wien finden", href: "/arzttermin-wien/kinderarzt" },
    ],
  },
};

type GuidePageProps = {
  params: Promise<{ topic: string }>;
};

function getGuide(topic: string) {
  return guides[topic];
}

export function generateStaticParams() {
  return Object.keys(guides).map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { topic } = await params;
  const guide = getGuide(topic);
  if (!guide) {
    return { title: "Seite nicht gefunden | Terminbörse.at", robots: { index: false, follow: false } };
  }
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/ratgeber/${topic}` },
    openGraph: { title: guide.title, description: guide.description, url: `https://www.terminboerse.at/ratgeber/${topic}`, type: "article", locale: "de_AT" },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { topic } = await params;
  const guide = getGuide(topic);
  if (!guide) {
    notFound();
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Terminbörse.at", item: "https://www.terminboerse.at/" },
      { "@type": "ListItem", position: 2, name: "Ratgeber", item: "https://www.terminboerse.at/ratgeber/arzttermin-wien" },
      { "@type": "ListItem", position: 3, name: guide.heading, item: `https://www.terminboerse.at/ratgeber/${topic}` },
    ],
  };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: guide.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <article>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"><Stethoscope className="h-4 w-4" /> Ratgeber für Wien</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">{guide.heading}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">{guide.intro}</p>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900">In vier Schritten zum passenden Termin</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {guide.steps.map((step, index) => (
              <li key={step.title} className="border-l-4 border-sky-500 bg-sky-50 p-4">
                <p className="text-xs font-bold text-sky-700">SCHRITT {index + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 border-y border-slate-200 py-8">
          <h2 className="text-2xl font-bold text-slate-900">Passende Bereiche auf Terminbörse.at</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {guide.relatedLinks.map((link, index) => {
              const Icon = index === 0 ? Search : index === 1 ? MapPin : CalendarClock;
              return <Link key={link.href} href={link.href} className="flex items-center gap-2 border border-sky-200 bg-white p-3 text-sm font-semibold text-sky-800 hover:bg-sky-50"><Icon className="h-4 w-4" />{link.label}</Link>;
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900">Häufige Fragen</h2>
          <div className="mt-4 space-y-3">
            {guide.faqs.map((faq) => <details key={faq.question} className="border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-900">{faq.question}</summary><p className="mt-3 text-sm leading-6 text-slate-700">{faq.answer}</p></details>)}
          </div>
        </section>
      </article>
    </main>
  );
}