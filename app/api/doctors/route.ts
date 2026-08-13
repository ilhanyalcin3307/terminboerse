import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getDoctorCommunityPreviews } from "@/lib/doctorCommunity";
import { getNextFreeSlotMap } from "@/lib/manualDoctorSlots";
import {
  getDoctorDistricts,
  getDoctorSpecialties,
  normalizeDoctorsData,
  tokenizeDoctorSearch,
} from "@/lib/doctors";

const ALL_SPECIALTIES = "Alle Fachbereiche";
const ALL_DISTRICTS = "Alle Bezirke";
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

const allDoctors = normalizeDoctorsData(doctorsJson);
const allSpecialties = [ALL_SPECIALTIES, ...getDoctorSpecialties(allDoctors)];
const allDistricts = [ALL_DISTRICTS, ...getDoctorDistricts(allDoctors).filter((item) => item !== "All Wien")];
const doctorsWithIndex = allDoctors.map((doctor) => ({
  doctor,
  searchable: tokenizeDoctorSearch(`${doctor.name} ${doctor.address} ${doctor.specialty} ${doctor.district}`).join(" "),
}));

const baseStats = {
  totalDoctors: allDoctors.length,
  totalWithPhone: allDoctors.filter((item) => Boolean(item.phone)).length,
  totalSpecialties: allSpecialties.length - 1,
};

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

function formatNextSlot(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q")?.trim() ?? "";
  const district = searchParams.get("district")?.trim() ?? ALL_DISTRICTS;
  const specialty = searchParams.get("specialty")?.trim() ?? ALL_SPECIALTIES;
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  const tokens = tokenizeDoctorSearch(query);

  const filtered = doctorsWithIndex
    .filter(({ doctor, searchable }) => {
      const byDistrict = district === ALL_DISTRICTS || doctor.district === district;
      const bySpecialty = specialty === ALL_SPECIALTIES || doctor.specialty === specialty;
      const byQuery = tokens.length === 0 || tokens.every((token) => searchable.includes(token));
      return byDistrict && bySpecialty && byQuery;
    })
    .map((entry) => entry.doctor);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const doctorsPage = filtered.slice(offset, offset + pageSize);
  const communityByDoctorId = new Map(
    (await getDoctorCommunityPreviews(doctorsPage.map((doctor) => doctor.id))).map((entry) => [entry.doctorId, entry]),
  );
  const nextSlotByDoctorId = await getNextFreeSlotMap(doctorsPage.map((doctor) => doctor.id));

  const doctors = doctorsPage.map((doctor) => {
    const community = communityByDoctorId.get(doctor.id);
    const nextSlot = nextSlotByDoctorId.get(doctor.id);

    return {
      ...doctor,
      nextSlot: nextSlot ? formatNextSlot(nextSlot.start) : doctor.nextSlot,
      averageRating: community?.averageRating,
      ratingsCount: community?.ratingsCount,
      commentsCount: community?.commentsCount,
      viewsCount: community?.viewsCount,
    };
  });

  return NextResponse.json({
    doctors,
    pagination: {
      total,
      page: safePage,
      pageSize,
      totalPages,
    },
    facets: {
      districts: allDistricts,
      specialties: allSpecialties,
    },
    stats: baseStats,
  });
}