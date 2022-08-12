# React useAwaited hook

A helper for working with asynchronous data in react functional components.

See the [examples](#examples) for some use cases.

## Install dependency

```bash
npm install --save react-hook-awaited
```

## Usage

```jsx
const useAwaited = require('react-hook-awaited');

const MyComponent = () => {
  const apiUrl = 'https://xkcd.com/info.0.json';
  const apiResponse = useAwaited((signal) => fetch(apiUrl, { signal }).then((r) => r.json()), [apiUrl]);

  switch (apiResponse.state) {
    case 'pending':
      return (<div>Loading...</div>);
    case 'resolved':
      return (<div>Latest: {apiResponse.data.num}</div>);
    case 'rejected':
      return (
        <div>
          Failed: {apiResponse.error}
          <button onClick={apiResponse.forceRefresh()}>Try Again</button>
        </div>
      );
  }
};
```

If you are using [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks),
you should configure it to check dependencies for `useAwaited` and
`useAwaitedWithDefault`:

```json
    "react-hooks/exhaustive-deps": ["warn", {
      "additionalHooks": "(useAwaited|useAwaitedWithDefault)"
    }]
```

## API

### useAwaited(generatorFunction, deps)

```javascript
const value = useAwaited(generatorFunction, deps);
```

Invokes the `generatorFunction` and returns the state of the returned
promise.

- `generatorFunction`: a function which returns a promise which is
  to be awaited. It is passed a single argument: an
  [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
  which will be marked as aborted if a change means that the current
  request is no-longer required.
- `deps`: a list of dependencies for the `generatorFunction`, matching
  the same API as
  [`React.useCallback`](https://reactjs.org/docs/hooks-reference.html#usecallback).

The `AbortSignal` can be passed directly to `fetch` calls to avoid
leaving requests running which are no-longer required:

```js
useAwaited((abortSignal) => fetch('https://example.com', { signal: abortSignal }), []);
```

**note:** If the `deps` change, the current promise will be discarded,
the `AbortSignal` will be triggered, `generatorFunction` will be called
again, and the newly returned promise will be awaited.

#### Return value

The response is an object which contains several properties:

- `state`: one of `'pending'`, `'resolved'` or `'rejected'`. For
  convenience these are also exported as constants `PENDING`,
  `RESOLVED`, `REJECTED`.
- `data`: the current data returned by the promise (if `state` is
  `'resolved'`, otherwise `undefined`).
- `error`: the current error returned by the promise (if `state` is
  `'rejected'`, otherwise `undefined`).
- `stats`: an object containing statistics about the current promise:
  - `beginTimestamp`: time when the promise began (number of
    milliseconds since the epoch)
  - `endTimestamp`: time when the promise completed (number of
    milliseconds since the epoch), or undefined if `state` is
    `pending`.
- `latestData`: the last successfully resolved data. Unlike `data`,
  this continues to be available until new data replaces it.
  This is `undefined` until the first request succeeds.
- `latestStats`: an object containing statistics about the last
  completed promise. Unlike `stats`, this continues to be available
  while new data is loaded. This is `undefined` until the first
  request has completed.
- `forceRefresh`: a function which can be called to force an
  immediate refresh of the data. This function is guaranteed to be
  stable (will be the same function instance across all renders).

### useAwaitedWithDefault(default, generatorFunction, deps)

Same as `useAwaited`, but `latestData` will be initialised as
`default` rather than `undefined`.

## Examples

### Loading data from a dynamic API endpoint

```jsx
const useAwaited = require('react-hook-awaited');

const ComicViewer = () => {
  const [num, setNum] = useState(1);
  const apiUrl = `https://xkcd.com/${num}/info.0.json`;
  const apiResponse = useAwaited((signal) => fetch(apiUrl, { signal }).then((r) => r.json()), [apiUrl]);

  let content;
  if (apiResponse.state === 'pending') {
    content = (<div>Loading...</div>);
  } else if (apiResponse.state === 'rejected') {
    content = (
      <div>
        Failed to load #{num}: {apiResponse.error}
        <br />
        <button onClick={apiResponse.forceRefresh()}>Try Again</button>
      </div>
    );
  } else {
    content = (
      <div>
        <h1>{apiResponse.data.title}</h1>
        <img src={apiResponse.data.img} alt={apiResponse.data.alt} />
      </div>
    );
  }
  return (
    <section>
      <label>Show XKCD <input type="number" value={num} onChange={setNum} /></label>
      { content }
    </section>
  );
};
```

### Show latest data with user-controlled refresh

```jsx
const useAwaited = require('react-hook-awaited');

const DataFetcher = () => {
  const apiUrl = 'https://xkcd.com/info.0.json';
  const apiResponse = useAwaited((signal) => fetch(apiUrl, { signal }).then((r) => r.json()), [apiUrl]);

  let content = null;
  if (apiResponse.latestData) {
    content = (
      <div>
        <p>Latest: {apiResponse.latestData.num}</p>
        <p>(as of ${new Date(apiResponse.latestStats.endTimestamp).toString()})</p>
      </div>
    );
  }
  return (
    <section>
      {content}
      {apiResponse.state === 'pending' ? (
        <p>Refreshing...</p>
      ) : (
        <button onClick={apiResponse.forceRefresh()}>Refresh</button>
      )}
      {apiResponse.state === 'rejected' ? (
        <p>Failed to refresh: ${apiResponse.error}</p>
      ) : null}
    </section>
  );
};
```

### Automatically refreshing on an interval

This also uses [react-hook-final-countdown](https://github.com/davidje13/react-hook-countdown)

```jsx
const useAwaited = require('react-hook-awaited');
const {useTimeInterval} = require('react-hook-final-countdown');

const DataFetcher = () => {
  const apiUrl = 'https://xkcd.com/info.0.json';
  const time = useTimeInterval(1000 * 60 * 60); // update every hour
  const apiResponse = useAwaited((signal) => fetch(apiUrl, { signal }).then((r) => r.json()), [apiUrl, time]);

  return (
    <section>
      <p>Latest: {apiResponse.latestData?.num}</p>
      <p>(as of ${new Date(apiResponse.latestStats?.endTimestamp).toString()})</p>
    </section>
  );
};
```
