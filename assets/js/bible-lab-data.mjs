export const cities = {
  Jerusalem: [35.21, 31.78], Samaria: [35.19, 32.28], Caesarea: [34.89, 32.50],
  'Syrian Antioch': [36.16, 36.20], Seleucia: [35.93, 36.11], Salamis: [33.90, 35.18],
  Paphos: [32.41, 34.77], Perga: [30.85, 36.96], 'Pisidian Antioch': [31.19, 38.31],
  Iconium: [32.49, 37.87], Lystra: [32.35, 37.59], Derbe: [33.37, 37.35],
  Troas: [26.16, 39.75], Samothrace: [25.54, 40.47], Neapolis: [24.41, 40.94],
  Philippi: [24.29, 41.01], Thessalonica: [22.94, 40.64], Berea: [22.20, 40.52],
  Athens: [23.73, 37.98], Corinth: [22.88, 37.91], Ephesus: [27.34, 37.94],
  Miletus: [27.27, 37.53], 'Cos': [27.29, 36.89], Rhodes: [28.22, 36.44],
  Patara: [29.32, 36.26], Tyre: [35.20, 33.27], Sidon: [35.37, 33.56],
  Myra: [29.98, 36.26], 'Fair Havens': [24.80, 34.93], Malta: [14.44, 35.89],
  Syracuse: [15.29, 37.06], Rhegium: [15.65, 38.11], Puteoli: [14.12, 40.82], Rome: [12.49, 41.89]
};

export const journeys = [
  { title: 'First journey', start: 'Syrian Antioch', steps: [
    { path: ['Seleucia', 'Salamis', 'Paphos'], ref: 'Acts 13:1–12', company: 'Barnabas and John Mark', event: 'The church sends Barnabas and Saul. At Paphos, Elymas opposes them and the proconsul believes.', letter: 'Acts names the sending church in Syrian Antioch.' },
    { path: ['Perga', 'Pisidian Antioch'], ref: 'Acts 13:13–52', company: 'Barnabas. John Mark leaves at Perga.', event: 'Paul speaks in the synagogue. After opposition, the missionaries leave for Iconium.', letter: 'The cities in this region are one proposed setting for the churches addressed in Galatians.' },
    { path: ['Iconium', 'Lystra', 'Derbe'], ref: 'Acts 14:1–21', company: 'Barnabas', event: 'A crowd at Lystra tries to sacrifice to the missionaries. Later Paul is stoned and then continues to Derbe.', letter: 'Compare the churches of Galatia in Galatians 1:2. The identification is debated.' },
    { path: ['Lystra', 'Iconium', 'Pisidian Antioch', 'Perga', 'Syrian Antioch'], ref: 'Acts 14:21–28', company: 'Barnabas', event: 'The travelers revisit disciples, appoint elders, and report to the sending church. This map omits the port of Attalia.', letter: 'Notice the difference between establishing churches and returning to strengthen them.' }
  ] },
  { title: 'Second journey', start: 'Syrian Antioch', steps: [
    { path: ['Derbe', 'Lystra', 'Troas'], ref: 'Acts 15:36–16:10', company: 'Silas, joined by Timothy at Lystra', event: 'A disagreement separates Paul and Barnabas. The call to Macedonia follows at Troas.', letter: 'Timothy later appears alongside Paul in several letter openings.' },
    { path: ['Samothrace', 'Neapolis', 'Philippi'], ref: 'Acts 16:11–40', company: 'Silas and Timothy traveled with Paul', event: 'Lydia welcomes the missionaries. Paul and Silas are jailed, and the jailer and his household are baptized.', letter: 'Philippians 1:1 names the believers and leaders at Philippi.' },
    { path: ['Thessalonica', 'Berea', 'Athens'], ref: 'Acts 17:1–34', company: 'Silas and Timothy remain in Berea while Paul goes on.', event: 'Opposition disrupts the work in Thessalonica and Berea. Paul speaks in Athens.', letter: 'First Thessalonians 1:1 names Paul, Silvanus and Timothy as senders.' },
    { path: ['Corinth', 'Ephesus', 'Caesarea', 'Syrian Antioch'], ref: 'Acts 18:1–22', company: 'Aquila and Priscilla accompany Paul to Ephesus.', event: 'Paul works and teaches at Corinth, faces an accusation before Gallio, and eventually sails east.', letter: 'First Corinthians 1:2 addresses the church at Corinth. Compare the greetings in 1 Thessalonians 1:1.' }
  ] },
  { title: 'Third journey', start: 'Syrian Antioch', steps: [
    { path: ['Ephesus'], ref: 'Acts 18:23–19:41', company: 'Timothy and Erastus are sent ahead into Macedonia.', event: 'Paul teaches in Ephesus. Silversmiths stir up a crowd over the threat to the trade linked to Artemis.', letter: 'Paul says he plans to remain in Ephesus in 1 Corinthians 16:8.' },
    { path: ['Thessalonica', 'Corinth', 'Philippi', 'Troas'], ref: 'Acts 20:1–12', company: 'Acts 20:4 names companions from several regions.', event: 'Acts describes travel through Macedonia and Greece, then the gathering at Troas. Some mapped stops are inferred from the wider itinerary.', letter: 'Paul mentions Macedonia in 2 Corinthians 2:13 and 7:5.' },
    { path: ['Miletus'], ref: 'Acts 20:13–38', company: 'Travel companions and the elders called from Ephesus', event: 'Paul calls the Ephesian elders to Miletus and gives them a farewell charge.', letter: 'Compare the concerns about leadership here with Paul’s address to church leaders in Philippians 1:1.' },
    { path: ['Cos', 'Rhodes', 'Patara', 'Tyre', 'Caesarea', 'Jerusalem'], ref: 'Acts 21:1–17', company: 'The traveling group and believers who host them along the way', event: 'Paul continues after warnings about what awaits him at Jerusalem.', letter: 'Romans 15:25–31 discusses a trip to Jerusalem and aid for believers there.' }
  ] }
];

export const acts = { title: 'Acts 1–28', start: 'Jerusalem', steps: [
  { path: [], place: 'Jerusalem', ref: 'Acts 1:8; 2:1–47', event: 'At Pentecost, pilgrims hear the message in their own languages. A community forms around teaching, fellowship, meals, and prayer.', connection: 'Jerusalem is the first place named in the outline of Acts 1:8.' },
  { from: 'Jerusalem', path: ['Samaria'], ref: 'Acts 8:1–25', event: 'After persecution scatters believers, Philip proclaims the message in Samaria. Peter and John come from Jerusalem.', connection: 'Conflict in one city leads to a new community across an old boundary.' },
  { from: 'Jerusalem', path: ['Caesarea'], ref: 'Acts 10:1–48; 11:1–18', event: 'Peter enters the household of Cornelius, a Roman centurion. His report becomes evidence in a debate at Jerusalem.', connection: 'Caesarea becomes a turning point in the inclusion of Gentiles. Peter travels via Joppa, omitted on this overview.' },
  { from: 'Jerusalem', path: ['Syrian Antioch'], ref: 'Acts 11:19–26; 13:1–3', event: 'Dispersed believers reach Antioch. Barnabas brings Saul there and the church later sends them out.', connection: 'A community formed through dispersal becomes a sending hub. Acts also names Phoenicia and Cyprus.' },
  { from: 'Syrian Antioch', path: ['Troas', 'Philippi'], ref: 'Acts 16:6–40', event: 'From Troas the travelers cross to Macedonia. In Philippi, Lydia and the jailer open their households.', connection: 'The line compresses intervening stops. Open Paul’s map to see the named Aegean ports.' },
  { from: 'Philippi', path: ['Corinth'], ref: 'Acts 17:1–18:11', event: 'After several stops, Paul spends eighteen months teaching in Corinth and works with Aquila and Priscilla.', connection: 'Households and shared work give the mission places to take root.' },
  { from: 'Corinth', path: ['Ephesus'], ref: 'Acts 18:18–21; 19:8–41', event: 'Ephesus becomes a teaching center, and the message spreads through the province of Asia.', connection: 'A city can function as a hub for people beyond its boundaries.' },
  { from: 'Ephesus', path: ['Miletus', 'Tyre', 'Caesarea', 'Jerusalem'], ref: 'Acts 20:13–21:36', event: 'Paul returns to Jerusalem. The return includes his farewell to Ephesian elders at Miletus, a stay in Caesarea, and his arrest in Jerusalem.', connection: 'The network includes return journeys. Use Paul’s third journey to trace the intervening coastal stops.' },
  { from: 'Jerusalem', path: ['Caesarea'], ref: 'Acts 23:23–35; 25:9–12', event: 'Roman soldiers take Paul to Caesarea. He appeals to Caesar during proceedings before Festus.', connection: 'A provincial trial leads to an imperial hearing.' },
  { from: 'Caesarea', path: ['Sidon', 'Myra', 'Fair Havens', 'Malta'], ref: 'Acts 27:1–28:10', event: 'A storm drives the ship beyond Crete. The passengers survive the wreck and are welcomed on Malta.', connection: 'This leg is a prisoner voyage. Wind and shipwreck shape the itinerary.' },
  { from: 'Malta', path: ['Syracuse', 'Rhegium', 'Puteoli', 'Rome'], ref: 'Acts 28:11–31', event: 'Paul reaches Rome and receives visitors while under guard.', connection: 'Acts ends with the message being proclaimed in the imperial capital.' }
] };

export const eras = [
  { year: 930, date: 'c. 930 BCE', title: 'The kingdom divides', kings: 'Rehoboam in Judah, Jeroboam I in Israel', prophets: 'Ahijah anticipates the division', books: '1 Kings 11–12', empire: 'Egypt campaigns in the region under Shishak shortly afterward', event: 'The northern tribes reject Rehoboam and crown Jeroboam.' },
  { year: 870, date: 'c. 870 BCE', title: 'Elijah challenges Ahab', kings: 'Ahab in Israel, Jehoshaphat in Judah during part of Ahab’s reign', prophets: 'Elijah confronts Baal worship and royal injustice', books: '1 Kings 16–22', empire: 'Israel faces Aram-Damascus. Assyria is expanding westward.', event: 'Compare the contest at Carmel with Naboth’s vineyard.' },
  { year: 760, date: 'c. 760 BCE', title: 'Prosperity and warning', kings: 'Jeroboam II in Israel, Uzziah in Judah', prophets: 'Amos warns Israel. Hosea’s ministry begins in this broad period.', books: 'Amos 1:1; 5:21–24; Hosea 1:1', empire: 'Assyria renews pressure on the region later in the century', event: 'Amos links worship with justice during a prosperous era.' },
  { year: 722, date: '722/721 BCE', title: 'Samaria falls', kings: 'Hoshea is Israel’s last king', prophets: 'Hosea speaks against Israel’s unfaithfulness. Isaiah is active in Judah.', books: '2 Kings 17; Hosea 11; Isaiah 7', empire: 'Assyria conquers the northern kingdom', event: 'Samaria falls and people are deported. Judah survives this conquest.' },
  { year: 701, date: '701 BCE', title: 'Jerusalem under threat', kings: 'Hezekiah in Judah', prophets: 'Isaiah advises Hezekiah. Micah also speaks in this era.', books: '2 Kings 18–19; Isaiah 36–37; Micah 1:1', empire: 'Sennacherib of Assyria campaigns in Judah', event: 'Assyria takes fortified cities, including Lachish. Jerusalem survives.' },
  { year: 597, date: '597 BCE', title: 'Deportation to Babylon', kings: 'Jehoiachin is taken captive. Zedekiah is installed.', prophets: 'Jeremiah later writes to exiles. Ezekiel receives his call in exile.', books: '2 Kings 24; Jeremiah 29; Ezekiel 1', empire: 'Nebuchadnezzar II of Babylon', event: 'The king and many leading people are deported before the final fall of the city.' },
  { year: 586, date: '587/586 BCE', title: 'Jerusalem falls', kings: 'Zedekiah is captured and Judah’s monarchy ends', prophets: 'Jeremiah witnesses the crisis. Ezekiel addresses people in exile.', books: '2 Kings 25; Jeremiah 52; Lamentations 1', empire: 'Babylon destroys Jerusalem and the temple', event: 'Further deportations follow. Lamentations gives poetic voice to the devastation.' },
  { year: 538, date: '539–538 BCE', title: 'Persia opens the way to return', kings: 'Cyrus of Persia authorizes temple rebuilding in Ezra', prophets: 'Isaiah 44–45 names Cyrus', books: 'Ezra 1; Isaiah 44:24–45:7', empire: 'Persia takes Babylon in 539 BCE', event: 'Ezra recounts a return to Judah. Communities also remain outside the land.' },
  { year: 516, date: 'c. 516/515 BCE', title: 'The second temple is completed', kings: 'Darius I rules Persia. Zerubbabel serves as governor during rebuilding.', prophets: 'Haggai and Zechariah urge rebuilding beginning around 520 BCE', books: 'Ezra 5–6; Haggai 1; Zechariah 4', empire: 'Judah remains within the Persian Empire', event: 'Temple worship resumes under Persian rule.' }
];

export const feasts = [
  { month: 0, date: '14 Nisan', title: 'Passover', season: 'Spring · barley season', practice: 'The biblical rite marks the night of deliverance with a meal. The Seder retells the exodus in Jewish practice today.', memory: 'God delivers Israel from slavery in Egypt.', ref: 'Exodus 12:1–28; Leviticus 23:5' },
  { month: 0, date: '15–21 Nisan', title: 'Unleavened Bread', season: 'Spring · barley season', practice: 'Eat unleavened bread for seven days. The period begins and ends with sacred assemblies.', memory: 'Israel’s dough had no time to rise during the departure from Egypt.', ref: 'Exodus 12:33–39; Leviticus 23:6–8' },
  { month: 0, date: 'Spring, during the festival season', title: 'Firstfruits', season: 'Spring · early grain', practice: 'Present the first sheaf before eating the new crop. Leviticus dates it relative to the Sabbath, interpreted differently in different traditions.', memory: 'The first part of the harvest is offered to God.', ref: 'Leviticus 23:9–14' },
  { month: 2, date: 'After counting fifty days · 6 Sivan in the fixed Jewish calendar', title: 'Weeks · Shavuot', season: 'Late spring / early summer · wheat harvest', practice: 'Bring an offering of new grain. Leviticus places the instruction to leave field edges for the poor and the foreigner alongside the feast.', memory: 'The biblical festival celebrates harvest. Later Jewish practice also commemorates the giving of Torah.', ref: 'Leviticus 23:15–22; Deuteronomy 16:9–12' },
  { month: 6, date: '1 Tishrei', title: 'Trumpets · Rosh Hashanah', season: 'Autumn · seventh month in the biblical count', practice: 'Set aside a day of rest marked by blasts. In Jewish observance this is Rosh Hashanah, the New Year.', memory: 'Leviticus describes a memorial marked by blasts without naming a single event from Israel’s past.', ref: 'Leviticus 23:23–25; Numbers 29:1–6' },
  { month: 6, date: '10 Tishrei', title: 'Day of Atonement · Yom Kippur', season: 'Autumn', practice: 'Leviticus prescribes priestly purification rites, rest, and self-denial. Fasting and prayer mark contemporary Jewish observance.', memory: 'The day calls the community to repentance and atonement.', ref: 'Leviticus 16; 23:26–32' },
  { month: 6, date: '15–21 Tishrei, followed by an eighth-day assembly', title: 'Booths · Sukkot', season: 'Autumn · ingathering', practice: 'Rejoice and dwell in booths. Deuteronomy expressly includes servants, foreigners, orphans, and widows in the celebration.', memory: 'Booths recall Israel dwelling in temporary shelters after leaving Egypt.', ref: 'Leviticus 23:33–43; Deuteronomy 16:13–15' }
];

export const parables = [
  { title: 'The Good Samaritan', setup: 'A traveler is left half dead. A priest and a Levite see him and pass by. What will the next traveler do?', choices: ['Pass by and leave the injured man', 'Stop, treat his wounds, and arrange care', 'Ask the man which community he belongs to'], answer: 1, verse: ['Luke', 10, 33, 37], insight: 'Jesus ends by asking which traveler became a neighbor. Find the verbs that make mercy visible.', scene: 'Road to Jericho', symbols: ['👤', '↗', '↗', '?'], reveal: '🤝' },
  { title: 'The Lost Son', setup: 'A son wastes his inheritance and returns hungry, preparing to ask for a servant’s place. How will the father meet him?', choices: ['Hire him on probation', 'Demand a public repayment plan', 'Run to meet him and celebrate his return'], answer: 2, verse: ['Luke', 15, 20, 24], insight: 'The father runs before the son finishes his speech. Read verses 25–32 next. What does the older brother’s response add?', scene: 'The road home', symbols: ['⌂', '→', '←', '?'], reveal: '✦' },
  { title: 'The Workers in the Vineyard', setup: 'Workers start at different hours. At the end of the day, the late workers receive a denarius. What will the earliest workers get?', choices: ['The agreed denarius', 'A larger payment for the extra hours', 'Nothing because they complain'], answer: 0, verse: ['Matthew', 20, 8, 16], insight: 'Compare the contract with the owner’s generosity. What expectation does “the last will be first” challenge?', scene: 'The vineyard at dusk', symbols: ['☀', '◷', '◒', '?'], reveal: '=' },
  { title: 'The Pharisee and the Tax Collector', setup: 'Two men go to the temple to pray. One lists his accomplishments. The other simply asks for mercy. Who goes home justified?', choices: ['The one who lists his accomplishments', 'The one who asks for mercy', 'Jesus leaves the question open'], answer: 1, verse: ['Luke', 18, 13, 14], insight: 'Luke 18:9 names the audience’s problem. Look for the connection between the setup and Jesus’ reversal.', scene: 'Two prayers at the temple', symbols: ['Ⅰ', '⌂', 'Ⅱ', '?'], reveal: 'Ⅱ' }
];

export const witnesses = [
  { title: 'Sinaiticus', date: 'Fourth century · Greek', excerpt: 'εφοβουντο γαρ', next: 'End title for Mark. Luke begins next.', source: 'https://codexsinaiticus.org/en/manuscript.aspx?book=34&chapter=16&lid=en&side=r&verse=8&zoomSlider=0' },
  { title: 'Vaticanus', date: 'Fourth century · Greek', excerpt: 'εφοβουντο γαρ', next: 'End title for Mark, followed by an empty column.', source: 'https://digi.vatlib.it/view/MSS_Vat.gr.1209' },
  { title: 'Alexandrinus', date: 'Fifth century · Greek', excerpt: 'εφοβουντο γαρ', next: 'The narrative continues into what is numbered Mark 16:9–20.', source: 'https://searcharchives.bl.uk/catalog/040-002353500' }
];

export const translations = [
  { title: 'Mark 16:8', verse: ['Mark', 16, 8, 8], prompt: 'Compare the way each edition connects fear with silence.', choices: ['Cause and effect', 'A different list of people'], answer: 0, insight: 'Both editions give fear as the reason for silence. Compare sentence breaks and word order. The manuscript question above concerns what follows this verse.' },
  { title: 'Luke 10:33', verse: ['Luke', 10, 33, 33], prompt: 'What should an English reader recognize across these two phrasings?', choices: ['Two travelers stop to help', 'The Samaritan’s compassion motivates his response'], answer: 1, insight: 'The editions phrase the encounter differently and both use “had compassion.” Look at what the Samaritan does next in verse 34.' },
  { title: 'Romans 12:2', verse: ['Romans', 12, 2, 2], prompt: 'Compare the way the two editions express discovering God’s will.', choices: ['A process of discerning or testing', 'A statement about travel'], answer: 0, insight: '“Prove” in older English can mean test or ascertain. Compare it with “test and approve” and notice how renewal of the mind frames the action.' }
];

export const holyPlaces = {
  'Bethany': [610, 246], 'Temple': [310, 82], 'Bethphage / Mount of Olives': [520, 93],
  'Meal in Jerusalem': [235, 205], 'Gethsemane': [410, 143],
  'Golgotha': [145, 89], 'Tomb': [105, 129]
};

export const holyWeek = [
  { title: 'Sunday', scenes: [
    { place: 'Bethphage / Mount of Olives', event: 'Entry into Jerusalem', verses: [[21, 6, 11], [11, 7, 11], [19, 35, 40], [12, 12, 16]], note: 'Compare the acclamations and the reactions. John adds a comment about what the disciples later understood.' }
  ] },
  { title: 'Monday', scenes: [
    { place: 'Temple', event: 'Jesus clears the temple', verses: [[21, 12, 16], [11, 15, 19], [19, 45, 48], null], note: 'Mark separates the entry from this action with an overnight stay. Matthew and Luke group events differently. John places a temple-clearing account early in his Gospel (John 2:13–22).' }
  ] },
  { title: 'Tuesday', scenes: [
    { place: 'Temple', event: 'Jesus’ authority is questioned', verses: [[21, 23, 27], [11, 27, 33], [20, 1, 8], null], note: 'Notice how the question about John reverses who must answer. This day follows the traditional sequence derived chiefly from Mark.' }
  ] },
  { title: 'Wednesday', scenes: [
    { place: 'Bethany', event: 'Anointing at Bethany', verses: [[26, 6, 13], [14, 3, 9], null, [12, 1, 8]], note: 'Matthew and Mark narrate the anointing near the plot against Jesus. John dates it six days before Passover and identifies Mary. The Wednesday placement is a traditional teaching convention. Luke 7 presents a differently framed anointing.' }
  ] },
  { title: 'Thursday', scenes: [
    { place: 'Meal in Jerusalem', event: 'Final meal with the disciples', verses: [[26, 26, 30], [14, 22, 26], [22, 14, 20], [13, 3, 10]], note: 'The Synoptics give words over bread and cup. John foregrounds the washing of feet. Compare the actions and what Jesus says they mean.' },
    { place: 'Gethsemane', event: 'Prayer and arrest', verses: [[26, 47, 52], [14, 43, 50], [22, 47, 53], [18, 1, 11]], note: 'Read how Judas identifies Jesus in the Synoptics and how Jesus identifies himself in John.' }
  ] },
  { title: 'Friday', scenes: [
    { place: 'Golgotha', event: 'Crucifixion', verses: [[27, 33, 44], [15, 22, 32], [23, 33, 43], [19, 16, 24]], note: 'Compare the inscription and the movement of each scene. Which speakers does each writer bring into focus?' },
    { place: 'Tomb', event: 'Burial', verses: [[27, 57, 61], [15, 42, 47], [23, 50, 56], [19, 38, 42]], note: 'All four name Joseph of Arimathea. Look for who accompanies him or observes the burial.' }
  ] },
  { title: 'Saturday', scenes: [
    { place: 'Tomb', event: 'The Sabbath after burial', verses: [[27, 62, 66], null, [23, 54, 56], null], note: 'Matthew reports the guard and seal. Luke describes the women resting on the Sabbath. The selected Mark and John narratives move straight from burial to the first day of the week.' }
  ] },
  { title: 'Easter Sunday', scenes: [
    { place: 'Tomb', event: 'The empty tomb', verses: [[28, 1, 10], [16, 1, 8], [24, 1, 12], [20, 1, 10]], note: 'Compare who comes, what each witness sees, and where the scene ends. In John, continue to verses 11–18 for Mary’s encounter.' }
  ] }
];
