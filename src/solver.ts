export interface Solution {
  word: string;
  path: number[];
}

interface Trie {
  children: Map<string, Trie>;
  word?: string;
}

export function createTrie(words: Iterable<string>): Trie {
  const root: Trie = { children: new Map() };
  for (const word of words) {
    // Never lowercase source entries: capitalization may denote a name.
    if (!/^[a-z]+$/.test(word)) continue;
    let node = root;
    for (const letter of word) {
      let child = node.children.get(letter);
      if (!child) {
        child = { children: new Map() };
        node.children.set(letter, child);
      }
      node = child;
    }
    node.word = word;
  }
  return root;
}

export function validateGrid(cells: string[], size: number, minimum: number): string[] {
  if (size !== 3 && size !== 4) throw new Error('Choose a 3 x 3 or 4 x 4 grid.');
  if (cells.length !== size * size) throw new Error('The grid has an incorrect number of cells.');
  if (!Number.isInteger(minimum) || minimum < 1 || minimum > 32) {
    throw new Error('Minimum letters must be a whole number from 1 to 32.');
  }
  return cells.map((cell, index) => {
    const segment = cell.trim();
    if (!/^[a-zA-Z]{1,2}$/.test(segment)) {
      throw new Error(`Cell ${index + 1} must contain one or two English letters.`);
    }
    return segment.toLowerCase();
  });
}

export function solveGrid(root: Trie, input: string[], size: number, minimum = 5): Solution[] {
  const cells = validateGrid(input, size, minimum);
  const neighbors = cells.map((_, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    return cells.flatMap((__, other) => {
      const dr = Math.abs(Math.floor(other / size) - row);
      const dc = Math.abs(other % size - column);
      return other !== index && dr <= 1 && dc <= 1 ? [other] : [];
    });
  });
  const found = new Map<string, Solution>();
  const path: number[] = [];
  function visit(index: number, node: Trie, used: number, letters: number): void {
    if (used & (1 << index)) return;
    let next: Trie | undefined = node;
    for (const letter of cells[index]) {
      next = next.children.get(letter);
      if (!next) return;
    }
    path.push(index);
    const length = letters + cells[index].length;
    if (next.word && length >= minimum) {
      const previous = found.get(next.word);
      if (!previous || previous.path.length < path.length) {
        found.set(next.word, { word: next.word, path: [...path] });
      }
    }
    const visited = used | (1 << index);
    for (const neighbor of neighbors[index]) visit(neighbor, next, visited, length);
    path.pop();
  }
  for (let start = 0; start < cells.length; start++) visit(start, root, 0, 0);
  return [...found.values()].sort((a, b) =>
    b.path.length - a.path.length || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
}
