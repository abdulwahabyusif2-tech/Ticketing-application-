const EVENTS = [
  { id: "e1", title: "Summer Live Concert", cat: "Music", date: "2026-12-05 19:00", venue: "City Arena", emoji: "🎤", hot: true, prices: [60, 45, 30], g: "#db2777,#7c3aed" },
  { id: "e2", title: "Tech & Innovation Summit", cat: "Conference", date: "2026-11-18 09:00", venue: "Convention Centre", emoji: "💡", hot: false, prices: [50, 40, 25], g: "#2563eb,#0ea5e9" },
  { id: "e3", title: "Cup Final: Stars vs Lions", cat: "Sports", date: "2026-11-28 16:00", venue: "National Stadium", emoji: "⚽", hot: true, prices: [40, 30, 20], g: "#16a34a,#065f46" },
  { id: "e4", title: "Stand-up Comedy Night", cat: "Comedy", date: "2026-12-12 20:00", venue: "Laugh Lounge", emoji: "😂", hot: false, prices: [35, 25, 15], g: "#f59e0b,#b45309" },
];
const ROWS = "ABCDEF".split(""), COLS = 8, MAX = 6, SESSION = 90, KEY = "ticketq.v1";
const SEAT_IDS = ROWS.flatMap((r) => Array.from({ length: COLS }, (_, c) => r + (c + 1)));
const $ = (s) => document.querySelector(s);
const app = $("#app"), dlg = $("#dlg");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (d) => new Date(d.replace(" ", "T")).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const priceOf = (ev, id) => ev.prices[Math.floor(ROWS.indexOf(id[0]) / 2)];

function seed() {
  const sold = {};
  EVENTS.forEach((e) => (sold[e.id] = SEAT_IDS.filter(() => Math.random() < (e.hot ? 0.45 : 0.2))));
  return { sold, tickets: [] };
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
if (!db || !db.sold) db = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };

let f = { q: "", cat: "All" }, room = null, sel = [], curId = null;

function toast(msg) {
  const t = Object.assign(document.createElement("div"), { className: "toast", textContent: msg });
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------- routing ---------- */
function route() {
  const [, page, id] = (location.hash || "#/").split("/");
  if (room && (page !== "event" || id !== room.eventId)) room = null;
  if (page !== "event") sel = [];
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("on", (a.hash === "#/tickets") === (page === "tickets")));
  $("#myCount").textContent = db.tickets.length;
  if (page === "event") viewEvent(id);
  else if (page === "tickets") viewTickets();
  else viewHome();
  window.scrollTo(0, 0);
}

/* ---------- home ---------- */
function viewHome() {
  const cats = ["All", ...new Set(EVENTS.map((e) => e.cat))];
  app.innerHTML = `<section class="hero"><h1>Find your next event</h1><p>Popular events use a fair waiting room: first in line, first to book.</p></section>
    <div class="tools"><input id="q" type="search" placeholder="Search events or venues" value="${esc(f.q)}">
    <div class="chips">${cats.map((c) => `<button class="chip ${f.cat === c ? "on" : ""}" data-cat="${c}">${c}</button>`).join("")}</div></div>
    <div id="grid" class="grid"></div>`;
  drawGrid();
}
function drawGrid() {
  const q = f.q.toLowerCase();
  const list = EVENTS.filter((e) => (f.cat === "All" || e.cat === f.cat) && (e.title + e.venue).toLowerCase().includes(q));
  $("#grid").innerHTML = list.length ? list.map((e) => {
    const left = SEAT_IDS.length - db.sold[e.id].length;
    return `<a class="card ev" href="#/event/${e.id}"><div class="art" style="--g:${e.g}">${e.emoji}${e.hot ? '<span class="tag">HIGH DEMAND</span>' : ""}</div>
      <div class="body"><b>${e.title}</b><span class="muted">${fmt(e.date)}</span><span class="muted">${e.venue}</span>
      <span><b>From $${Math.min(...e.prices)}</b> · <span class="muted">${left ? left + " seats left" : "Sold out"}</span></span></div></a>`;
  }).join("") : '<p class="empty">No events match your search.</p>';
}

/* ---------- event page ---------- */
function viewEvent(id) {
  const ev = EVENTS.find((e) => e.id === id);
  if (!ev) { location.hash = "#/"; return; }
  curId = id;
  const open = !ev.hot || (room && room.admitted);
  app.innerHTML = `<a href="#/">← All events</a>
    <section class="banner" style="--g:${ev.g}"><span class="emoji">${ev.emoji}</span><div><h1>${ev.title}</h1><p>${fmt(ev.date)} · ${ev.venue}</p></div></section>` +
    (open
      ? `<div class="split"><div class="card"><div class="legend"><span><i class="seat"></i>Available</span><span><i class="seat sel"></i>Selected</span>
         <span><i class="seat sold"></i>Taken</span><span class="muted">Rows A-B $${ev.prices[0]} · C-D $${ev.prices[1]} · E-F $${ev.prices[2]}</span></div>
         <div class="scroll"><div class="stage">STAGE</div><div id="map"></div></div></div><aside class="card sum" id="sum"></aside></div>`
      : '<div class="card center" id="roomBox"></div>');
  open ? paintSeats() : paintRoom();
}

function paintRoom() {
  const box = $("#roomBox"); if (!box) return;
  if (!room) {
    box.innerHTML = `<h2>This event is in high demand</h2><p class="muted">Join the waiting room. When it is your turn you get ${SESSION} seconds to choose seats.</p>
      <button data-act="join">Join waiting room</button>`;
    return;
  }
  const pos = room.queue.toArray().findIndex((u) => u.me) + 1;
  box.innerHTML = `<p class="muted">Your place in line</p><div class="pos">#${pos}</div>
    <div class="bar"><i style="width:${Math.round((1 - pos / room.init) * 100)}%"></i></div>
    <p>${pos - 1} people ahead of you · about ${(pos - 1) * 2 + 1}s</p>
    <p class="muted">Keep this page open. People are admitted one at a time, in the order they joined.</p>
    <button class="ghost" data-act="leave">Leave waiting room</button>`;
}

function paintSeats() {
  const ev = EVENTS.find((e) => e.id === curId), map = $("#map"); if (!map) return;
  const taken = new Set(db.sold[ev.id]);
  map.innerHTML = ROWS.map((r, ri) => `<div class="srow"><span class="rl">${r}</span>` +
    SEAT_IDS.slice(ri * COLS, ri * COLS + COLS).map((id) =>
      `<button class="seat p${Math.floor(ri / 2)} ${taken.has(id) ? "sold" : sel.includes(id) ? "sel" : ""}" data-seat="${id}"
        title="${id} · $${priceOf(ev, id)}" ${taken.has(id) ? "disabled" : ""}>${id.slice(1)}</button>`).join("") + "</div>").join("");
  const total = sel.reduce((s, id) => s + priceOf(ev, id), 0);
  const left = room ? Math.max(0, Math.round((room.expires - Date.now()) / 1000)) : null;
  $("#sum").innerHTML = `<h2>Your selection</h2>` +
    (left !== null ? `<p class="muted">Time left: <span class="timer ${left <= 15 ? "urgent" : ""}">${left}s</span></p>` : "") +
    (sel.length ? `<ul>${sel.map((id) => `<li><span>Seat ${id}</span><b>$${priceOf(ev, id)}</b></li>`).join("")}</ul>`
      : `<p class="muted">Pick up to ${MAX} seats.</p>`) +
    `<div class="total">$${total}</div><button data-act="checkout" ${sel.length ? "" : "disabled"}>Checkout</button>`;
}

/* ---------- checkout ---------- */
function openCheckout() {
  const ev = EVENTS.find((e) => e.id === curId);
  const total = sel.reduce((s, id) => s + priceOf(ev, id), 0);
  dlg.innerHTML = `<form id="payForm" novalidate><h2>Checkout</h2>
    <p class="muted">${ev.title} · Seats ${sel.join(", ")} · <b>$${total}</b></p>
    <label>Full name<input name="name" autocomplete="name" required></label>
    <label>Email<input name="email" type="email" autocomplete="email" required></label>
    <label>Payment method<select name="method"><option>Mobile money</option><option>Card</option></select></label>
    <p class="err" id="err"></p>
    <div class="row"><button type="submit">Pay $${total}</button><button type="button" class="ghost" data-act="close">Cancel</button></div>
    <p class="muted">Demo only. No payment details are collected or stored.</p></form>`;
  dlg.showModal();
}
function pay(form) {
  const ev = EVENTS.find((e) => e.id === curId), d = new FormData(form);
  const name = d.get("name").trim(), email = d.get("email").trim(), err = $("#err");
  if (name.length < 2) return (err.textContent = "Please enter your full name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return (err.textContent = "Please enter a valid email address.");
  if (sel.some((id) => db.sold[ev.id].includes(id))) { dlg.close(); toast("Sorry, a seat was just taken."); sel = []; return paintSeats(); }
  db.sold[ev.id].push(...sel);
  const total = sel.reduce((s, id) => s + priceOf(ev, id), 0);
  const code = "TQ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  db.tickets.unshift({ code, eventId: ev.id, name, email, seats: [...sel], total, method: d.get("method"), at: Date.now() });
  save(); sel = []; room = null; dlg.close();
  toast("Booking confirmed! " + code);
  location.hash = "#/tickets"; route();
}

/* ---------- my tickets ---------- */
const barcode = (code) => {
  let x = 4;
  const bars = [...code].map((c) => { const w = 1 + (c.charCodeAt(0) % 3), r = `<rect x="${x}" y="4" width="${w}" height="40"/>`; x += w + 2; return r; }).join("");
  return `<svg width="${x + 4}" height="48" fill="#111" aria-label="Barcode ${code}">${bars}</svg>`;
};
function viewTickets() {
  app.innerHTML = `<h1>My tickets</h1><p class="muted">Saved in this browser.</p>` + (db.tickets.length
    ? db.tickets.map((t) => { const ev = EVENTS.find((e) => e.id === t.eventId);
        return `<div class="card tk"><div><h2>${ev.emoji} ${ev.title}</h2><p class="muted">${fmt(ev.date)} · ${ev.venue}</p>
          <p>Seats <b>${t.seats.join(", ")}</b> · Total <b>$${t.total}</b></p><p class="muted">${esc(t.name)} · ${esc(t.email)} · ${t.method}</p>
          <div class="acts"><button class="danger" data-cancel="${t.code}">Cancel booking</button></div></div>
          <div><b>${t.code}</b><br>${barcode(t.code)}</div></div>`; }).join("")
    : '<div class="empty">No tickets yet. <a href="#/">Browse events</a></div>');
}

/* ---------- waiting-room simulation ---------- */
function joinRoom() {
  const q = new Queue(), n = 6 + Math.floor(Math.random() * 8);
  for (let i = 0; i < n; i++) q.enqueue({ me: false });
  q.enqueue({ me: true });
  room = { eventId: curId, queue: q, init: n + 1, admitted: false, ticks: 0 };
  paintRoom();
}
setInterval(() => {
  if (!room) return;
  if (!room.admitted) {
    if (++room.ticks % 2 === 0 && room.queue.dequeue().me) {
      room.admitted = true; room.expires = Date.now() + SESSION * 1000;
      toast("It's your turn! Choose your seats."); return viewEvent(curId);
    }
    paintRoom();
  } else if (Date.now() >= room.expires) {
    room = null; sel = []; dlg.open && dlg.close(); toast("Your time ran out. Join the waiting room again."); viewEvent(curId);
  } else if (!dlg.open) paintSeats();
}, 1000);

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.cat) { f.cat = t.dataset.cat; viewHome(); }
  else if (t.dataset.seat) {
    const i = sel.indexOf(t.dataset.seat);
    if (i >= 0) sel.splice(i, 1);
    else if (sel.length < MAX) sel.push(t.dataset.seat);
    else toast(`You can book at most ${MAX} seats.`);
    paintSeats();
  } else if (t.dataset.cancel) {
    if (!confirm("Cancel this booking and release the seats?")) return;
    const tk = db.tickets.find((x) => x.code === t.dataset.cancel);
    db.sold[tk.eventId] = db.sold[tk.eventId].filter((id) => !tk.seats.includes(id));
    db.tickets = db.tickets.filter((x) => x !== tk); save(); toast("Booking cancelled."); route();
  } else if (t.dataset.act === "join") joinRoom();
  else if (t.dataset.act === "leave") { room = null; paintRoom(); }
  else if (t.dataset.act === "checkout") openCheckout();
  else if (t.dataset.act === "close") dlg.close();
});
document.addEventListener("input", (e) => { if (e.target.id === "q") { f.q = e.target.value; drawGrid(); } });
dlg.addEventListener("submit", (e) => { e.preventDefault(); pay(e.target); });
window.addEventListener("hashchange", route);
route();
