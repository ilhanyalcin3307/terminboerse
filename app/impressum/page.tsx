export default function ImpressumPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Impressum</h1>

      <section className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Angaben gemäß § 5 ECG und § 25 Mediengesetz</h2>
        <p><span className="font-semibold">Medieninhaber und Diensteanbieter:</span> Ilhan Yalcin</p>
        <p><span className="font-semibold">Adresse:</span> Kiningergasse, 1120 Wien, Österreich</p>
        <p><span className="font-semibold">E-Mail:</span> kontakt@terminboerse.at</p>
        <p><span className="font-semibold">Telefon:</span> 004369919050017</p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Ausrichtung der Plattform</h2>
        <p>
          Terminbörse.at ist eine nicht-kommerzielle, gemeinwohlorientierte Plattform zur Unterstützung der Wiener
          Bevölkerung bei der Suche nach kurzfristigen Arztterminen und Gesundheitsinformationen.
        </p>
        <p>
          Die Plattform wird ohne Gewinnerzielungsabsicht betrieben und dient der Information sowie der Vereinfachung
          von Kontaktanfragen.
        </p>
        <p>
          Es werden keine medizinischen Leistungen angeboten oder verkauft. Terminbörse.at ist kein
          Gesundheitsdienstleister, sondern eine technische Informations- und Kontaktplattform.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Datenquellen</h2>
        <p>
          Teile der Inhalte (insbesondere Arzt- und Apothekendaten) basieren auf offenen Verwaltungsdatenquellen,
          unter anderem data.gv.at und Open Government Data der Stadt Wien.
        </p>
        <p>
          Trotz sorgfältiger Verarbeitung kann keine Gewähr für Vollständigkeit, Richtigkeit und laufende Aktualität
          dieser externen Daten übernommen werden.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Haftungsausschluss</h2>
        <p>
          Terminbörse.at erbringt keine medizinischen Leistungen und ersetzt keine ärztliche Beratung,
          Diagnose oder Notfallversorgung. Für externe Links und Inhalte Dritter sind ausschließlich deren
          Betreiber verantwortlich.
        </p>
        <p>
          In medizinischen Notfällen wenden Sie sich bitte an den Notruf 144 oder an die nächstgelegene
          Notfallambulanz.
        </p>
      </section>

      <p className="mt-8 text-xs text-slate-500">Stand: August 2026</p>
    </main>
  );
}
