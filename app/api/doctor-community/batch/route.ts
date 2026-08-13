import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { trackDoctorListImpressions } from "@/lib/doctorCommunity";
import { normalizeDoctorsData } from "@/lib/doctors";

type BatchEventBody = {
  event?: "list_impression";
  doctorIds?: string[];
};

const doctors = normalizeDoctorsData(doctorsJson);
const knownDoctorIds = new Set(doctors.map((doctor) => doctor.id));

function resolveKnownDoctorIds(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as string[];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of input) {
    if (typeof item !== "string") {
      continue;
    }

    const doctorId = decodeURIComponent(item).trim();
    if (!doctorId || seen.has(doctorId) || !knownDoctorIds.has(doctorId)) {
      continue;
    }

    seen.add(doctorId);
    result.push(doctorId);
  }

  return result;
}

export async function POST(request: Request) {
  let body: BatchEventBody = {};
  try {
    body = (await request.json()) as BatchEventBody;
  } catch {
    body = {};
  }

  if (body.event !== "list_impression") {
    return NextResponse.json({ ok: false, error: "Unsupported event" }, { status: 400 });
  }

  const doctorIds = resolveKnownDoctorIds(body.doctorIds);

  if (doctorIds.length === 0) {
    return NextResponse.json({ ok: true, tracked: 0 });
  }

  await trackDoctorListImpressions(doctorIds);

  return NextResponse.json({ ok: true, tracked: doctorIds.length });
}