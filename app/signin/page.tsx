import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Sign in · Marketplace / AI' };

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-marketplace-paper px-5 py-16">
      <AuthForm mode="signin" />
    </main>
  );
}
