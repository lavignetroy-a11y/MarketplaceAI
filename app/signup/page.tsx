import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Create account · Marketplace / AI' };

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-marketplace-paper px-5 py-16">
      <AuthForm mode="signup" />
    </main>
  );
}
