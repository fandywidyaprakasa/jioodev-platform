export interface ReorderBlock {
  slot: string;
  order: number;
}

export function reorderBlocks<T extends ReorderBlock>(
  blocks: T[],
  fromSlot: string,
  toSlot: string,
  bounds: Record<string, { orderMin?: number; orderMax?: number }>
): T[] | null {
  if (fromSlot === toSlot) return null;

  const ordered = [...blocks].sort((a, b) => a.order - b.order);
  const fromIndex = ordered.findIndex((block) => block.slot === fromSlot);
  const toIndex = ordered.findIndex((block) => block.slot === toSlot);

  if (fromIndex === -1 || toIndex === -1) return null;

  if (fromIndex < 1 || fromIndex >= ordered.length - 1) return null;
  if (toIndex < 1 || toIndex >= ordered.length - 1) return null;

  const next = [...ordered];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next.map((block, position) => ({
    ...block,
    order: position === 0 ? 1 : position === next.length - 1 ? 10 : position + 1,
  }));
}