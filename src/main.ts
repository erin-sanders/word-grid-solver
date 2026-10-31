import './style.css';
import { validateGrid } from './solver';
import type { Solution } from './solver';
import type { SolveRequest, SolveResponse } from './protocol';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing interface element: ${id}`);
  return found as T;
}

const form = element<HTMLFormElement>('solver-form');
const size = element<HTMLSelectElement>('size');
const minimum = element<HTMLInputElement>('minimum');
const grid = element<HTMLDivElement>('grid');
const results = element<HTMLOListElement>('results');
const status = element<HTMLParagraphElement>('status');
const pathDescription = element<HTMLParagraphElement>('path');
const solve = element<HTMLButtonElement>('solve');
let inputs: HTMLInputElement[] = [];
let worker: Worker | undefined;
let requestId = 0;

function resetResults(): void {
  requestId++;
  worker?.terminate();
  worker = undefined;
  solve.disabled = false;
  results.replaceChildren();
  pathDescription.textContent = 'Select a word to see its numbered path.';
  for (const input of inputs) {
    input.parentElement?.classList.remove('visited');
    input.parentElement?.removeAttribute('data-step');
    input.removeAttribute('aria-invalid');
  }
}

function renderGrid(): void {
  resetResults();
  const width = Number(size.value);
  grid.style.setProperty('--size', String(width));
  inputs = Array.from({ length: width * width }, (_, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 2;
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    input.setAttribute('aria-label', `Row ${Math.floor(index / width) + 1}, column ${index % width + 1}`);
    input.addEventListener('input', () => {
      resetResults();
      status.textContent = 'Grid changed. Solve to update the words.';
    });
    input.addEventListener('keydown', event => {
      const row = Math.floor(index / width);
      const column = index % width;
      let target = index;
      if (event.key === 'ArrowLeft' && column > 0) target--;
      if (event.key === 'ArrowRight' && column < width - 1) target++;
      if (event.key === 'ArrowUp' && row > 0) target -= width;
      if (event.key === 'ArrowDown' && row < width - 1) target += width;
      if (target !== index) {
        event.preventDefault();
        inputs[target].focus();
      }
    });
    wrapper.append(input);
    return input;
  });
  grid.replaceChildren(...inputs.map(input => input.parentElement!));
  status.textContent = 'Enter a grid to get started.';
}

function selectSolution(solution: Solution, button: HTMLButtonElement): void {
  for (const input of inputs) {
    input.parentElement?.classList.remove('visited');
    input.parentElement?.removeAttribute('data-step');
  }
  for (const item of results.querySelectorAll('button')) item.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-pressed', 'true');
  solution.path.forEach((index, step) => {
    inputs[index].parentElement?.classList.add('visited');
    inputs[index].parentElement?.setAttribute('data-step', String(step + 1));
  });
  pathDescription.textContent = `${solution.word}: ${solution.path.map(index =>
    `row ${Math.floor(index / Number(size.value)) + 1}, column ${index % Number(size.value) + 1}`
  ).join(' then ')}.`;
}

function showResults(solutions: Solution[]): void {
  const fragment = document.createDocumentFragment();
  for (const solution of solutions) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    const word = document.createElement('strong');
    word.textContent = solution.word;
    const counts = document.createElement('span');
    counts.textContent = `${solution.path.length} cells / ${solution.word.length} letters`;
    button.append(word, counts);
    button.addEventListener('click', () => selectSolution(solution, button));
    item.append(button);
    fragment.append(item);
  }
  results.replaceChildren(fragment);
  status.textContent = solutions.length
    ? `${solutions.length} words found, ranked by cells visited. All ties are included alphabetically.`
    : 'No matching words. Try another grid or a lower minimum letter count.';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  resetResults();
  try {
    const cells = validateGrid(inputs.map(input => input.value), Number(size.value), Number(minimum.value));
    const id = requestId;
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (message: MessageEvent<SolveResponse>) => {
      if (message.data.id !== requestId) return;
      solve.disabled = false;
      if ('error' in message.data) status.textContent = message.data.error;
      else showResults(message.data.solutions);
    };
    worker.onerror = event => {
      event.preventDefault();
      solve.disabled = false;
      status.textContent = 'The solver worker failed. Reload the page and try again.';
      worker?.terminate();
      worker = undefined;
    };
    const request: SolveRequest = { id, cells, size: Number(size.value), minimum: Number(minimum.value) };
    solve.disabled = true;
    status.textContent = 'Loading dictionary and finding words...';
    worker.postMessage(request);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Unable to start the solver.';
    const invalid = inputs.find(input => !/^[a-zA-Z]{1,2}$/.test(input.value.trim()));
    invalid?.setAttribute('aria-invalid', 'true');
    invalid?.focus();
  }
});
size.addEventListener('change', renderGrid);
minimum.addEventListener('input', () => {
  resetResults();
  status.textContent = 'Minimum changed. Solve to update the words.';
});
element<HTMLButtonElement>('clear').addEventListener('click', () => {
  resetResults();
  inputs.forEach(input => { input.value = ''; });
  status.textContent = 'Grid cleared.';
  inputs[0].focus();
});
renderGrid();
