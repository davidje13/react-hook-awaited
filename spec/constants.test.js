const {PENDING, RESOLVED, REJECTED} = require('../index');

describe('library', () => {
  it('exports helper constants', () => {
    expect(PENDING).toEqual('pending');
    expect(RESOLVED).toEqual('resolved');
    expect(REJECTED).toEqual('rejected');
  });
});
