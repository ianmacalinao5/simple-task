import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { authorize, fail } from '@/lib/authorize';
const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    source_label: z.string().trim().min(1).max(60).nullable().optional(),
    source_url: z
      .string()
      .trim()
      .url()
      .max(2048)
      .refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS link.')
      .nullable()
      .optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    due_date: z.string().nullable().optional(),
    column_id: z.string().uuid().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine(
    (body) =>
      (body.source_label === undefined && body.source_url === undefined) ||
      Boolean(body.source_label) === Boolean(body.source_url),
    'Enter both a source name and its URL, or leave both blank.',
  );
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = adminDb();
    const { data: task, error: lookup } = await db
      .from('tasks')
      .select('board_id')
      .eq('id', id)
      .single();
    if (lookup) throw lookup;
    await authorize(request, task.board_id, true);
    const body = updateSchema.parse(await request.json());
    if (body.column_id) {
      const { data: column, error } = await db
        .from('columns')
        .select('id')
        .eq('id', body.column_id)
        .eq('board_id', task.board_id)
        .single();
      if (error || !column) throw new Error('Column does not belong to this board.');
    }
    const { data, error } = await db
      .from('tasks')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
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
    const db = adminDb();
    const { data: task, error: lookup } = await db
      .from('tasks')
      .select('board_id')
      .eq('id', id)
      .single();
    if (lookup) throw lookup;
    await authorize(request, task.board_id, true);
    const { error } = await db.from('tasks').delete().eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
