type DoctorComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

export type DoctorCommunitySnapshot = {
  doctorId: string;
  averageRating: number;
  ratingsCount: number;
  viewsCount: number;
  lastComments: DoctorComment[];
  canRate: boolean;
};

const viewCounters = new Map<string, number>();

const COMMENT_POOL = [
  "Sehr freundliches Team und strukturierter Ablauf.",
  "Ich habe schnell einen Termin bekommen und wurde gut informiert.",
  "Praxis gut erreichbar, Termin lief ohne lange Wartezeit.",
  "Klare Kommunikation und angenehme Betreuung vor Ort.",
  "Ordination wirkte organisiert, ich habe mich gut aufgehoben gefühlt.",
  "Ruhige Atmosphäre und professionelle Beratung.",
  "Der Ablauf war effizient und transparent erklärt.",
  "Gute Erreichbarkeit und hilfreiche Rückmeldung auf meine Anfrage.",
];

const AUTHOR_POOL = [
  "Patient A.",
  "Patientin M.",
  "Besucher K.",
  "Patient P.",
  "Patientin S.",
  "Besucherin L.",
  "Patient R.",
  "Patientin T.",
];

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function getSeededBaseMetrics(doctorId: string) {
  const seed = hashString(doctorId);
  const ratingsCount = 12 + (seed % 89);
  const ratingRaw = 3.9 + ((seed % 12) / 20);
  const averageRating = Math.min(4.8, Number(ratingRaw.toFixed(1)));
  const viewsCount = 180 + (seed % 2600);
  return { ratingsCount, averageRating, viewsCount, seed };
}

function getSeededComments(doctorId: string): DoctorComment[] {
  const { seed } = getSeededBaseMetrics(doctorId);
  const comments: DoctorComment[] = [];

  for (let index = 0; index < 3; index += 1) {
    const commentIndex = (seed + index * 3) % COMMENT_POOL.length;
    const authorIndex = (seed + index * 5) % AUTHOR_POOL.length;
    const daysAgo = 4 + ((seed + index * 11) % 75);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    comments.push({
      id: `${doctorId}-comment-${index + 1}`,
      author: AUTHOR_POOL[authorIndex],
      message: COMMENT_POOL[commentIndex],
      createdAt,
    });
  }

  return comments;
}

export function trackDoctorProfileView(doctorId: string) {
  const current = viewCounters.get(doctorId) ?? 0;
  viewCounters.set(doctorId, current + 1);
}

export function getDoctorCommunitySnapshot(doctorId: string): DoctorCommunitySnapshot {
  const base = getSeededBaseMetrics(doctorId);
  const trackedViews = viewCounters.get(doctorId) ?? 0;

  return {
    doctorId,
    averageRating: base.averageRating,
    ratingsCount: base.ratingsCount,
    viewsCount: base.viewsCount + trackedViews,
    lastComments: getSeededComments(doctorId),
    canRate: false,
  };
}