import { logVar, logVars } from './logger';
jest.unmock('./logger');

describe('logger', () => {
  it('logVar({ varName })', () => {
    const varName = 'value';
    expect(logVar({ varName })).toBe('varName: value');
  });
});

describe('logger', () => {
  it('logVars(vars)', () => {
    const varName1 = 'value1';
    const varName2 = 'value2';

    const vars = { varName1, varName2 };
    const expected = `varName1: value1
varName2: value2`;
    expect(logVars(vars)).toBe(expected);
  });
});

describe('logger', () => {
  it('logVar({ varName: obj.varName })', () => {
    let obj = new Class();
    expect(logVar({ varName: obj.varName })).toBe('varName: value');
  });
});

class Class {
  public varName: string;

  constructor() {
    this.varName = 'value';
  }
}
