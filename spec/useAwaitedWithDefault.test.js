const React = require('react');
const {render, querySelector} = require('./render');
const {runPending, delayedPromise} = require('./helpers');
const {useAwaitedWithDefault} = require('../index');

const Component = ({def, fn, deps}) => {
  const result = useAwaitedWithDefault(def, fn, deps);

  const renderCount = React.useRef(0);
  renderCount.current += 1;

  return React.createElement(
    'div',
    { onClick: result.forceRefresh },
    JSON.stringify({ renders: renderCount.current, result }),
  );
};

function renderHook(def, fn, deps) {
  render(React.createElement(Component, { def, fn, deps }));
}

function getOutput() {
  return JSON.parse(querySelector('div').textContent);
}

describe('useAwaitedWithDefault', () => {
  it('returns the default value until a request completes', async () => {
    const promise = delayedPromise();
    renderHook('first!', () => promise, []);
    await runPending();

    expect(getOutput().result.state).toEqual('pending');
    expect(getOutput().result.data).toBeUndefined();
    expect(getOutput().result.error).toBeUndefined();
    expect(getOutput().result.latestData).toEqual('first!');
    expect(getOutput().renders).toEqual(1);

    promise.resolve('hi');
    await runPending();

    expect(getOutput().result.state).toEqual('resolved');
    expect(getOutput().result.latestData).toEqual('hi');
    expect(getOutput().renders).toEqual(2);
  });

  it('continues to return the default value if requests fail', async () => {
    renderHook('first!', () => Promise.reject('nope'), []);
    await runPending();

    expect(getOutput().result.latestData).toEqual('first!');
  });
});
