import assert from "node:assert/strict";
import { test } from "node:test";
import { isDoctorIndexable } from "./doctorIndexing.ts";

const bareDoctor = {
  id: "ARZTOGD.1",
  name: "Test Doctor",
  specialty: "Dermatologie",
  district: "01. Bezirk",
  address: "Testgasse 1",
  providerType: "Privat",
  phone: "0123456",
  website: "https://example.com",
  languages: ["Deutsch"],
};

test("imported contact data and default German do not qualify", () => {
  assert.equal(isDoctorIndexable(bareDoctor), false);
  assert.equal(isDoctorIndexable({ ...bareDoctor, nextSlot: "Morgen", viewsCount: 100 }), false);
});

test("each populated profile field independently qualifies", () => {
  const additions = [
    { about: "Behandlung von Hauterkrankungen." },
    { services: [{ title: "Hautkrebsvorsorge" }] },
    { workingHours: [{ label: "Montag", value: "08:00-12:00" }] },
    { workingHours: [{ label: "Montag", value: "08:00 – 12:00" }] },
    { languages: ["Deutsch", "Englisch"] },
    { insuranceModels: ["Privat"] },
    { acceptsNewPatients: true },
    { acceptsNewPatients: false },
    { bookingUrl: "https://example.com/termine" },
  ];
  for (const addition of additions) {
    assert.equal(isDoctorIndexable({ ...bareDoctor, ...addition }), true, JSON.stringify(addition));
  }
});

test("only explicitly stored German qualifies, not the merge default", () => {
  assert.equal(isDoctorIndexable(bareDoctor, { hasExplicitLanguages: true }), true);
  assert.equal(isDoctorIndexable({ ...bareDoctor, languages: [] }, { hasExplicitLanguages: true }), false);
});

test("empty values, closed-only or invalid hours and invalid links do not qualify", () => {
  const additions = [
    { about: "   " },
    { services: [{ title: " " }] },
    { languages: ["Deutsch", " "] },
    { insuranceModels: [" "] },
    { workingHours: [{ label: "Montag", value: "-" }] },
    { workingHours: [{ label: "Montag", value: "Geschlossen" }] },
    { workingHours: [{ label: "Montag", value: "25:00-26:00" }] },
    { workingHours: [{ label: "Montag", value: "12:00-08:00" }] },
    { workingHours: [{ label: "Montag", value: "08:00-08:00" }] },
    { bookingUrl: "not-a-url" },
    { bookingUrl: "javascript:alert(1)" },
  ];
  for (const addition of additions) {
    assert.equal(isDoctorIndexable({ ...bareDoctor, ...addition }), false, JSON.stringify(addition));
  }
});

test("active internal booking qualifies even without enriched content", () => {
  assert.equal(isDoctorIndexable(bareDoctor, { canBookOnline: true }), true);
  assert.equal(isDoctorIndexable(bareDoctor, { canBookOnline: false }), false);
});

test("removing the qualifying content restores noindex", () => {
  const enriched = { ...bareDoctor, about: "Meine Praxis" };
  assert.equal(isDoctorIndexable(enriched), true);
  assert.equal(isDoctorIndexable({ ...enriched, about: undefined }), false);
});
