const { useEffect, useState, useCallback } = require('react');

const PENDING = 'pending';
const RESOLVED = 'resolved';
const REJECTED = 'rejected';

const applyLoadState = (old) => {
  const now = Date.now();
  if (old.state === PENDING && old.stats.beginTimestamp > now - 20) {
    /* Probably first render; no need to update state,
     * so return same exact value to avoid a re-render. */
    return old;
  }
  return {
    state: PENDING,
    data: undefined,
    error: undefined,
    stats: { beginTimestamp: now, endTimestamp: undefined },
    latestStats: old.latestStats,
    latestData: old.latestData,
    forceRefresh: old.forceRefresh,
  };
};

const applyFinState = (state, data, error) => (old) => {
  const stats = {
    beginTimestamp: old.stats.beginTimestamp,
    endTimestamp: Date.now(),
  };
  return {
    state,
    data,
    error,
    stats,
    latestStats: stats,
    latestData: (state === RESOLVED) ? data : old.latestData,
    forceRefresh: old.forceRefresh,
  };
};

const inc = (v) => (v + 1);

function useAwaitedWithDefault(def, promiseGenerator, deps) {
  const [forceUpdate, setForceUpdate] = useState(0);
  const memoPromiseGenerator = useCallback(promiseGenerator, deps || [promiseGenerator]);
  const [state, setState] = useState(() => applyLoadState({
    latestData: def,
    latestStats: undefined,
    forceRefresh: () => setForceUpdate(inc),
  }));

  useEffect(() => {
    const ac = new AbortController();
    setState(applyLoadState);
    Promise.resolve(ac.signal)
      .then(memoPromiseGenerator)
      .then((data) => {
        if (!ac.signal.aborted) {
          setState(applyFinState(RESOLVED, data, undefined));
        }
      })
      .catch((error) => {
        if (!ac.signal.aborted) {
          setState(applyFinState(REJECTED, undefined, error));
        }
      });
    return () => ac.abort();
  }, [memoPromiseGenerator, forceUpdate]);

  return state;
}

function useAwaited(promiseGenerator, deps) {
  return useAwaitedWithDefault(undefined, promiseGenerator, deps);
}

Object.defineProperty(exports, '__esModule', { value: true });
exports.default = useAwaited;
exports.useAwaitedWithDefault = useAwaitedWithDefault;
exports.PENDING = PENDING;
exports.RESOLVED = RESOLVED;
exports.REJECTED = REJECTED;

module.exports = Object.assign(exports.default, exports);
exports.default.default = module.exports;
