export type Column = { id: string; board_id: string; name: string; position: number };
export type Task = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  source_label: string | null;
  source_url: string | null;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  position: number;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
};
export type Board = { id: string; name: string; columns: Column[]; tasks: Task[] };
export type Permission = 'owner' | 'edit' | 'view';
