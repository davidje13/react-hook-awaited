export const PENDING: 'pending';
export const RESOLVED: 'resolved';
export const REJECTED: 'rejected';

export interface AwaitedStats {
  beginTimestamp: number;
  endTimestamp: number;
}

export type AwaitedState<T, ErrorT = unknown, InitialT = undefined> = (
  { state: 'pending', stats: Pick<AwaitedStats, 'beginTimestamp'> } |
  { state: 'resolved', data: T, stats: AwaitedStats } |
  { state: 'rejected', error: ErrorT, stats: AwaitedStats }
) & {
  latestData: T | InitialT;
  latestStats: AwaitedStats | undefined;
  forceRefresh: () => void;
};

export default function useAwaited<T>(
  promiseGenerator: (abortSignal: AbortSignal) => (Promise<T> | T),
  deps?: React.DependencyList,
): AwaitedState<T>;

export function useAwaitedWithDefault<T>(
  initial: (() => T) | T,
  promiseGenerator: (abortSignal: AbortSignal) => (Promise<T> | T),
  deps?: React.DependencyList,
): AwaitedState<T, unknown, T>;
