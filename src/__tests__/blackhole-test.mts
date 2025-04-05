import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { blackhole } from '../suite-setup.mjs';

test('blackhole function should not throw any errors', () => {
  // Check that blackhole accepts various value types without throwing errors
  assert.doesNotThrow(() => {
    blackhole(null);
    blackhole(undefined);
    blackhole(123);
    blackhole('string');
    blackhole(true);
    blackhole({});
    blackhole([]);
    blackhole(new Map());
    blackhole(new Set());
    blackhole(() => {});
  });
});

test('multiple calls to blackhole with the same object should work', () => {
  // Create an object to pass to blackhole multiple times
  const obj = { test: 'value' };

  // Call blackhole with the same object multiple times (should cycle through WeakMap keys)
  assert.doesNotThrow(() => {
    for (let i = 0; i < 100; i++) {
      blackhole(obj);
    }
  });
});

test('blackhole should handle large number of different objects', () => {
  // Generate many different objects and pass them to blackhole
  assert.doesNotThrow(() => {
    for (let i = 0; i < 100; i++) {
      blackhole({ id: i, value: `value-${i}` });
    }
  });
});
