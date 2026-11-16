import apothekenJson from "@/data/APOTHEKEOGD.json";
import haltestellenJson from "@/data/HALTESTELLENOGD.json";
import garagenJson from "@/data/GARAGENOGD.json";

type ApothekeFeature = {
  geometry?: { coordinates?: number[] };
  properties?: { BEZEICHNUNG?: string; ADRESSE?: string };
};

type ApothekeFeatureCollection = {
  features?: ApothekeFeature[];
};

type HaltestelleFeature = {
  geometry?: { coordinates?: number[] };
  properties?: { HTXT?: string; HLINIEN?: string };
};

type HaltestelleFeatureCollection = {
  features?: HaltestelleFeature[];
};

type GarageFeature = {
  properties?: {
    BEZEICHNUNG?: string;
    ADRESSE?: string;
    BETREIBER?: string;
    LATITUDE?: number;
    LONGITUDE?: number;
    PARK_AND_RIDE?: string;
  };
};

type GarageFeatureCollection = {
  features?: GarageFeature[];
};

export type NearestPharmacy = {
  name: string;
  address: string;
  distanceMeters: number;
};

export type NearestTransitStop = {
  name: string;
  lines: string[];
  distanceMeters: number;
};

export type NearestParkingGarage = {
  name: string;
  address: string;
  operator: string;
  parkAndRide: boolean;
  distanceMeters: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

// Haversine-Distanz in Metern zwischen zwei WGS84-Koordinaten.
function distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let cachedPharmacies: Array<{ name: string; address: string; lat: number; lng: number }> | null = null;

function loadPharmacies() {
  if (cachedPharmacies) {
    return cachedPharmacies;
  }

  const collection = apothekenJson as ApothekeFeatureCollection;
  cachedPharmacies = (collection.features ?? [])
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const lng = coordinates?.[0];
      const lat = coordinates?.[1];
      const name = feature.properties?.BEZEICHNUNG?.trim();
      const address = feature.properties?.ADRESSE?.trim();
      if (typeof lat !== "number" || typeof lng !== "number" || !name || !address) {
        return null;
      }
      return { name, address, lat, lng };
    })
    .filter((item): item is { name: string; address: string; lat: number; lng: number } => item !== null);

  return cachedPharmacies;
}

export function getNearestPharmacy(latitude?: number, longitude?: number): NearestPharmacy | null {
  return getNearestPharmacies(latitude, longitude, 1)[0] ?? null;
}

export function getNearestPharmacies(latitude?: number, longitude?: number, limit = 3): NearestPharmacy[] {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return [];
  }

  return loadPharmacies()
    .map((pharmacy) => ({
      name: pharmacy.name,
      address: pharmacy.address,
      distanceMeters: distanceInMeters(latitude, longitude, pharmacy.lat, pharmacy.lng),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

let cachedHaltestellen: Array<{ name: string; lines: string[]; lat: number; lng: number }> | null = null;

function loadHaltestellen() {
  if (cachedHaltestellen) {
    return cachedHaltestellen;
  }

  const collection = haltestellenJson as HaltestelleFeatureCollection;
  cachedHaltestellen = (collection.features ?? [])
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const lng = coordinates?.[0];
      const lat = coordinates?.[1];
      const name = feature.properties?.HTXT?.trim();
      const lines = (feature.properties?.HLINIEN ?? "")
        .split(",")
        .map((line) => line.trim())
        .filter(Boolean);
      if (typeof lat !== "number" || typeof lng !== "number" || !name) {
        return null;
      }
      return { name, lines, lat, lng };
    })
    .filter((item): item is { name: string; lines: string[]; lat: number; lng: number } => item !== null);

  return cachedHaltestellen;
}

// Quelle: offene Haltestellendaten der Stadt Wien (ogdwien:OEFFHALTESTOGD).
// Nahe Einzeleintraege derselben Haltestelle (z. B. je Fahrtrichtung) werden zu einem Eintrag zusammengefasst.
export function getNearestTransitStops(latitude?: number, longitude?: number, limit = 3): NearestTransitStop[] {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return [];
  }

  const nearestRaw = loadHaltestellen()
    .map((stop) => ({
      name: stop.name,
      lines: stop.lines,
      distanceMeters: distanceInMeters(latitude, longitude, stop.lat, stop.lng),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 30);

  const groupedByName = new Map<string, NearestTransitStop>();
  for (const entry of nearestRaw) {
    const existing = groupedByName.get(entry.name);
    if (!existing) {
      groupedByName.set(entry.name, { name: entry.name, lines: [...entry.lines], distanceMeters: entry.distanceMeters });
      continue;
    }
    existing.distanceMeters = Math.min(existing.distanceMeters, entry.distanceMeters);
    existing.lines = Array.from(new Set([...existing.lines, ...entry.lines]));
  }

  return Array.from(groupedByName.values())
    .map((stop) => ({ ...stop, lines: stop.lines.sort((a, b) => a.localeCompare(b, "de", { numeric: true })) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

let cachedGaragen: Array<{ name: string; address: string; operator: string; parkAndRide: boolean; lat: number; lng: number }> | null = null;

function loadGaragen() {
  if (cachedGaragen) {
    return cachedGaragen;
  }

  const collection = garagenJson as GarageFeatureCollection;
  cachedGaragen = (collection.features ?? [])
    .map((feature) => {
      const lat = feature.properties?.LATITUDE;
      const lng = feature.properties?.LONGITUDE;
      const name = feature.properties?.BEZEICHNUNG?.trim();
      const address = feature.properties?.ADRESSE?.trim();
      if (typeof lat !== "number" || typeof lng !== "number" || !name || !address) {
        return null;
      }
      return {
        name,
        address,
        operator: feature.properties?.BETREIBER?.trim() ?? "",
        parkAndRide: feature.properties?.PARK_AND_RIDE === "J" || feature.properties?.PARK_AND_RIDE === "Y",
        lat,
        lng,
      };
    })
    .filter(
      (item): item is { name: string; address: string; operator: string; parkAndRide: boolean; lat: number; lng: number } =>
        item !== null,
    );

  return cachedGaragen;
}

// Quelle: offene Garagendaten der Stadt Wien (ogdwien:GARAGENOGD).
export function getNearestParkingGarages(latitude?: number, longitude?: number, limit = 3): NearestParkingGarage[] {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return [];
  }

  return loadGaragen()
    .map((garage) => ({
      name: garage.name,
      address: garage.address,
      operator: garage.operator,
      parkAndRide: garage.parkAndRide,
      distanceMeters: distanceInMeters(latitude, longitude, garage.lat, garage.lng),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}
