import { MAX_SEATS, seatDetails, validateSelection, calculatePrice, formatPrice } from './seats.js';

const byId = (id) => document.getElementById(id);
const ui = {
  loading: byId('loading'), loadError: byId('load-error'), app: byId('app'), eventName: byId('event-name'),
  grid: byId('seat-grid'), selectedSeats: byId('selected-seats'), seatCount: byId('seat-count'),
  subtotal: byId('subtotal'), discount: byId('discount'), total: byId('total'),
  selectionErrors: byId('selection-errors'), continueButton: byId('continue'),
  dialog: byId('checkout'), form: byId('checkout-form'), checkoutSummary: byId('checkout-summary'),
  checkoutErrors: byId('checkout-errors'), name: byId('full-name'), email: byId('email'),
  nameError: byId('name-error'), emailError: byId('email-error'), confirmation: byId('confirmation')
};

let eventData = null;
let sold = new Set();
const selected = new Set();
const buttons = new Map();
let activeSeat = null;

const seatOrder = () => [...buttons.keys()];
const selection = () => [...selected].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

function showProblems(container, problems) {
  container.replaceChildren();
  container.hidden = problems.length === 0;
  if (!problems.length) return;
  const heading = document.createElement('strong');
  heading.textContent = 'Please fix the following:';
  const list = document.createElement('ul');
  for (const problem of problems) {
    const item = document.createElement('li');
    item.textContent = problem;
    list.append(item);
  }
  container.append(heading, list);
}

function setActiveSeat(id, shouldFocus = false) {
  if (!buttons.has(id) || buttons.get(id).disabled) return;
  activeSeat = id;
  for (const [key, button] of buttons) button.tabIndex = key === id ? 0 : -1;
  if (shouldFocus) buttons.get(id).focus();
}

function updateSeatButtons() {
  for (const [id, button] of buttons) {
    const detail = seatDetails(eventData, id);
    const isSold = sold.has(id);
    const isSelected = selected.has(id);
    button.disabled = isSold;
    button.classList.toggle('sold', isSold);
    button.setAttribute('aria-pressed', String(isSelected));
    button.setAttribute('aria-label', `Row ${detail.row}, seat ${detail.number}, ${detail.category}, ${formatPrice(detail.price)}, ${isSold ? 'sold' : isSelected ? 'selected' : 'available'}`);
    button.replaceChildren(document.createTextNode(String(detail.number)));
    if (isSelected || isSold) {
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = isSold ? '×' : '✓';
      mark.setAttribute('aria-hidden', 'true');
      button.append(mark);
    }
  }
  if (!activeSeat || buttons.get(activeSeat)?.disabled) {
    activeSeat = [...buttons].find(([, button]) => !button.disabled)?.[0] ?? null;
  }
  if (activeSeat) setActiveSeat(activeSeat);
}

function updateSummary() {
  const ids = selection();
  const prices = calculatePrice(eventData, ids);
  ui.seatCount.textContent = `${ids.length} / ${MAX_SEATS}`;
  ui.selectedSeats.textContent = ids.length ? ids.join(', ') : 'No seats selected yet';
  ui.subtotal.textContent = formatPrice(prices.subtotal);
  ui.discount.textContent = prices.discount ? `−${formatPrice(prices.discount)}` : formatPrice(0);
  ui.total.textContent = formatPrice(prices.total);
}

function toggleSeat(id) {
  if (sold.has(id)) return;
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  updateSeatButtons();
  updateSummary();
  showProblems(ui.selectionErrors, []);
  ui.confirmation.hidden = true;
}

function handleArrowKey(event) {
  const current = event.currentTarget.dataset.id;
  const detail = seatDetails(eventData, current);
  const rows = Object.keys(eventData.rows);
  const rowIndex = rows.indexOf(detail.row);
  const directions = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
  if (!Object.hasOwn(directions, event.key)) return;
  event.preventDefault();
  const [dr, dc] = directions[event.key];
  let r = rowIndex + dr;
  let c = detail.number + dc;
  // Skip sold seats in the direction of travel, without wrapping around rows.
  while (r >= 0 && r < rows.length && c >= 1 && c <= 10) {
    const id = `${rows[r]}${c}`;
    if (!sold.has(id)) {
      setActiveSeat(id, true);
      return;
    }
    r += dr;
    c += dc;
  }
}

function renderSeatMap() {
  ui.grid.replaceChildren();
  buttons.clear();
  for (const row of Object.keys(eventData.rows)) {
    const label = document.createElement('span');
    label.className = 'row-label';
    label.textContent = row;
    label.setAttribute('aria-hidden', 'true');
    ui.grid.append(label);
    for (let n = 1; n <= 10; n++) {
      const id = `${row}${n}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'seat';
      button.dataset.id = id;
      button.tabIndex = -1;
      button.addEventListener('click', () => toggleSeat(id));
      button.addEventListener('keydown', handleArrowKey);
      button.addEventListener('focus', () => setActiveSeat(id));
      buttons.set(id, button);
      ui.grid.append(button);
    }
  }
  updateSeatButtons();
}

async function loadEvent() {
  ui.loading.hidden = false;
  ui.loadError.hidden = true;
  ui.app.hidden = true;
  ui.confirmation.hidden = true;
  try {
    const response = await fetch('./event.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Event request failed: ${response.status}`);
    const data = await response.json();
    if (!data || !data.name || !data.rows || !data.categories || !Array.isArray(data.sold)) {
      throw new Error('Invalid event data');
    }
    eventData = data;
    sold = new Set(data.sold);
    selected.clear();
    activeSeat = null;
    // XSS protection: never interpret the untrusted event name as HTML.
    ui.eventName.textContent = data.name;
    renderSeatMap();
    updateSummary();
    showProblems(ui.selectionErrors, []);
    ui.app.hidden = false;
  } catch (error) {
    console.error('Failed to load event:', error);
    ui.loadError.hidden = false;
  } finally {
    ui.loading.hidden = true;
  }
}

function validateBooking() {
  return validateSelection(eventData, selection(), [...sold]);
}

ui.continueButton.addEventListener('click', () => {
  const problems = validateBooking();
  showProblems(ui.selectionErrors, problems);
  if (problems.length) {
    ui.selectionErrors.focus();
    return;
  }
  ui.form.reset();
  ui.name.removeAttribute('aria-invalid');
  ui.email.removeAttribute('aria-invalid');
  ui.nameError.textContent = '';
  ui.emailError.textContent = '';
  showProblems(ui.checkoutErrors, []);
  ui.checkoutSummary.textContent = `Seats ${selection().join(', ')} · ${ui.total.textContent}`;
  ui.dialog.showModal();
  ui.name.focus();
});

function validateCustomer() {
  const errors = [];
  let firstInvalid = null;
  const name = ui.name.value.trim();
  const email = ui.email.value.trim();
  ui.nameError.textContent = '';
  ui.emailError.textContent = '';
  ui.name.removeAttribute('aria-invalid');
  ui.email.removeAttribute('aria-invalid');
  if (!name) {
    errors.push('Full name is required.');
    ui.nameError.textContent = 'Enter your full name.';
    ui.name.setAttribute('aria-invalid', 'true');
    firstInvalid = ui.name;
  }
  if (!email || !ui.email.validity.valid) {
    errors.push(email ? 'Enter a valid email address.' : 'Email address is required.');
    ui.emailError.textContent = email ? 'Enter a valid email address.' : 'Enter your email address.';
    ui.email.setAttribute('aria-invalid', 'true');
    firstInvalid ??= ui.email;
  }
  return { errors, firstInvalid };
}

ui.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const seatProblems = validateBooking();
  const { errors, firstInvalid } = validateCustomer();
  showProblems(ui.checkoutErrors, [...seatProblems, ...errors]);
  if (seatProblems.length || errors.length) {
    if (firstInvalid) firstInvalid.focus();
    else ui.checkoutErrors.focus();
    return;
  }
  const booked = selection();
  for (const id of booked) sold.add(id);
  selected.clear();
  ui.dialog.close();
  updateSeatButtons();
  updateSummary();
  showProblems(ui.selectionErrors, []);
  ui.confirmation.textContent = `Booking confirmed. Seats ${booked.join(', ')} are now sold.`;
  ui.confirmation.hidden = false;
  // Native dialog restores focus to Continue on close.
  ui.continueButton.focus();
});

byId('cancel').addEventListener('click', () => ui.dialog.close());
ui.dialog.addEventListener('close', () => ui.continueButton.focus());
byId('retry').addEventListener('click', loadEvent);
loadEvent();
