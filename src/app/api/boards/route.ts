import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';
import { fail } from '@/lib/authorize';
const schema = z.object({ name: z.string().trim().min(1).max(80).optional() });
export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user)
      return Response.json({ error: 'Sign in to create or access your board.' }, { status: 401 });
    const db = adminDb();
    const url = new URL(request.url);
    if (url.searchParams.get('all') === '1') {
      const { data, error } = await db
        .from('boards')
        .select('id,name')
        .eq('owner_id', user.id)
        .order('created_at');
      if (error) throw error;
      return Response.json(data);
    }
    let { data: board } = await db
      .from('boards')
      .select('id,name')
      .eq('owner_id', user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (!board) {
      const created = await db
        .from('boards')
        .insert({ owner_id: user.id, name: 'My task board' })
        .select('id,name')
        .single();
      if (created.error) throw created.error;
      board = created.data;
      const result = await db.from('columns').insert(
        ['To Do', 'In Progress', 'Review', 'Done'].map((name, position) => ({
          board_id: board!.id,
          name,
          position,
        })),
      );
      if (result.error) throw result.error;
    }
    return Response.json(board);
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Sign in to create a board.' }, { status: 401 });
    const body = schema.parse(await request.json());
    const db = adminDb();
    const { data: board, error } = await db
      .from('boards')
      .insert({ owner_id: user.id, name: body.name || 'My task board' })
      .select('id,name')
      .single();
    if (error) throw error;
    const result = await db.from('columns').insert(
      ['To Do', 'In Progress', 'Review', 'Done'].map((name, position) => ({
        board_id: board.id,
        name,
        position,
      })),
    );
    if (result.error) {
      await db.from('boards').delete().eq('id', board.id);
      throw result.error;
    }
    return Response.json(board, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
