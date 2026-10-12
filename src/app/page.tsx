'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const boardPath = /^\/board\/([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})\/?$/i;
const shareToken = /^[A-Za-z0-9_-]{24,128}$/;

export default function Home() {
  const [name, setName] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function continueToBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 80) {
      setError('Enter a name between 1 and 80 characters.');
      return;
    }

    let invite: URL;
    try {
      invite = new URL(inviteLink.trim(), window.location.origin);
    } catch {
      setError('Paste a valid board invitation link.');
      return;
    }

    const match = boardPath.exec(invite.pathname);
    const token = invite.searchParams.get('token') || '';
    if (!match || !shareToken.test(token)) {
      setError(
        'That link does not look like a board invitation. Ask the board owner to share an edit link.',
      );
      return;
    }

    setSubmitting(true);
    localStorage.setItem(`taskboard:guest:${match[1]}`, JSON.stringify({ name: trimmedName }));
    router.push(`/board/${match[1]}?token=${encodeURIComponent(token)}`);
  }

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
              <p className="text-sm font-medium text-[#626f66]">A calmer way to get things done.</p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-xl px-4 py-2.5 font-bold text-[#254333]"
          >
            <Link href="/admin">Sign in</Link>
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
              Jump into a shared board, add your name, and keep the work moving. No account or email
              needed.
            </p>
            <div className="mt-9 hidden items-center gap-3 text-base font-semibold text-[#59675e] md:flex">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e5eee6] text-emerald-800">
                <Check size={15} strokeWidth={2.5} />
              </span>
              Just your name and a board invitation
            </div>
          </section>

          <Card
            asChild
            className="w-full rounded-[2rem] border-[#e7e3d8] bg-white/90 p-7 shadow-[0_24px_80px_-36px_rgba(27,54,43,0.28)] backdrop-blur-sm sm:p-10"
          >
            <section>
              <p className="mb-3 text-xs font-bold tracking-[0.16em] text-emerald-900 uppercase">
                No account needed
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-[#1b362b]">
                Continue with your name
              </h3>
              <p className="mt-3 mb-7 text-base leading-7 font-medium text-[#59675e]">
                Enter the name your teammates will see and paste the board invitation link you were
                given.
              </p>
              <form onSubmit={continueToBoard} className="space-y-5">
                <Label
                  className="block text-base font-semibold text-[#263a2f]"
                  htmlFor="guest-name"
                >
                  Your name
                  <Input
                    id="guest-name"
                    autoComplete="name"
                    maxLength={80}
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="How should we identify you?"
                    className="mt-2 h-10 rounded-xl bg-[#fcfcfa] px-4 text-base font-medium text-[#1b362b] placeholder:text-slate-500"
                  />
                </Label>
                <Label
                  className="block text-base font-semibold text-[#263a2f]"
                  htmlFor="invite-link"
                >
                  Board invitation link
                  <Input
                    id="invite-link"
                    type="url"
                    inputMode="url"
                    required
                    value={inviteLink}
                    onChange={(event) => setInviteLink(event.target.value)}
                    placeholder="Paste the link shared with you"
                    className="mt-2 h-10 rounded-xl bg-[#fcfcfa] px-4 text-base font-medium text-[#1b362b] placeholder:text-slate-500"
                  />
                </Label>
                <Button
                  disabled={submitting}
                  className="group h-11 w-full rounded-xl text-base font-bold shadow-md shadow-emerald-900/10"
                >
                  {submitting ? (
                    <>
                      <Spinner /> Opening your board…
                    </>
                  ) : (
                    'Continue to board'
                  )}
                  {!submitting && (
                    <ArrowRight
                      className="transition-transform group-hover:translate-x-0.5"
                      size={19}
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
                Your name is saved on this device and shown on the tasks you create.
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
