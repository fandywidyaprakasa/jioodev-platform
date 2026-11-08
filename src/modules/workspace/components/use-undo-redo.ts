"use client";

import { useState } from "react";

export const UNDO_HISTORY_LIMIT = 50;

export function pushEntry<T>(past: readonly T[], entry: T, limit: number): T[] {
  return [...past.slice(-(limit - 1)), entry];
}

export function popEntry<T>(past: readonly T[]): { rest: T[]; popped: T | null } {
  if (!past.length) return { rest: [], popped: null };
  return { rest: past.slice(0, -1), popped: past[past.length - 1] ?? null };
}

export function prependEntry<T>(future: readonly T[], entry: T, limit: number): T[] {
  return [entry, ...future.slice(0, limit - 1)];
}

export function shiftEntry<T>(future: readonly T[]): { rest: T[]; shifted: T | null } {
  if (!future.length) return { rest: [], shifted: null };
  return { rest: future.slice(1), shifted: future[0] ?? null };
}

export interface UseUndoRedoReturn<T> {
  past: readonly T[];
  future: readonly T[];
  canUndo: boolean;
  canRedo: boolean;
  commit: (entry: T) => void;
  undo: (current: T) => T | null;
  redo: (current: T) => T | null;
}

export function useUndoRedo<T>(limit: number = UNDO_HISTORY_LIMIT): UseUndoRedoReturn<T> {
  const [past, setPast] = useState<readonly T[]>([]);
  const [future, setFuture] = useState<readonly T[]>([]);

  function commit(entry: T) {
    setPast((current) => pushEntry(current, entry, limit));
    setFuture([]);
  }

  function undo(current: T): T | null {
    if (!past.length) return null;
    const { rest, popped } = popEntry(past);
    if (!popped) return null;
    setPast(rest);
    setFuture((currentFuture) => prependEntry(currentFuture, current, limit));
    return popped;
  }

  function redo(current: T): T | null {
    if (!future.length) return null;
    const { rest, shifted } = shiftEntry(future);
    if (!shifted) return null;
    setFuture(rest);
    setPast((currentPast) => pushEntry(currentPast, current, limit));
    return shifted;
  }

  return {
    past,
    future,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    commit,
    undo,
    redo,
  };
}
