import {$, esc, icon, today, shifted, weekOf, weekday, monthDay, minutes, lengthText, timeRange, roomPill, renderSchedule} from "./calendar.js";

const service = new URL($('meta[name="booking-service"]').content);
const mobile = matchMedia("(max-width: 800px)");
const state = {week:weekOf(today()), day:today(), view:"grid", bookings:null, error:""};
let generation = 0;
let refreshed = 0;
let selected = null;

function render() { renderSchedule(state, mobile.matches); }

async function refresh() {
  const request = ++generation;
  const url = new URL("api/public/bookings", service);
  url.searchParams.set("from", state.week);
  url.searchParams.set("to", shifted(state.week, 7));
  try {
    const response = await fetch(url, {credentials:"omit", cache:"no-store", referrerPolicy:"no-referrer"});
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (!Array.isArray(data.bookings)) throw new Error();
    if (request !== generation) return;
    state.bookings = data.bookings;
    state.error = "";
    refreshed = Date.now();
    if ($("#detail").open) showDetail(selected);
  } catch {
    if (request !== generation) return;
    state.error = "暂时无法读取实时排期，请检查网络后重试。";
  }
  render();
}

function selectDay(day) {
  const week = weekOf(day);
  if (week !== state.week) { state.bookings = null; state.error = ""; }
  state.day = day;
  state.week = week;
  render();
  void refresh();
}

function staffPage(params) {
  const target = new URL(service);
  target.search = new URLSearchParams(params);
  location.assign(target.href);
}

function showDetail(id) {
  const b = state.bookings?.find(booking => booking.id === id);
  if (!b) { $("#detail").close(); return; }
  selected = id;
  const day = b.starts.slice(0,10);
  $("#detail-content").innerHTML = roomPill(b.room) + '<h2 id="detail-heading">' + esc(b.title) + '</h2>' +
    '<p class="detail-time">' + day.slice(0,4) + "年" + monthDay(day) + " " + weekday(day) + "<br>" + esc(timeRange(b, day)) + '</p>' +
    '<div class="facts-strip"><span>' + icon("clock") + lengthText(minutes(b.starts,b.ends)) + '</span><span>' + icon("people") + b.people + ' 人</span></div>';
  if (!$("#detail").open) $("#detail").showModal();
}

$("#new-booking").addEventListener("click", () => staffPage({new:"1", room:"trpg", day:state.day}));
$("#staff-login").addEventListener("click", () => staffPage({staff:"1"}));
$("#detail-login").addEventListener("click", () => staffPage({staff:"1", booking:selected}));
$("#this-week").addEventListener("click", () => selectDay(today()));
$("#next-week").addEventListener("click", () => selectDay(shifted(weekOf(today()),7)));
$("#prev").addEventListener("click", () => selectDay(shifted(state.day,-7)));
$("#next").addEventListener("click", () => selectDay(shifted(state.day,7)));
$("#view-grid").addEventListener("click", () => { state.view="grid"; render(); });
$("#view-list").addEventListener("click", () => { state.view="list"; render(); });
$("#jump").addEventListener("click", () => { $("#jump-date").value=state.day; $("#date-dialog").showModal(); });
$("#date-form").addEventListener("submit", event => {
  event.preventDefault();
  $("#date-dialog").close();
  selectDay($("#jump-date").value);
});
document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-close")) button.closest("dialog").close();
  else if (button.dataset.id) showDetail(button.dataset.id);
  else if (button.dataset.add) staffPage({new:"1", room:button.dataset.add, day:button.dataset.date});
  else if (button.dataset.day) { state.day=button.dataset.day; render(); }
  else if (button.hasAttribute("data-retry")) void refresh();
});
mobile.addEventListener("change", render);
function refreshIfVisible() {
  if (!document.hidden && Date.now() - refreshed > 1500) void refresh();
}
window.addEventListener("focus", refreshIfVisible);
window.addEventListener("pageshow", event => { if (event.persisted) void refresh(); });
document.addEventListener("visibilitychange", refreshIfVisible);
setInterval(refreshIfVisible,30000);
render();
void refresh();
