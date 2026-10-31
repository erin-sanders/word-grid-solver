import { describe, expect, it } from 'vitest';
import { createTrie, solveGrid, validateGrid } from '../src/solver';
import type { Solution } from '../src/solver';

function reference(words: string[], cells: string[], size: number, minimum: number): Solution[] {
  const best = new Map<string, number[]>();
  function walk(path: number[], text: string): void {
    if (text.length >= minimum && words.includes(text)) {
      const previous = best.get(text);
      if (!previous || previous.length < path.length) best.set(text, [...path]);
    }
    if (text.length >= Math.max(...words.map(word => word.length))) return;
    for (let i = 0; i < cells.length; i++) {
      if (path.includes(i)) continue;
      const last = path.at(-1);
      if (last !== undefined &&
        (Math.abs(Math.floor(last / size) - Math.floor(i / size)) > 1 ||
         Math.abs(last % size - i % size) > 1)) continue;
      walk([...path, i], text + cells[i]);
    }
  }
  walk([], '');
  return [...best].map(([word, path]) => ({ word, path })).sort((a, b) =>
    b.path.length - a.path.length || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
}

describe('word grid rules', () => {
  it('gives a corner exactly three adjacent cells', () => {
    const cells = [...'abcdefghi'];
    const words = ['ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai'];
    expect(solveGrid(createTrie(words), cells, 3, 2).map(s => s.word)).toEqual(['ab', 'ad', 'ae']);
  });
  it('can visit all sixteen cells, consuming all thirty-two letters', () => {
    const order = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
    const cells = Array.from({ length: 16 }, (_, i) => `a${String.fromCharCode(97 + i)}`);
    const word = order.map(index => cells[index]).join('');
    const result = solveGrid(createTrie([word]), cells, 4, 32);
    expect(result).toEqual([{ word, path: order }]);
  });
  it('uses whole pairs in order and never revisits a cell', () => {
    const words = ['quite', 'qiute', 'quit', 'ququite'];
    const solutions = solveGrid(createTrie(words), ['qu', 'i', 't', 'x', 'x', 'e', 'x', 'x', 'x'], 3);
    expect(solutions.map(s => s.word)).toEqual(['quite']);
    expect(solutions[0].path).toEqual([0, 1, 2, 5]);
  });
  it('counts letters separately and retains the maximum-cell duplicate path', () => {
    const cells = ['ab', 'c', 'd', 'a', 'b', 'e', 'x', 'x', 'x'];
    const solutions = solveGrid(createTrie(['abcde', 'abc', 'ab']), cells, 3);
    expect(solutions).toHaveLength(1);
    expect(solutions[0].path).toHaveLength(5);
  });
  it('allows diagonals and independent repeated letters', () => {
    const cells = ['l', 'x', 'x', 'x', 'e', 'v', 'x', 'l', 'e'];
    expect(solveGrid(createTrie(['level']), cells, 3)[0].word).toBe('level');
  });
  it('does not wrap rows or jump to non-neighboring cells', () => {
    const cells = ['x', 'x', 'a', 'b', 'c', 'd', 'e', 'x', 'x'];
    expect(solveGrid(createTrie(['abcde']), cells, 3)).toEqual([]);
  });
  it('ranks by cells rather than characters and includes alphabetical ties', () => {
    const cells = ['a', 'b', 'c', 'x', 'd', 'e', 'xy', 'zq', 'rs'];
    const solutions = solveGrid(createTrie(['abcde', 'abdce', 'xyzqrs']), cells, 3);
    expect(solutions.map(s => [s.word, s.path.length])).toEqual([
      ['abcde', 5], ['abdce', 5], ['xyzqrs', 3],
    ]);
  });
  it('accepts inflections and lowercase name homographs without lowercasing names', () => {
    const cells = ['r', 'o', 's', 'x', 'x', 'e', 'x', 'x', 's'];
    const trie = createTrie(['rose', 'roses', 'Rose', 'NASA', "rose's", 'rose-red']);
    expect(solveGrid(trie, cells, 3, 4).map(s => s.word)).toEqual(['roses', 'rose']);
  });
  it('reports empty, punctuation, long cells, dimensions, and invalid minima', () => {
    for (const cell of ['', 'abc', 'a-', 'é']) {
      expect(() => validateGrid([cell, ...Array<string>(8).fill('a')], 3, 5)).toThrow();
    }
    expect(() => validateGrid(Array<string>(9).fill('a'), 4, 5)).toThrow();
    expect(() => validateGrid(Array<string>(9).fill('a'), 3, 1.5)).toThrow();
    expect(validateGrid(Array<string>(9).fill(' QU '), 3, 5)[0]).toBe('qu');
  });
  it('matches an exhaustive reference on deterministic 3x3 and 4x4 controlled grids', () => {
    const words = ['abc', 'aba', 'abcd', 'aabc', 'abaca', 'bcda', 'cab', 'dad', 'aaaa'];
    let seed = 17;
    for (const size of [3, 4]) {
      for (let trial = 0; trial < 12; trial++) {
        const cells = Array.from({ length: size * size }, () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return ['a', 'b', 'c', 'd', 'ab'][seed % 5];
        });
        const actual = solveGrid(createTrie(words), cells, size, 3);
        const expected = reference(words, cells, size, 3);
        expect(actual.map(s => [s.word, s.path.length])).toEqual(expected.map(s => [s.word, s.path.length]));
        for (const result of actual) {
          expect(new Set(result.path).size).toBe(result.path.length);
          expect(result.path.map(index => cells[index]).join('')).toBe(result.word);
          for (let i = 1; i < result.path.length; i++) {
            expect(Math.abs(Math.floor(result.path[i] / size) - Math.floor(result.path[i - 1] / size))).toBeLessThanOrEqual(1);
            expect(Math.abs(result.path[i] % size - result.path[i - 1] % size)).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});
