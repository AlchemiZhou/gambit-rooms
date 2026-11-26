const rooms = [
  {id: "trpg", name: "跑团包间", icon: "die"},
  {id: "large", name: "大包间", icon: "large"},
  {id: "small1", name: "小包间1", icon: "room"},
  {id: "small2", name: "小包间2", icon: "room"}
];
const $ = selector => document.querySelector(selector);
const roomById = id => rooms.find(room => room.id === id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[ch]);
const icon = name => `<svg class="ico" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
const MS_DAY = 86400000;
const shanghaiDate = new Intl.DateTimeFormat("sv-SE", {timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"});
const today = () => shanghaiDate.format(new Date());
const dateOf = value => new Date(value + "T00:00:00Z");
const shifted = (date, days) => new Date(+dateOf(date) + days * MS_DAY).toISOString().slice(0, 10);
const weekOf = day => shifted(day, -(dateOf(day).getUTCDay() + 6) % 7);
const weekday = date => "周" + weekdays[dateOf(date).getUTCDay()];
const shortDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const monthDay = date => `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`;
const rangeDates = week => Array.from({length: 7}, (_, index) => shifted(week, index));
const activeOn = (record, day) => record.starts < shifted(day, 1) + "T00:00" && record.ends > day + "T00:00";
const minutes = (start, end) => (Date.parse(end + ":00Z") - Date.parse(start + ":00Z")) / 60000;

function lengthText(total) {
  if (!Number.isFinite(total) || total <= 0) return "待确认时长";
  const days = Math.floor(total / 1440);
  const hours = Math.floor(total % 1440 / 60);
  const mins = total % 60;
  return [days && days + " 天", hours && hours + " 小时", mins && mins + " 分钟"].filter(Boolean).join(" ");
}

function timeRange(record, displayDay) {
  const a = record.starts.slice(0, 10), b = record.ends.slice(0, 10);
  const start = record.starts.slice(11), end = record.ends.slice(11);
  if (a === b) return start + "–" + end;
  if (displayDay === a && shifted(a, 1) === b) return start + "–次日 " + end;
  return `${shortDate(a)} ${start}–${shortDate(b)} ${end}`;
}

function weekLabel(start) {
  const end = shifted(start, 6);
  const left = `${start.slice(0, 4)}年${monthDay(start)}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return left + " — " + Number(end.slice(8)) + "日";
  return left + " — " + (start.slice(0,4) === end.slice(0,4) ? "" : end.slice(0,4) + "年") + monthDay(end);
}

function roomTitle(room) {
  return `<span class="room-icon">${icon(room.icon)}</span>${room.name}`;
}
function roomPill(id) {
  const r = roomById(id);
  return `<span class="pill" data-room="${r.id}">${r.name}</span>`;
}

function bookingCard(booking, day) {
  return `<button type="button" class="booking-card" data-id="${esc(booking.id)}" data-room="${esc(booking.room)}">
    <strong>${esc(booking.title)}</strong><span class="card-time">${timeRange(booking, day)}</span>
    <span class="card-facts"><span>${icon("clock")}${lengthText(minutes(booking.starts, booking.ends))}</span><span>${icon("people")}${booking.people} 人</span></span>
  </button>`;
}

function addButton(room, day, className, content) {
  return `<button type="button" class="${className}" data-add="${room.id}" data-date="${day}" aria-label="${monthDay(day)}，在${room.name}新建预约">${content}</button>`;
}

function tableView(dates, bookings) {
  const headers = rooms.map(room => `<th scope="col" data-room="${room.id}"><span class="room-head">${roomTitle(room)}</span></th>`).join("");
  const rows = dates.map(day => {
    const isToday = day === today(), weekend = [0,6].includes(dateOf(day).getUTCDay());
    const cells = rooms.map(room => {
      const entries = bookings.filter(b => b.room === room.id && activeOn(b, day));
      const contents = entries.length ? entries.map(b => bookingCard(b, day)).join("") + addButton(room, day, "extra-slot", icon("plus"))
        : addButton(room, day, "empty-slot", icon("plus"));
      return `<td data-room="${room.id}" class="${entries.length ? "filled" : ""}">${contents}</td>`;
    }).join("");
    return `<tr class="${isToday ? "today" : ""} ${weekend ? "weekend" : ""}"><th scope="row"><span class="day-number">${shortDate(day)}</span><span class="day-name">${isToday ? "今天" : weekday(day)}</span></th>${cells}</tr>`;
  }).join("");
  return `<table class="calendar-table" aria-label="本页一周的四个包间排期"><colgroup><col class="date-col"><col span="4"></colgroup><thead><tr><th scope="col">日期</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

function mobileView(dates, bookings, selectedDay) {
  const tabs = dates.map(day => {
    const n = bookings.filter(b => activeOn(b, day)).length;
    const current = day === today();
    return `<button class="date-tab ${n ? "has-booking" : ""} ${current ? "is-today" : ""}" data-day="${day}" aria-pressed="${day === selectedDay}" aria-label="${monthDay(day)} ${weekday(day)}，${n} 场预约"><small>${current ? "今天" : weekday(day)}</small><b>${Number(day.slice(8))}</b><i aria-hidden="true"></i></button>`;
  }).join("");
  const rows = rooms.map(room => {
    const entries = bookings.filter(b => b.room === room.id && activeOn(b, selectedDay));
    return `<section class="day-room" data-room="${room.id}"><div class="day-room-head"><h3>${roomTitle(room)}</h3>${addButton(room, selectedDay, "", icon("plus"))}</div>
      ${entries.length ? entries.map(b => bookingCard(b, selectedDay)).join("") : '<p class="mobile-free">当天暂无预约</p>'}</section>`;
  }).join("");
  return `<div class="mobile-schedule"><div class="day-strip" aria-label="选择日期">${tabs}</div><div class="day-rooms">${rows}</div></div>`;
}

function agendaView(dates, bookings, week) {
  const groups = dates.map(day => {
    const entries = bookings.filter(b => (b.starts.slice(0, 10) < week ? week : b.starts.slice(0, 10)) === day);
    const items = entries.map(b => `<button type="button" class="agenda-booking" data-id="${esc(b.id)}" data-room="${b.room}">
      <strong>${esc(b.title)}</strong><span class="card-time">${timeRange(b, day)}</span>
      <span class="agenda-fact">${icon("clock")}${lengthText(minutes(b.starts, b.ends))}</span><span class="agenda-fact">${icon("people")}${b.people} 人</span>${roomPill(b.room)}</button>`).join("");
    const occupied = bookings.some(b => activeOn(b, day));
    const empty = `<div class="agenda-empty"><span>${occupied ? "有跨日预约延续" : "暂无预约"}</span><button data-add="trpg" data-date="${day}">＋ 新建</button></div>`;
    return `<div class="agenda-day"><h3>${monthDay(day)}<span>${day === today() ? "今天 · " : ""}${weekday(day)}</span></h3><div>${items || empty}</div></div>`;
  }).join("");
  return `<div class="agenda">${groups}</div>`;
}

function pressed(id, value) { $(id).setAttribute("aria-pressed", String(value)); }

function renderSchedule(state, compact) {
  if ($("#board").hidden) return;
  const focus = document.activeElement;
  const focusInSchedule = focus instanceof HTMLButtonElement && $("#schedule").contains(focus);
  const selector = focusInSchedule ? ["id", "day", "add", "date"].filter(key => focus.dataset[key]).map(key => `[data-${key}="${CSS.escape(focus.dataset[key])}"]`).join("") : "";
  const current = weekOf(today());
  pressed("#this-week", state.week === current);
  pressed("#next-week", state.week === shifted(current, 7));
  pressed("#view-grid", state.view === "grid");
  pressed("#view-list", state.view === "list");
  $("#week-range").textContent = weekLabel(state.week);
  const rows = state.bookings;
  const period = state.week === current ? "本周" : state.week === shifted(current, 7) ? "下周" : "所选周";
  $("#stats").textContent = rows ? `${period} ${rows.length} 场预约 · ${rows.reduce((sum, b) => sum + b.people, 0)} 人次` : "四个包间 · 周排期";
  const feedback = $("#calendar-feedback");
  feedback.hidden = !state.error && rows !== null && rows.length > 0;
  if (state.error) feedback.innerHTML = `${rows ? "目前显示上次读取的排期。" : ""}${esc(state.error)} <button data-retry>重试</button>`;
  else feedback.textContent = rows ? "这周还没有预约。" : "正在读取预约…";
  const dates = rangeDates(state.week);
  $("#schedule").innerHTML = !rows ? "" : state.view === "list" ? agendaView(dates, rows, state.week)
    : compact ? mobileView(dates, rows, state.day) : tableView(dates, rows);
  if (selector) $("#schedule").querySelector(selector)?.focus({preventScroll: true});
}

export {$, esc, icon, rooms, roomById, today, shifted, weekOf, weekday, monthDay, minutes, lengthText, timeRange, roomPill, renderSchedule};
