(function (global) {
  'use strict';

  var stages = {
    world: { number: 1, title: 'The Biblical World', short: 'Orientation, story, and transmission' },
    presence: { number: 2, title: 'Covenant & Presence', short: 'Rescue, worship, holiness, and dwelling' },
    israel: { number: 3, title: 'Israel & the Prophets', short: 'Land, kingdom, exile, judgment, and hope' },
    jesus: { number: 4, title: 'Jesus & the Kingdom', short: 'Gospel setting, ministry, teaching, death, and resurrection' },
    church: { number: 5, title: 'Church & Mission', short: 'Spirit, witness, journeys, and gospel communities' },
    wisdom: { number: 6, title: 'Wisdom, Formation & Hope', short: 'Prayer, wisdom, suffering, discipleship, and new creation' }
  };

  var lessons = [
    { id: 'world-of-the-bible', href: 'world-of-the-bible.html', code: '1A', stage: 'world', kind: 'core', route: 'world-core', title: 'The World of the Bible' },
    { id: 'genesis', href: 'genesis.html', code: '1C', stage: 'world', kind: 'core', route: 'world-core', title: 'Genesis: Creation, Promise & Family' },
    { id: 'how-the-bible-reached-us', href: 'how-the-bible-reached-us.html', code: '1B', stage: 'world', kind: 'extension', route: 'reading-tools', title: 'How the Bible Reached Us' },
    { id: 'genesis-10-table-of-nations', href: 'genesis-10-table-of-nations.html', code: '1D', stage: 'world', kind: 'extension', route: 'genesis-deep-dive', title: 'Genesis 10: The Table of Nations' },

    { id: 'exodus', href: 'exodus.html', code: '2C', stage: 'presence', kind: 'core', route: 'presence-core', title: 'Exodus: Rescue, Covenant & Presence' },
    { id: 'the-tabernacle', href: 'the-tabernacle.html', code: '2A', stage: 'presence', kind: 'core', route: 'presence-core', title: 'The Tabernacle' },
    { id: 'leviticus', href: 'leviticus.html', code: '2E', stage: 'presence', kind: 'core', route: 'presence-core', title: 'Leviticus: Holiness, Worship & Neighbor-Love' },
    { id: 'numbers', href: 'numbers.html', code: '2F', stage: 'presence', kind: 'core', route: 'presence-core', title: 'Numbers: Wilderness, Trust & a New Generation' },
    { id: 'deuteronomy', href: 'deuteronomy.html', code: '2G', stage: 'presence', kind: 'core', route: 'presence-core', title: 'Deuteronomy: Remember, Love & Choose Life' },
    { id: 'temple-and-gods-presence', href: 'temple-and-gods-presence.html', code: '2B', stage: 'presence', kind: 'core', route: 'presence-core', title: "The Temple & God's Presence" },
    { id: 'feasts-of-israel', href: 'feasts-of-israel.html', code: '2D', stage: 'presence', kind: 'extension', route: 'presence-deep-dive', title: 'The Feasts of Israel' },

    { id: 'joshua-to-david', href: 'joshua-to-david.html', code: '3J', stage: 'israel', kind: 'core', route: 'israel-core', title: 'Joshua to David: Land, Judges & Kings' },
    { id: 'kingdoms-prophets-exile', href: 'kingdoms-prophets-exile.html', code: '3A', stage: 'israel', kind: 'core', route: 'israel-core', title: 'Kingdoms, Prophets & Exile' },
    { id: 'elijah', href: 'elijah.html', code: '3C', stage: 'israel', kind: 'book-study', route: 'prophets-deep-dive', title: 'Elijah: Prophet of the Living God' },
    { id: 'isaiah', href: 'isaiah.html', code: '3E', stage: 'israel', kind: 'book-study', route: 'prophets-deep-dive', title: 'Isaiah: Holiness, Justice & Hope' },
    { id: 'jeremiah', href: 'jeremiah.html', code: '3F', stage: 'israel', kind: 'book-study', route: 'prophets-deep-dive', title: 'Jeremiah: Courage, Covenant & Exile' },
    { id: 'lamentations', href: 'lamentations.html', code: '3H', stage: 'israel', kind: 'book-study', route: 'prophets-deep-dive', title: 'Lamentations: Grief, Prayer & Persistent Hope' },
    { id: 'ezekiel', href: 'ezekiel.html', code: '3G', stage: 'israel', kind: 'book-study', route: 'prophets-deep-dive', title: 'Ezekiel: God’s Presence & a People Renewed' },
    { id: 'daniel', href: 'daniel.html', code: '3D', stage: 'israel', kind: 'book-study', route: 'prophets-deep-dive', title: 'Daniel: Faithfulness in Exile' },

    { id: 'world-of-jesus', href: 'world-of-jesus.html', code: '4A', stage: 'jesus', kind: 'core', route: 'jesus-core', title: 'The World of Jesus' },
    { id: 'jesus-ministry', href: 'jesus-ministry.html', code: '4D', stage: 'jesus', kind: 'core', route: 'jesus-core', title: 'Jesus\u2019 Ministry: The Kingdom Arrives' },
    { id: 'jesus-parables-lab', href: 'jesus-parables-lab.html', code: '4B', stage: 'jesus', kind: 'core', route: 'jesus-core', title: "Jesus' Parables Lab" },
    { id: 'holy-week', href: 'holy-week.html', code: '4C', stage: 'jesus', kind: 'core', route: 'jesus-core', title: 'Holy Week: The Final Days of Jesus' },

    { id: 'acts-jerusalem-to-nations', href: 'acts-jerusalem-to-nations.html', code: '5A', stage: 'church', kind: 'core', route: 'church-core', title: 'Acts: Jerusalem to the Nations' },
    { id: 'pauls-missionary-journeys', href: 'pauls-missionary-journeys.html', code: '5B', stage: 'church', kind: 'core', route: 'church-core', title: "Paul's Missionary Journeys" },
    { id: 'epistles', href: 'epistles.html', code: '5C', stage: 'church', kind: 'core', route: 'church-core', title: 'The Epistles: Gospel Communities in Practice' },

    { id: 'psalms', href: 'psalms.html', code: '6D', stage: 'wisdom', kind: 'core', route: 'wisdom-core', title: 'Psalms: Honesty, Beauty & Context' },
    { id: 'proverbs', href: 'proverbs.html', code: '6A', stage: 'wisdom', kind: 'core', route: 'wisdom-core', title: 'Proverbs: Depth, Beauty & Context' },
    { id: 'job', href: 'job.html', code: '6B', stage: 'wisdom', kind: 'core', route: 'wisdom-core', title: 'Job: Suffering, Wisdom & Faithful Speech' },
    { id: 'sermon-on-the-mount', href: 'sermon-on-the-mount.html', code: '6C', stage: 'wisdom', kind: 'core', route: 'wisdom-core', title: 'The Sermon on the Mount' },
    { id: 'revelation', href: 'revelation.html', code: '6E', stage: 'wisdom', kind: 'capstone', route: 'whole-bible-capstone', title: 'Revelation: Witness, Worship & New Creation' }
  ];

  var routes = {
    'world-core': { label: 'Biblical World core route', items: ['world-of-the-bible', 'genesis'], nextRoute: 'presence-core' },
    'reading-tools': { label: 'Reading tools extension', items: ['how-the-bible-reached-us'], returnTo: 'world-of-the-bible' },
    'genesis-deep-dive': { label: 'Genesis deep dive', items: ['genesis-10-table-of-nations'], returnTo: 'genesis' },
    'presence-core': { label: 'Torah, Covenant & Presence core route', items: ['exodus', 'the-tabernacle', 'leviticus', 'numbers', 'deuteronomy', 'temple-and-gods-presence'], previousRoute: 'world-core', nextRoute: 'israel-core' },
    'presence-deep-dive': { label: 'Covenant calendar extension', items: ['feasts-of-israel'], returnTo: 'exodus' },
    'israel-core': { label: 'Israel & the Prophets core route', items: ['joshua-to-david', 'kingdoms-prophets-exile'], previousRoute: 'presence-core', nextRoute: 'jesus-core' },
    'prophets-deep-dive': { label: 'Prophets deep dive', items: ['elijah', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel'], returnTo: 'kingdoms-prophets-exile' },
    'jesus-core': { label: 'Jesus & the Kingdom core route', items: ['world-of-jesus', 'jesus-ministry', 'jesus-parables-lab', 'holy-week'], previousRoute: 'israel-core', nextRoute: 'church-core' },
    'church-core': { label: 'Church & Mission core route', items: ['acts-jerusalem-to-nations', 'pauls-missionary-journeys', 'epistles'], previousRoute: 'jesus-core', nextRoute: 'wisdom-core' },
    'wisdom-core': { label: 'Wisdom & Formation core route', items: ['psalms', 'proverbs', 'job', 'sermon-on-the-mount'], previousRoute: 'church-core', nextRoute: 'whole-bible-capstone' },
    'whole-bible-capstone': { label: 'Whole-Bible capstone', items: ['revelation'], previousRoute: 'wisdom-core' }
  };

  var related = {
    'world-of-the-bible': ['how-the-bible-reached-us', 'genesis'],
    genesis: ['genesis-10-table-of-nations', 'exodus'],
    exodus: ['the-tabernacle', 'leviticus'],
    leviticus: ['the-tabernacle', 'feasts-of-israel', 'numbers'],
    numbers: ['leviticus', 'deuteronomy', 'joshua-to-david'],
    deuteronomy: ['numbers', 'joshua-to-david'],
    'temple-and-gods-presence': ['revelation'],
    'kingdoms-prophets-exile': ['elijah', 'isaiah', 'jeremiah', 'ezekiel', 'daniel'],
    'world-of-jesus': ['jesus-ministry'],
    'jesus-ministry': ['jesus-parables-lab', 'sermon-on-the-mount'],
    'holy-week': ['acts-jerusalem-to-nations'],
    'pauls-missionary-journeys': ['epistles'],
    psalms: ['job', 'sermon-on-the-mount'],
    proverbs: ['job', 'sermon-on-the-mount'],
    job: ['psalms', 'sermon-on-the-mount'],
    'sermon-on-the-mount': ['jesus-ministry', 'jesus-parables-lab'],
    revelation: ['genesis', 'exodus', 'daniel', 'temple-and-gods-presence']
  };

  var agePaths = {
    elementary: { label: 'Grades K–5 · learn together', note: 'Short, visual story lessons for a teacher, parent, or older reader to guide aloud.', items: ['world-of-the-bible', 'genesis', 'exodus', 'the-tabernacle', 'numbers', 'jesus-ministry', 'jesus-parables-lab', 'acts-jerusalem-to-nations', 'psalms'] },
    middle: { label: 'Grades 6–8 · build the story', note: 'Follow the main storyline, practice using evidence, and connect books and themes.', items: ['world-of-the-bible', 'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua-to-david', 'kingdoms-prophets-exile', 'world-of-jesus', 'jesus-ministry', 'holy-week', 'acts-jerusalem-to-nations', 'psalms', 'proverbs'] },
    high: { label: 'Grades 9–12 · investigate deeply', note: 'Use historical context, compare interpretations, and build passage-based explanations.', items: lessons.map(function (lesson) { return lesson.id; }) }
  };

  global.BiblePathway = { stages: stages, lessons: lessons, routes: routes, related: related, agePaths: agePaths };
}(window));
