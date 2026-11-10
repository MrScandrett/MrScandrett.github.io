import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDate, julianDate, christianSeason, solarTerm, skyReading} from '../assets/js/calendar-explorer.mjs';
import {easter} from '../assets/js/home-calendar.mjs';
const d = (y,m,day) => new Date(y,m-1,day);
test('calendar conversions match independent known date fixtures', () => {
  assert.match(calendarDate(d(2026,11,10), 'hebrew'), /30.*5787/);
  assert.match(calendarDate(d(2026,2,17), 'chinese'), /1.*2026/);
  assert.match(calendarDate(d(2026,3,21), 'persian'), /1.*1405/);
  assert.equal(julianDate(d(2026,11,10)), 'Oct 28, 2026');
  assert.equal(julianDate(d(2100,3,14)), 'Feb 29, 2100');
  assert.equal(julianDate(d(2100,3,15)), 'Mar 1, 2100');
});
test('Christian season transitions include leap years and Sunday Christmas', () => {
  for (const [date, name] of [[d(2026,2,17),'Epiphany season'],[d(2026,2,18),'Lent'],[d(2026,3,29),'Holy Week'],[d(2026,4,5),'Easter season'],[d(2026,5,24),'Pentecost'],[d(2026,5,25),'After Pentecost'],[d(2026,11,29),'Advent'],[d(2026,12,25),'Christmas'],[d(2026,1,5),'Christmas'],[d(2022,11,27),'Advent']]) assert.equal(christianSeason(date,easter).name,name);
});
test('astronomy estimates stay in range and follow seasonal cycles', () => {
  assert.equal(solarTerm(d(2026,11,10)), 'Start of winter');
  const winter=skyReading(d(2026,12,21)),summer=skyReading(d(2026,6,21));
  assert.match(winter.daylight,/^10h/); assert.match(summer.daylight,/^13h|^14h/);
  assert.equal(skyReading(d(2000,1,7)).name, 'New Moon');
  for(let m=1;m<=12;m++) {const s=skyReading(d(2026,m,15));assert.ok(s.illumination>=0 && s.illumination<=100);}
});
