import { CampaignReveal } from '@/components/marketing/CampaignReveal';
import { Examples } from '@/components/marketing/Examples';
import { Faq } from '@/components/marketing/Faq';
import { FinalCta } from '@/components/marketing/FinalCta';
import { Footer } from '@/components/marketing/Footer';
import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Nav } from '@/components/marketing/Nav';
import { Pricing } from '@/components/marketing/Pricing';
import { Trust } from '@/components/marketing/Trust';
import { WhyItMatters } from '@/components/marketing/WhyItMatters';
import { Stakes } from '@/components/marketing/Stakes';
import { IconGradientDefs } from '@/components/marketing/primitives';

// Section order follows the sales narrative: hook, why it matters, the differentiator, how
// easy it is, why it's honest, proof, price, objections, close. Light and dark alternate so
// no two adjacent sections read the same.
export default function Home() {
  return (
    <main className="min-h-screen bg-marketplace-paper text-marketplace-ink">
      <IconGradientDefs />
      <Nav />
      <Hero />
      <Stakes />
      <WhyItMatters />
      <CampaignReveal />
      <HowItWorks />
      <Trust />
      <Examples />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
