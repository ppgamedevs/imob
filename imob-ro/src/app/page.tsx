import { HomeClaritySection } from "@/components/home/home-clarity-section";
import { HomeCredibility } from "@/components/home/home-credibility";
import { HomeFeatures } from "@/components/home/home-features";
import { HomeFinalCta } from "@/components/home/home-final-cta";
import { HomeHero } from "@/components/home/home-hero";
import { HomeReportContents } from "@/components/home/home-report-contents";
import { HomeSocialProof } from "@/components/home/home-social-proof";

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <HomeHero />
      <HomeSocialProof />
      <HomeFeatures />
      <HomeReportContents />
      <HomeClaritySection />
      <HomeCredibility />
      <HomeFinalCta />
    </main>
  );
}
