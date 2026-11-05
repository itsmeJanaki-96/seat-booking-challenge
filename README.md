# Repalogic Group — Seat Booking Challenge

A dependency-free event seat booking page using HTML, CSS and modern JavaScript.

## Run locally

Serve this directory over HTTP because `event.json` is loaded with `fetch`:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. Do not open `index.html` using a `file://` URL.

## Run tests

Requires Node.js 20+:

```bash
npm test
# or: node --test tests/seats.test.js
```

No `npm install` is required: the project uses no packages.

## Functionality

- Six rows, ten seats each; categories and sold seats from `event.json`.
- Maximum six seats; no single free seat stranded between blocked neighbours or a row boundary.
- 10% discount for four or more seats; totals in euro using `Intl.NumberFormat`.
- Responsive horizontal scrolling *inside* the seat map; light and dark modes.
- Accessible buttons, status labels, visible focus and arrow-key roving tabindex.
- Continue remains enabled and reports every booking-rule problem.
- Native checkout dialog validates full name and email, with first-invalid-field focus.
- Successful booking marks seats sold in memory and announces confirmation.
- Event name safely rendered as text, including the intentional XSS payload.

## Limitations

This is a frontend-only recruitment exercise. Bookings are in-memory and reset on reload; real bookings need an API and transactional inventory handling. Manual browser/screen-reader/axe checks are recommended before submission.
