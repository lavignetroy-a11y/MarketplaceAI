import { Hero } from '@/components/marketing/Hero';
import { Nav } from '@/components/marketing/Nav';

export default function Home() {
  return (
    <main className="min-h-screen bg-marketplace-paper text-marketplace-ink">
      <Nav />
      <Hero />
      {/* Remaining sections (marketplace feed, benefits, how it works, campaign reveal, trust,
          categories, examples, pricing, FAQ, final CTA, footer) come next. */}
    </main>
  );
}
