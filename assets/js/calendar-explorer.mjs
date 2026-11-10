// Civil-date comparisons use noon on the selected local date, independent of DST.
const DAY = 86400000;
const rad = Math.PI / 180;
const mod = (n, d) => ((n % d) + d) % d;
export const civilUTC = d => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
export const LENSES = {
  christian: { label: 'Christian year', explanation: 'A Western Christian seasonal overview using Gregorian Easter and Advent beginning four Sundays before Christmas. Epiphany is January 6; the Christmas season is shown through January 5. Denominations differ on season endings, colors, and feast observance. Purple marks preparation, white celebration, green growth, and red Pentecost.', lesson: 'lessons/bible-studies/feasts-of-israel.html', source: 'https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/liturgical-year' },
  hebrew: { label: 'Hebrew', explanation: 'A lunisolar calendar: months follow the Moon, with seven leap months in a 19-year cycle to keep festivals in their seasons. The displayed date is the daytime Hebrew date; that day begins at sunset on the preceding civil evening. Biblical festivals remain visible through the Holidays filter.', lesson: 'lessons/bible-studies/feasts-of-israel.html', source: 'https://aa.usno.navy.mil/faq/calendars' },
  chinese: { label: 'Chinese', explanation: 'The traditional Chinese calendar combines lunar months with solar seasons. Leap months keep the cycles aligned. Dates use the browser’s Chinese-calendar conversion for the selected civil date. The solar term below is estimated at 12:00 UTC; a boundary day may span two terms. Seasonal names describe traditional Chinese climate, not local Florida weather.', lesson: 'lessons/earth-science/seasons-and-the-heavens.html', source: 'https://www.hko.gov.hk/en/gts/time/24solarterms.htm' },
  sky: { label: 'Sun & Moon', explanation: 'An astronomy view rather than a separate calendar. Moon phase uses a mean 29.53059-day cycle from the January 6, 2000 new moon; illumination and phase are approximate, not an ephemeris. Daylight is estimated for Longwood, Florida (28.7°N), with a standard sunrise refraction correction. All readings represent the selected date, not live weather.', lesson: 'lessons/earth-science/sun-moon-and-stars.html', source: 'https://gml.noaa.gov/grad/solcalc/calcdetails.html' },
  persian: { label: 'Persian', explanation: 'The modern Solar Hijri calendar starts its year near the March equinox. It is distinct from the historical Jalali calendar associated with Omar Khayyam. Dates here use the browser’s Persian-calendar conversion; very distant dates and equinox-boundary conventions can vary.', lesson: 'lessons/language-literature/pioneers/omar-khayyam.html', source: 'https://www.iranicaonline.org/articles/calendars/calendars-ii-in-the-islamic-period/' },
  julian: { label: 'Julian', explanation: 'The Julian calendar has a leap day every four years. The Gregorian calendar omits three of those leap days every 400 years. Their date difference changes over the centuries. Some Christian churches use the Julian calendar for fixed feasts; Easter rules and church practices need a separate comparison. A Julian calendar date is different from an astronomical Julian Day number.', lesson: 'lessons/language-literature/pioneers/omar-khayyam.html', source: 'https://aa.usno.navy.mil/faq/calendars' }
};
const formatters = new Map();
export function calendarDate(date, calendar, compact = false) {
  try {
    const key = `${calendar}-${compact}`;
    if (!formatters.has(key)) {
      const fmt = new Intl.DateTimeFormat(`en-US-u-ca-${calendar}`, { timeZone: 'UTC', day: 'numeric', month: compact ? 'short' : 'long', ...(!compact && { year: 'numeric' }) });
      if (fmt.resolvedOptions().calendar !== calendar) return 'Calendar unavailable in this browser';
      formatters.set(key, fmt);
    }
    return formatters.get(key).format(civilUTC(date));
  } catch { return 'Calendar unavailable in this browser'; }
}
export function julianDate(date, compact = false) {
  // Gregorian civil date -> integer Julian Day -> Julian calendar (no fixed offset).
  const d = civilUTC(date);
  const jdn = Math.floor(d.getTime() / DAY + 2440587.5);
  const c = jdn + 32082, y = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * y / 4), m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10), year = y - 4800 + Math.floor(m / 10);
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1]} ${day}${compact ? '' : `, ${year}`}`;
}
export function christianSeason(date, easter) {
  const year = date.getFullYear(), t = civilUTC(date).getTime();
  const at = (m, d) => Date.UTC(year, m, d, 12);
  const e = civilUTC(easter(year)).getTime();
  const christmas = new Date(year, 11, 25);
  const advent = at(11, 25) - (christmas.getDay() || 7) * DAY - 21 * DAY;
  if (t >= at(11, 25) || t < at(0, 6)) return {name: 'Christmas', color: 'white'};
  if (t >= advent) return {name: 'Advent', color: 'purple'};
  if (t < e - 46 * DAY) return {name: 'Epiphany season', color: 'green'};
  if (t < e - 7 * DAY) return {name: 'Lent', color: 'purple'};
  if (t < e) return {name: 'Holy Week', color: 'purple'};
  if (t < e + 49 * DAY) return {name: 'Easter season', color: 'white'};
  if (t === e + 49 * DAY) return {name: 'Pentecost', color: 'red'};
  return {name: 'After Pentecost', color: 'green'};
}
export function solarLongitude(date) {
  const n = civilUTC(date).getTime() / DAY + 2440587.5 - 2451545;
  const g = mod(357.529 + .98560028 * n, 360) * rad;
  return mod(280.459 + .98564736 * n + 1.915 * Math.sin(g) + .020 * Math.sin(2 * g), 360);
}
const terms = ['Spring equinox','Clear and bright','Grain rain','Start of summer','Grain full','Grain in ear','Summer solstice','Minor heat','Major heat','Start of autumn','End of heat','White dew','Autumn equinox','Cold dew','Frost descent','Start of winter','Minor snow','Major snow','Winter solstice','Minor cold','Major cold','Start of spring','Rain water','Awakening of insects'];
export const solarTerm = date => terms[Math.floor(solarLongitude(date) / 15)];
export function skyReading(date) {
  const t = civilUTC(date).getTime();
  const phase = mod((t - Date.UTC(2000, 0, 6, 18, 14)) / DAY / 29.53059, 1);
  const index = Math.floor(phase * 8 + .5) % 8;
  const name = ['New Moon','Waxing crescent','First quarter','Waxing gibbous','Full Moon','Waning gibbous','Last quarter','Waning crescent'][index];
  const icon = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][index];
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) * 50);
  const longitude = solarLongitude(date) * rad;
  const decl = Math.asin(Math.sin(23.439 * rad) * Math.sin(longitude));
  const lat = 28.7 * rad;
  const cosH = (Math.cos(90.833 * rad) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
  const minutes = Math.round(8 * Math.acos(Math.max(-1, Math.min(1, cosH))) / rad);
  return { name, icon, illumination, daylight: `${Math.floor(minutes / 60)}h ${minutes % 60}m` };
}
