import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { normalizeDoctorsData } from "@/lib/doctors";

export async function GET() {
  const doctors = normalizeDoctorsData(doctorsJson);
  return NextResponse.json({ doctors });
}