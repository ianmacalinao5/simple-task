import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { authorize, fail } from '@/lib/authorize';
const schema = z.object({
  board_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        column_id: z.string().uuid(),
        position: z.number().int().min(0),
      }),
    )
    .max(500),
});
export async function PUT(request: NextRequest) {
  try {
    const { board_id, items } = schema.parse(await request.json());
    await authorize(request, board_id, true);
    const { error } = await adminDb().rpc('reorder_tasks', {
      p_board_id: board_id,
      p_items: items,
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
