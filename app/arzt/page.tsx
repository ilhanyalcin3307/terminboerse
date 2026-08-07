import { ArztDirectory } from "@/components/arzt/ArztDirectory";

type ArztPageProps = {
  searchParams: Promise<{ search?: string; category?: string; district?: string }>;
};

export default async function ArztPage({ searchParams }: ArztPageProps) {
  const params = await searchParams;
  const initialSearchQuery = params.search ?? "";
  const initialSelectedSpecialty = params.category ?? "Alle Fachbereiche";
  const initialSelectedDistrict = params.district ?? "Alle Bezirke";

  return (
    <ArztDirectory
      key={`${initialSearchQuery}::${initialSelectedSpecialty}::${initialSelectedDistrict}`}
      initialSearchQuery={initialSearchQuery}
      initialSelectedSpecialty={initialSelectedSpecialty}
      initialSelectedDistrict={initialSelectedDistrict}
    />
  );
}
