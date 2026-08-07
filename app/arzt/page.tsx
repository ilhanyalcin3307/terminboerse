import { ArztDirectory } from "@/components/arzt/ArztDirectory";

type ArztPageProps = {
  searchParams: Promise<{ search?: string }>;
};

export default async function ArztPage({ searchParams }: ArztPageProps) {
  const params = await searchParams;
  return <ArztDirectory initialSearchQuery={params.search ?? ""} />;
}
