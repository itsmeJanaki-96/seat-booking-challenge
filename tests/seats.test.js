import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateSelection, calculatePrice, seatDetails, formatPrice } from '../js/seats.js';

const event = JSON.parse(readFileSync(fileURLToPath(new URL('../event.json', import.meta.url)), 'utf8'));
const errors = (seats) => validateSelection(event, seats);

test('C3 valid', () => assert.deepEqual(errors(['C3']), []));
test('C9 invalid: C10 stranded at row end', () => assert.ok(errors(['C9']).some(e => e.includes('C10'))));
test('C7 invalid: C6 stranded', () => assert.ok(errors(['C7']).some(e => e.includes('C6'))));
test('C6,C7,C8 valid', () => assert.deepEqual(errors(['C6', 'C7', 'C8']), []));
test('C1,C2 invalid: C3 stranded', () => assert.ok(errors(['C1', 'C2']).some(e => e.includes('C3'))));
test('C1,C2,C3 valid', () => assert.deepEqual(errors(['C1', 'C2', 'C3']), []));
test('seven seats invalid', () => assert.ok(errors(['A1','A2','A3','A4','A5','A6','A7']).some(e => e.includes('at most 6'))));
test('B1 B2 F5 F6: 48.00 minus 10% = 43.20', () => {
  assert.deepEqual(calculatePrice(event, ['B1','B2','F5','F6']), { subtotal: 4800, discount: 480, total: 4320 });
  assert.equal(formatPrice(4320), '€43.20');
});
test('zero seats returns a problem', () => assert.ok(errors([]).some(e => e.includes('at least one'))));
test('sold seats cannot be selected', () => assert.ok(errors(['C4']).some(e => e.includes('already sold'))));
test('invalid seat ID is rejected', () => assert.ok(errors(['Z99']).some(e => e.includes('not a valid seat'))));
test('no discount for three seats', () => assert.equal(calculatePrice(event, ['A1','A2','A3']).discount, 0));
test('seat details are derived from row category', () => {
  assert.deepEqual(seatDetails(event, 'F10'), { id:'F10', row:'F', number:10, category:'Premium', price:1500 });
});
test('multiple validation problems are returned together', () => {
  const problems = errors(['C9','C7','A1','A2','A3','A4','A5']);
  assert.ok(problems.some(e => e.includes('at most 6')));
  assert.ok(problems.some(e => e.includes('C6')));
  assert.ok(problems.some(e => e.includes('C10')));
});
