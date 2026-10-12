import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { authorize, fail } from '@/lib/authorize';
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = adminDb();
    const { data: s, error: e } = await db
      .from('share_links')
      .select('board_id')
      .eq('id', id)
      .single();
    if (e) throw e;
    const a = await authorize(request, s.board_id, true);
    if (a.permission !== 'owner') throw new Error('Only the owner can manage sharing.');
    const { error } = await db
      .from('share_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
