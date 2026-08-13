import { NextResponse } from "next/server";

const body = `# Terminboerse.at

Terminboerse.at helps people in Vienna find short-notice doctor appointments and discover pharmacies by district.

## Main URLs
- Home: https://www.terminboerse.at/
- Doctor directory: https://www.terminboerse.at/arzt
- Doctor profile pages: https://www.terminboerse.at/arzt/[doctor-slug]
- Doctor area login/registration: https://www.terminboerse.at/arztbereich
- User login: https://www.terminboerse.at/login
- Contact: https://www.terminboerse.at/kontakt

## Key features
- Search doctors by specialty, district, and optional doctor name.
- Display manually published free time slots for the next 3 days.
- Direct contact and appointment request flow for doctor profiles.
- Pharmacy search on the homepage with district filter.
- Doctor area for profile management and free-slot publication.

## Geographic scope
- City: Vienna (Wien), Austria

## Canonical policy
- Use https://www.terminboerse.at as canonical host.
`;

export async function GET() {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
