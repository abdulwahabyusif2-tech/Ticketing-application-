# TicketQ - Event Ticket Booking with Waiting-Room Queue

A functional single-page website (HTML, CSS, JavaScript, no dependencies) for browsing events and booking seats. High-demand events use a **virtual waiting room** built on a queue, so buyers are served first come, first served.

## Features

- Event listing with search and category filters
- Waiting room for high-demand events (queue position, progress, estimated wait, leave anytime)
- Timed booking session once admitted, with a countdown
- Interactive seat map with row pricing (max 6 seats per booking)
- Checkout form with validation (demo only, no payment data collected)
- Confirmation with ticket code and barcode
- "My tickets" page with booking cancellation (releases the seats)
- Data saved in the browser (localStorage), toast notifications, light and dark mode, responsive

## How the queue is used

Joining the waiting room = `enqueue`; admitting the next buyer = `dequeue`. The `Queue` class is a linked list in `js/queue.js`. The people ahead of you are simulated.

## Structure

```
index.html
css/style.css
js/queue.js   Linked-list queue
js/app.js     Routing, events, waiting room, seats, checkout, tickets
```

## Run locally

Open `index.html` in a browser. No build step.

## Deploy with GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit: TicketQ"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ticketq.git
git push -u origin main
```

Then: **Settings → Pages → Deploy from a branch → main / (root) → Save**.

## Reset demo data

Clear the site's data in your browser, or run `localStorage.removeItem("ticketq.v1")` in the console.

## License

MIT
