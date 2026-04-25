import { HomeBuyerPainSection } from "@/components/home/home-buyer-pain-section";
import { HomeCredibility } from "@/components/home/home-credibility";
import { HomeFeatures } from "@/components/home/home-features";
import { HomeFinalCta } from "@/components/home/home-final-cta";
import { HomeHero } from "@/components/home/home-hero";
import { HomeReportContents } from "@/components/home/home-report-contents";
import { HomeReportNotSection } from "@/components/home/home-report-not-section";
import { HomeSocialProof } from "@/components/home/home-social-proof";
import { FunnelHomeView } from "@/components/tracking/FunnelHomeView";

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <FunnelHomeView />
      <HomeHero />
      <HomeSocialProof />
      <HomeBuyerPainSection />
      <HomeFeatures />
      <HomeReportContents />
      <HomeReportNotSection />
      <HomeCredibility />
      <HomeFinalCta />
    </main>
  );
}
