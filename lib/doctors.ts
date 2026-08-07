export type DoctorRecord = {
  id: string;
  name: string;
  specialty: string;
  district: string;
  address: string;
  providerType: "OEGK" | "Wahlarzt" | "Privat";
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  nextSlot?: string;
};

type RawDoctor = Record<string, unknown>;

type GeoJsonFeature = {
  id?: unknown;
  properties?: Record<string, unknown>;
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  };
};

type GeoJsonFeatureCollection = {
  type?: unknown;
  features?: unknown;
};

function asText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function pickText(raw: RawDoctor, keys: string[]) {
  for (const key of keys) {
    const value = asText(raw[key]);
    if (value) {
      return value;
    }
  }
  return "";
}

function normalizeDistrict(rawDistrict: string, rawAddress: string) {
  if (rawDistrict) {
    return rawDistrict;
  }

  const fromAddress = rawAddress.match(/\b(0?[1-9]|1[0-9]|2[0-3])\s*\./);
  if (fromAddress) {
    const districtNumber = fromAddress[1].padStart(2, "0");
    return `${districtNumber}. Bezirk`;
  }

  return "All Wien";
}

function normalizeProviderType(value: string): DoctorRecord["providerType"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("oegk") || normalized.includes("ogk")) {
    return "OEGK";
  }
  if (normalized.includes("wahl")) {
    return "Wahlarzt";
  }
  return "Privat";
}

function normalizeSpecialty(value: string) {
  const text = value.trim();
  const normalized = text.toLowerCase();

  if (normalized.includes("allgemeinmedizin") || normalized.includes("praktischer arzt")) {
    return "Hausarzt / Allgemeinmedizin";
  }
  if (normalized.includes("orthopaed") || normalized.includes("orthopad") || normalized.includes("orthop")) {
    return "Orthopaedie";
  }
  if (
    normalized.includes("frauenheilkunde") ||
    normalized.includes("gynaek") ||
    normalized.includes("gynak") ||
    normalized.includes("geburtshilfe")
  ) {
    return "Gynaekologie / Frauenarzt";
  }
  if (normalized.includes("dermat") || normalized.includes("haut")) {
    return "Dermatologie";
  }
  if (normalized.includes("augen")) {
    return "Augenheilkunde";
  }
  if (normalized.includes("zahn")) {
    return "Zahnmedizin";
  }
  if (normalized.includes("kinder") || normalized.includes("paediatr") || normalized.includes("padiatr")) {
    return "Kinderheilkunde";
  }
  if (normalized.includes("innere")) {
    return "Innere Medizin";
  }
  if (normalized.includes("urolog")) {
    return "Urologie";
  }
  if (normalized.includes("hno") || normalized.includes("hals") || normalized.includes("ohren")) {
    return "HNO";
  }
  if (normalized.includes("psychiatr") || normalized.includes("psychotherap")) {
    return "Psychiatrie / Psychotherapie";
  }
  if (normalized.includes("neurolog")) {
    return "Neurologie";
  }
  if (normalized.includes("chirurg")) {
    return "Chirurgie";
  }
  if (normalized.includes("radiolog")) {
    return "Radiologie";
  }
  if (normalized.includes("kardiolog")) {
    return "Kardiologie";
  }
  if (normalized.includes("anasth") || normalized.includes("anaesth")) {
    return "Anaesthesie";
  }

  return text;
}

function normalizeWebsite(value: string) {
  if (!value) {
    return undefined;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim() || undefined;
}

function getCoordinates(raw: RawDoctor) {
  const longitude = typeof raw.__longitude === "number" ? raw.__longitude : undefined;
  const latitude = typeof raw.__latitude === "number" ? raw.__latitude : undefined;
  return { latitude, longitude };
}

export function getGoogleMapsUrl(doctor: Pick<DoctorRecord, "address" | "latitude" | "longitude">) {
  if (typeof doctor.latitude === "number" && typeof doctor.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${doctor.latitude},${doctor.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.address)}`;
}

export function normalizeDoctorsData(rawData: unknown): DoctorRecord[] {
  const collection = rawData as GeoJsonFeatureCollection;

  const rawEntries: RawDoctor[] = Array.isArray(rawData)
    ? rawData.filter((entry): entry is RawDoctor => typeof entry === "object" && entry !== null)
    : Array.isArray(collection.features)
      ? collection.features
          .map((feature) => {
            const geo = (feature ?? {}) as GeoJsonFeature;
            const props = geo.properties;
            if (!props || typeof props !== "object") {
              return null;
            }

            const coordinates = Array.isArray(geo.geometry?.coordinates) ? geo.geometry?.coordinates : undefined;
            const longitude = typeof coordinates?.[0] === "number" ? coordinates[0] : undefined;
            const latitude = typeof coordinates?.[1] === "number" ? coordinates[1] : undefined;
            const featureId = asText(geo.id);

            return {
              ...props,
              __feature_id: featureId,
              __latitude: latitude,
              __longitude: longitude,
            } as RawDoctor;
          })
          .filter((entry): entry is RawDoctor => entry !== null)
      : [];

  if (rawEntries.length === 0) {
    return [];
  }

  const normalized = rawEntries.map((raw, index): DoctorRecord | null => {
    const name = pickText(raw, ["NAME", "name", "arzt", "doctor_name", "fullName"]);
    const specialty = pickText(raw, ["FACH", "specialty", "fachbereich", "fach", "kategorie", "category"]);
    const address = pickText(raw, ["ADRESSE", "address", "adresse", "street", "strasse"]);
    const district = normalizeDistrict(
      pickText(raw, ["BEZIRK", "district", "bezirk", "district_name"]),
      address,
    );
    const providerType = normalizeProviderType(
      pickText(raw, ["KASSE", "providerType", "typ", "type", "versicherung", "kasse"]),
    );
    const nextSlot = pickText(raw, ["nextSlot", "next_slot", "termin", "slot", "zeit", "SLOT"]);
    const phone = normalizePhone(pickText(raw, ["TELEFON", "phone", "telefon"]));
    const website = normalizeWebsite(pickText(raw, ["INTERNET", "website", "web", "url"]));
    const { latitude, longitude } = getCoordinates(raw);

    if (!name || !specialty) {
      return null;
    }

    return {
      id: pickText(raw, ["__feature_id", "OBJECTID", "id", "uuid", "slug"]) || `doc-${index + 1}`,
      name,
      specialty: normalizeSpecialty(specialty),
      district,
      address: address || "Adresse folgt",
      providerType,
      ...(phone ? { phone } : {}),
      ...(website ? { website } : {}),
      ...(typeof latitude === "number" ? { latitude } : {}),
      ...(typeof longitude === "number" ? { longitude } : {}),
      ...(nextSlot ? { nextSlot } : {}),
    };
  });

  return normalized.filter((entry): entry is DoctorRecord => entry !== null);
}

export function getDoctorSpecialties(doctors: DoctorRecord[]) {
  const unique = Array.from(new Set(doctors.map((item) => item.specialty)));
  const preferredOrder = [
    "Hausarzt / Allgemeinmedizin",
    "Orthopaedie",
    "Gynaekologie / Frauenarzt",
    "Dermatologie",
    "Augenheilkunde",
    "Zahnmedizin",
    "Kinderheilkunde",
    "Innere Medizin",
    "HNO",
    "Urologie",
    "Neurologie",
    "Psychiatrie / Psychotherapie",
    "Chirurgie",
    "Kardiologie",
    "Radiologie",
  ];

  const preferred = preferredOrder.filter((item) => unique.includes(item));
  const remaining = unique.filter((item) => !preferredOrder.includes(item)).sort((a, b) => a.localeCompare(b));

  return [...preferred, ...remaining];
}

export function getDoctorDistricts(doctors: DoctorRecord[]) {
  const districts = Array.from(new Set(doctors.map((item) => item.district))).sort((a, b) => a.localeCompare(b));
  return ["All Wien", ...districts.filter((item) => item !== "All Wien")];
}

export function getTickerItemsFromDoctors(doctors: DoctorRecord[]) {
  const fallbackTimes = ["Heute 14:30 Uhr", "Heute 16:15 Uhr", "Morgen 09:00 Uhr", "Morgen 11:45 Uhr"];
  return doctors.slice(0, 3).map((doctor, index) => ({
    district: doctor.district,
    title: `${doctor.providerType} ${doctor.specialty}`,
    time: doctor.nextSlot ?? fallbackTimes[index % fallbackTimes.length],
    category: doctor.specialty,
    address: doctor.address,
  }));
}
