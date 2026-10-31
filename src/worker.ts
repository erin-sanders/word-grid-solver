import { createTrie, solveGrid } from './solver';
import type { SolveRequest, SolveResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;
let dictionary: Promise<ReturnType<typeof createTrie>> | undefined;

async function loadDictionary(): Promise<ReturnType<typeof createTrie>> {
  const response = await fetch(new URL('../words.txt', scope.location.href));
  if (!response.ok) {
    throw new Error('The English dictionary could not be loaded. Reload the page and try again.');
  }
  const text = await response.text();
  const words = text.split(/\r?\n/).filter(Boolean);
  if (words.length === 0 || words.some(word => !/^[a-z]+$/.test(word))) {
    throw new Error('The bundled dictionary is empty or invalid. Please report this deployment error.');
  }
  return createTrie(words);
}

scope.onmessage = async (event: MessageEvent<SolveRequest>) => {
  const { id, cells, size, minimum } = event.data;
  try {
    dictionary ??= loadDictionary();
    const root = await dictionary;
    const response: SolveResponse = { id, solutions: solveGrid(root, cells, size, minimum) };
    scope.postMessage(response);
  } catch (error) {
    dictionary = undefined;
    const response: SolveResponse = {
      id,
      error: error instanceof Error ? error.message : 'An unexpected solver error occurred.',
    };
    scope.postMessage(response);
  }
};
