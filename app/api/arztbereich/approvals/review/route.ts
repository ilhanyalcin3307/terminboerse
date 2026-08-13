import { NextResponse } from "next/server";
import { reviewPendingRegistration } from "@/lib/arztbereichAdminStore";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";

type ReviewBody = {
  token?: string;
  requestId?: string;
  decision?: "approve" | "reject";
  reviewNote?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewBody;
    const token = typeof body.token === "string" ? body.token : "";
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const decision = body.decision;
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote : "";

    if (!token || !requestId || (decision !== "approve" && decision !== "reject")) {
      return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
    }

    const session = verifyArztbereichSessionToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const requestItem = await reviewPendingRegistration({
      requestId,
      decision,
      reviewerEmail: session.email,
      reviewNote,
    });

    return NextResponse.json({ ok: true, request: requestItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interner Fehler bei der Freigabe.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
