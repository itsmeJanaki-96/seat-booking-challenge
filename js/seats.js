/** Pure, side-effect-free booking rules. All monetary values are integer cents. */
export const MAX_SEATS = 6;
export const SEATS_PER_ROW = 10;

export function seatDetails(event, id) {
  const match = /^([A-Z])([1-9]|10)$/.exec(id);
  if (!match || !Object.hasOwn(event.rows, match[1])) return null;
  const [, row, number] = match;
  const category = event.rows[row];
  const price = event.categories[category];
  if (!Number.isSafeInteger(price) || price < 0) return null;
  return { id, row, number: Number(number), category, price };
}

/** Returns all problems, rather than only the first. */
export function validateSelection(event, selection, sold = event.sold) {
  const selected = new Set(selection);
  const unavailable = new Set(sold);
  const problems = [];
  if (selected.size === 0) problems.push('Select at least one seat.');
  if (selected.size > MAX_SEATS) problems.push(`You can book at most ${MAX_SEATS} seats.`);
  for (const id of selected) {
    if (!seatDetails(event, id)) problems.push(`${id} is not a valid seat.`);
    else if (unavailable.has(id)) problems.push(`${id} is already sold.`);
  }
  // A free seat is stranded when both immediate neighbours are blocked,
  // where the row boundaries also count as blocked.
  for (const row of Object.keys(event.rows)) {
    for (let n = 1; n <= SEATS_PER_ROW; n++) {
      const id = `${row}${n}`;
      if (selected.has(id) || unavailable.has(id)) continue;
      const blocked = (neighbour) => selected.has(`${row}${neighbour}`) || unavailable.has(`${row}${neighbour}`);
      const leftBlocked = n === 1 || blocked(n - 1);
      const rightBlocked = n === SEATS_PER_ROW || blocked(n + 1);
      if (leftBlocked && rightBlocked) problems.push(`Seat ${id} would be left alone.`);
    }
  }
  return problems;
}

export function calculatePrice(event, selection) {
  const subtotal = selection.reduce((sum, id) => {
    const details = seatDetails(event, id);
    if (!details) throw new RangeError(`Invalid seat: ${id}`);
    return sum + details.price;
  }, 0);
  const discount = selection.length >= 4 ? Math.round(subtotal * 10 / 100) : 0;
  return { subtotal, discount, total: subtotal - discount };
}

export function formatPrice(cents) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
