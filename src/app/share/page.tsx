import AppShell from "@/components/AppShell";

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const combined = [pick(params.title), pick(params.text), pick(params.url)]
    .filter(Boolean)
    .join("\n");

  return <AppShell initialText={combined || undefined} />;
}
