export default function DatenschutzPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Datenschutz</h1>

      <section className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">1. Verantwortlicher</h2>
        <p>Ilhan Yalcin</p>
        <p>Kiningergasse, 1120 Wien, Österreich</p>
        <p>E-Mail: kontakt@terminboerse.at</p>
        <p>Telefon: 004369919050017</p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">2. Zweck der Verarbeitung</h2>
        <p>Wir verarbeiten personenbezogene Daten, um die Funktionen von Terminbörse.at bereitzustellen, insbesondere:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Suche und Darstellung von Arzt- und Apothekeninformationen in Wien,</li>
          <li>Kontakt- und Terminanfragen über die Plattform,</li>
          <li>Login- und Profilfunktionen für Nutzerinnen, Nutzer und Arztbereich,</li>
          <li>technische Sicherheit, Stabilität und Missbrauchsschutz.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">3. Verarbeitete Datenkategorien</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Kontaktdaten (z. B. Name, E-Mail, Telefonnummer),</li>
          <li>Anfrageinhalte (z. B. Fachbereich, Bezirk, gewählte Zeitfenster),</li>
          <li>Login- und Kontodaten,</li>
          <li>technische Nutzungsdaten (z. B. Zeitpunkt, Browser, IP-Adresse in Server-Logs).</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">4. Rechtsgrundlagen (DSGVO)</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Art. 6 Abs. 1 lit. b DSGVO (Vertrag bzw. vorvertragliche Maßnahmen),</li>
          <li>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb),</li>
          <li>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung, sofern erforderlich).</li>
        </ul>
        <p>
          Unser berechtigtes Interesse umfasst insbesondere die technische Sicherheit, den stabilen Betrieb sowie die
          nutzerfreundliche Weiterentwicklung einer nicht-kommerziellen Informationsplattform.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">5. Empfänger und Dienstleister</h2>
        <p>
          Zur technischen Bereitstellung können externe Auftragsverarbeiter eingesetzt werden, insbesondere in den
          Bereichen Hosting, Datenbank/Authentifizierung, E-Mail-Zustellung und Analyse.
        </p>
        <p>
          Eine Verarbeitung erfolgt nur im erforderlichen Umfang und auf Basis geeigneter datenschutzrechtlicher
          Vereinbarungen.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">6. Datenquellen (Open Data)</h2>
        <p>
          Ein Teil der angezeigten Inhalte basiert auf offenen Verwaltungsdatenquellen (u. a. data.gv.at und Open
          Government Data der Stadt Wien). Für Aktualität und Vollständigkeit dieser Drittquellen kann keine
          uneingeschränkte Gewähr übernommen werden.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">7. Speicherdauer</h2>
        <p>
          Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke erforderlich ist oder
          gesetzliche Aufbewahrungspflichten bestehen.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">8. Ihre Rechte</h2>
        <p>Sie haben nach DSGVO insbesondere das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit.</p>
        <p>Anfragen richten Sie bitte an: kontakt@terminboerse.at</p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">9. Beschwerderecht</h2>
        <p>
          Sie haben das Recht auf Beschwerde bei einer Datenschutzaufsichtsbehörde. In Österreich ist dies die
          Datenschutzbehörde.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">10. Hinweis zur medizinischen Nutzung</h2>
        <p>
          Terminbörse.at ersetzt keine medizinische Beratung und ist kein Notfalldienst. In akuten Notfällen nutzen
          Sie bitte den Notruf 144.
        </p>
      </section>

      <p className="mt-8 text-xs text-slate-500">Stand: August 2026</p>
    </main>
  );
}
