import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
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
  const doctors = filtered.slice(offset, offset + pageSize);

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