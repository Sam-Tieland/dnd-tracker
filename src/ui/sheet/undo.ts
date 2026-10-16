export interface UndoEntry<T> {
  label: string;
  before: T;
}

/** Spec §8: the last 20 changes can be undone while the app is open. */
export class UndoStack<T> {
  readonly limit: number;
  private entries: UndoEntry<T>[] = [];

  constructor(limit = 20) {
    this.limit = limit;
  }

  push(entry: UndoEntry<T>): void {
    this.entries = [...this.entries, entry].slice(-this.limit);
  }

  pop(): UndoEntry<T> | undefined {
    return this.entries.pop();
  }

  get size(): number {
    return this.entries.length;
  }
}
