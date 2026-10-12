import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { authorize, fail } from '@/lib/authorize';
const schema = z.object({ board_id: z.string().uuid(), name: z.string().trim().min(1).max(40) });
export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const a = await authorize(request, body.board_id, true);
    if (a.permission !== 'owner') throw new Error('Only the owner can manage columns.');
    const db = adminDb();
    const { data: cols, error: queryError } = await db
      .from('columns')
      .select('position')
      .eq('board_id', body.board_id)
      .order('position', { ascending: false })
      .limit(1);
    if (queryError) throw queryError;
    const position = (cols?.[0]?.position ?? -1) + 1;
    const { data, error } = await db
      .from('columns')
      .insert({ ...body, position })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
