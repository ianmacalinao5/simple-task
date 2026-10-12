'use client';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CalendarDays,
  AlertTriangle,
  CopyPlus,
  ChevronDown,
  Check,
  GripVertical,
  FolderKanban,
  Eraser,
  LogOut,
  Link2,
  ExternalLink,
  MoreVertical,
  Pencil,
  Plus,
  Share2,
  Trash2,
  X,
  Search,
} from 'lucide-react';
import type { Board, Column, Task, Permission } from '@/lib/types';
import { browserDb } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
type Props = { boardId: string };
type GuestProfile = { name: string };
const priorityLabel = { low: 'Low', medium: 'Medium', high: 'High' };
function readInitialToken() {
  return typeof window === 'undefined'
    ? ''
    : new URLSearchParams(window.location.search).get('token') || '';
}
function readGuestProfile(boardId: string, token: string): GuestProfile | null {
  if (typeof window === 'undefined' || !token) return null;
  try {
    const saved = localStorage.getItem(`taskboard:guest:${boardId}`);
    const profile = saved ? (JSON.parse(saved) as GuestProfile) : null;
    return profile?.name ? profile : null;
  } catch {
    return null;
  }
}
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0] || '?').slice(0, 2).toUpperCase();
}
function SortableTask({
  task,
  onEdit,
  onDelete,
  onMove,
  onDuplicate,
  readOnly,
  canDrag = true,
  columns,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (id: string) => void;
  onDuplicate: () => void;
  readOnly: boolean;
  canDrag?: boolean;
  columns: Column[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const descriptionCanExpand = Boolean(task.description && task.description.length > 120);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: readOnly || !canDrag,
    resizeObserverConfig: {},
  });
  return (
    <Card asChild className="task-card group">
      <article
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.45 : 1,
        }}
      >
        <div className="mb-2 flex items-start gap-1">
          {!readOnly && canDrag && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              {...attributes}
              {...listeners}
              aria-label="Drag task"
              className="mt-0.5 touch-none rounded p-1 text-slate-300 opacity-0 hover:bg-slate-100 group-hover:opacity-100"
            >
              <GripVertical size={16} />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDetailsOpen(true)}
            className="h-auto min-w-0 flex-1 justify-start rounded-none px-0 py-0 text-left text-[15px] font-bold leading-6 whitespace-normal text-slate-900 [overflow-wrap:anywhere] hover:bg-transparent hover:text-emerald-800"
          >
            {task.title}
          </Button>
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Task actions"
                  className="text-slate-500"
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil size={14} />
                  Edit task
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>
                  <CopyPlus size={14} />
                  Duplicate task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {columns.map((c) => (
                  <DropdownMenuItem key={c.id} onSelect={() => onMove(c.id)}>
                    <FolderKanban size={14} />
                    {c.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={onDelete}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <Trash2 size={14} />
                  Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {task.description && (
          <>
            <p className="task-card-description is-collapsed mb-1 whitespace-pre-wrap text-[13px] leading-5">
              {task.description}
            </p>
            {descriptionCanExpand && (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setDetailsOpen(true)}
                className="mb-2 h-6 px-0 text-xs font-semibold text-emerald-800"
              >
                View full details
              </Button>
            )}
          </>
        )}
        {task.source_label && task.source_url && (
          <a
            href={task.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:border-emerald-200 hover:bg-emerald-100"
          >
            <Link2 size={13} className="shrink-0" />
            <span className="truncate">{task.source_label}</span>
            <ExternalLink size={12} className="shrink-0 opacity-70" />
          </a>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              task.priority === 'high'
                ? 'destructive'
                : task.priority === 'low'
                  ? 'secondary'
                  : 'warning'
            }
          >
            {priorityLabel[task.priority]} priority
          </Badge>
          {task.due_date && (
            <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
              <CalendarDays size={12} />
              {new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
          <span className="ml-auto text-xs font-medium text-slate-500">
            Added{' '}
            {new Date(task.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        {task.created_by_name && (
          <p className="mt-2 truncate text-xs font-medium text-slate-600">
            Added by {task.created_by_name}
          </p>
        )}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-h-[85dvh] gap-5 overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="pr-8 text-lg font-semibold leading-6 tracking-tight">
                {task.title}
              </DialogTitle>
              <DialogDescription>Task details</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  task.priority === 'high'
                    ? 'destructive'
                    : task.priority === 'low'
                      ? 'secondary'
                      : 'warning'
                }
              >
                {priorityLabel[task.priority]} priority
              </Badge>
              <Badge variant="outline">
                {columns.find((column) => column.id === task.column_id)?.name ?? 'Unknown column'}
              </Badge>
            </div>
            {task.description && (
              <section className="min-w-0 space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-800">Description</h3>
                <p className="min-w-0 max-w-full whitespace-pre-wrap text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] [word-break:break-word]">
                  {task.description}
                </p>
              </section>
            )}
            {task.source_label && task.source_url && (
              <section className="min-w-0 space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-800">Source</h3>
                <a
                  href={task.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-2 text-sm font-medium text-emerald-800 underline-offset-4 hover:underline"
                >
                  <Link2 size={15} className="shrink-0" />
                  <span className="break-all">{task.source_label}</span>
                  <ExternalLink size={13} className="shrink-0" />
                </a>
                <p className="break-all text-xs text-slate-500">{task.source_url}</p>
              </section>
            )}
            <dl className="grid min-w-0 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-500">Due date</dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {task.due_date
                    ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'No due date'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-500">Added by</dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {task.created_by_name || 'Owner'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-500">Created</dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {new Date(task.created_at).toLocaleString()}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-500">Last updated</dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {new Date(task.updated_at).toLocaleString()}
                </dd>
              </div>
            </dl>
            {!readOnly && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    setDetailsOpen(false);
                    onEdit();
                  }}
                >
                  <Pencil size={15} /> Edit task
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </article>
    </Card>
  );
}
function DropArea({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, resizeObserverConfig: {} });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-12 space-y-2.5 rounded-lg transition-colors ${isOver ? 'bg-emerald-100/60' : ''}`}
    >
      {children}
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={className ?? 'gap-4'}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
function StyledDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel} className="mt-1.5">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function DatePicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;
  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Choose a date';
  function toIsoDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className="mt-1.5 w-full justify-start font-normal text-slate-700"
        >
          <CalendarDays className="text-slate-500" />
          <span className={selectedDate ? '' : 'text-slate-400'}>{dateLabel}</span>
          <ChevronDown className="ml-auto text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={ariaLabel} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(date ? toIsoDate(date) : '');
            setOpen(false);
          }}
          defaultMonth={selectedDate}
          autoFocus
        />
        <div className="flex items-center justify-between border-t border-slate-100 p-2">
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              Clear date
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(toIsoDate(new Date()));
              setOpen(false);
            }}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
export default function BoardView({ boardId }: Props) {
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [ownedBoards, setOwnedBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [permission, setPermission] = useState<Permission>('view');
  const [activeCollaborators, setActiveCollaborators] = useState<string[]>([]);
  const [token] = useState(readInitialToken);
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(() =>
    readGuestProfile(boardId, token),
  );
  const [ownerDisplayName, setOwnerDisplayName] = useState('Owner');
  const [guestNameInput, setGuestNameInput] = useState(() => guestProfile?.name ?? '');
  const [busy, setBusy] = useState(true);
  const [taskSearch, setTaskSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<
    'task' | 'rename' | 'share' | 'join' | 'create' | 'column' | 'confirm' | null
  >(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [boardName, setBoardName] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [columnName, setColumnName] = useState('');
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [pendingShareAction, setPendingShareAction] = useState<string | null>(null);
  const [createdLinks, setCreatedLinks] = useState<
    Array<{
      id: string;
      permission: 'view' | 'edit';
      token?: string;
      revoked_at?: string;
      expires_at?: string;
    }>
  >([]);
  const readOnly = permission === 'view';
  const currentUserName =
    permission === 'owner' ? ownerDisplayName : guestProfile?.name || 'Viewer';
  const boardReady = Boolean(board);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const request = useCallback(
    (url: string, init: RequestInit = {}) =>
      fetch(url, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(token ? { 'x-share-token': token } : {}),
          ...(token && guestProfile
            ? {
                'x-actor-name': guestProfile.name,
              }
            : {}),
          ...init.headers,
        },
      }),
    [guestProfile, token],
  );
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const r = await request(
        `/api/boards/${boardId}${token ? '?token=' + encodeURIComponent(token) : ''}`,
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Could not load this board.');
      setBoard(d);
      setPermission(d.permission);
      setBoardName(d.name);
      if (d.permission !== 'owner' && !guestProfile) setModal('join');
      if (d.permission === 'owner') {
        const [sr, br] = await Promise.all([
          request(`/api/shares?board_id=${boardId}`),
          request('/api/boards?all=1'),
        ]);
        if (sr.ok) {
          const links = await sr.json();
          setCreatedLinks((current) => {
            const fresh = current.filter((x) => x.token);
            return [
              ...links.filter((x: { id: string }) => !fresh.some((f) => f.id === x.id)),
              ...fresh,
            ];
          });
        }
        if (br.ok) setOwnedBoards(await br.json());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this board.');
    } finally {
      setBusy(false);
    }
  }, [boardId, guestProfile, request, token]);
  useEffect(() => {
    let active = true;
    void browserDb()
      .auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        const metadata = data.session?.user.user_metadata;
        const fullName = [metadata?.full_name, metadata?.name].find(
          (value): value is string => typeof value === 'string' && value.trim().length > 0,
        );
        if (fullName) setOwnerDisplayName(fullName.trim());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, token]);
  useEffect(() => {
    if (!boardReady || (permission !== 'owner' && !guestProfile)) return;

    const supabase = browserDb();
    const channel = supabase
      .channel(`board-presence:${boardId}`)
      .on('presence', { event: 'sync' }, () => {
        const names = Object.values(channel.presenceState<{ name?: string }>())
          .flatMap((sessions) => sessions.map((session) => session.name?.trim()))
          .filter((name): name is string => Boolean(name) && name !== currentUserName);
        setActiveCollaborators([...new Set(names)]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ name: currentUserName });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [boardId, boardReady, currentUserName, guestProfile, permission]);
  const notify = (message: string, kind: 'success' | 'error' = 'success') =>
    kind === 'error' ? toast.error(message) : toast.success(message);
  function askConfirmation(confirmation: {
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  }) {
    setConfirmation(confirmation);
    setModal('confirm');
  }
  function joinSharedBoard(e: FormEvent) {
    e.preventDefault();
    const profile = { name: guestNameInput.trim() };
    if (!profile.name) return;
    localStorage.setItem(`taskboard:guest:${boardId}`, JSON.stringify(profile));
    setGuestProfile(profile);
    setModal(null);
  }
  function openTask(columnId: string, task?: Task) {
    setEditing(task || null);
    setTargetColumn(columnId);
    setTaskTitle(task?.title || '');
    setDescription(task?.description || '');
    setSourceLabel(task?.source_label || '');
    setSourceUrl(task?.source_url || '');
    setPriority(task?.priority || 'medium');
    setDueDate(task?.due_date || '');
    setModal('task');
  }
  async function saveTask(e: FormEvent) {
    e.preventDefault();
    if (!board) return;
    setBusy(true);
    try {
      const editingTask = editing;
      const r = editingTask
        ? await request(`/api/tasks/${editingTask.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              title: taskTitle,
              description: description || null,
              source_label: sourceLabel.trim() || null,
              source_url: sourceUrl.trim() || null,
              priority,
              due_date: dueDate || null,
            }),
          })
        : await request('/api/tasks', {
            method: 'POST',
            body: JSON.stringify({
              board_id: board.id,
              column_id: targetColumn,
              title: taskTitle,
              description: description || null,
              source_label: sourceLabel.trim() || null,
              source_url: sourceUrl.trim() || null,
              priority,
              due_date: dueDate || null,
            }),
          });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setModal(null);
      await load();
      notify(editingTask ? 'Task updated' : 'Task added');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save task.', 'error');
    } finally {
      setBusy(false);
    }
  }
  async function deleteTask(task: Task) {
    try {
      const r = await request(`/api/tasks/${task.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      notify('Task deleted');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not delete task.', 'error');
    }
  }
  async function updateBoardName(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await request(`/api/boards/${boardId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: boardName }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setBoard((b) => (b ? { ...b, name: d.name } : b));
      setModal(null);
      notify('Project renamed');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not rename board.', 'error');
    } finally {
      setBusy(false);
    }
  }
  async function createBoard(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await request('/api/boards', {
        method: 'POST',
        body: JSON.stringify({ name: newBoardName.trim() || 'Untitled project' }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Could not create project.');
      setModal(null);
      setNewBoardName('');
      router.push(`/board/${d.id}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not create project.', 'error');
    } finally {
      setBusy(false);
    }
  }
  async function deleteProject() {
    try {
      const r = await request(`/api/boards/${boardId}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Could not delete project.');
      const nextBoard = ownedBoards.find((ownedBoard) => ownedBoard.id !== boardId);
      if (!nextBoard) throw Error('Create another project before deleting your only project.');
      notify('Project deleted');
      router.replace(`/board/${nextBoard.id}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not delete project.', 'error');
    }
  }
  async function moveTask(task: Task, columnId: string) {
    if (!board || task.column_id === columnId) return;
    const tasks = board.tasks.map((t) => (t.id === task.id ? { ...t, column_id: columnId } : t));
    setBoard({ ...board, tasks });
    try {
      const items = tasks.map((t) => ({
        id: t.id,
        column_id: t.column_id,
        position: tasks.filter((x) => x.column_id === t.column_id).findIndex((x) => x.id === t.id),
      }));
      const r = await request('/api/tasks/reorder', {
        method: 'PUT',
        body: JSON.stringify({ board_id: board.id, items }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Move failed.', 'error');
      await load();
    }
  }
  async function dragEnd(event: DragEndEvent) {
    if (!board || !event.over || event.active.id === event.over.id) return;
    const moving = board.tasks.find((t) => t.id === event.active.id);
    if (!moving) return;
    const overTask = board.tasks.find((t) => t.id === event.over!.id);
    const dest = board.columns.find((c) => c.id === event.over!.id);
    const column = overTask?.column_id || dest?.id;
    if (!column) return;
    const grouped = board.columns.map((c) => ({
      column: c,
      list: board.tasks.filter((t) => t.column_id === c.id),
    }));
    const from = grouped.find((g) => g.column.id === moving.column_id)!,
      to = grouped.find((g) => g.column.id === column)!;
    from.list = from.list.filter((t) => t.id !== moving.id);
    const index = overTask ? to.list.findIndex((t) => t.id === overTask.id) : to.list.length;
    to.list.splice(Math.max(index, 0), 0, { ...moving, column_id: column });
    const next = grouped.flatMap((g) =>
      g.list.map((t, i) => ({ ...t, column_id: g.column.id, position: i })),
    );
    const old = board;
    setBoard({ ...board, tasks: next });
    try {
      const r = await request('/api/tasks/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          board_id: board.id,
          items: next.map(({ id, column_id, position }) => ({ id, column_id, position })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setBoard(old);
      notify(e instanceof Error ? e.message : 'Could not save task order.', 'error');
    }
  }
  function openColumn(column?: Column) {
    setEditingColumn(column ?? null);
    setColumnName(column?.name ?? '');
    setModal('column');
  }
  async function saveColumn(e: FormEvent) {
    e.preventDefault();
    if (!board) return;
    setBusy(true);
    try {
      const r = editingColumn
        ? await request(`/api/columns/${editingColumn.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: columnName.trim() }),
          })
        : await request('/api/columns', {
            method: 'POST',
            body: JSON.stringify({ board_id: board.id, name: columnName.trim() }),
          });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setModal(null);
      await load();
      notify(editingColumn ? 'Column renamed' : 'Column added');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save column.', 'error');
    } finally {
      setBusy(false);
    }
  }
  async function deleteColumn(c: Column) {
    try {
      const r = await request(`/api/columns/${c.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      notify('Column deleted');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not delete column.', 'error');
    }
  }
  async function clearDone(c: Column) {
    try {
      const results = await Promise.all(
        board!.tasks
          .filter((t) => t.column_id === c.id)
          .map((t) => request(`/api/tasks/${t.id}`, { method: 'DELETE' })),
      );
      for (const result of results) {
        if (!result.ok) {
          const body = await result.json();
          throw Error(body.error || 'Could not clear tasks.');
        }
      }
      await load();
      notify('Completed tasks cleared');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not clear tasks.', 'error');
      await load();
    }
  }
  async function duplicateTask(task: Task) {
    try {
      const r = await request('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          board_id: task.board_id,
          column_id: task.column_id,
          title: `${task.title} (copy)`,
          description: task.description,
          source_label: task.source_label,
          source_url: task.source_url,
          priority: task.priority,
          due_date: task.due_date,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      notify('Task duplicated');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not duplicate task.', 'error');
    }
  }
  async function createShare(permission: 'view' | 'edit') {
    const action = `create:${permission}`;
    setPendingShareAction(action);
    try {
      const r = await request('/api/shares', {
        method: 'POST',
        body: JSON.stringify({
          board_id: boardId,
          permission,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      const replacedAt = new Date().toISOString();
      setCreatedLinks((links) => [
        d,
        ...links.map((link) =>
          link.permission === permission && !link.revoked_at
            ? { ...link, revoked_at: replacedAt }
            : link,
        ),
      ]);
      notify('Sharing link created');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not create link.', 'error');
    } finally {
      setPendingShareAction(null);
    }
  }
  async function revokeLink(id: string) {
    setPendingShareAction(`revoke:${id}`);
    try {
      const target = createdLinks.find((link) => link.id === id);
      const r = await request(`/api/shares/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      const revokedAt = new Date().toISOString();
      setCreatedLinks((x) =>
        x.map((s) =>
          s.id === id || (target && s.permission === target.permission && !s.revoked_at)
            ? { ...s, revoked_at: revokedAt }
            : s,
        ),
      );
      notify('Link revoked');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not revoke link.', 'error');
    } finally {
      setPendingShareAction(null);
    }
  }
  const shareUrl = (t: string) =>
    `${location.origin}/board/${boardId}?token=${encodeURIComponent(t)}`;
  async function copyShareLink(value: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(value));
      notify('Sharing link copied');
    } catch {
      notify('Could not copy the link. You can select and copy it manually.', 'error');
    }
  }
  if (busy && !board && !error)
    return (
      <main className="board-app min-h-screen" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading your board…
        </span>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl bg-emerald-100" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-lg bg-slate-100" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 space-y-2.5">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72 max-w-full bg-slate-100" />
          </div>
          <div className="board-lanes grid items-start gap-4 pb-6">
            {Array.from({ length: 4 }, (_, column) => (
              <Card asChild key={column} className="board-column p-3">
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-6" />
                  </div>
                  {Array.from({ length: column === 0 ? 3 : 2 }, (_, task) => (
                    <Card key={task} className="mb-3 rounded-xl p-4">
                      <Skeleton className="mb-3 h-4 w-4/5" />
                      <Skeleton className="mb-2 h-3 w-full bg-slate-100" />
                      <Skeleton className="h-3 w-2/3 bg-slate-100" />
                    </Card>
                  ))}
                </section>
              </Card>
            ))}
          </div>
        </div>
      </main>
    );
  if (error && !board)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <Card asChild className="max-w-md rounded-2xl p-7 text-center">
          <section>
            <h1 className="mb-2 text-lg font-bold">Board unavailable</h1>
            <Alert variant="destructive" className="mb-5 text-left">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button type="button" onClick={() => void load()} className="rounded-lg">
              Try again
            </Button>
          </section>
        </Card>
      </main>
    );
  if (!board) return null;
  const grouped = board.columns.slice().sort((a, b) => a.position - b.position);
  const hasTaskFilters = Boolean(
    taskSearch.trim() || priorityFilter !== 'all' || dueFilter !== 'all',
  );
  const visibleTasks = board.tasks.filter((task) => {
    const query = taskSearch.trim().toLocaleLowerCase();
    const matchesSearch =
      !query ||
      [task.title, task.description, task.source_label, task.created_by_name].some((value) =>
        value?.toLocaleLowerCase().includes(query),
      );
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = task.due_date ? new Date(`${task.due_date}T00:00:00`) : null;
    const daysUntilDue = due ? Math.ceil((due.getTime() - today.getTime()) / 86_400_000) : null;
    const matchesDue =
      dueFilter === 'all' ||
      (dueFilter === 'overdue' && daysUntilDue !== null && daysUntilDue < 0) ||
      (dueFilter === 'upcoming' &&
        daysUntilDue !== null &&
        daysUntilDue >= 0 &&
        daysUntilDue <= 7) ||
      (dueFilter === 'no-date' && daysUntilDue === null);
    return matchesSearch && matchesPriority && matchesDue;
  });
  const isOwner = permission === 'owner';
  const shareActive = createdLinks.some(
    (link) => !link.revoked_at && (!link.expires_at || new Date(link.expires_at) > new Date()),
  );
  return (
    <main className="board-app min-h-screen">
      <header className="board-topbar sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-800 text-white shadow-sm shadow-emerald-950/15">
              <Check size={18} strokeWidth={2.5} />
            </div>
            <span className="hidden text-base font-extrabold tracking-tight text-slate-900 sm:inline">
              Taskboard
            </span>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="board-switch-trigger">
                    <FolderKanban size={16} />
                    <span className="max-w-28 truncate sm:max-w-40">{board.name}</span>
                    <ChevronDown size={15} className="text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Projects</DropdownMenuLabel>
                  {ownedBoards.map((b) => (
                    <DropdownMenuItem
                      key={b.id}
                      onSelect={() => router.push(`/board/${b.id}`)}
                      className={
                        b.id === boardId ? 'bg-emerald-50 text-emerald-900 focus:bg-emerald-50' : ''
                      }
                    >
                      <FolderKanban size={15} />
                      <span className="min-w-0 flex-1 truncate">{b.name}</span>
                      {b.id === boardId && <Check size={16} />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setModal('create')}>
                    <Plus size={16} /> Create a project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Project actions"
                    title="Project actions"
                    className="size-9 shrink-0 text-slate-500"
                  >
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>{board.name}</DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={() => {
                      setBoardName(board.name);
                      setModal('rename');
                    }}
                  >
                    <Pencil size={15} /> Rename current project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      askConfirmation({
                        title: 'Delete this project?',
                        description: `“${board.name}” and all its columns, tasks, and sharing links will be permanently deleted. You must have another project to delete this one.`,
                        confirmLabel: 'Delete project',
                        onConfirm: deleteProject,
                      });
                    }}
                    className="text-red-600 focus:bg-red-50 focus:text-red-700"
                  >
                    <Trash2 size={15} /> Delete current project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-0 sm:gap-2">
            {shareActive && (
              <Badge variant="success" className="hidden h-7 px-2.5 py-0 sm:flex">
                <Link2 size={13} /> Shared
              </Badge>
            )}
            {isOwner && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setModal('share')}
                aria-label="Share board"
                title="Share board"
                className="h-9 w-9 px-0 sm:w-auto sm:px-3.5"
              >
                <Share2 size={15} /> <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            {isOwner && (
              <Button
                type="button"
                onClick={() => setModal('create')}
                aria-label="Create project"
                title="Create project"
                className="h-9 w-9 px-0 sm:w-auto sm:gap-2 sm:px-3"
              >
                <Plus size={16} /> <span className="hidden sm:inline">New project</span>
              </Button>
            )}
            {activeCollaborators.length > 0 && (
              <div
                className="flex shrink-0 items-center pl-1 sm:pl-2"
                aria-label={`${activeCollaborators.length} other ${activeCollaborators.length === 1 ? 'person' : 'people'} active on this board`}
              >
                <div className="flex -space-x-2">
                  {activeCollaborators.slice(0, 3).map((name) => (
                    <Avatar
                      key={name}
                      className="size-8 border-2 border-white"
                      title={`${name} is active on this board`}
                    >
                      <AvatarFallback className="bg-emerald-100 text-[11px] font-semibold text-emerald-800">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {activeCollaborators.length > 3 && (
                    <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-600">
                      +{activeCollaborators.length - 3}
                    </span>
                  )}
                </div>
                <span className="sr-only">{activeCollaborators.join(', ')}</span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Account: ${currentUserName}`}
                  className="ml-0.5 h-9 shrink-0 gap-2 rounded-lg border-l border-slate-200 py-0 pl-2 pr-0.5 sm:ml-1 sm:pl-3 sm:pr-1"
                >
                  <Avatar aria-hidden="true" className="size-8">
                    <AvatarFallback>{getInitials(currentUserName)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-32 truncate text-sm font-medium text-slate-700 md:block">
                    {currentUserName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{currentUserName}</DropdownMenuLabel>
                {!isOwner && guestProfile && (
                  <DropdownMenuItem onSelect={() => setModal('join')}>
                    <Pencil size={14} /> Edit name
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <DropdownMenuItem
                    onSelect={() => {
                      void browserDb()
                        .auth.signOut()
                        .then(() => router.replace('/'));
                    }}
                  >
                    <LogOut size={14} /> Sign out
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">
              Workspace / Board
            </div>
            <div className="flex items-center gap-2">
              <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-slate-950 md:text-[1.75rem] [overflow-wrap:anywhere]">
                {board.name}
              </h1>
              {isOwner && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setModal('rename')}
                  aria-label="Rename project"
                  title="Rename project"
                  className="size-8 text-slate-500"
                >
                  <Pencil size={15} />
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-sm font-medium text-slate-600">
              A little progress, every day.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            {readOnly && (
              <Badge variant="outline" className="w-fit px-3 py-1.5 shadow-sm">
                View only
              </Badge>
            )}
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1 sm:w-48 sm:flex-none lg:w-56">
                <Search
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  aria-label="Search tasks"
                  value={taskSearch}
                  onChange={(event) => setTaskSearch(event.target.value)}
                  placeholder="Search tasks…"
                  className="h-9 border-slate-200 bg-white pl-9 shadow-none focus-visible:ring-1"
                />
              </div>
              <div className="flex min-w-0 gap-2">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger
                    aria-label="Filter by priority"
                    className="h-9 min-w-0 flex-1 sm:w-32 sm:flex-none"
                  >
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High priority</SelectItem>
                    <SelectItem value="medium">Medium priority</SelectItem>
                    <SelectItem value="low">Low priority</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dueFilter} onValueChange={setDueFilter}>
                  <SelectTrigger
                    aria-label="Filter by due date"
                    className="h-9 min-w-0 flex-1 sm:w-36 sm:flex-none"
                  >
                    <SelectValue placeholder="Due date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any due date</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="upcoming">Due in 7 days</SelectItem>
                    <SelectItem value="no-date">No due date</SelectItem>
                  </SelectContent>
                </Select>
                {hasTaskFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Clear task filters"
                    title="Clear filters"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      setTaskSearch('');
                      setPriorityFilter('all');
                      setDueFilter('all');
                    }}
                  >
                    <X size={15} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        {error && (
          <Alert
            variant="destructive"
            className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
          >
            <AlertDescription>{error}</AlertDescription>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setError('')}
              aria-label="Dismiss"
              className="ml-4 shrink-0"
            >
              <X size={16} />
            </Button>
          </Alert>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={dragEnd}>
          <div className="board-lanes grid items-start gap-4 pb-6">
            {grouped.map((col) => {
              const allColumnTasks = board!.tasks
                .filter((t) => t.column_id === col.id)
                .sort((a, b) => a.position - b.position);
              const tasks = visibleTasks
                .filter((t) => t.column_id === col.id)
                .sort((a, b) => a.position - b.position);
              return (
                <Card asChild key={col.id} className="board-column">
                  <section>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-sm font-bold text-slate-800">{col.name}</h2>
                        <Badge
                          variant="secondary"
                          className={`h-6 min-w-6 px-1.5 shadow-sm ${hasTaskFilters ? 'w-auto' : 'size-6'}`}
                        >
                          {hasTaskFilters
                            ? `${tasks.length}/${allColumnTasks.length}`
                            : allColumnTasks.length}
                        </Badge>
                      </div>
                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Column actions"
                              className="text-slate-500"
                            >
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onSelect={() => openColumn(col)}>
                              <Pencil size={14} />
                              Rename column
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openTask(col.id)}>
                              <Plus size={14} />
                              Add task
                            </DropdownMenuItem>
                            {col.name.toLowerCase() === 'done' && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  askConfirmation({
                                    title: 'Clear completed tasks?',
                                    description: `All tasks in “${col.name}” will be permanently deleted.`,
                                    confirmLabel: 'Clear tasks',
                                    onConfirm: () => clearDone(col),
                                  });
                                }}
                              >
                                <Eraser size={14} />
                                Clear completed tasks
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50 focus:text-red-700"
                              onSelect={() => {
                                askConfirmation({
                                  title: 'Delete this column?',
                                  description: `“${col.name}” and its tasks will be permanently deleted.`,
                                  confirmLabel: 'Delete column',
                                  onConfirm: () => deleteColumn(col),
                                });
                              }}
                            >
                              <Trash2 size={14} />
                              Delete column
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <SortableContext
                      items={tasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <DropArea id={col.id}>
                        {tasks.map((task) => (
                          <SortableTask
                            key={task.id}
                            task={task}
                            canDrag={!hasTaskFilters}
                            columns={grouped}
                            readOnly={readOnly}
                            onEdit={() => openTask(col.id, task)}
                            onDelete={() =>
                              askConfirmation({
                                title: 'Delete this task?',
                                description: `“${task.title}” will be permanently deleted.`,
                                confirmLabel: 'Delete task',
                                onConfirm: () => deleteTask(task),
                              })
                            }
                            onMove={(id) => void moveTask(task, id)}
                            onDuplicate={() => void duplicateTask(task)}
                          />
                        ))}
                        {tasks.length === 0 && (
                          <Card className="board-empty-state rounded-xl border-dashed px-3 py-5 text-center text-sm font-medium text-slate-500 shadow-none">
                            {allColumnTasks.length === 0 ? 'Nothing here yet' : 'No matching tasks'}
                          </Card>
                        )}
                      </DropArea>
                    </SortableContext>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => openTask(col.id)}
                        className="board-add-task mt-1.5 h-9 w-full justify-start px-2.5 font-medium text-slate-600"
                      >
                        <Plus size={16} /> Add task
                      </Button>
                    )}
                  </section>
                </Card>
              );
            })}
            {isOwner && (
              <Button
                type="button"
                variant="outline"
                onClick={() => openColumn()}
                className="board-add-column justify-start"
              >
                <Plus size={16} /> Add a column
              </Button>
            )}
          </div>
        </DndContext>
      </section>
      {modal === 'task' && (
        <Modal title={editing ? 'Edit task' : 'Add a task'} onClose={() => setModal(null)}>
          <form onSubmit={saveTask} className="space-y-4">
            <Label className="block text-sm font-medium">
              Title
              <Input
                autoFocus
                maxLength={120}
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="mt-1.5"
                placeholder="What needs to get done?"
              />
            </Label>
            <Label className="block text-sm font-medium">
              Description <span className="font-normal text-slate-400">(optional)</span>
              <Textarea
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 min-h-24 resize-y"
                placeholder="Add a few details…"
              />
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label className="block text-sm font-medium">
                Source name <span className="font-normal text-slate-400">(optional)</span>
                <Input
                  maxLength={60}
                  required={Boolean(sourceUrl.trim())}
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  className="mt-1.5"
                  placeholder="e.g. Figma, brief, ticket"
                />
              </Label>
              <Label className="block text-sm font-medium">
                Source URL <span className="font-normal text-slate-400">(optional)</span>
                <Input
                  type="url"
                  maxLength={2048}
                  required={Boolean(sourceLabel.trim())}
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="mt-1.5"
                  placeholder="https://…"
                />
              </Label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label className="block text-sm font-medium">
                Priority
                <StyledDropdown
                  ariaLabel="Task priority"
                  value={priority}
                  onChange={(value) => setPriority(value as Task['priority'])}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
                />
              </Label>
              <Label className="block text-sm font-medium">
                Due date <span className="font-normal text-slate-400">(optional)</span>
                <DatePicker value={dueDate} onChange={setDueDate} ariaLabel="Task due date" />
              </Label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? (
                  <>
                    <Spinner /> Saving…
                  </>
                ) : editing ? (
                  'Save changes'
                ) : (
                  'Add task'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Modal>
      )}
      {modal === 'create' && (
        <Modal title="Create a project" onClose={() => setModal(null)}>
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-100 text-emerald-800">
              <FolderKanban size={17} />
            </span>
            <p className="pt-0.5 text-sm leading-5 text-slate-600">
              Start with a ready-to-use workflow for your project.
            </p>
          </div>
          <form onSubmit={createBoard} className="space-y-4">
            <Label className="block text-sm font-bold text-slate-700">
              Project name
              <Input
                autoFocus
                required
                maxLength={80}
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="e.g. Website refresh"
                className="mt-1.5"
              />
            </Label>
            <DialogFooter className="pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? <Spinner /> : <Plus size={15} />}
                {busy ? 'Creating…' : 'Create project'}
              </Button>
            </DialogFooter>
          </form>
        </Modal>
      )}
      {modal === 'rename' && (
        <Modal title="Rename project" onClose={() => setModal(null)}>
          <form onSubmit={updateBoardName} className="space-y-4">
            <Input
              autoFocus
              required
              maxLength={80}
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? <Spinner /> : null}
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Modal>
      )}
      {modal === 'column' && (
        <Modal
          title={editingColumn ? 'Rename column' : 'Add a column'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveColumn} className="space-y-4">
            <Label className="block text-sm font-medium text-slate-700">
              Column name
              <Input
                autoFocus
                required
                maxLength={80}
                value={columnName}
                onChange={(event) => setColumnName(event.target.value)}
                placeholder="e.g. Ready for review"
                className="mt-1.5"
              />
            </Label>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? <Spinner /> : <Check size={15} />}
                {busy ? 'Saving…' : editingColumn ? 'Save changes' : 'Add column'}
              </Button>
            </DialogFooter>
          </form>
        </Modal>
      )}
      {modal === 'confirm' && confirmation && (
        <Modal title={confirmation.title} onClose={() => setModal(null)}>
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-red-100 text-red-700">
              <AlertTriangle size={17} />
            </span>
            <DialogDescription className="pt-1 text-sm leading-5 text-red-900">
              {confirmation.description}
            </DialogDescription>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await confirmation.onConfirm();
                } finally {
                  setBusy(false);
                  setConfirmation(null);
                  setModal(null);
                }
              }}
            >
              {busy ? <Spinner /> : <Trash2 size={15} />}
              {busy ? 'Working…' : confirmation.confirmLabel}
            </Button>
          </DialogFooter>
        </Modal>
      )}
      {modal === 'share' && (
        <Modal
          title="Share this board"
          onClose={() => setModal(null)}
          className="min-w-0 gap-4 sm:max-w-xl"
        >
          <DialogDescription className="text-sm leading-5 text-slate-500">
            Choose a view link or an edit link. Creating a replacement disables the previous link
            with the same access.
          </DialogDescription>
          <div className="space-y-2">
            {(['view', 'edit'] as const).map((access) => {
              const share = createdLinks.find(
                (link) =>
                  link.permission === access &&
                  !link.revoked_at &&
                  (!link.expires_at || new Date(link.expires_at) > new Date()),
              );
              const creating = pendingShareAction === `create:${access}`;
              const revoking = share && pendingShareAction === `revoke:${share.id}`;
              return (
                <div
                  key={access}
                  className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
                >
                  <div className="shrink-0 sm:w-24">
                    <p className="text-sm font-semibold text-slate-800">
                      {access === 'view' ? 'View only' : 'Can edit'}
                    </p>
                  </div>
                  {share?.token ? (
                    <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                      {shareUrl(share.token)}
                    </p>
                  ) : (
                    <p className="min-w-0 flex-1 text-xs text-slate-500">
                      {share ? 'Link is active. Create a new one to copy it.' : 'No link yet'}
                    </p>
                  )}
                  {share?.token && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void copyShareLink(share.token!)}
                    >
                      Copy link
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={share?.token ? 'ghost' : 'outline'}
                    size="sm"
                    className="shrink-0"
                    disabled={Boolean(pendingShareAction)}
                    onClick={() => void createShare(access)}
                  >
                    {creating && <Spinner />}
                    {share ? 'Create new' : 'Create link'}
                  </Button>
                  {share && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-slate-500"
                      aria-label={`Revoke ${access} link`}
                      disabled={Boolean(pendingShareAction)}
                      onClick={() => void revokeLink(share.id)}
                    >
                      {revoking ? <Spinner /> : 'Revoke'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setModal(null)}>
              Done
            </Button>
          </DialogFooter>
        </Modal>
      )}
      {modal === 'join' && (
        <Modal title="Join this board" onClose={() => {}}>
          <p className="mb-5 text-sm leading-5 text-slate-500">
            Enter the name you want shown on tasks you add. No account or email is needed.
          </p>
          <form onSubmit={joinSharedBoard} className="space-y-4">
            <Label className="block text-sm font-medium">
              Your name
              <Input
                autoFocus
                required
                maxLength={80}
                value={guestNameInput}
                onChange={(e) => setGuestNameInput(e.target.value)}
                className="mt-1.5"
                placeholder="How should we identify you?"
              />
            </Label>
            <Button type="submit" className="w-full">
              Continue to board
            </Button>
          </form>
        </Modal>
      )}
    </main>
  );
}
