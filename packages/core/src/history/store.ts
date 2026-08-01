// ============================================================
// DocumentStore — spec 08 § Store
// ============================================================

import { type Patch, applyPatches } from 'immer';
import type { PlanDocument } from '../model';
import { createEmptyDocument } from '../model';
import type { Command, CommandResult } from '../commands';
import { applyCommand } from '../commands';

// ============================================================
// Tipos
// ============================================================

export interface HistoryEntry {
  label: string;
  patches: Patch[];        // para redo
  inversePatches: Patch[];  // para undo
}

export interface PendingEntry {
  label: string;
  inversePatches: Patch[];
}

export type Unsubscribe = () => void;

// ============================================================
// DocumentStore
// ============================================================

export class DocumentStore {
  private _doc: PlanDocument;
  private _undo: HistoryEntry[] = [];
  private _redo: HistoryEntry[] = [];
  private _pending: PendingEntry | null = null;
  private _subscribers = new Set<(doc: PlanDocument) => void>();

  private static readonly MAX_HISTORY = 500;

  constructor(doc?: PlanDocument) {
    this._doc = doc ?? createEmptyDocument();
  }

  get current(): PlanDocument {
    return this._doc;
  }

  dispatch(cmd: Command): void {
    const result = applyCommand(this._doc, cmd);

    if (cmd.transient) {
      if (!this._pending) {
        this._pending = {
          label: result.label,
          inversePatches: [...result.inversePatches],
        };
      } else {
        // Concatena ao fim (ordem de chegada)
        this._pending.inversePatches.push(...result.inversePatches);
      }
    } else {
      // Comando não-transiente: sela qualquer pendência, empilha
      this._sealPending();

      // Limpa redo
      this._redo = [];

      // Empilha
      const entry: HistoryEntry = {
        label: result.label,
        patches: [...result.patches],
        inversePatches: [...result.inversePatches],
      };
      this._undo.push(entry);

      // Limite
      if (this._undo.length > DocumentStore.MAX_HISTORY) {
        this._undo.shift();
      }
    }

    this._doc = result.document;
    this._notify();
  }

  undo(): void {
    if (this._pending) return;
    if (this._undo.length === 0) return;

    const entry = this._undo.pop()!;
    // applyPatches com inversePatches na ordem original (não invertida)
    // porque cada inversePatch[i] é relativo ao estado após patches[0..i]
    this._doc = applyPatches(this._doc, entry.inversePatches);
    this._redo.push(entry);
    this._notify();
  }

  redo(): void {
    if (this._redo.length === 0) return;

    const entry = this._redo.pop()!;
    this._doc = applyPatches(this._doc, entry.patches);
    this._undo.push(entry);
    this._notify();
  }

  /**
   * Sela a entrada pendente no histórico (commit).
   * Chamado quando a ferramenta emite historyBoundary='commit'.
   */
  sealPending(): void {
    this._sealPending();
  }

  /**
   * Descarta a entrada pendente e reverte (abort).
   * Chamado quando a ferramenta emite historyBoundary='abort'.
   */
  abortPending(): void {
    if (!this._pending) return;

    // Aplica patches inversos (ordem original, não invertida)
    this._doc = applyPatches(this._doc, this._pending.inversePatches);
    this._pending = null;
    this._notify();
  }

  get hasPending(): boolean {
    return this._pending !== null;
  }

  get canUndo(): boolean {
    return this._undo.length > 0;
  }

  get canRedo(): boolean {
    return this._redo.length > 0;
  }

  subscribe(fn: (doc: PlanDocument) => void): Unsubscribe {
    this._subscribers.add(fn);
    return () => {
      this._subscribers.delete(fn);
    };
  }

  private _sealPending(): void {
    if (!this._pending) return;

    const entry: HistoryEntry = {
      label: this._pending.label,
      patches: [],
      inversePatches: this._pending.inversePatches,
    };
    this._undo.push(entry);
    this._redo = [];

    if (this._undo.length > DocumentStore.MAX_HISTORY) {
      this._undo.shift();
    }

    this._pending = null;
  }

  private _notify(): void {
    for (const fn of this._subscribers) {
      fn(this._doc);
    }
  }
}