import BoardView from '@/components/board-view';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardView key={id} boardId={id} />;
}
