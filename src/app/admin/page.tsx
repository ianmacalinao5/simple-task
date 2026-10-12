'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { browserDb } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const {
          data: { session },
        } = await browserDb().auth.getSession();
        if (!live) return;
        if (session) {
          const res = await fetch('/api/boards');
          const body = await res.json();
          if (!res.ok) throw Error(body.error);
          router.replace(`/board/${body.id}`);
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load your board.');
      }
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [router]);
  async function signIn(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { error } = await browserDb().auth.signInWithPassword({ email, password });
      if (error) throw error;
      const response = await fetch('/api/boards');
      const body = await response.json();
      if (!response.ok) throw Error(body.error || 'Could not load your board.');
      router.replace(`/board/${body.id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not sign in. Check your email and password.',
      );
    } finally {
      setSubmitting(false);
    }
  }
  if (loading)
    return (
      <main className="access-page min-h-screen px-6 py-7 sm:px-10" aria-busy="true">
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col">
          <span className="sr-only">Loading your board…</span>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl bg-emerald-100" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36 bg-slate-100" />
            </div>
          </div>
          <div className="my-auto grid items-center gap-12 py-14 md:grid-cols-2">
            <div className="hidden space-y-5 md:block">
              <Skeleton className="h-4 w-44 bg-emerald-100" />
              <Skeleton className="h-12 w-4/5" />
              <Skeleton className="h-12 w-3/5 bg-emerald-100" />
              <Skeleton className="h-4 w-4/5 bg-slate-100" />
            </div>
            <Card className="rounded-[2rem] p-8 sm:p-10">
              <Skeleton className="mb-4 h-3 w-36 bg-emerald-100" />
              <Skeleton className="mb-3 h-7 w-3/4" />
              <Skeleton className="mb-2 h-3 w-full bg-slate-100" />
              <Skeleton className="mb-8 h-3 w-5/6 bg-slate-100" />
              <Skeleton className="mb-3 h-4 w-32" />
              <Skeleton className="mb-3 h-10 rounded-xl bg-slate-100" />
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="mb-3 h-10 rounded-xl bg-slate-100" />
              <Skeleton className="h-11 rounded-xl bg-emerald-100" />
            </Card>
          </div>
        </div>
      </main>
    );
  return (
    <main className="access-page relative min-h-screen overflow-hidden px-6 py-7 sm:px-10 lg:px-12">
      <div className="access-orb access-orb-one" aria-hidden="true" />
      <div className="access-orb access-orb-two" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-800 text-white shadow-lg shadow-emerald-900/10">
              <Check size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#1b362b]">Taskboard</h1>
              <p className="text-sm font-medium text-[#626f66]">Owner access</p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-xl px-4 py-2.5 font-bold text-[#254333]"
          >
            <Link href="/">Back to guest page</Link>
          </Button>
        </header>

        <div className="my-auto grid items-center gap-12 py-14 md:grid-cols-[1.1fr_0.9fr] md:gap-16 lg:gap-24">
          <section className="max-w-xl">
            <p className="mb-6 flex items-center gap-3 text-sm font-extrabold text-emerald-950">
              <span className="h-px w-8 bg-emerald-700/50" />A little more clarity, every day
            </p>
            <h2 className="text-5xl leading-[1.08] font-bold tracking-[-0.045em] text-[#1b362b] sm:text-6xl lg:text-[5rem]">
              Make room for
              <span className="calligraphy-heading mt-1 block font-bold text-emerald-900">
                meaningful work.
              </span>
            </h2>
            <p className="mt-7 max-w-md text-lg leading-8 font-medium text-[#59675e]">
              Gather your next steps in one thoughtful space. Keep projects moving, one small win at
              a time.
            </p>
            <div className="mt-9 hidden items-center gap-3 text-base font-semibold text-[#59675e] md:flex">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e5eee6] text-emerald-800">
                <Check size={15} strokeWidth={2.5} />
              </span>
              Private by default · easy to share when ready
            </div>
          </section>

          <Card
            asChild
            className="w-full rounded-[2rem] border-[#e7e3d8] bg-white/90 p-7 shadow-[0_24px_80px_-36px_rgba(27,54,43,0.28)] backdrop-blur-sm sm:p-10"
          >
            <section>
              <p className="mb-3 text-sm font-extrabold text-emerald-950">Your private workspace</p>
              <h3 className="text-3xl font-bold tracking-tight text-[#1b362b]">
                Welcome to your board
              </h3>
              <p className="mt-3 mb-7 text-base leading-7 font-medium text-[#59675e]">
                Sign in with your owner account. Collaborators can join a shared board with only
                their name.
              </p>
              <form onSubmit={signIn} className="space-y-4">
                <Label className="block text-base font-semibold text-[#263a2f]" htmlFor="email">
                  Email
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 h-10 rounded-xl bg-[#fcfcfa] px-4 text-base font-medium text-[#1b362b] placeholder:text-slate-500"
                  />
                </Label>
                <div>
                  <Label
                    className="block text-base font-semibold text-[#263a2f]"
                    htmlFor="password"
                  >
                    Password
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="h-10 rounded-xl bg-[#fcfcfa] px-4 pr-12 text-base font-medium text-[#1b362b] placeholder:text-slate-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute inset-y-1 right-1 size-10 text-[#52665a] hover:text-emerald-900"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </Button>
                  </div>
                </div>
                <Button
                  disabled={submitting}
                  className="group h-11 w-full rounded-xl text-base font-bold shadow-md shadow-emerald-900/10"
                >
                  {submitting ? (
                    <>
                      <Spinner /> Signing in…
                    </>
                  ) : (
                    'Sign in to your board'
                  )}
                  {!submitting && (
                    <ArrowRight
                      className="transition-transform group-hover:translate-x-0.5"
                      size={17}
                    />
                  )}
                </Button>
              </form>
              {error && (
                <Alert variant="destructive" className="mt-4 rounded-xl text-base font-medium">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <p className="mt-6 border-t border-[#edf0eb] pt-5 text-sm leading-6 font-medium text-[#59675e]">
                Your board stays private until you choose to share a view-only or editing link. Set
                up your owner credentials in Supabase Auth; don’t put them in app code.
              </p>
            </section>
          </Card>
        </div>

        <footer className="flex items-center justify-between border-t border-[#dfe4dc] pt-5 text-sm font-medium tracking-wide text-[#59675e]">
          <span>Make progress at your own pace.</span>
          <span className="hidden sm:inline">Plan · focus · finish</span>
        </footer>
      </div>
    </main>
  );
}
