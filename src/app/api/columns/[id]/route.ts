import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { authorize, fail } from '@/lib/authorize';
const schema = z.object({ name: z.string().trim().min(1).max(40) });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = adminDb();
    const { data: c, error: e } = await db.from('columns').select('board_id').eq('id', id).single();
    if (e) throw e;
    const a = await authorize(request, c.board_id, true);
    if (a.permission !== 'owner') throw new Error('Only the owner can manage columns.');
    const body = schema.parse(await request.json());
    const { data, error } = await db.from('columns').update(body).eq('id', id).select().single();
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = adminDb();
    const { data: c, error: e } = await db.from('columns').select('board_id').eq('id', id).single();
    if (e) throw e;
    const a = await authorize(request, c.board_id, true);
    if (a.permission !== 'owner') throw new Error('Only the owner can manage columns.');
    const { count } = await db
      .from('columns')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', c.board_id);
    if ((count || 0) <= 1) throw new Error('The last column cannot be deleted.');
    const { error } = await db.from('columns').delete().eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
