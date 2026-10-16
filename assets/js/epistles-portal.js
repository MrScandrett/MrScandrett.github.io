/* Epistles portal: a map of all 21 New Testament letters, added to the epistles lesson.
   Loads after bible-pathway-lesson.js and inserts itself after the goals row. */
(function () {
  'use strict';

  var main = document.querySelector('[data-bible-lesson="epistles"]');
  if (!main) return;
  var anchor = main.querySelector('.bpl-grid');
  if (!anchor) return;

  var groups = [
    ['paul-church', 'Paul to churches', 'Nine letters to congregations Paul helped start or wanted to visit.'],
    ['paul-team', 'Paul to coworkers', 'Four letters to individuals: church leadership, and one personal appeal.'],
    ['general', 'Letters to wide audiences', 'Hebrews and the letters of James, Peter, John, and Jude.']
  ];

  // c = chapters, m = rough minutes to read aloud, o = a common view of Paul's writing order (dates are debated)
  var letters = [
    { id: 'romans', n: 'Romans', g: 'paul-church', by: 'Paul', to: 'Christians in Rome, Jews and Gentiles together', at: 'Written from Greece (likely Corinth), c. AD 55–57', c: 16, m: 60, o: 6,
      occasion: 'Paul has never been to Rome but plans to visit and then go on to Spain. Jewish and Gentile believers there need to see how one gospel makes them one family.',
      claim: 'God’s righteousness is revealed in the gospel for everyone who believes, Jew first and also Greek, and it creates one people who live it out in mercy.',
      outline: [['1:1–17', 'Greeting and theme: the gospel is God’s power'], ['1:18–5:21', 'All need grace; it comes through faith in Christ'], ['6–8', 'New life: freed from sin, led by the Spirit'], ['9–11', 'God’s faithfulness to Israel and the nations'], ['12–16', 'Mercy, unity, and practical love']],
      key: ['Romans 1:16–17', 'Romans 8:1–17', 'Romans 12:1–8'], themes: ['grace', 'faith', 'Jew and Gentile', 'Spirit'],
      ask: 'Chapters 14–15 ask strong and weak believers to welcome each other. What disagreement in that church is Paul actually addressing?', link: ['galatians', 'ephesians'] },
    { id: '1-corinthians', n: '1 Corinthians', g: 'paul-church', by: 'Paul (with Sosthenes)', to: 'The church in Corinth', at: 'Written from Ephesus, c. AD 53–55', c: 16, m: 55, o: 4,
      occasion: 'Reports from Chloe’s people and a letter from the Corinthians raise factions, lawsuits, sexual immorality, food offered to idols, disorder at worship and the Lord’s Supper, spiritual gifts, and doubts about resurrection.',
      claim: 'A church shaped by the cross and the resurrection must treat one another as members of one body, with love ruling every gift.',
      outline: [['1–4', 'Divisions and the wisdom of the cross'], ['5–7', 'Holiness, lawsuits, marriage'], ['8–10', 'Freedom, idols, and concern for the weaker'], ['11–14', 'Worship, the Lord’s Supper, gifts, and love'], ['15–16', 'Resurrection and the collection']],
      key: ['1 Corinthians 1:18–25', '1 Corinthians 12:12–27', '1 Corinthians 13', '1 Corinthians 15:1–11'], themes: ['unity', 'gifts', 'love', 'resurrection'],
      ask: 'Chapter 13 sits in the middle of a discussion of gifts. What does that placement tell you about its purpose?', link: ['2-corinthians', 'romans'] },
    { id: '2-corinthians', n: '2 Corinthians', g: 'paul-church', by: 'Paul (with Timothy)', to: 'The church in Corinth', at: 'Written from Macedonia, c. AD 55–56', c: 13, m: 40, o: 5,
      occasion: 'After a painful relationship with the church and the arrival of rival teachers who questioned his authority, Paul writes about reconciliation, his sufferings, and the offering for Jerusalem.',
      claim: 'God’s power is shown in weakness, and ministry is measured by faithfulness to Christ, not by status or polish.',
      outline: [['1–7', 'Comfort, reconciliation, and the new covenant ministry'], ['8–9', 'Generous giving for the saints in Jerusalem'], ['10–13', 'Defending apostolic ministry; strength in weakness']],
      key: ['2 Corinthians 4:7–12', '2 Corinthians 5:17–21', '2 Corinthians 12:7–10'], themes: ['weakness', 'reconciliation', 'generosity', 'ministry'],
      ask: 'Paul boasts about his weaknesses. Why would that be a surprising move in Corinth?', link: ['1-corinthians'] },
    { id: 'galatians', n: 'Galatians', g: 'paul-church', by: 'Paul', to: 'Churches in Galatia', at: 'Date and place debated: c. AD 48–55', c: 6, m: 18, o: 3,
      occasion: 'Teachers have told Gentile believers they must be circumcised and keep the Law to be fully included. Paul writes with alarm.',
      claim: 'We are put right with God by faith in Christ, not by works of the Law, and in Christ the dividing line between Jew and Gentile no longer defines the family.',
      outline: [['1–2', 'Paul’s gospel and its defense'], ['3–4', 'Abraham’s children by faith; sons, not slaves'], ['5–6', 'Freedom, the Spirit, and love of neighbor']],
      key: ['Galatians 2:15–21', 'Galatians 3:26–29', 'Galatians 5:13–26'], themes: ['faith', 'freedom', 'Spirit', 'belonging'],
      ask: 'Galatians has no thanksgiving. What does that omission tell you about Paul’s mood and the stakes?', link: ['romans', 'ephesians'] },
    { id: 'ephesians', n: 'Ephesians', g: 'paul-church', by: 'Paul', to: 'Christians in Ephesus and the surrounding region', at: 'Written from prison, c. AD 60–62', c: 6, m: 18, o: 9,
      occasion: 'Some early manuscripts omit “in Ephesus,” and the letter has little personal detail, so many think it was a circular letter. It paints the big picture of what God is doing in Christ.',
      claim: 'God has united Jews and Gentiles in Christ into one new people, so the church should walk in unity, holiness, and love.',
      outline: [['1–3', 'What God has done: blessing, grace, one new humanity'], ['4–6', 'How to live: unity, new self, households, spiritual armor']],
      key: ['Ephesians 1:3–14', 'Ephesians 2:1–10', 'Ephesians 2:11–22', 'Ephesians 6:10–20'], themes: ['unity', 'grace', 'new humanity', 'spiritual conflict'],
      ask: 'Chapters 1–3 are mostly one prayerful argument. How does the “therefore” of 4:1 change the mood?', link: ['colossians', 'galatians'] },
    { id: 'philippians', n: 'Philippians', g: 'paul-church', by: 'Paul (with Timothy)', to: 'The church in Philippi', at: 'Written from prison, c. AD 60–62', c: 4, m: 12, o: 10,
      occasion: 'The Philippians sent a gift through Epaphroditus. Paul thanks them, reports on his imprisonment, and urges unity between two coworkers who disagree.',
      claim: 'Joy and unity grow when believers follow the humble path of Christ and press on toward knowing him.',
      outline: [['1', 'Thanks, prison, and living worthy of the gospel'], ['2', 'The mind of Christ; Timothy and Epaphroditus'], ['3', 'Counting everything loss for Christ'], ['4', 'Rejoice, pray, and thanks for the gift']],
      key: ['Philippians 1:12–18', 'Philippians 2:1–11', 'Philippians 4:4–9'], themes: ['joy', 'humility', 'partnership', 'contentment'],
      ask: 'Count how often joy or rejoicing appears. What circumstances is Paul writing from?', link: ['philemon', 'colossians'] },
    { id: 'colossians', n: 'Colossians', g: 'paul-church', by: 'Paul (with Timothy)', to: 'The church in Colossae', at: 'Written from prison, c. AD 60–62', c: 4, m: 12, o: 7,
      occasion: 'Epaphras reports on a church Paul has not visited, which is being tempted by a blend of rules, visions, and philosophy that diminishes Christ.',
      claim: 'Christ is supreme over all creation and the church, so believers are complete in him and should put on a new way of life.',
      outline: [['1:1–2:5', 'Thanksgiving, the supremacy of Christ'], ['2:6–23', 'Do not be taken captive by empty philosophy'], ['3:1–4:6', 'Put off the old, put on the new; households'], ['4:7–18', 'Personal news and greetings']],
      key: ['Colossians 1:15–20', 'Colossians 2:6–10', 'Colossians 3:1–17'], themes: ['Christ’s supremacy', 'new self', 'household life', 'wisdom'],
      ask: 'Compare Colossians 1:15–20 with Ephesians 1. What phrases appear in both?', link: ['ephesians', 'philemon'] },
    { id: '1-thessalonians', n: '1 Thessalonians', g: 'paul-church', by: 'Paul, Silas, and Timothy', to: 'The church in Thessalonica', at: 'Written from Corinth, c. AD 50–51', c: 5, m: 12, o: 1,
      occasion: 'Paul was forced to leave Thessalonica quickly. Timothy brings good news of their faith and questions about those who have died.',
      claim: 'Keep living in faith, love, and hope, because Christ will return and those who have died in him will not be left behind.',
      outline: [['1–3', 'Thanksgiving, Paul’s ministry, news from Timothy'], ['4:1–12', 'Holy and loving living'], ['4:13–5:11', 'Hope concerning Christ’s return'], ['5:12–28', 'Community life and closing']],
      key: ['1 Thessalonians 1:2–10', '1 Thessalonians 4:13–18', '1 Thessalonians 5:12–24'], themes: ['hope', 'return of Christ', 'encouragement', 'holiness'],
      ask: 'Notice the word “comfort/encourage.” Who is the audience for the teaching about the dead, and why?', link: ['2-thessalonians'] },
    { id: '2-thessalonians', n: '2 Thessalonians', g: 'paul-church', by: 'Paul, Silas, and Timothy', to: 'The church in Thessalonica', at: 'Written from Corinth, c. AD 51', c: 3, m: 6, o: 2,
      occasion: 'The believers face persecution, and someone has claimed the day of the Lord has already come. Some have stopped working.',
      claim: 'Stand firm: God will set things right, so do not be shaken by rumors, and keep working faithfully.',
      outline: [['1', 'Encouragement in persecution'], ['2', 'Do not be shaken about the day of the Lord'], ['3', 'Prayer and orderly work']],
      key: ['2 Thessalonians 1:3–10', '2 Thessalonians 2:1–5', '2 Thessalonians 3:6–13'], themes: ['perseverance', 'justice', 'discernment', 'work'],
      ask: 'What exactly is the false claim Paul corrects in 2:1–2?', link: ['1-thessalonians'] },
    { id: '1-timothy', n: '1 Timothy', g: 'paul-team', by: 'Paul', to: 'Timothy, in Ephesus', at: 'Written c. AD 62–64 (debated)', c: 6, m: 15, o: 11,
      occasion: 'Paul leaves Timothy to guide the Ephesian church amid false teaching, disorder in worship, and questions about leadership.',
      claim: 'The church is God’s household, held together by sound teaching, prayer, and leaders of proven character.',
      outline: [['1', 'Guard the teaching'], ['2–3', 'Worship, order, and qualified leaders'], ['4–5', 'Godliness and care for different groups'], ['6', 'Contentment, wealth, and a final charge']],
      key: ['1 Timothy 3:1–13', '1 Timothy 4:11–16', '1 Timothy 6:6–12'], themes: ['sound teaching', 'leadership', 'godliness', 'money'],
      ask: 'This is one side of a conversation with one person. What do you learn about Timothy himself?', link: ['titus', '2-timothy'] },
    { id: 'titus', n: 'Titus', g: 'paul-team', by: 'Paul', to: 'Titus, on Crete', at: 'Written c. AD 62–64 (debated)', c: 3, m: 7, o: 12,
      occasion: 'Paul left Titus on Crete to appoint elders and strengthen young churches that live in a culture with a poor reputation.',
      claim: 'Grace trains believers to live good, ordinary, visible lives that make the gospel attractive.',
      outline: [['1', 'Appoint elders; confront false teachers'], ['2', 'Teaching fit for each group'], ['3', 'Good works and grace for the community']],
      key: ['Titus 2:11–14', 'Titus 3:3–8'], themes: ['good works', 'grace', 'leadership', 'witness'],
      ask: 'Find the phrase “good works” each time it appears. What is its relationship to grace?', link: ['1-timothy'] },
    { id: '2-timothy', n: '2 Timothy', g: 'paul-team', by: 'Paul', to: 'Timothy', at: 'Written from prison, c. AD 64–67 (debated)', c: 4, m: 11, o: 13,
      occasion: 'Paul expects to die soon. He asks Timothy to come, to remain loyal despite suffering, and to hand on the gospel.',
      claim: 'Be strong in grace, endure hardship, and entrust the gospel to faithful people who will teach others.',
      outline: [['1', 'Do not be ashamed; guard what is entrusted'], ['2', 'Endure like a soldier, athlete, farmer'], ['3', 'Scripture and difficult times'], ['4', 'The final charge and personal notes']],
      key: ['2 Timothy 1:6–14', '2 Timothy 2:1–7', '2 Timothy 3:14–17', '2 Timothy 4:6–8'], themes: ['endurance', 'Scripture', 'succession', 'faithfulness'],
      ask: 'Read the final chapter as a personal letter. Who is with Paul, and who has left?', link: ['1-timothy'] },
    { id: 'philemon', n: 'Philemon', g: 'paul-team', by: 'Paul (with Timothy)', to: 'Philemon, Apphia, Archippus, and the house church', at: 'Written from prison, c. AD 60–62', c: 1, m: 3, o: 8,
      occasion: 'Onesimus, who belonged to Philemon, is now with Paul and has become a believer. Paul sends him back with this letter.',
      claim: 'In Christ the relationship between Philemon and Onesimus changes; Paul appeals to love and asks for a welcome “no longer as a slave but … a beloved brother.”',
      outline: [['1–7', 'Greeting and thanksgiving'], ['8–21', 'The appeal for Onesimus'], ['22–25', 'Plans and greetings']],
      key: ['Philemon 8–16', 'Philemon 17–21'], themes: ['reconciliation', 'brotherhood', 'appeal', 'slavery in the Roman world'],
      ask: 'Paul does not give an order. Why choose appeal, and what pressure does the shared audience add?', link: ['colossians'] },
    { id: 'hebrews', n: 'Hebrews', g: 'general', by: 'Anonymous author (names Timothy as a companion, 13:23)', to: 'Jewish-background believers under pressure', at: 'Before AD 70, probably; place unknown', c: 13, m: 45, o: 0,
      occasion: 'Listeners are tired, facing hostility, and tempted to drift back. The author calls the letter “a word of exhortation” (13:22), more sermon than letter.',
      claim: 'Jesus is greater than angels, Moses, and the priesthood, so hold fast to him and keep faith in him.',
      outline: [['1–2', 'The Son is greater than angels'], ['3–4', 'Greater than Moses; enter God’s rest'], ['5–10', 'A greater priest, covenant, and sacrifice'], ['11', 'The heroes of faith'], ['12–13', 'Run the race; live as pilgrims']],
      key: ['Hebrews 1:1–4', 'Hebrews 4:14–16', 'Hebrews 11:1–16', 'Hebrews 12:1–3'], themes: ['Christ’s superiority', 'priesthood', 'faith', 'endurance'],
      ask: 'Hebrews quotes the Old Testament constantly. Choose one quotation and trace how the author uses it.', link: [] },
    { id: 'james', n: 'James', g: 'general', by: 'James, likely the brother of Jesus and leader of the Jerusalem church', to: 'Jewish Christians “in the dispersion”', at: 'Probably Jerusalem, mid-first century', c: 5, m: 15, o: 0,
      occasion: 'Scattered believers face trials, favoritism, harsh speech, and temptation to separate faith from daily life.',
      claim: 'Real faith shows itself in wise speech, steady endurance, care for the poor, and obedience.',
      outline: [['1', 'Trials, wisdom, doing the Word'], ['2', 'Favoritism; faith and works'], ['3', 'Taming the tongue; heavenly wisdom'], ['4–5', 'Pride, wealth, patience, prayer']],
      key: ['James 1:2–8', 'James 2:14–26', 'James 3:1–12'], themes: ['wisdom', 'works', 'speech', 'justice'],
      ask: 'Compare James 2 with Romans 4. What does each author mean by “faith” and “works”?', link: ['romans'] },
    { id: '1-peter', n: '1 Peter', g: 'general', by: 'Peter, an apostle', to: 'Believers scattered across Asia Minor', at: 'Written from “Babylon” (probably Rome), c. AD 62–64', c: 5, m: 15, o: 0,
      occasion: 'Christians who are social outsiders face slander and suffering. Peter calls them “exiles” and gives them a new identity.',
      claim: 'Follow the suffering and vindicated Christ with holy, hopeful lives that bear witness before a watching world.',
      outline: [['1:1–2:10', 'A living hope and a chosen people'], ['2:11–3:12', 'Honorable conduct in society and home'], ['3:13–4:19', 'Suffering for doing good'], ['5', 'Elders, humility, and standing firm']],
      key: ['1 Peter 1:3–9', '1 Peter 2:9–12', '1 Peter 3:13–18'], themes: ['exile', 'suffering', 'hope', 'holiness'],
      ask: 'List the images Peter uses for the church (stones, priesthood, flock). What does each add?', link: ['hebrews'] },
    { id: '2-peter', n: '2 Peter', g: 'general', by: 'Peter, an apostle', to: 'Christians who have received the faith', at: 'Probably Rome, c. AD 64–68', c: 3, m: 10, o: 0,
      occasion: 'Peter expects to die soon and warns about false teachers who mock the promise of Christ’s return.',
      claim: 'Grow in knowledge of Christ, reject false teaching, and live in patient hope, because the Lord’s delay is mercy.',
      outline: [['1', 'Grow in godliness; the prophetic word'], ['2', 'False teachers'], ['3', 'The promise of the Lord’s return']],
      key: ['2 Peter 1:3–11', '2 Peter 1:16–21', '2 Peter 3:8–13'], themes: ['growth', 'discernment', 'patience', 'return of Christ'],
      ask: 'Compare chapter 2 with Jude. What do they share, and what does this suggest?', link: ['jude'] },
    { id: '1-john', n: '1 John', g: 'general', by: 'John, the apostle and eyewitness', to: 'Churches facing a painful split', at: 'Probably Ephesus, c. AD 85–95', c: 5, m: 15, o: 0,
      occasion: 'Some have left the community and denied that Jesus is the Christ come in the flesh. John writes so that believers may know they have eternal life.',
      claim: 'Walking in the light shows itself in believing who Jesus is, obeying him, and loving one another.',
      outline: [['1:1–2:2', 'The word of life; walk in the light'], ['2:3–29', 'Obedience, love, antichrists'], ['3', 'Children of God and love in action'], ['4–5', 'Test the spirits; God is love; assurance']],
      key: ['1 John 1:5–10', '1 John 4:7–21', '1 John 5:11–13'], themes: ['light', 'love', 'truth', 'assurance'],
      ask: 'John repeats three tests: belief, obedience, and love. Find a verse for each.', link: ['2-john', '3-john'] },
    { id: '2-john', n: '2 John', g: 'general', by: '“The elder” (John)', to: '“The elect lady and her children,” probably a local church', at: 'Probably Ephesus, c. AD 85–95', c: 1, m: 2, o: 0,
      occasion: 'Travelling teachers are moving between churches, and some deny that Jesus came in the flesh.',
      claim: 'Keep walking in truth and love, and do not give a platform to teachers who deny Christ.',
      outline: [['1–3', 'Greeting in truth and love'], ['4–6', 'Walk in love'], ['7–13', 'Beware of deceivers']],
      key: ['2 John 4–6', '2 John 7–11'], themes: ['truth', 'love', 'hospitality limits'],
      ask: 'How does 2 John’s caution about hospitality balance 3 John?', link: ['1-john', '3-john'] },
    { id: '3-john', n: '3 John', g: 'general', by: '“The elder” (John)', to: 'Gaius, a beloved church member', at: 'Probably Ephesus, c. AD 85–95', c: 1, m: 2, o: 0,
      occasion: 'Gaius has welcomed traveling teachers. Diotrephes refuses to, and speaks against John.',
      claim: 'Support those who serve the truth; do not follow a leader who loves to be first.',
      outline: [['1–8', 'Praise for Gaius’s hospitality'], ['9–10', 'Diotrephes’ pride'], ['11–15', 'Imitate good; Demetrius is commended']],
      key: ['3 John 5–8', '3 John 9–12'], themes: ['hospitality', 'truth', 'leadership'],
      ask: 'Who are the three named people, and what does each reveal about church life?', link: ['2-john'] },
    { id: 'jude', n: 'Jude', g: 'general', by: 'Jude, brother of James (and of Jesus)', to: 'Believers who are called and beloved in God', at: 'Date uncertain, c. AD 60–80', c: 1, m: 4, o: 0,
      occasion: 'Jude meant to write about salvation but must urge believers to contend for the faith against intruders who twist grace into license.',
      claim: 'Remember what you were taught, build yourselves up, and show mercy while keeping each other in God’s love.',
      outline: [['1–4', 'Greeting and reason for writing'], ['5–16', 'Examples of judgment on rebels'], ['17–23', 'Remember, build up, show mercy'], ['24–25', 'Doxology']],
      key: ['Jude 3–4', 'Jude 20–25'], themes: ['contending for the faith', 'mercy', 'perseverance'],
      ask: 'Jude cites examples from Scripture and Jewish tradition. How does he use each?', link: ['2-peter'] }
  ];

  var routes = [
    ['Start here', 'Short, vivid letters that show how a letter works.', ['philemon', 'philippians', 'james', '1-john']],
    ['The gospel and one people', 'Faith, grace, and Jews and Gentiles together.', ['galatians', 'romans', 'ephesians', 'colossians']],
    ['Church life', 'Conflict, gifts, leaders, and daily order.', ['1-corinthians', '2-corinthians', '1-timothy', 'titus']],
    ['Suffering and hope', 'Endurance, return of Christ, and faith under pressure.', ['1-thessalonians', '2-thessalonians', 'hebrews', '1-peter']]
  ];

  var anatomy = [
    ['Greeting', 'Sender, recipients, “grace and peace.” Often hints at the theme.', 'Romans 1:1–7'],
    ['Thanksgiving or prayer', 'What Paul celebrates tells you what he cares about most.', 'Philippians 1:3–11'],
    ['Body', 'The argument or response to the occasion.', 'Galatians 3:1–14'],
    ['Exhortation', 'The “therefore”: what a community should now do.', 'Ephesians 4:1–6'],
    ['Closing', 'Greetings, names, and travel plans that show real people.', 'Romans 16:1–16']
  ];

  var byId = {};
  letters.forEach(function (l) { byId[l.id] = l; });
  var storeKey = 'epistles:studied:v1';
  var studied = {};
  try { studied = JSON.parse(localStorage.getItem(storeKey) || '{}') || {}; } catch (e) { studied = {}; }
  function save() { try { localStorage.setItem(storeKey, JSON.stringify(studied)); } catch (e) { /* storage unavailable */ } }

  function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function readerHref(ref) { return '../../bible.html#/go/' + ref; }
  function refLink(ref) { return '<a data-bible-ref href="' + esc(readerHref(ref)) + '">' + esc(ref) + '</a>'; }
  function groupName(key) { return groups.filter(function (g) { return g[0] === key; })[0][1]; }

  var state = { group: 'all', order: 'bible', selected: null };

  var section = document.createElement('section');
  section.className = 'bpl-card ep-portal';
  section.setAttribute('aria-labelledby', 'ep-title');
  section.innerHTML =
    '<p class="bpl-label">Letter-by-letter portal</p>' +
    '<h2 id="ep-title">All 21 letters, one at a time</h2>' +
    '<p class="ep-intro">Every New Testament letter was written to real people in a real situation. Pick a letter to see who wrote it, who got it, what was going on, how the argument moves, and where to read first.</p>' +
    '<div class="ep-progress" role="status"><span class="ep-progress-text"></span><span class="ep-progress-bar" aria-hidden="true"><i></i></span></div>' +
    '<div class="ep-routes"><h3>Start with a path</h3><div class="ep-route-grid">' + routes.map(function (r) {
      return '<article class="ep-route"><h4>' + esc(r[0]) + '</h4><p>' + esc(r[1]) + '</p><ol>' + r[2].map(function (id) { return '<li><button type="button" data-ep-open="' + id + '">' + esc(byId[id].n) + '</button></li>'; }).join('') + '</ol></article>';
    }).join('') + '</div></div>' +
    '<div class="ep-controls"><div class="ep-chips" role="group" aria-label="Filter letters"><button type="button" data-ep-group="all" aria-pressed="true">All 21</button>' + groups.map(function (g) {
      var count = letters.filter(function (l) { return l.g === g[0]; }).length;
      return '<button type="button" data-ep-group="' + g[0] + '" aria-pressed="false">' + esc(g[1]) + ' (' + count + ')</button>';
    }).join('') + '</div><label class="ep-order"><span>Order</span><select aria-label="Order of letters"><option value="bible">Order in the Bible</option><option value="written">Paul’s letters in a common writing order</option></select></label></div>' +
    '<p class="ep-group-note" aria-live="polite"></p>' +
    '<ul class="ep-grid"></ul>' +
    '<article class="ep-detail" id="ep-detail" aria-live="polite" tabindex="-1"></article>' +
    '<div class="ep-anatomy"><h3>Anatomy of a letter</h3><p>Most letters follow a pattern. Knowing the parts shows you where the argument turns.</p><ol>' + anatomy.map(function (a) {
      return '<li><strong>' + esc(a[0]) + '</strong><span>' + esc(a[1]) + '</span><small>Example: ' + refLink(a[2]) + '</small></li>';
    }).join('') + '</ol></div>' +
    '<div class="ep-method"><h3>Four questions for any letter</h3><ol><li><strong>Who</strong> is writing, and who is receiving?</li><li><strong>What happened</strong> that made the letter necessary?</li><li><strong>What is the main claim</strong>, and what reasons support it?</li><li><strong>What should the community do</strong> now, and how does that differ from what we copy without thinking?</li></ol></div>';

  anchor.insertAdjacentElement('afterend', section);

  var grid = section.querySelector('.ep-grid');
  var detail = section.querySelector('.ep-detail');
  var groupNote = section.querySelector('.ep-group-note');

  function visible() {
    var list = letters.filter(function (l) { return state.group === 'all' || l.g === state.group; });
    if (state.order === 'written') {
      var paul = list.filter(function (l) { return l.o > 0; }).sort(function (a, b) { return a.o - b.o; });
      var rest = list.filter(function (l) { return !l.o; });
      list = paul.concat(rest);
    }
    return list;
  }

  function renderGrid() {
    var list = visible();
    grid.innerHTML = list.map(function (l) {
      var on = state.selected === l.id;
      return '<li><button type="button" class="ep-card' + (on ? ' is-on' : '') + (studied[l.id] ? ' is-done' : '') + '" data-ep-open="' + l.id + '" aria-pressed="' + on + '">' +
        '<span class="ep-card-top"><strong>' + esc(l.n) + '</strong>' + (studied[l.id] ? '<span class="ep-done" aria-label="Studied">✓</span>' : '') + '</span>' +
        '<span class="ep-card-by">' + esc(l.by.split(',')[0].replace(/ \(.*$/, '')) + ' → ' + esc(l.to.split(',')[0]) + '</span>' +
        '<span class="ep-card-line">' + esc(l.claim) + '</span>' +
        '<span class="ep-card-meta">' + l.c + (l.c === 1 ? ' chapter' : ' chapters') + ' · about ' + l.m + ' min</span></button></li>';
    }).join('');
    var g = groups.filter(function (x) { return x[0] === state.group; })[0];
    groupNote.textContent = g ? g[2] : 'Paul wrote thirteen of these letters; the rest come from Peter, John, James, Jude, and the unnamed author of Hebrews.';
  }

  function renderProgress() {
    var n = letters.filter(function (l) { return studied[l.id]; }).length;
    section.querySelector('.ep-progress-text').textContent = n + ' of ' + letters.length + ' letters studied on this device';
    section.querySelector('.ep-progress-bar i').style.width = (n / letters.length * 100) + '%';
  }

  function renderDetail() {
    var l = byId[state.selected];
    if (!l) {
      detail.hidden = true;
      detail.innerHTML = '';
      return;
    }
    detail.hidden = false;
    var list = letters;
    var pos = list.indexOf(l);
    var prev = list[pos - 1];
    var next = list[pos + 1];
    detail.innerHTML =
      '<header><div><p class="bpl-label">' + esc(groupName(l.g)) + ' · letter ' + (pos + 1) + ' of 21</p><h3>' + esc(l.n) + '</h3></div>' +
      '<button type="button" class="ep-mark" aria-pressed="' + !!studied[l.id] + '">' + (studied[l.id] ? '✓ Studied' : 'Mark as studied') + '</button></header>' +
      '<dl class="ep-facts"><div><dt>Writer</dt><dd>' + esc(l.by) + '</dd></div><div><dt>First readers</dt><dd>' + esc(l.to) + '</dd></div><div><dt>Setting</dt><dd>' + esc(l.at) + '</dd></div><div><dt>Length</dt><dd>' + l.c + (l.c === 1 ? ' chapter' : ' chapters') + ', about ' + l.m + ' minutes aloud</dd></div></dl>' +
      '<div class="ep-cols"><section><h4>Why it was written</h4><p>' + esc(l.occasion) + '</p><h4>Main claim</h4><p>' + esc(l.claim) + '</p><h4>Themes</h4><ul class="ep-tags">' + l.themes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>' +
      '<section><h4>How the letter moves</h4><ol class="ep-outline">' + l.outline.map(function (o) { return '<li><span>' + esc(o[0]) + '</span>' + esc(o[1]) + '</li>'; }).join('') + '</ol></section></div>' +
      '<div class="ep-read"><h4>Read it</h4><p>' + (l.c <= 4 ? 'Read the whole letter in one sitting, then reread it with the four questions.' : 'Read it in one or two sittings first, then return to the key passages.') + '</p><ul class="ep-refs"><li><a class="ep-whole" data-bible-ref href="' + esc(readerHref(l.n)) + '">Open ' + esc(l.n) + ' in the Bible reader</a></li>' + l.key.map(function (k) { return '<li>' + refLink(k) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="ep-think"><h4>Think about it</h4><p>' + esc(l.ask) + '</p></div>' +
      (l.link.length ? '<p class="ep-linked"><strong>Read alongside:</strong> ' + l.link.map(function (id) { return '<button type="button" data-ep-open="' + id + '">' + esc(byId[id].n) + '</button>'; }).join('') + '</p>' : '') +
      '<nav class="ep-step" aria-label="Neighbouring letters">' + (prev ? '<button type="button" data-ep-open="' + prev.id + '">&larr; ' + esc(prev.n) + '</button>' : '<span></span>') + (next ? '<button type="button" data-ep-open="' + next.id + '">' + esc(next.n) + ' &rarr;</button>' : '<span></span>') + '</nav>';
    detail.querySelector('.ep-mark').addEventListener('click', function () {
      if (studied[l.id]) delete studied[l.id]; else studied[l.id] = 1;
      save(); renderProgress(); renderGrid(); renderDetail();
      var mark = detail.querySelector('.ep-mark'); if (mark) mark.focus();
    });
  }

  function open(idToOpen, focus) {
    if (!byId[idToOpen]) return;
    if (state.group !== 'all' && byId[idToOpen].g !== state.group) {
      state.group = 'all';
      Array.prototype.forEach.call(section.querySelectorAll('[data-ep-group]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-ep-group') === 'all')); });
    }
    state.selected = idToOpen;
    renderGrid(); renderDetail();
    try { history.replaceState(null, '', '#' + idToOpen); } catch (e) { /* ignore */ }
    if (focus) {
      detail.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      detail.focus({ preventScroll: true });
    }
  }

  section.addEventListener('click', function (e) {
    var openBtn = e.target.closest('[data-ep-open]');
    if (openBtn) { open(openBtn.getAttribute('data-ep-open'), true); return; }
    var groupBtn = e.target.closest('[data-ep-group]');
    if (groupBtn) {
      state.group = groupBtn.getAttribute('data-ep-group');
      Array.prototype.forEach.call(section.querySelectorAll('[data-ep-group]'), function (b) { b.setAttribute('aria-pressed', String(b === groupBtn)); });
      renderGrid();
    }
  });
  section.querySelector('.ep-order select').addEventListener('change', function (e) { state.order = e.target.value; renderGrid(); });

  renderProgress();
  renderGrid();
  renderDetail();
  var start = (location.hash || '').slice(1);
  if (byId[start]) open(start, false);
})();
