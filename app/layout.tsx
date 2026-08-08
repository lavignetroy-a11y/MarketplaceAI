import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'Marketplace / AI',
  description:
    'Turn the photos you already have into a polished, coordinated marketplace listing image campaign.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Smooth scrolling is ours, set in globals.css for the in-page nav links. Declaring it on the
  // root element tells Next it is intentional, so it stops warning and stops overriding it on
  // route changes.
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;550;600;650;700;800&family=Geist+Mono:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
