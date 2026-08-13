import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getDoctorCommunitySnapshot, trackDoctorProfileView } from "@/lib/doctorCommunity";
import { findDoctorById, normalizeDoctorsData } from "@/lib/doctors";

type RouteContext = {
  params: Promise<{ doctorId: string }>;
};

type CommunityEventBody = {
  event?: "view";
};

const doctors = normalizeDoctorsData(doctorsJson);

function resolveDoctorByRouteParam(rawDoctorId: string) {
  return findDoctorById(doctors, decodeURIComponent(rawDoctorId));
}

export async function GET(_: Request, context: RouteContext) {
  const { doctorId } = await context.params;
  const doctor = resolveDoctorByRouteParam(doctorId);

  if (!doctor) {
    return NextResponse.json({ ok: false, error: "Doctor not found" }, { status: 404 });
  }

  const snapshot = await getDoctorCommunitySnapshot(doctor.id);

  return NextResponse.json({
    ok: true,
    snapshot,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { doctorId } = await context.params;
  const doctor = resolveDoctorByRouteParam(doctorId);

  if (!doctor) {
    return NextResponse.json({ ok: false, error: "Doctor not found" }, { status: 404 });
  }

  let body: CommunityEventBody = {};
  try {
    body = (await request.json()) as CommunityEventBody;
  } catch {
    body = {};
  }

  if (body.event === "view") {
    await trackDoctorProfileView(doctor.id);
  }

  const snapshot = await getDoctorCommunitySnapshot(doctor.id);

  return NextResponse.json({
    ok: true,
    snapshot,
  });
}