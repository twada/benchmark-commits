import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseCommandLine } from '../suite-setup.mts';

describe('parseCommandLine', () => {
  it('./setup.sh', () => {
    assert.deepEqual(parseCommandLine('./setup.sh'), { command: './setup.sh', args: [] });
  });
  it('npm install', () => {
    assert.deepEqual(parseCommandLine('npm install'), { command: 'npm', args: ['install'] });
  });
  it('npm run build', () => {
    assert.deepEqual(parseCommandLine('npm run build'), { command: 'npm', args: ['run', 'build'] });
  });
});
