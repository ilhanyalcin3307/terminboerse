import { notFound } from "next/navigation";
import ArztPage, { generateMetadata as arztMetadata } from "@/app/arzt/page";
import SpecialtyPage, { generateMetadata as specialtyMetadata } from "@/app/arzttermin-wien/[specialty]/page";

export const revalidate = 600;

const specialties = ["hausarzt", "hautarzt", "frauenarzt", "zahnarzt", "kinderarzt"];

type Props = { params: Promise<{ kind: string; page: string }> };

export function generateStaticParams() {
  return ["arzt", ...specialties].map((kind) => ({ kind, page: "1" }));
}

function getProps(kind: string, page: string) {
  if (!/^[1-9]\d{0,3}$/.test(page) || (kind !== "arzt" && !specialties.includes(kind))) {
    notFound();
  }
  return { params: Promise.resolve({ specialty: kind }), searchParams: Promise.resolve({ page }) };
}

export async function generateMetadata({ params }: Props) {
  const { kind, page } = await params;
  const props = getProps(kind, page);
  return kind === "arzt" ? arztMetadata(props) : specialtyMetadata(props);
}

export default async function DirectoryIsrPage({ params }: Props) {
  const { kind, page } = await params;
  const props = getProps(kind, page);
  return kind === "arzt" ? ArztPage(props) : SpecialtyPage(props);
}
