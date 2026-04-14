import { HomelabExperience } from "@/components/homelab-experience";
import { getOverview } from "@/lib/overview";

export const dynamic = "force-dynamic";

export default async function Home() {
  const overview = await getOverview();

  return (
    <HomelabExperience initialOverview={overview} />
  );
}
