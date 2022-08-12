const {act} = require('react-dom/test-utils');

beforeEach(() => {
  jest.restoreAllMocks();
});

module.exports = {
  runPending() {
    return act(() => new Promise(process.nextTick));
  },

  delayedPromise() {
    let resolve = null;
    let reject = null;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return Object.assign(promise, { resolve, reject });
  },
};
