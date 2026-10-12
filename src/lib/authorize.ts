import { createHash, randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';
import type { Permission } from '@/lib/types';
const collaboratorSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
const windows = new Map<string, { started: number; count: number }>();
function rateLimit(request: NextRequest, write: boolean) {
  const now = Date.now();
  for (const [key, value] of windows) if (now - value.started > 60_000) windows.delete(key);
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const key = `${ip}:${write ? 'write' : 'read'}`;
  const entry = windows.get(key);
  if (!entry || now - entry.started > 60_000) {
    windows.set(key, { started: now, count: 1 });
    return;
  }
  entry.count++;
  if (entry.count > (write ? 90 : 180))
    throw new Error('Too many requests. Please wait a minute and try again.');
}
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export function newToken() {
  return randomBytes(32).toString('base64url');
}
export async function authorize(
  request: NextRequest,
  boardId: string,
  write = false,
): Promise<{
  permission: Permission;
  userId?: string;
  actor?: { name: string };
}> {
  rateLimit(request, write);
  const user = await getUser();
  const db = adminDb();
  if (user) {
    const { data } = await db
      .from('boards')
      .select('id')
      .eq('id', boardId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (data) return { permission: 'owner', userId: user.id };
  }
  const token = request.headers.get('x-share-token') || request.nextUrl.searchParams.get('token');
  if (!token || token.length > 100) throw new Error('A valid board access link is required.');
  const { data } = await db
    .from('share_links')
    .select('permission,expires_at,revoked_at')
    .eq('board_id', boardId)
    .eq('token_hash', hashToken(token))
    .maybeSingle();
  if (!data || data.revoked_at || (data.expires_at && new Date(data.expires_at) <= new Date()))
    throw new Error('This board link is invalid or expired.');
  if (write && data.permission !== 'edit') throw new Error('This link only allows viewing.');
  if (write) {
    const actor = collaboratorSchema.safeParse({ name: request.headers.get('x-actor-name') });
    if (!actor.success)
      throw new Error('A valid name is required for collaborators using an edit link.');
    return { permission: data.permission, userId: undefined, actor: actor.data };
  }
  return { permission: data.permission, userId: undefined };
}
export function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  const isValidation =
    !!error && typeof error === 'object' && (error as { name?: string }).name === 'ZodError';
  const status = /too many requests/i.test(message)
    ? 429
    : isValidation || /valid name is required/i.test(message)
      ? 400
      : /required|invalid|expired|only allows|only .*owner|view-only/i.test(message)
        ? 403
        : 500;
  return Response.json({ error: message }, { status });
}
