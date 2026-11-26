// Rebuild the static, keyboard-accessible library charts from the reviewed snapshot.
import fs from 'node:fs';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const { books } = read('data/book-chart-snapshot.json');
const { covers } = read('data/book-covers.json');
const catalog = read('data/reader-library.json').books;
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
function row(book, index) {
  const home = 'https://www.gutenberg.org/ebooks/' + book.id;
  const href = catalog[home] ? 'reader.html?src=' + encodeURIComponent(home) : home;
  const image = covers[home] ? '<img loading="lazy" src="' + covers[home].src + '" width="44" height="66" alt="">' : '<span></span>';
  return '<li><a href="' + href + '"><b>#' + (index + 1) + '</b>' + image + '<span><strong>' + escape(book.title) + '</strong><small>' + escape(book.author) + '</small></span></a></li>';
}
function chart(name, items, open = false) {
  return '<details class="book-award" name="book-awards"' + (open ? ' open' : '') + '><summary>' + escape(name) + ' <small>(' + items.length + ')</small></summary><ol class="library-rankings">\n' + items.map(row).join('\n') + '\n</ol></details>';
}
function percentile(value, values) {
  if (value == null || values.length < 2) return 0.5;
  const lower = values.filter(x => x < value).length;
  const equal = values.filter(x => x === value).length;
  return (lower + (equal - 1) / 2) / (values.length - 1);
}
function rank(items) {
  const scores = new Map();
  for (const field of ['stars', 'downloads']) {
    const values = items.map(book => book[field]).filter(Number.isFinite);
    for (const book of items) scores.set(book, (scores.get(book) || 0) + percentile(book[field], values));
  }
  return items.sort((a,b) => scores.get(b) - scores.get(a) || a.title.localeCompare(b.title));
}
function selected(ids) {
  return ids.map(id => {
    const book = books.find(b => b.id === id);
    if (!book) throw Error('Missing featured title ' + id);
    return book;
  });
}
const science = ['On the Origin of Species', 'The Voyage of the Beagle', 'Relativity: The Special and General Theory'].map(title => books.find(b => b.title === title));
const charts = [
  '<details class="award-browser"><summary>Book awards <span>Rankings across all grades</span></summary><div class="award-categories">',
  chart('All-time reader favorites', selected(['1342','514','1400','11'])),
  chart('Most influential in science', science),
  ...[...new Set(books.map(b => b.category))].sort().map(category => chart(category, rank(books.filter(b => b.category === category)))),
  '</div><details class="chart-sources"><summary>Sources and ranking method</summary>',
  '<p>All-time favorites compares four featured classics by their average place in the <a href="https://www.bbc.co.uk/arts/bigread/top100.shtml">BBC</a>, <a href="https://www.pbs.org/the-great-american-read/results/">PBS</a>, and <a href="https://stevegerlach.com/files/archive-2004.html">ABC Australia</a> reader polls.</p>',
  '<p>Science influence follows <a href="https://www.discovermagazine.com/25-greatest-science-books-of-all-time-15865">Discover’s science editors</a> for three featured works. Its two Darwin books tied. The <a href="https://www.publishers.org.uk/public-chooses-charles-darwins-on-the-origin-of-species-as-most-influential-academic-book-in-history/">Academic Book Week influence poll</a> breaks that tie in favor of <i>On the Origin of Species</i>.</p>',
  '<p>The genre awards compare ' + books.length + ' books by reader reception. Each book gets equal weight for its relative standing within the category in Goodreads reader stars and Project Gutenberg downloads over 30 days. Missing measures receive the category midpoint. Ties go alphabetically. Figures come from indexed pages reviewed November 26, 2026 and cover different reporting windows. <a href="data/book-chart-snapshot.json">View the data</a>.</p></details></details>'
];
const page = fs.readFileSync('library.html','utf8');
fs.writeFileSync('library.html',page.replace(/<!-- book charts start -->[\s\S]*?<!-- book charts end -->/, () => '<!-- book charts start -->\n        ' + charts.join('\n        ') + '\n        <!-- book charts end -->'));
