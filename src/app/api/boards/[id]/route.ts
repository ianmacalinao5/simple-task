import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { authorize, fail } from '@/lib/authorize';
const nameSchema = z.object({ name: z.string().trim().min(1).max(80) });
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await authorize(request, id);
    const db = adminDb();
    const [b, c, t] = await Promise.all([
      db.from('boards').select('id,name').eq('id', id).single(),
      db.from('columns').select('*').eq('board_id', id).order('position'),
      db.from('tasks').select('*').eq('board_id', id).order('position'),
    ]);
    if (b.error) throw b.error;
    if (c.error) throw c.error;
    if (t.error) throw t.error;
    return Response.json({
      ...b.data,
      columns: c.data,
      tasks: t.data,
      permission: access.permission,
    });
  } catch (error) {
    return fail(error);
  }
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await authorize(request, id, true);
    if (access.permission !== 'owner')
      throw new Error('Only the board owner can rename the board.');
    const body = nameSchema.parse(await request.json());
    const { data, error } = await adminDb()
      .from('boards')
      .update({ name: body.name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id,name')
      .single();
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
    const access = await authorize(request, id, true);
    if (access.permission !== 'owner' || !access.userId)
      throw new Error('Only the board owner can delete this project.');
    const db = adminDb();
    const { data: otherBoards, error: queryError } = await db
      .from('boards')
      .select('id')
      .eq('owner_id', access.userId)
      .neq('id', id)
      .limit(1);
    if (queryError) throw queryError;
    if (!otherBoards?.length)
      throw new Error(
        'A project is required. Create another project before deleting your only project.',
      );
    const { error } = await db.from('boards').delete().eq('id', id).eq('owner_id', access.userId);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
