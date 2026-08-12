import { notFound } from 'next/navigation';

/**
 * The studio is an internal tool for generating this site's own marketing imagery. It spends money
 * against the OpenAI key on every run.
 *
 * Its two API routes already refuse in production. The PAGE did not, so the whole interface --
 * batch controls, cost estimates, the manifest -- was publicly reachable on the live site. The
 * buttons would have failed, but shipping an internal console to visitors is not something to rely
 * on the buttons failing for.
 *
 * A layout is the right place for this: it is a server component wrapping every route under
 * /studio, so a page added later is covered without anyone remembering to gate it.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <>{children}</>;
}
