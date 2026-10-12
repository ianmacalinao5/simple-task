import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { authorize, fail, hashToken, newToken } from '@/lib/authorize';
const schema = z.object({
  board_id: z.string().uuid(),
  permission: z.enum(['view', 'edit']),
  expires_at: z.string().datetime().nullable().optional(),
});
export async function GET(request: NextRequest) {
  try {
    const board = request.nextUrl.searchParams.get('board_id');
    if (!board) throw new Error('Board ID is required.');
    const a = await authorize(request, board, true);
    if (a.permission !== 'owner') throw new Error('Only the owner can manage sharing.');
    const { data, error } = await adminDb()
      .from('share_links')
      .select('id,permission,expires_at,revoked_at,created_at')
      .eq('board_id', board)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const a = await authorize(request, body.board_id, true);
    if (a.permission !== 'owner') throw new Error('Only the owner can manage sharing.');
    const token = newToken();
    const { data, error } = await adminDb()
      .from('share_links')
      .insert({
        board_id: body.board_id,
        permission: body.permission,
        expires_at: body.expires_at || null,
        token_hash: hashToken(token),
      })
      .select('id,permission,expires_at,created_at')
      .single();
    if (error) throw error;
    return Response.json({ ...data, token }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
