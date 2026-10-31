import type { Solution } from './solver';

export interface SolveRequest {
  id: number;
  cells: string[];
  size: number;
  minimum: number;
}

export type SolveResponse =
  | { id: number; solutions: Solution[] }
  | { id: number; error: string };
