import {mkdir,copyFile,writeFile} from "node:fs/promises";
const service = new URL(process.env.BOOKING_SOURCE || "https://gambit-futian-room-bookings.major-petal-4125.chatgpt.site");
if (service.protocol !== "https:") throw Error("HTTPS required");
const day = new Date().toISOString().slice(0,10);
const shift = (d,n) => new Date(Date.parse(d+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
const from=shift(day,-90), to=shift(day,730);
const records=new Map();
for(let cursor=from;cursor<to;){
  const end=shift(cursor,35)<to?shift(cursor,35):to;
  const url=new URL("/api/public/bookings",service);
  url.search=new URLSearchParams({from:cursor,to:end});
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error("Source unavailable: "+response.status);
  const {bookings}=await response.json();
  if(!Array.isArray(bookings))throw Error("Invalid schedule");
  for(const {id,room,title,people,starts,ends} of bookings){
    if(!id||!["trpg","large","small1","small2"].includes(room)||typeof title!=="string"||!Number.isInteger(people)||typeof starts!=="string"||typeof ends!=="string") throw Error("Invalid booking");
    records.set(id,{id,room,title,people,starts,ends});
  }
  cursor=end;
}
await mkdir("_site",{recursive:true});
for(const file of ["index.html","calendar.js","viewer.js","style.css","gambit-mark.png","staff-trial.html"])await copyFile(file,"_site/"+file);
await writeFile("_site/schedule.json",JSON.stringify({updatedAt:new Date().toISOString(),from,to,bookings:[...records.values()].sort((a,b)=>a.starts.localeCompare(b.starts)||a.id.localeCompare(b.id))}));
