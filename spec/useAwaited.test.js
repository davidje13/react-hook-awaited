const React = require('react');
const {Simulate, act} = require('react-dom/test-utils');
const {render, unmount, querySelector} = require('./render');
const {runPending, delayedPromise} = require('./helpers');
const useAwaited = require('../index');

const Component = ({fn, deps}) => {
  const result = useAwaited(fn, deps);

  const renderCount = React.useRef(0);
  renderCount.current += 1;

  return React.createElement(
    'div',
    { onClick: result.forceRefresh },
    JSON.stringify({ renders: renderCount.current, result }),
  );
};

function renderHook(fn, deps) {
  render(React.createElement(Component, { fn, deps }));
}

function getOutput() {
  return JSON.parse(querySelector('div').textContent);
}

function clickRefresh() {
  act(() => Simulate.click(querySelector('div')));
}

describe('useAwaited', () => {
  it('returns the result of the promise once it resolves', async () => {
    renderHook(() => Promise.resolve('hello'), []);
    await runPending();

    expect(getOutput().result.state).toEqual('resolved');
    expect(getOutput().result.data).toEqual('hello');
    expect(getOutput().result.error).toBeUndefined();
    expect(getOutput().result.latestData).toEqual('hello');
  });

  it('returns the value if the generator returns a raw value', async () => {
    renderHook(() => 'hello', []);
    await runPending();

    expect(getOutput().result.state).toEqual('resolved');
    expect(getOutput().result.data).toEqual('hello');
    expect(getOutput().result.error).toBeUndefined();
    expect(getOutput().result.latestData).toEqual('hello');
  });

  it('returns the error of the promise if it rejects', async () => {
    renderHook(() => Promise.reject('nope'), []);
    await runPending();

    expect(getOutput().result.state).toEqual('rejected');
    expect(getOutput().result.data).toBeUndefined();
    expect(getOutput().result.error).toEqual('nope');
    expect(getOutput().result.latestData).toBeUndefined();
  });

  it('returns the error if the generator function throws', async () => {
    renderHook(() => {
      throw 'eek';
    }, []);
    await runPending();

    expect(getOutput().result.state).toEqual('rejected');
    expect(getOutput().result.data).toBeUndefined();
    expect(getOutput().result.error).toEqual('eek');
    expect(getOutput().result.latestData).toBeUndefined();
  });

  it('returns a pending state until the promise resolves', async () => {
    const promise = delayedPromise();
    renderHook(() => promise, []);
    await runPending();

    expect(getOutput().result.state).toEqual('pending');
    expect(getOutput().result.data).toBeUndefined();
    expect(getOutput().result.error).toBeUndefined();
    expect(getOutput().result.latestData).toBeUndefined();
    expect(getOutput().renders).toEqual(1);

    promise.resolve('hi');
    await runPending();

    expect(getOutput().result.state).toEqual('resolved');
    expect(getOutput().result.data).toEqual('hi');
    expect(getOutput().renders).toEqual(2);
  });

  describe('refresh', () => {
    it('re-runs if the function and deps change', async () => {
      renderHook(() => Promise.resolve('hello'), [1]);
      await runPending();

      renderHook(() => Promise.resolve('bye'), [2]);
      await runPending();

      expect(getOutput().result.data).toEqual('bye');
    });

    it('re-runs if the function changes and there are no deps', async () => {
      renderHook(() => Promise.resolve('hello'));
      await runPending();

      renderHook(() => Promise.resolve('bye'));
      await runPending();

      expect(getOutput().result.data).toEqual('bye');
    });

    it('does not re-run if the deps remain constant', async () => {
      renderHook(() => Promise.resolve('hello'), [1]);
      await runPending();

      renderHook(() => Promise.resolve('bye'), [1]);
      await runPending();

      expect(getOutput().result.data).toEqual('hello');
    });

    it('does not re-run if the function remains constant and there are no deps', async () => {
      let res = 'hello';
      const fn = () => Promise.resolve(res);
      renderHook(fn);
      await runPending();

      res = 'bye';

      renderHook(fn);
      await runPending();

      expect(getOutput().result.data).toEqual('hello');
    });

    it('re-runs if forceRefresh is called', async () => {
      let res = 'hello';
      renderHook(() => Promise.resolve(res), [1]);
      await runPending();

      res = 'bye';

      clickRefresh();
      await runPending();

      expect(getOutput().result.data).toEqual('bye');
    });

    it('replaces old errors with new results', async () => {
      renderHook(() => Promise.reject('nope'), [1]);
      await runPending();

      renderHook(() => Promise.resolve('bye'), [2]);
      await runPending();

      expect(getOutput().result.state).toEqual('resolved');
      expect(getOutput().result.data).toEqual('bye');
      expect(getOutput().result.error).toBeUndefined();
      expect(getOutput().result.latestData).toEqual('bye');
    });

    it('replaces old data with new errors', async () => {
      renderHook(() => Promise.resolve('hello'), [1]);
      await runPending();

      renderHook(() => Promise.reject('nope'), [2]);
      await runPending();

      expect(getOutput().result.state).toEqual('rejected');
      expect(getOutput().result.data).toBeUndefined();
      expect(getOutput().result.error).toEqual('nope');

      // But does not replace latestData
      expect(getOutput().result.latestData).toEqual('hello');
    });

    it('replaces old data with new data', async () => {
      renderHook(() => Promise.resolve('hello'), [1]);
      await runPending();

      renderHook(() => Promise.resolve('hi'), [2]);
      await runPending();

      expect(getOutput().result.state).toEqual('resolved');
      expect(getOutput().result.data).toEqual('hi');
      expect(getOutput().result.error).toBeUndefined();
      expect(getOutput().result.latestData).toEqual('hi');
    });
  });

  describe('cancelling', () => {
    it('discards old results if they arrive after a refresh', async () => {
      const promise1 = delayedPromise();
      renderHook(() => promise1, [1]);
      await runPending();

      const promise2 = delayedPromise();
      renderHook(() => promise2, [2]);
      await runPending();

      promise1.resolve('1');
      await runPending();

      expect(getOutput().result.state).toEqual('pending');
    });

    it('discards old errors if they arrive after a refresh', async () => {
      const promise1 = delayedPromise();
      renderHook(() => promise1, [1]);
      await runPending();

      const promise2 = delayedPromise();
      renderHook(() => promise2, [2]);
      await runPending();

      promise1.reject('1');
      await runPending();

      expect(getOutput().result.state).toEqual('pending');
    });

    it('discards old results if they arrive after unmounting', async () => {
      jest.spyOn(console, 'error');

      const promise = delayedPromise();
      renderHook(() => promise, [1]);
      await runPending();

      unmount();
      promise.resolve('1');
      await runPending();

      expect(console.error).not.toHaveBeenCalled();
    });

    it('triggers the AbortSignal when a new request appears', async () => {
      let capturedSignal1 = null;
      const promise1 = delayedPromise();
      renderHook((signal) => {
        capturedSignal1 = signal;
        return promise1;
      }, [1]);
      await runPending();

      expect(capturedSignal1.aborted).toBeFalsy();

      let capturedSignal2 = null;
      const promise2 = delayedPromise();
      renderHook((signal) => {
        capturedSignal2 = signal;
        return promise2;
      }, [2]);
      await runPending();

      expect(capturedSignal1.aborted).toBeTruthy();
      expect(capturedSignal2.aborted).toBeFalsy();
    });
  });

  describe('statistics', () => {
    it('reports statistics for successful requests', async () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(10) // First render
        .mockReturnValueOnce(10) // First load begin
        .mockReturnValueOnce(20) // End load
        .mockImplementation(() => {
          throw 'too many calls';
        });

      const promise = delayedPromise();
      renderHook(() => promise, []);
      await runPending();

      expect(getOutput().result.stats.beginTimestamp).toEqual(10);
      expect(getOutput().result.stats.endTimestamp).toBeUndefined();
      expect(getOutput().result.latestStats).toBeUndefined();

      promise.resolve();
      await runPending();

      expect(getOutput().result.stats.beginTimestamp).toEqual(10);
      expect(getOutput().result.stats.endTimestamp).toEqual(20);
      expect(getOutput().result.latestStats.beginTimestamp).toEqual(10);
      expect(getOutput().result.latestStats.endTimestamp).toEqual(20);
    });

    it('reports statistics for unsuccessful requests', async () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(10) // First render
        .mockReturnValueOnce(10) // First load begin
        .mockReturnValueOnce(20) // End load
        .mockImplementation(() => {
          throw 'too many calls';
        });

      const promise = delayedPromise();
      renderHook(() => promise, []);
      await runPending();

      expect(getOutput().result.stats.beginTimestamp).toEqual(10);
      expect(getOutput().result.stats.endTimestamp).toBeUndefined();
      expect(getOutput().result.latestStats).toBeUndefined();

      promise.reject();
      await runPending();

      expect(getOutput().result.stats.beginTimestamp).toEqual(10);
      expect(getOutput().result.stats.endTimestamp).toEqual(20);
      expect(getOutput().result.latestStats.beginTimestamp).toEqual(10);
      expect(getOutput().result.latestStats.endTimestamp).toEqual(20);
    });

    it('preserves latest statistics during later requests', async () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(10) // First render
        .mockReturnValueOnce(10) // First load begin
        .mockReturnValueOnce(20) // End load
        .mockReturnValueOnce(30) // Second load begin
        .mockImplementation(() => {
          throw 'too many calls';
        });

      renderHook(() => Promise.resolve(), [1]);
      await runPending();

      renderHook(() => delayedPromise(), [2]);
      await runPending();

      expect(getOutput().result.stats.beginTimestamp).toEqual(30);
      expect(getOutput().result.stats.endTimestamp).toBeUndefined();
      expect(getOutput().result.latestStats.beginTimestamp).toEqual(10);
      expect(getOutput().result.latestStats.endTimestamp).toEqual(20);
    });
  });
});
