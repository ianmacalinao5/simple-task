import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { authorize, fail } from '@/lib/authorize';
const input = z
  .object({
    board_id: z.string().uuid(),
    column_id: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
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
    priority: z.enum(['low', 'medium', 'high']),
    due_date: z.string().nullable().optional(),
  })
  .refine(
    (body) => Boolean(body.source_label) === Boolean(body.source_url),
    'Enter both a source name and its URL, or leave both blank.',
  );
export async function POST(request: NextRequest) {
  try {
    const body = input.parse(await request.json());
    const access = await authorize(request, body.board_id, true);
    const db = adminDb();
    const { data: column, error: columnError } = await db
      .from('columns')
      .select('id')
      .eq('id', body.column_id)
      .eq('board_id', body.board_id)
      .single();
    if (columnError || !column) throw new Error('Column does not belong to this board.');
    const { data: last, error: lastError } = await db
      .from('tasks')
      .select('position')
      .eq('column_id', body.column_id)
      .order('position', { ascending: false })
      .limit(1);
    if (lastError) throw lastError;
    const position = (last?.[0]?.position ?? -1) + 1;
    const { data, error } = await db
      .from('tasks')
      .insert({
        ...body,
        position,
        created_by_name: access.actor?.name ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
