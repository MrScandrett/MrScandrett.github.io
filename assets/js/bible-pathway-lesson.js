(function () {
  'use strict';

  var lessons = [
    {
      id: 'world-of-the-bible', code: '1A', stage: 'Stage 1 · The Biblical World', grades: 'Grades 4–9', time: '45–60 minutes',
      title: 'The World of the Bible', lede: 'Build a geographic and chronological framework by connecting major places, peoples, covenants, empires, and events.',
      question: 'How does knowing where and when a biblical event happened help us read it more carefully?',
      scripture: 'Genesis 12:1–9 · Joshua 1:1–9 · Luke 3:1–2',
      goals: ['Locate Mesopotamia, Canaan, Egypt, the wilderness, Israel, and the wider Roman world.', 'Place creation, patriarchs, exodus, kingdom, exile, return, Jesus, and the early Church in sequence.', 'Use geography and chronology as context without letting background replace the biblical text.'],
      lenses: [['Place','Land and movement','Trace Abram’s movement from Mesopotamia toward Canaan. Notice rivers, travel corridors, deserts, and the importance of land in the promise.','Ask: What becomes clearer when this passage is located on a map?', 0, "Compare Abram’s travel with the migration of Jacob’s household in Genesis 46.", "Why does Genesis name stopping places?"],['Time','Anchor eras','Organize the story around the patriarchs, exodus, judges, monarchy, exile, return, Jesus, and the apostolic Church.','Ask: What came before and what changed afterward?', 1, "Compare Joshua 1 with Moses’ farewell in Deuteronomy 34.", "What changes at the opening of Joshua?"],['People','Nations and empires','Identify Israel’s neighbors and the empires that shape the setting: Egypt, Assyria, Babylon, Persia, Greece, and Rome.','Ask: Which power relationships are explicit in the text?', 2, "Compare the rulers named in Luke 3 with the decree and named ruler in Luke 2:1–3.", "How does Luke anchor John’s ministry?"],['Story','Promise and fulfillment','Follow creation, fall, covenant, kingdom, exile, Messiah, Church, and new creation without flattening distinct covenants or genres.','Ask: Where does this passage sit in Scripture’s unfolding story?', 3, "Compare Acts 17’s address in Athens with the promise to all families in Genesis 12:3.", "What does Paul appeal to in Acts 17:24–28?"]],
      check: ['Which practice best uses historical context?',['Let the map determine the passage’s theology','Use place and time to clarify details the passage communicates','Ignore geography because Scripture is theological'],'Use place and time to clarify details the passage communicates','Context serves careful reading; it does not replace the words and claims of the passage.'],
      reflect: 'Choose one biblical event. Explain how its location or place in the timeline helps you understand it.'
    },
    {
      id: 'how-the-bible-reached-us', code: '1B', stage: 'Stage 1 · The Biblical World', grades: 'Grades 6–12', time: '50–70 minutes',
      title: 'How the Bible Reached Us', lede: 'Trace Scripture from inspired writings through manuscripts, canon recognition, printing, and modern translation.',
      question: 'How did the biblical writings travel across centuries and languages to reach readers today?',
      scripture: 'Deuteronomy 31:24–26 · Luke 1:1–4 · 2 Timothy 3:14–17',
      goals: ['Distinguish composition, copying, canon recognition, and translation.', 'Explain how manuscript comparison helps scholars identify copying differences.', 'Evaluate claims about transmission with accuracy, evidence, and appropriate humility.'],
      lenses: [['Writing','Composition and preservation','Biblical books arose in particular settings and were written, collected, read, and preserved by communities of faith.','Separate what the text says about its origin from later details supplied by history.'],['Copies','Manuscript witnesses','Before printing, scribes copied texts by hand. Many surviving witnesses allow differences to be compared rather than hidden.','A variant is a difference among copies; it is not automatically a different doctrine.'],['Canon','Recognized books','Canon refers to the collection recognized as Scripture. It is different from the physical format of a scroll or codex and from a translation.','Ask what criteria and communal practices were involved, and name tradition-specific differences fairly.'],['Translation','Meaning across languages','Translation teams weigh vocabulary, grammar, context, style, and audience. Responsible translations may phrase the same meaning differently.','Compare translations to notice decisions, then consult notes and context before drawing conclusions.']],
      check: ['What is the clearest distinction?',['Canon is a translation style','A manuscript is a handwritten witness; canon is the recognized collection','Printing created the biblical books'],'A manuscript is a handwritten witness; canon is the recognized collection','Manuscripts are physical witnesses to texts; canon concerns which writings are received as Scripture.'],
      reflect: 'Write a careful two-sentence response to someone who says, “The Bible has been translated so many times that we cannot know what it said.”'
    },
    {
      id: 'the-tabernacle', code: '2A', stage: 'Stage 2 · God Dwells With His People', grades: 'Grades 5–10', time: '45–65 minutes',
      title: 'The Tabernacle', lede: 'Journey from Israel’s camp through the courtyard and Holy Place toward the Most Holy Place.',
      question: 'How can a holy God dwell among His people, and what do the Tabernacle’s spaces teach about presence and access?',
      scripture: 'Exodus 25–40 · Leviticus 16 · Hebrews 8–10',
      goals: ['Identify the Tabernacle’s major spaces, furnishings, and priestly functions.', 'Explain how holiness, sacrifice, cleansing, worship, and access relate.', 'Trace explicit connections made by Hebrews without inventing symbolism.'],
      lenses: [['Camp','God among His people','The sanctuary stands within Israel’s camp: God graciously dwells among the covenant people He rescued from Egypt.','Read Exodus 25:8 and ask who initiates this dwelling.'],['Courtyard','Sacrifice and cleansing','The altar and basin belong to the approach. Sacrifice and priestly washing show that access to holy presence is not casual.','Observe the stated use of each object before exploring later connections.'],['Holy Place','Priestly service','The lampstand, bread, and incense altar belong to the priests’ regular ministry inside the tent.','Compare Exodus 25–30 with Hebrews 9:1–7.'],['Most Holy','Holy presence','The ark and mercy seat stand behind the veil. The high priest enters under prescribed conditions on the Day of Atonement.','Let Hebrews explain how Christ’s priestly work changes access.']],
      check: ['Why should interpreters begin with each object’s stated purpose?',['Every material has a secret code','The text’s own explanation controls later connections','Objects have no larger biblical significance'],'The text’s own explanation controls later connections','The lesson may trace connections Scripture itself makes, but should not assign arbitrary meanings.'],
      reflect: 'Choose one Tabernacle space or object. Describe its function in Exodus, then identify one connection Hebrews explicitly makes.'
    },
    {
      id: 'temple-and-gods-presence', code: '2B', stage: 'Stage 2 · God Dwells With His People', grades: 'Grades 6–12', time: '50–70 minutes',
      title: 'The Temple & God’s Presence', lede: 'Compare Eden, Tabernacle, Temple, Christ, Church, and new creation across Scripture’s presence theme.',
      question: 'How does the Bible develop the hope of God dwelling with humanity?',
      scripture: 'Genesis 2–3 · 1 Kings 8 · John 1:14 · 1 Corinthians 3:16 · Revelation 21–22',
      goals: ['Trace repeated images of presence, holiness, priesthood, life, and access.', 'Identify both continuity and development across the biblical story.', 'Explain how Christ and new creation fulfill the presence theme.'],
      lenses: [['Eden','Presence lost','Human beings live before God in a garden of life, then are exiled eastward and barred from the tree of life.','Notice garden, river, precious materials, cherubim, life, and exile.', 0, "Compare the guarded tree of life with the accessible tree in Revelation 22:1–5.", "What is guarded in Genesis 3:24?"],['Sanctuary','Presence among Israel','Tabernacle and Temple provide covenantal sacred space, yet Solomon confesses that heaven cannot contain God.','Hold together real divine presence and God’s transcendence in 1 Kings 8.', 1, "Compare Solomon’s request that God hear from heaven with Jesus’ appeal to a house of prayer in Mark 11:17.", "What does Solomon say cannot contain God?"],['Christ and Church','Presence embodied','John announces that the Word became flesh and “dwelt” among us; the New Testament also calls God’s people a temple.','Distinguish Christ’s unique incarnation from the Spirit’s corporate indwelling of the Church.', 2, "Compare the glory witnessed in John 1:14 with the glory filling the tent in Exodus 40:34–38.", "Who dwells among the witnesses in John 1?"],['New Creation','Presence without a temple','Revelation’s city has no temple building because God and the Lamb are its temple; the tree and river of life return.','Compare Genesis 2–3 with Revelation 21–22.', 4, "Read Revelation 22:1–5 after 21:22–27 and trace the theme of access.", "What does John see in place of a temple building?"]],
      check: ['What makes a whole-Bible theme responsible?',['Matching every repeated object symbolically','Following textual echoes while respecting each passage’s context','Treating all sanctuaries as identical'],'Following textual echoes while respecting each passage’s context','Good biblical theology notices genuine connections and also respects development and difference.'],
      reflect: 'Trace one repeated image—garden, light, water, cherubim, temple, or dwelling—through at least three moments in the biblical story.'
    },
    {
      id: 'kingdoms-prophets-exile', code: '3A', stage: 'Stage 3 · Israel, Covenant & Prophets', grades: 'Grades 6–12', time: '55–75 minutes',
      title: 'Kingdoms, Prophets & Exile', lede: 'Synchronize kings, prophetic voices, biblical books, empires, exile, and return.',
      question: 'Why did Israel and Judah go into exile, and how did the prophets speak judgment and hope?',
      scripture: '1 Samuel 8 · 1 Kings 11–12 · 2 Kings 17, 25 · Ezra 1',
      goals: ['Sequence the united monarchy, divided kingdoms, Assyrian exile, Babylonian exile, and return.', 'Place selected prophets alongside the kings and empires they addressed.', 'Connect covenant unfaithfulness, judgment, mercy, and hope.'],
      lenses: [['United Kingdom','Saul, David, Solomon','Israel’s monarchy unites under its first kings. God’s covenant with David shapes later hope, while Solomon’s failures prepare the division.','Read royal success and failure in light of covenant faithfulness.'],['Divided Kingdom','Israel and Judah','After Solomon, the northern kingdom Israel and southern kingdom Judah follow separate rulers and repeated patterns of unfaithfulness.','Keep the two kingdoms and their capitals distinct.'],['Exile','Assyria and Babylon','Assyria conquers Samaria in 722/721 BC; Babylon destroys Jerusalem and the Temple in 586 BC. Biblical narratives give theological reasons within real imperial history.','Distinguish the two exiles, dates, destinations, and prophetic settings.'],['Return','Restoration and waiting','Persian policy permits return and rebuilding, but the post-exilic story still waits for the fullness of prophetic hope.','Restoration is real but incomplete. Ask which promises remain open.']],
      check: ['Which sequence is correct?',['Division → united monarchy → exile → return','United monarchy → division → exile → return','Exile → judges → division → return'],'United monarchy → division → exile → return','The monarchy divides after Solomon; Assyria and Babylon bring exile; Persia permits return.'],
      reflect: 'Select one prophet and identify the kingdom, ruler or empire, crisis, warning, and hope that frame the prophet’s message.'
    },
    {
      id: 'feasts-of-israel', code: '2D', stage: 'Stage 2 · Covenant & Presence', grades: 'Grades 5–10', time: '45–60 minutes',
      title: 'The Feasts of Israel', lede: 'Explore sacred time, harvest rhythms, remembrance, worship, and communal identity in Israel’s calendar.',
      question: 'How did Israel’s appointed feasts teach the community to remember God’s works?',
      scripture: 'Exodus 12 · Leviticus 23 · Deuteronomy 16',
      goals: ['Name the major appointed feasts (Leviticus 23) and place them in their agricultural seasons: spring barley, early summer wheat, autumn fruit and grain.', 'Notice the repeated rhythm of sevens: seventh day, seventh week, seventh month, and the seventh year.', 'Connect feast practices with remembered events and covenant worship.', 'Use New Testament connections carefully and distinguish Jewish and Christian practice.'],
      lenses: [['Spring','Passover and Unleavened Bread','Israel remembers deliverance from Egypt through the Passover meal and the week of Unleavened Bread.','Read Exodus 12 alongside Leviticus 23:4–8.'],['First harvest','Firstfruits and Weeks','Firstfruits acknowledges God’s provision; Weeks follows a counted interval and celebrates harvest with an assembly.','Notice how sacred time is joined to ordinary work and provision.'],['Autumn','Trumpets and Atonement','A memorial of trumpet blasts opens the seventh month (Leviticus 23:24); ten days later the Day of Atonement centers cleansing, fasting, and solemn rest, and Leviticus 16 describes the sanctuary rites (the scapegoat, the blood in the Most Holy Place).','Compare Leviticus 16 and 23 without treating the days as interchangeable. Jewish Rosh Hashanah and Yom Kippur developed these themes in later centuries.'],['Ingathering','Booths','Israel lives in temporary shelters, rejoices in harvest, and remembers wilderness dependence after the exodus (Leviticus 23:42–43). Nehemiah 8:13–18 shows the feast revived after the return from exile, with joy and Scripture reading.','Ask how embodied practices form communal memory, and how a revival (Nehemiah) is also a feast.']],
      check: ['What do the feasts join together?',['Only agricultural technique','Sacred time, God’s acts, worship, and community memory','A single event repeated every month'],'Sacred time, God’s acts, worship, and community memory','The calendar connects seasons and harvest with remembered acts of God and covenant worship.'],
      reflect: 'Choose one feast. Explain its timing, key practice, remembered event, and the way it formed Israel’s shared memory.'
    },
    {
      id: 'elijah', code: '3C', stage: 'Stage 3 · Israel, Covenant & Prophets', grades: 'Grades 5–10', time: '45–65 minutes',
      title: 'Elijah: Prophet of the Living God', lede: 'Follow Elijah’s confrontations with Ahab and Baal worship from Mount Carmel to the still small voice at Horeb.',
      question: 'How does Elijah’s ministry confront false worship and reveal who the living God really is?',
      scripture: '1 Kings 17–19 · 1 Kings 21 · 2 Kings 2:1–12',
      goals: ['Sequence Elijah’s ministry from the drought announcement to his departure in the whirlwind.', 'Explain how Cherith, Zarephath, Carmel, and Horeb each reveal God’s provision, power, and character.', 'Compare God’s dramatic self-revelation in fire at Carmel with His quiet self-revelation in the “still small voice” at Horeb.'],
      lenses: [['Cherith','Provision in hiding','After announcing a drought to King Ahab, Elijah hides at the Kerith Ravine, where ravens bring him bread and meat and he drinks from the brook.','Read 1 Kings 17:2–7 and ask what this hidden scene teaches about obedience before any public confrontation.', 0, "Compare bread beside the brook with bread for the journey in 1 Kings 19:5–8.", "What happens to the brook in 1 Kings 17?"],['Zarephath','A widow’s flour and oil','Sent to a foreign widow during the famine, Elijah finds her jar of flour and jug of oil do not run out, and later raises her son to life.','Notice that God’s provision and power reach beyond Israel’s borders even as judgment falls on Israel.', 4, "Read Luke 4:24–27 for Jesus’ use of the Zarephath episode.", "What does the widow say after her son is restored?"],['Carmel','Fire falls, Baal is silent','Elijah challenges 450 prophets of Baal to a public contest of sacrifice and fire before all Israel; the Lord answers by fire while Baal answers nothing.','Read 1 Kings 18:20–39 and notice the crowd’s response: “The Lord, he is God.”', 1, "Compare the crowd’s declaration here with its silence at the first challenge in 1 Kings 18:21.", "What reason does Elijah give for his prayer?"],['Horeb','The still small voice','Fleeing Jezebel’s threat after his greatest public victory, Elijah journeys forty days to Horeb, where wind, earthquake, and fire precede a quiet voice that recommissions him.','Compare the dramatic fire at Carmel with the quiet voice at Horeb, and ask what both reveal about God.', 2, "Compare the call of Elisha in 1 Kings 19:19–21 with his request in 2 Kings 2:9.", "What follows Elijah’s encounter at Horeb?"]],
      check: ['What does Elijah’s flight to Horeb right after Carmel teach?',['Public victory guarantees lasting confidence','Even a faithful prophet can grow afraid and discouraged after a great victory','Elijah stopped trusting God after Carmel'],'Even a faithful prophet can grow afraid and discouraged after a great victory','Elijah’s flight after his greatest public triumph shows that dramatic success does not remove fear, exhaustion, or the need for God’s renewing word.'],
      reflect: 'Choose one scene—Cherith, Zarephath, Carmel, or Horeb. Describe Elijah’s circumstances, God’s provision, and Elijah’s response.'
    },
    {
      id: 'world-of-jesus', code: '4A', stage: 'Stage 4 · Jesus & the Kingdom', grades: 'Grades 4–10', time: '45–60 minutes',
      title: 'The World of Jesus', lede: 'Explore Galilee, Samaria, Judea, Jerusalem, roads, terrain, social groups, and Gospel events.',
      question: 'How do geography and historical setting clarify the Gospel accounts of Jesus?',
      scripture: 'Matthew 4:12–25 · Luke 9:51–56 · John 4:1–42',
      goals: ['Locate major regions, towns, bodies of water, and travel routes in the Gospels.', 'Explain how terrain, distance, rule, and regional identity affect events.', 'Use historical context to clarify rather than control Gospel interpretation.'],
      lenses: [['Galilee','Ministry around the lake','Nazareth, Capernaum, the Sea of Galilee, fishing villages, and surrounding roads frame much of Jesus’ public ministry.','Notice movement among towns and the role of boats, crowds, and hillsides.', 0, "Compare Matthew 4 with Mark 1:16–21 and trace the movement from shore to synagogue.", "Where does Jesus settle after leaving Nazareth in Matthew 4?"],['Samaria','A contested region','Samaria lies between Galilee and Judea, yet regional identity and religious history make travel socially significant.','Read John 4 and Luke 9 without reducing Samaritans to a simple label.', 3, "Compare the village’s response in Luke 9:52–56 with the welcome in John 4:39–42.", "What surprises the woman at the well?"],['Judea','Road toward Jerusalem','Judea includes Jerusalem, nearby villages, wilderness, and roads rising through difficult terrain.','Estimate travel by terrain and ancient conditions, not modern driving time.', 2, "Compare Luke 9:51 with Luke 19:28 as the journey approaches Jerusalem.", "What destination shapes the refusal in Luke 9:53?"],['Jerusalem','Temple and Roman rule','The Temple, festivals, leadership groups, crowds, and Roman authority converge in the city.','Name who holds religious or political authority in each scene.', 5, "Compare the temple authorities’ question in Mark 11:27–33 with Pilate’s question in Luke 23:1–4.", "What do the authorities ask about in Mark 11:28?"]],
      check: ['Why is Jesus’ route through Samaria significant in John 4?',['It was geographically impossible','Place and strained social relationships shape the encounter','Samaria was another name for Rome'],'Place and strained social relationships shape the encounter','The route is geographically intelligible and socially meaningful because of Jewish-Samaritan history.'],
      reflect: 'Choose one Gospel journey. List its places in order and explain one detail made clearer by geography or social setting.'
    },
    {
      id: 'jesus-parables-lab', code: '4B', stage: 'Stage 4 · Jesus & the Kingdom', grades: 'Grades 4–10', time: '45–65 minutes',
      title: 'Jesus’ Parables Lab', lede: 'Practice hearing context, surprise, reversal, kingdom truth, and response in Jesus’ story-shaped teaching.',
      question: 'How do Jesus’ parables challenge expectations and call hearers to respond to God’s kingdom?',
      scripture: 'Matthew 13 · Luke 10:25–37 · Luke 15',
      goals: ['Identify speaker, audience, prompting question, and literary context.', 'Notice repetition, contrast, surprise, reversal, and the story’s conclusion.', 'State a central claim supported by details without allegorizing every feature.'],
      lenses: [['Context','Who hears and why?','Begin outside the story: Who is Jesus addressing? What question, conflict, or situation prompts the parable?','Read the paragraphs before and after the parable.'],['Expectation','Predict the likely turn','Name what an original hearer might expect from familiar social roles, plots, or values.','Hold the prediction lightly; the story may overturn it.'],['Surprise','Notice the reversal','Watch for unexpected compassion, judgment, delay, abundance, refusal, or role reversal.','Ask which detail receives emphasis through repetition or contrast.'],['Response','Hear the invitation','A parable may expose, warn, invite, or demand a decision. State the main thrust before exploring smaller details.','Support the claim from the story and its Gospel context.']],
      check: ['What is a strong first step in interpreting a parable?',['Assign a symbolic meaning to every object','Read its audience and surrounding Gospel context','Skip to a modern moral'],'Read its audience and surrounding Gospel context','Context helps identify the question or conflict Jesus addresses and guards against free-floating interpretation.'],
      reflect: 'Choose a parable. Record the context, expected turn, actual surprise, central claim, and response Jesus invites.'
    },
    {
      id: 'holy-week', code: '4C', stage: 'Stage 4 · Jesus & the Kingdom', grades: 'Grades 6–12', time: '55–75 minutes',
      title: 'Holy Week: The Final Days of Jesus', lede: 'Follow Jesus’ final week by day, location, Gospel witness, Old Testament connection, death, and resurrection.',
      question: 'How do the four Gospels narrate the climax of Jesus’ mission with shared events and distinct emphases?',
      scripture: 'Matthew 21–28 · Mark 11–16 · Luke 19–24 · John 12–21',
      goals: ['Sequence the major events from the entry into Jerusalem through the resurrection appearances, tying each to a day, a place, and a Gospel.', 'Compare parallel accounts without erasing each Gospel’s literary emphasis, and say what all four share.', 'Notice how the Gospels read the week through Scripture: Zechariah 9, Psalm 118, Isaiah 53, Psalm 22, and the Passover.', 'Distinguish what the Gospels report from the later art, tradition, and sites that grew up around the week.', 'Articulate why Jesus’ death and resurrection are central to Christian faith.'],
      lenses: [['Entry and Temple','The King enters','Jesus enters Jerusalem on a colt as crowds cry “Hosanna!” (Matthew 21:1–11; Mark 11:1–11; Luke 19:28–40; John 12:12–19). The Gospels tie the scene to Zechariah 9:9 and Psalm 118, then follow it with action in the Temple.','Compare the citations and details each Gospel foregrounds: Matthew names the colt and the prophet, Luke adds the stones that would cry out, John the palm branches.'],['Teaching and Supper','Conflict and covenant','Public teaching, controversy, and anointing lead to Passover week’s final meal, where Jesus gives bread and cup as a new covenant (Mark 14:22–26; Luke 22:14–20). John instead shows Him washing feet and giving a new commandment (John 13).','Track changes in location, audience, and tension. Notice that John’s chronology of the meal differs from the other three, a question readers have long discussed.'],['Arrest and Trials','Gethsemane to Pilate','Jesus prays in a garden, is arrested after Judas’s betrayal, and is questioned by the high priest and then by Pilate, the Roman governor (Mark 14:32–15:15; John 18:1–19:16).','Ask who holds power in each scene and what each authority is afraid of. Compare the charge before the council with the charge before Pilate.'],['Trial and Cross','The crucified Messiah','Crucifixion was a Roman punishment. The Gospels report the inscription, the mockery, the words from the cross, the darkness, and the death (Mark 15:21–41; Luke 23:32–49; John 19:16–37), and each selects different words and witnesses.','Distinguish responsible harmonization from forcing every detail into one narrator’s order. Note the Psalms the writers hear in the scene (Psalm 22, Psalm 31).'],['Burial','A guarded tomb','Joseph of Arimathea asks for the body, which is wrapped and laid in a new rock-cut tomb closed with a stone (Mark 15:42–47; John 19:38–42). Matthew alone reports the guard (Matthew 27:62–66).','Compare the burial with what archaeology shows about first-century rock-cut tombs, and ask why the burial matters to the resurrection claim.'],['Resurrection','The tomb is empty','Women discover the empty tomb and the risen Jesus appears to disciples. The earliest manuscripts of Mark end at 16:8 with fear and silence, while Matthew, Luke, and John narrate appearances (Matthew 28; Luke 24; John 20–21).','List what all four affirm, then note each writer’s emphasis. Name the shared core: an empty tomb, women as first witnesses, and a risen Jesus who sends His followers.']],
      check: ['How should parallel Gospel accounts be compared?',['Erase every difference','Treat differences as contradictions automatically','Identify shared testimony and respect each author’s selected emphasis'],'Identify shared testimony and respect each author’s selected emphasis','A careful comparison sees convergence without flattening the four literary witnesses into one voice.'],
      reflect: 'Make a four-column comparison of one Holy Week event. What is shared, and what does each Gospel especially emphasize?'
    },
    {
      id: 'acts-jerusalem-to-nations', code: '5A', stage: 'Stage 5 · The Church Goes Out', grades: 'Grades 5–10', time: '45–65 minutes',
      title: 'Acts: Jerusalem to the Nations', lede: 'Watch Spirit-empowered witness spread through people, households, cities, and cultures.',
      question: 'How does the risen Jesus continue His mission through the Holy Spirit and the witness of the Church?',
      scripture: 'Acts 1:8 · Acts 2 · Acts 8–11 · Acts 13',
      goals: ['Use Acts 1:8 to describe the book’s broad geographic movement.', 'Identify repeated patterns of witness, opposition, hospitality, conversion, and community.', 'Explain how boundary-crossing episodes prepare the mission to the nations.'],
      lenses: [['Jerusalem','Spirit and witness','Pentecost empowers public witness, forms a worshiping community, and begins the outward movement promised in Acts 1:8.','Notice Scripture, speech, response, baptism, fellowship, and opposition.'],['Judea and Samaria','Witness under pressure','Persecution scatters believers; Philip’s ministry and the Samaritan reception show the gospel crossing old boundaries.','Track how apparent setbacks become routes for mission.'],['Households','Unexpected welcome','Peter’s encounter with Cornelius makes God’s welcome of Gentiles unmistakable to the Jerusalem believers.','Follow the repeated visions, witnesses, Spirit, and communal explanation.'],['To the nations','Sending communities','At Antioch, a diverse worshiping church sends Barnabas and Saul into cross-cultural mission.','Notice that routes grow through people, households, cities, and new congregations.']],
      check: ['What broad movement structures Acts?',['Rome to Jerusalem','Jerusalem toward Judea, Samaria, and the ends of the earth','Egypt to Babylon'],'Jerusalem toward Judea, Samaria, and the ends of the earth','Acts 1:8 gives a geographic and theological horizon for the expanding witness.'],
      reflect: 'Choose one boundary-crossing episode in Acts. Who crosses the boundary, what resistance appears, and what confirms God’s work?'
    },
    {
      id: 'pauls-missionary-journeys', code: '5B', stage: 'Stage 5 · The Church Goes Out', grades: 'Grades 6–12', time: '55–75 minutes',
      title: 'Paul’s Missionary Journeys', lede: 'Trace routes, cities, companions, opposition, churches, and letters across the Roman world.',
      question: 'How did Paul and his coworkers carry the gospel across cultures and strengthen new churches?',
      scripture: 'Acts 13–21 · Selected Pauline letter openings',
      goals: ['Distinguish Paul’s major journeys and identify their key regions and cities.', 'Connect travel conditions, companions, events, and local congregations.', 'Relate New Testament letters to settings with appropriate caution about debated dates.'],
      lenses: [['Journey 1','Cyprus and Galatia','Sent from Antioch with Barnabas, Paul travels through Cyprus and cities of southern Galatia, preaching and appointing elders.','Trace Acts 13–14 and notice repeated synagogue-to-city patterns.'],['Journey 2','Macedonia and Achaia','With Silas and later Timothy and Luke, Paul crosses into Macedonia and continues to Athens and Corinth.','Compare responses in Philippi, Thessalonica, Berea, Athens, and Corinth.'],['Journey 3','Ephesus and strengthening','Paul revisits communities and spends extended time in Ephesus before traveling through Macedonia and Greece.','Observe teaching, teamwork, opposition, and collection for Jerusalem.'],['Jerusalem to Rome','Witness in custody','Arrest, hearings, storm, shipwreck, and house arrest carry Paul’s witness to Rome, though Acts does not narrate his death.','Do not call this a fourth missionary journey without explaining the label.']],
      check: ['Which city becomes Paul’s extended base during the third journey?',['Ephesus','Bethlehem','Nineveh'],'Ephesus','Acts presents an extended Ephesian ministry that influences the wider province of Asia.'],
      reflect: 'Choose one travel leg. Record origin, destination, companions, challenge, response, and any letter connected with the city.'
    },
    { id: 'proverbs', title: 'Proverbs' },
    {
      id: 'job', code: '6B', stage: 'Stage 6 · Wisdom & Christian Life', grades: 'Grades 6–12', time: '50–70 minutes',
      title: 'Job: Suffering, Wisdom & Faithful Speech', lede: 'Read Job as wisdom literature: lament honestly, test easy explanations, and listen for the book’s answer to suffering and human limits.',
      question: 'How can faithful speech make room for suffering without pretending to know more than we do?',
      scripture: 'Job 1–3 · 38–42',
      goals: ['Trace the movement from Job’s loss and lament through the friends’ explanations to God’s speeches and Job’s response.', 'Distinguish lament, accusation, explanation, and divine wisdom instead of treating every speech as equally authoritative.', 'Practice accompanying suffering with humility, truthful presence, and hope rather than assigning blame.'],
      lenses: [['Loss','What happens?','The opening scenes establish Job’s losses and preserve his refusal to curse God, but they do not give the reader a simple formula for explaining suffering.','Name what the text says and what it leaves unexplained.', 0, "Compare God’s description of Job in 1:8 with the verdict on the friends in 42:7.", "How does the narrator first describe Job?"],['Lament','Faithful protest','Job curses the day of his birth, asks hard questions, and directs his speech toward God. Lament is not the same as indifference or silence.','Listen for grief, desire for justice, and continued relationship in the same speech.', 2, "Read Psalm 13 and compare how lament gives voice to distress.", "What does Job curse at the start of chapter 3?"],['Friends','Testing explanations','Eliphaz, Bildad, and Zophar repeatedly connect suffering with wrongdoing. Their confidence sounds orderly, but Job 42:7 makes the book’s judgment on their speech part of the lesson.','A plausible principle can become harmful when applied without evidence or compassion.', 5, "Compare Eliphaz’s claim with the verdict in Job 42:7.", "How does Eliphaz turn a question about the innocent into a claim about Job?"],['Encounter','Wonder and limits','God answers from the whirlwind with questions about creation, creatures, justice, and human knowledge. Job receives no secret transcript of the heavenly council; he receives an encounter that reorders his confidence.','Do not turn God’s questions into a claim that every sufferer caused their own pain.', 3, "Compare Job 38:1–18 with Job’s first words in 42:1–6.", "What does God ask Job about?"]],
      check: ['What does Job most clearly challenge?',['The idea that every person can explain another person’s suffering by pointing to hidden sin','The practice of speaking honestly to God','The value of compassion from friends'],'The idea that every person can explain another person’s suffering by pointing to hidden sin','Job’s friends are rebuked for speaking wrongly about God. The book makes room for honest lament while refusing a mechanical explanation of suffering.'],
      reflect: 'Write a response to a suffering person that includes presence, one honest question, and one limit on what you claim to know.'
    },
    {
      id: 'sermon-on-the-mount', code: '6C', stage: 'Stage 6 · Wisdom & Christian Life', grades: 'Grades 6–12', time: '55–75 minutes',
      title: 'The Sermon on the Mount', lede: 'Explore Jesus’ teaching about kingdom character, motives, relationships, trust, prayer, and obedience.',
      question: 'What does faithful life under Jesus’ kingdom look like in public action and hidden motive?',
      scripture: 'Matthew 5–7',
      goals: ["Trace the sermon's movement from kingdom character to practiced obedience.", 'Connect outward actions with inward motives, desires, and trust.', 'Apply Jesus’ teaching without reducing discipleship to performance or a score.'],
      lenses: [['Kingdom character','Blessing and witness','The Beatitudes name surprising recipients of kingdom blessing; salt and light describe a visible vocation shaped by the Father.','Read the opening as the frame for what follows, not as isolated virtues.'],['Deep righteousness','Heart and relationship','Jesus addresses anger, desire, truthfulness, retaliation, and enemy love by reaching beyond minimum compliance to reconciled faithfulness.','Observe the repeated pattern: “You have heard … but I say.”'],['Hidden devotion','Father-centered practice','Giving, prayer, fasting, possessions, and anxiety expose the audience for whom we perform and the treasure we trust.','Compare visible action and hidden motive without assuming motives you cannot know.'],['Obedient wisdom','The narrow and solid way','Jesus closes with choices: ask, discern fruit, enter the narrow gate, and build by hearing and doing His words.','The sermon ends with practiced obedience, not admiration alone.']],
      check: ['What contrast repeatedly matters in Matthew 6?',['Public appearance and the Father who sees in secret','Old cities and new cities','Learning and imagination'],'Public appearance and the Father who sees in secret','Jesus examines both faithful practices and the audience or reward that motivates them.'],
      reflect: 'Choose one teaching from Matthew 5–7. Describe the visible action, possible hidden motive, kingdom value, and one faithful practice.'
    },
    {
      id: 'genesis', code: '1C', stage: 'Stage 1 · The Biblical World', grades: 'Grades 4–10', time: '50–70 minutes',
      title: 'Genesis: Creation, Promise & Family', lede: 'Read Genesis as one connected story of creation, fall, flood, promise, and a family carried toward Egypt.',
      question: 'How do creation, fall, judgment, and promise set the pattern for the rest of Scripture?',
      scripture: 'Genesis 1–3 · 6–9 · 12:1–3 · 37–50',
      goals: ['Trace Genesis through its repeated generations (“these are the generations of…”) and turning points.', 'Distinguish what the text states from later interpretations or reconstructions.', 'Explain how God’s promise to Abraham carries the story beyond one family.'],
      lenses: [['Creation','A good world','Genesis begins with ordered life, blessing, image-bearing, and rest.','Observe the repeated pattern before asking what it means.', 1, "Compare Genesis 1:26–31 with Genesis 9:6–7 after the flood.", "Who bears God’s image in Genesis 1?"],['Fall','Broken fellowship','Genesis 3 introduces distrust, shame, and exile from the garden. Chapters 4–11 widen the damage: Cain’s violence, the flood, and Babel’s scattered nations, each followed by a thread of mercy.','Name consequences and the mercy that follows each one without treating every later detail as a direct replay.', 2, "Compare the humans hiding here with their departure in Genesis 3:22–24.", "What do the humans do when they hear God in the garden?"],['Promise','A family for blessing','God calls Abram out of Ur’s world and promises land, descendants, and blessing for all the families of the earth: the answer to Babel’s scattering.','Follow the promise through failures, delays, and surprising births (Sarah, Rebekah, Rachel).', 5, "Compare Genesis 12:3 with the blessing reaching beyond Joseph’s household in Genesis 50:20.", "Who is included in the horizon of Abram’s blessing?"],['Providence','Toward Egypt','Joseph’s descent and rise bring the family to Egypt, where the next book begins.','Trace the story’s movement rather than reducing it to isolated heroes.', 8, "Compare Genesis 50 with Exodus 1 to see what changes for the family in Egypt.", "How does Joseph describe his brothers’ intention?"]],
      check: ['Which thread best connects Genesis 12 to the rest of Scripture?',['A promise to bless the families of the earth through Abraham’s line','A command to build the Jerusalem Temple immediately','A prediction that every event will be easy'],'A promise to bless the families of the earth through Abraham’s line','Genesis gives the family story a wider horizon: blessing is meant to reach beyond Abraham’s household.'],
      reflect: 'Draw a six-stop timeline from creation to Joseph. At each stop, name one fracture and one promise.'
    },
    {
      id: 'exodus', code: '2C', stage: 'Stage 2 · God Dwells With His People', grades: 'Grades 5–10', time: '50–70 minutes',
      title: 'Exodus: Rescue, Covenant & Presence', lede: 'Follow Israel from slavery in Egypt through Passover, the sea, and Sinai into a covenant people.',
      question: 'How do rescue and covenant form a people who did not previously exist as a nation?',
      scripture: 'Exodus 1–3 · 12–14 · 19–20',
      goals: ['Sequence oppression, calling, plagues, Passover, sea crossing, wilderness, and Sinai.', 'Notice how Exodus answers Pharaoh’s claim to power with the Lord’s claim on Israel: “Let my people go, that they may serve me.”', 'Explain how deliverance leads to covenant identity rather than merely escape.', 'Connect Exodus 19–20 with the Tabernacle and later biblical memory.'],
      lenses: [['Oppression','A people under power','Exodus names forced labor, fear, resistance, and the cries of an enslaved people.','Keep the human cost visible before moving to the spectacular scenes.', 0, "Compare forced labor in Exodus 1 with the reason for rest in Deuteronomy 5:15.", "What motivates Pharaoh’s oppression in Exodus 1?"],['Name','A reluctant calling','At the bush, Moses encounters the God who sees, hears, remembers, and sends.','Compare Moses’ questions with God’s revealed name and promise.', 2, "Compare Moses’ questions with the later commission of Joshua in Joshua 1:5–9.", "What does God promise Moses in Exodus 3:12?"],['Passover','Rescue remembered','The plagues contest Egypt’s power; the Passover meal, blood, haste, and memorial then make deliverance communal and repeatable (Exodus 12:14, 26–27).','Notice how ritual turns history into shared memory that children are taught to ask about.', 3, "Compare Exodus 12:14 with the explanation given to children in 12:26–27.", "How does Exodus 12 describe the day for later generations?"],['Sinai','A covenant people','Israel is rescued before receiving the law (20:2 comes before 20:3); covenant gives shape to worship, justice, and neighbor-love, and ends with a plan for God to dwell among them (25:8).','Read commands as the vocation of a redeemed people, not a ladder to earn rescue.', 7, "Read Exodus 25:8–9 to see where covenant life points.", "What does God recall before the commandments?"]],
      check: ['What is the order in Exodus?',['Sinai covenant → slavery → Passover → creation','Slavery → calling → Passover and sea → Sinai covenant','Temple building → exile → slavery → Sinai'],'Slavery → calling → Passover and sea → Sinai covenant','Exodus moves from oppression through God’s rescue to covenant identity at Sinai.'],
      reflect: 'Create a route-and-covenant map. Mark one place, one rescue event, and one way Sinai changes Israel’s shared life.'
    },
    {
      id: 'leviticus', code: '2E', stage: 'Stage 2 · Covenant & Presence', grades: 'Grades 5–12', time: '50–70 minutes',
      title: 'Leviticus: Holiness, Worship & Neighbor-Love', lede: 'Discover why Leviticus places worship, justice, bodies, food, land, and neighbor-love inside one vision of holy life.',
      question: 'How can a holy God live among an ordinary people, and what kind of community does that create?',
      scripture: 'Leviticus 1 · 16 · 19 · 23 · 25',
      goals: ['Locate sacrifice, priesthood, purity, the Day of Atonement, holy living, festivals, and Jubilee within the book.', 'Distinguish ritual categories from moral blame and avoid treating impurity as the same thing as sin.', 'Explain how love of neighbor, care for the vulnerable, honest work, and worship belong together.'],
      lenses: [['Approach','Worship and gift','Leviticus opens with offerings that express dedication, gratitude, fellowship, and atonement. The instructions make approach ordered rather than casual.','Name what each selected passage actually says before importing later assumptions.', 0, "Compare the offering at the entrance with the sanctuary rites in Leviticus 16.", "Who is addressed at the beginning of Leviticus 1?"],['Clean and unclean','Boundaries, not rankings','Purity language organizes Israel’s worship and embodied life. Ritual impurity is often temporary and is not automatically a moral failure.','Ask whether a passage concerns ritual status, moral wrongdoing, or both.', 6, "Compare Leviticus 15:16–18 with the prohibitions and duties in Leviticus 19.", "What response does Leviticus 15:16 specify?"],['Atonement','Cleansing the sanctuary and people','Leviticus 16 gathers the book’s concerns in the Day of Atonement: confession, cleansing, sacrifice, and removal of sin.','Follow the movements and purposes described in the chapter.', 1, "Compare the two goats in Leviticus 16:7–10 with the fuller sequence in 16:15–22.", "How are the goats assigned their roles?"],['Holy life','Love made public','Leviticus 19 joins reverence for God with honest scales, gleaning for the poor, justice, truth, and love of neighbor.','Holiness is not merely separation; the chapter gives it social shape.', 2, "Compare the gleaning commands with Ruth’s experience in Ruth 2:2–9.", "For whom are the field edges and gleanings left?"]],
      check: ['Which statement best fits Leviticus 19?',['Worship and neighbor-love belong to separate parts of life','Holiness includes worship, justice, truth, generosity, and love of neighbor','Only priests are called to holy living'],'Holiness includes worship, justice, truth, generosity, and love of neighbor','Leviticus 19 repeatedly connects “I am the Lord” with concrete treatment of neighbors, workers, immigrants, the poor, and the vulnerable.'],
      reflect: 'Choose one command from Leviticus 19. Explain what it protects, whom it helps, and how it connects love of God with love of neighbor.'
    },
    {
      id: 'numbers', code: '2F', stage: 'Stage 2 · Covenant & Presence', grades: 'Grades 5–10', time: '50–70 minutes',
      title: 'Numbers: Wilderness, Trust & a New Generation', lede: 'Follow a rescued people through testing, failure, mercy, and preparation as a new generation reaches the edge of the land.',
      question: 'What does the wilderness reveal about trust, leadership, consequences, and God’s faithfulness?',
      scripture: 'Numbers 1–2 · 11–14 · 20–21 · 27',
      goals: ['Trace the journey from Sinai to the plains of Moab and explain why two censuses frame the book.', 'Compare complaint, fear, rebellion, intercession, judgment, and mercy in their narrative contexts.', 'Explain how the book ends with both loss and renewed preparation.'],
      lenses: [['Ordered camp','A people around the sanctuary','The opening census and camp arrangement place the Tabernacle at the center as Israel prepares to travel.','Numbers is not only a list of counts; the counts mark generations and readiness.', 1, "Compare the arrangement in Numbers 2:1–9 with the order of departure in 10:11–14.", "What is the camp arranged around?"],['Complaint','Pressure exposes trust','Food, fear, rivalry, and uncertainty repeatedly reveal how the community and its leaders respond under pressure.','Compare each complaint rather than treating every conflict as identical.', 2, "Compare Moses’ burden here with the shared responsibility of the elders in Numbers 11:16–17.", "What does Moses say about carrying the people?"],['The spies','Fear and evidence','Numbers 13–14 gives the same land report to the community, but the spies interpret its meaning differently. Fear becomes refusal, with consequences for a generation.','Separate what the scouts observe from the conclusions they draw.', 3, "Read Numbers 14:6–9 to see Joshua and Caleb explain their position.", "What observation and conclusion are distinct?"],['New generation','Judgment is not the last scene','A second census, new leadership, and instructions about inheritance prepare children of the wilderness generation to continue the journey.','Notice what changes and what promises remain.', 6, "Read Joshua 1:1–9 after the commissioning in Numbers 27.", "What does Moses do before the congregation?"]],
      check: ['Why are there two major censuses in Numbers?',['They help frame the wilderness story around an older and a new generation','They prove nothing happened between Sinai and Moab','They count only Israel’s kings'],'They help frame the wilderness story around an older and a new generation','The first generation is counted near Sinai; after wilderness judgment, a new generation is counted near the land.'],
      reflect: 'Make a two-column evidence chart for Numbers 13–14: what all the spies saw and how they interpreted it. What turned observation into fear or trust?'
    },
    {
      id: 'deuteronomy', code: '2G', stage: 'Stage 2 · Covenant & Presence', grades: 'Grades 6–12', time: '50–70 minutes',
      title: 'Deuteronomy: Remember, Love & Choose Life', lede: 'Listen to Moses retell Israel’s story and law to a new generation preparing to cross the Jordan.',
      question: 'Why does Moses ask a new generation to remember before it moves forward?',
      scripture: 'Deuteronomy 1 · 5–6 · 8 · 10 · 15 · 17–18 · 26 · 30–34',
      goals: ['Recognize Deuteronomy as a covenant renewal shaped like an ancient treaty: history, stipulations, blessings and curses, witnesses, and a handoff to a new leader.', 'Trace the pattern of remembering, loving, teaching, obeying, and choosing life across chapters 1, 5–6, 8, 26, and 30.', 'Explain how memory becomes justice: show how “you were slaves” shapes laws about debt, harvest, foreigners, and rulers.', 'Compare a retold passage with its earlier version (Deuteronomy 5 and Exodus 20; Deuteronomy 1:22 and Numbers 13) and say what the retelling adds.', 'Connect Deuteronomy to later Scripture: Jesus’ wilderness answers, the greatest commandment, 1 Samuel 8, Romans 10, and Joshua 1.'],
      lenses: [
        ['Retell','Memory forms identity','Deuteronomy opens “These are the words that Moses spoke” (its Hebrew title, Devarim, means “words”; the English name comes from a Greek rendering of 17:18 meaning “second law”). Moses speaks east of the Jordan to people who were children, or not yet born, at Sinai, yet he says the Lord made this covenant “not with our fathers… but with us, who are all of us here alive today” (5:3). Retelling makes an old covenant a present one. He also retells with emphasis: chapter 5 gives a different reason for the Sabbath than Exodus 20 does.','Read Deuteronomy 5:12–15 beside Exodus 20:8–11. What reason does each give for the Sabbath, and what does the difference show about how Moses retells?',1,'Retelling as ritual: the Passover Haggadah teaches that in every generation a person should see themselves as if they had come out of Egypt (Mishnah, Pesachim 10:5).','Compare Deuteronomy 1:22–23 with Numbers 13:1–3. Which side of the same event does each emphasize, and is retelling the same as changing the story?'],
        ['Hear and love','The Shema','Deuteronomy 6:4–5 is the Shema, named for its first word, “Hear.” It joins a confession (the Lord is one) with the command to love him with all heart, soul, and might. Many scholars note that “love” in this treaty-shaped book includes loyalty, not only feeling. Verses 6–9 then say how it is learned: words on the heart, repeated to children, spoken while sitting, walking, lying down, and rising, bound as a sign, and written on doorposts. Observant Jews still recite the Shema morning and evening and read verses 8–9 literally in tefillin and mezuzot.','List every action verb in 6:4–9 and sort them: which are private, which are shared with a household, and which a visitor could see?',2,'Jesus names this the greatest commandment (Mark 12:28–34) and answers each wilderness temptation from Deuteronomy (Matthew 4:1–11, quoting 8:3, 6:16, and 6:13).','How can love be commanded? Look at 10:12–13 and 11:1, where love sits beside walking, serving, and keeping. What does the text count as love?'],
        ['Justice and neighbor','Memory becomes law','Moses grounds justice in who God is: he “executes justice for the fatherless and the widow, and loves the sojourner,” so Israel must love the sojourner, “for you were sojourners in the land of Egypt” (10:17–19). The laws make it concrete: debts released every seventh year (15:1–11), judges who pursue “justice, and only justice” (16:18–20), and part of the harvest left for the foreigner, orphan, and widow (24:19–22). The memory of slavery becomes a rule for how the strong treat the weak.','Find each place in chapters 10, 15, and 24 where the reason for a law is “you were slaves” or “you were sojourners.” What does remembering do to the way a law is applied?',5,'Compare Leviticus 19:9–18 (the Leviticus lesson). Acts 4:34 echoes 15:4: “there was not a needy person among them.”','Deuteronomy 15:4 says there will be “no poor among you” if Israel obeys, yet 15:11 says the poor “will never cease from the land.” How does the passage hold the ideal and the realism together?'],
        ['Limits on power','Authority under the word','Deuteronomy allows a king but limits him (17:14–20): not many horses, wives, or silver and gold, and he must copy the law and read it “all the days of his life, that his heart may not be lifted up above his brothers.” Judges, priests, and prophets share the work of authority (16:18–18:22). The prophet like Moses (18:15–22) is tested by whether his word comes true and in whose name he speaks. Power is spread out and placed under a written word.','Make a three-column chart: what the king may not gather, what he must do, and why (the last phrase of 17:20). What kind of ruler is this law trying to prevent?',6,'Test it against 1 Samuel 8, where Israel asks for a king “like all the nations,” and against Solomon, who gathers horses from Egypt, many wives, and great gold (1 Kings 10–11). The prophet like Moses is echoed in Acts 3:22–23 and 7:37.','Is 17:14–20 permission for monarchy or a brake on it? 1 Samuel 8 treats the request as a problem. How might both be true?'],
        ['Remember','Prosperity can forget','Chapter 8 says the forty years were a school: God humbled and tested Israel and fed them with manna so they would learn that “man does not live by bread alone,” then warns that prosperity is the danger: “My power and the might of my hand have gotten me this wealth” (8:17). Chapter 26 gives memory a script. A worshiper brings first fruits, recites a short history (“A wandering Aramean was my father”), and shares the joy with the Levite and the sojourner (26:5–11). Remembering is meant to end in gratitude and generosity.','Mark every “remember” and “forget” in chapter 8, then read 26:1–11 aloud. At what point does the recited history turn into action?',8,'The same pattern runs through the festival calendar (Deuteronomy 16; see the Feasts of Israel lesson) and through Jesus’ answer to the first temptation, which quotes 8:3.','Moses asks Israel to remember a wilderness full of failure. Why must honest memory include what went wrong, and what would a one-sided memory do to a people?'],
        ['Choose life','A decision before crossing','Chapters 29–30 renew the covenant on the plains of Moab. Moses says the commandment is “not too hard for you… the word is very near you, in your mouth and in your heart” (30:11–14), sets “life and death, blessing and curse” before them, calls heaven and earth as witnesses, and urges “choose life” (30:19). The book is not naively optimistic: 30:1–10 already imagines exile and return. Moses then commissions Joshua (31:1–8), the book is placed beside the ark (31:24–26), and chapter 34 ends with Moses on Mount Nebo, shown the land he will not enter.','Read 30:15–20 as a decision speech. What are the two paths, what does each cost, and which words make the choice feel immediate?',9,'Paul quotes 30:12–14 in Romans 10:6–8, and Joshua 1:6–9 repeats “be strong and courageous” from the handoff in 31:6–8.','Moses is told he will not enter (32:48–52; Numbers 20:12). Read what the text actually says about why, then ask what the ending says about leadership: the work outlasts the leader.']
      ],
      check: ['What is the purpose of remembering in Deuteronomy?',['To shape present love, gratitude, teaching, and faithfulness','To replace action with nostalgia','To claim the wilderness had no failures'],'To shape present love, gratitude, teaching, and faithfulness','Moses retells the past so a new generation can live faithfully in the future.'],
      reflect: 'Write a four-part “remember” statement: what happened, what it reveals about God, what danger forgetting creates, and one faithful practice for today.'
    },
    {
      id: 'jesus-ministry', code: '4D', stage: 'Stage 4 · Jesus & the Kingdom', grades: 'Grades 4–10', time: '60–80 minutes',
      title: 'Jesus’ Ministry: The Kingdom Arrives', lede: 'Trace Jesus’ baptism, temptation, calling, signs, conflicts, and announcement of God’s kingdom before Holy Week.',
      question: 'What does Jesus announce and embody when He says that God’s kingdom has drawn near?',
      scripture: 'Mark 1–4 · Luke 4:14–30 · Matthew 16:13–20',
      goals: ['Sequence the opening movement of Jesus’ public ministry: baptism, wilderness, announcement, calling, a day in Capernaum, growing conflict, and the question at Caesarea Philippi.', 'Compare teaching, healing, exorcism, meals, and calls to discipleship as signs that God’s kingdom has drawn near (Mark 1:15).', 'Notice how each scene raises the Gospels’ central question, “Who is this?” (Mark 1:27; 4:41; 8:29).', 'Read Gospel scenes in context without collapsing the distinct emphases of Mark, Luke, and Matthew.'],
      lenses: [['Baptism & wilderness','The beloved Son','Mark 1:9–13 is compressed: the heavens are torn open, the Spirit descends, and the Father says, “You are my beloved Son; with you I am well pleased.” Identity is given before any miracle or sermon. The same Spirit then sends Jesus into the wilderness for forty days, a number that recalls Israel’s forty years. Matthew 4 and Luke 4 add the three temptations, each answered from Deuteronomy.','Ask what Jesus is given before He does anything, and why the temptations are about the kind of Son He will be.', 0, "Compare the voice at baptism with the voice in Mark 9:7.", "What happens before Jesus announces the kingdom in Mark 1:14–15?"],['Announcement','Good news for the poor','Mark 1:14–15 gives the headline: “The time is fulfilled, and the kingdom of God is at hand; repent and believe in the gospel.” In Luke 4:16–21 Jesus reads from Isaiah in Nazareth’s synagogue (good news to the poor, release, sight, liberty) and says, “Today this Scripture has been fulfilled in your hearing.” The hometown first admires Him, then turns furious when He points to Elijah and Naaman: God’s favor also reached outsiders (4:22–30).','Compare the synagogue’s first reaction with its last. What did Jesus say in between?', 1, "Compare Luke 4:18–19 with Isaiah 61:1–2 and notice Luke’s emphasis on fulfillment.", "What does Jesus say is fulfilled “today”?"],['Signs & authority','Restoration and the question “Who is this?”','Mark 1:21–45 follows one day in Capernaum and its aftermath: teaching “with authority,” an unclean spirit silenced, Peter’s mother-in-law raised up, crowds at the door, and a leper touched and cleansed. In Mark 2:1–12 a paralyzed man is lowered through a roof and Jesus forgives before He heals; the scribes object, and conflict builds through 3:6. In 4:35–41 the wind obeys Him and the disciples ask, “Who then is this?”','Do not treat miracles as detachable tricks. For each sign ask who is restored, who objects, and what question it raises about Jesus.', 4, "Compare the scribes’ objection here with their question about Levi’s meal in Mark 2:16.", "Why does Jesus tell the man to rise?"],['Discipleship','A new community and its cost','Jesus calls fishermen to follow Him (Mark 1:16–20), then eats with tax collectors and sinners in Levi’s house: “I came not to call the righteous, but sinners” (2:13–17). At Caesarea Philippi He asks, “Who do you say that I am?” and Peter answers, “You are the Christ” (Matthew 16:13–20; Mark 8:27–30). Mark adds at once that following Him means taking up a cross (8:31–38). Christian traditions read “on this rock” in Matthew 16:18 differently, so read the verse closely and note where readers diverge.','Track both welcome and cost: who is invited, and what is asked of them?', 8, "Read Mark 8:34–38 alongside the call to the fishermen in Mark 1:16–20.", "What follows Peter’s confession in Mark?"]],
      check: ['What belongs together in Jesus’ ministry?',['Announcement of the kingdom, restoration, teaching, and a call to follow','Only private moral advice with no public setting','A sequence that begins after the resurrection'],'Announcement of the kingdom, restoration, teaching, and a call to follow','The Gospels present Jesus’ words and works together as the kingdom’s arrival and an invitation to discipleship.'],
      reflect: 'Choose one scene before Holy Week. Identify the need, Jesus’ action or word, the response (welcome, wonder, or opposition), and what it reveals about the kingdom. Then name the question the scene raises: “Who is this?”'
    },
    { id: 'psalms', title: 'Psalms: The Honesty and Beauty of Prayer' },
    {
      id: 'joshua-to-david', code: '3J', stage: 'Stage 3 · Israel, Covenant & Prophets', grades: 'Grades 5–10', time: '55–75 minutes',
      title: 'Joshua to David: Land, Judges & Kings', lede: 'Bridge the story from Joshua’s settlement through Judges, Samuel, Saul, David, and the covenant hope of a king.',
      question: 'Why does Israel’s movement from land to monarchy create both hope and danger?',
      scripture: 'Joshua 1 · Judges 2 · 1 Samuel 8 · 2 Samuel 7',
      goals: ['Place settlement, tribal instability, judges, Saul, and David in sequence, and note the anchor points of covenant renewal at Shechem (Joshua 24) and the promise to David (2 Samuel 7).', 'Distinguish the Bible’s theological pattern from a simplistic “good times/bad times” cycle.', 'Explain both the promise and the risk in Israel’s request for a king.'],
      lenses: [['Joshua','A land received','Joshua frames courage, inheritance, memory, and covenant faithfulness after Moses.','Read conquest and settlement with attention to the text’s own claims and limits.', 0, "Compare Joshua’s commission with the public handover in Numbers 27:18–23.", "What is Joshua told to keep close at hand?"],['Judges','A fractured cycle','Judges repeats crisis, crying out, deliverance, and relapse while showing local variation and moral deterioration. Deborah, Gideon, and Samson show very different leaders; the last chapters end in violence, and Ruth shows quiet faithfulness in the same era.','Do not treat “everyone did what was right in his own eyes” (21:25) as a compliment. Notice who is missing: a faithful king.', 2, "Compare Judges 2:10 with Joshua’s call to remember and serve in Joshua 24:14–18.", "What changes after Joshua’s generation dies?"],['Samuel','A king requested','Israel asks for a king like the nations; the request addresses real insecurity but also reveals misplaced trust.','Hold together God’s warning and God’s continued purpose.', 5, "Compare Israel’s request for a king in 1 Samuel 8 with Gideon’s refusal to rule in Judges 8:22–23.", "Which powers does Samuel say a king will claim?"],['David','Promise and failure','David is anointed, defeats Goliath, becomes king, and receives God’s promise of a lasting house (2 Samuel 7), yet his household and kingdom remain morally complicated (2 Samuel 11–12). Later writers hang messianic hope on this promise.','Distinguish promise from approval of every royal action. Compare Psalm 51 with 2 Samuel 12.', 8, "Compare the house promised to David with the house his son will build in 2 Samuel 7:11–13.", "What two meanings of house matter in the promise?"]],
      check: ['What tension does 1 Samuel 8 create?',['A king can provide order, yet imitation of the nations can distort trust and justice','Israel has no need for leadership at all','David is already king before Saul'],'A king can provide order, yet imitation of the nations can distort trust and justice','The narrative neither romanticizes leaderlessness nor treats monarchy as an uncomplicated solution.'],
      reflect: 'Make a four-column comparison of Joshua, a judge, Saul, and David: calling, leadership strength, failure, and consequence.'
    },
    {
      id: 'epistles', code: '5C', stage: 'Stage 5 · The Church Goes to the Nations', grades: 'Grades 6–12', time: '55–75 minutes',
      title: 'The Epistles: Gospel Communities in Practice', lede: 'Read the New Testament letters as situated teaching for real congregations facing conflict, identity, worship, justice, and hope.',
      question: 'How do the epistles move from the gospel’s announcement to the daily life of diverse communities?',
      scripture: 'Romans 1:16–17 · 1 Corinthians 12–13 · Galatians 3:26–29 · Ephesians 2:11–22',
      goals: ['Identify sender, audience, occasion, argument, and practical response in a letter.', 'Compare how several epistles address unity, gifts, freedom, holiness, and hope.', 'Apply a letter’s reasoning without lifting a sentence out of its situation.'],
      lenses: [['Situation','Why was this written?','Letters answer concrete questions in named communities; the occasion shapes the argument.','Look for conflict, confusion, suffering, or a practical decision.'],['Gospel','What has changed?','Romans, Galatians, and Ephesians connect grace and faith with a new people formed in Christ.','Keep justification, reconciliation, freedom, and identity in each letter’s own frame.'],['Community','How do people belong?','First Corinthians uses the body metaphor to challenge status competition and place love at the center of gifted life.','Difference is not the same as superiority.'],['Practice','What now follows?','Epistles move from theological claims toward speech, money, sexuality, power, worship, work, forgiveness, and hope.','Name the reasoning that connects belief to practice.']],
      check: ['What is a responsible first step when reading an epistle?',['Identify its audience, occasion, and argument before applying a sentence','Treat every sentence as a free-floating slogan','Assume all churches faced exactly the same problem'],'Identify its audience, occasion, and argument before applying a sentence','Context reveals what the writer is addressing and how the local instruction fits the letter’s larger gospel reasoning.'],
      reflect: 'Choose one passage. Write its situation, main claim, supporting reason, community practice, and one modern application that respects the context.'
    },
    { id: 'revelation', title: 'Revelation' }
  ];

  var storyAnchors = [
    { id: 'creation', label: 'Creation', short: 'God creates', testament: 'Old Testament' },
    { id: 'fall', label: 'Fall', short: 'Sin fractures', testament: 'Old Testament' },
    { id: 'covenant', label: 'Covenant', short: 'God promises', testament: 'Old Testament' },
    { id: 'exodus', label: 'Exodus', short: 'God rescues', testament: 'Old Testament' },
    { id: 'kingdom', label: 'Kingdom', short: 'God reigns', testament: 'Old Testament' },
    { id: 'exile', label: 'Exile & return', short: 'Hope remains', testament: 'Old Testament' },
    { id: 'jesus', label: 'Jesus', short: 'The King comes', testament: 'New Testament' },
    { id: 'church', label: 'Church', short: 'The good news goes', testament: 'New Testament' },
    { id: 'new-creation', label: 'New creation', short: 'God dwells with us', testament: 'New Testament' }
  ];

  var lessonStoryContext = {
    'world-of-the-bible': {
      focus: storyAnchors.map(function (anchor) { return anchor.id; }),
      bigIdea: 'The Bible is a library of many books that together tell one unfolding story of God, His world, and His people.',
      before: 'Creation opens the story and the fall creates the conflict: humanity is separated from God and one another.',
      now: 'Follow the promises, places, kingdoms, and turning points that hold the whole biblical story together.',
      next: 'Each later lesson zooms in on one part of this map without losing sight of the whole.'
    },
    'how-the-bible-reached-us': {
      focus: storyAnchors.map(function (anchor) { return anchor.id; }),
      bigIdea: 'God’s word came through real authors, communities, manuscripts, and languages—and can be studied with both confidence and care.',
      before: 'The events and teaching of Scripture took place in history before they were collected in the Bible we hold.',
      now: 'See how writing, copying, canon recognition, printing, and translation are related but different.',
      next: 'A clearer view of transmission helps us slow down, compare responsibly, and read every lesson’s passages well.'
    },
    'the-tabernacle': {
      focus: ['fall', 'covenant', 'exodus'],
      bigIdea: 'The Tabernacle shows God graciously dwelling among the people He rescued while providing a holy way to approach Him.',
      before: 'Humanity loses open access to God’s presence; God then makes covenant promises and rescues Israel from Egypt.',
      now: 'God places His sanctuary in Israel’s camp, with sacrifice, cleansing, priesthood, and ordered access.',
      next: 'The Temple continues this presence theme, and Hebrews connects the sanctuary’s worship to Christ’s priestly work.'
    },
    'temple-and-gods-presence': {
      focus: ['creation', 'fall', 'exodus', 'kingdom', 'jesus', 'church', 'new-creation'],
      bigIdea: 'From Eden to new creation, Scripture moves toward God dwelling with His people in holiness, life, and peace.',
      before: 'Presence is lost in Eden, then graciously pictured among Israel in the Tabernacle.',
      now: 'The Temple gathers themes of sacred space, sacrifice, priesthood, kingship, and God’s name among His people.',
      next: 'The New Testament centers God’s presence in Christ, extends it through the Spirit-filled Church, and completes it in new creation.'
    },
    'kingdoms-prophets-exile': {
      focus: ['covenant', 'kingdom', 'exile'],
      bigIdea: 'Israel’s kings fail, the prophets call the people back to covenant faithfulness, and judgment does not erase God’s promises.',
      before: 'God rescues Israel, gives the covenant, settles the people in the land, and establishes the monarchy.',
      now: 'The kingdom divides; Assyria and Babylon bring exile; prophets explain the crisis and announce hope.',
      next: 'Return from exile is real but incomplete, intensifying the hope for a faithful King and lasting restoration.'
    },
    'feasts-of-israel': {
      focus: ['covenant', 'exodus', 'kingdom'],
      bigIdea: 'Israel’s calendar turns God’s rescue and provision into shared memory practiced with the body, the land, and the community.',
      before: 'God rescues Israel from Egypt and forms a covenant people who live by His provision.',
      now: 'Passover, Weeks, Atonement, Booths, and other appointed times teach Israel to remember and worship.',
      next: 'The Gospels and early Church unfold within this festival world, so the calendar clarifies many later scenes and themes.'
    },
    'elijah': {
      focus: ['covenant', 'kingdom'],
      bigIdea: 'Elijah confronts Israel’s compromised worship of Baal and calls a divided kingdom back to covenant loyalty to the living God.',
      before: 'After Solomon, the kingdom divides, and Israel’s kings—especially Ahab, married to the Phoenician princess Jezebel—promote the worship of Baal alongside or instead of the Lord.',
      now: 'Elijah announces drought, is fed by ravens and a foreign widow, defeats the prophets of Baal on Carmel, and meets God in a quiet voice at Horeb.',
      next: 'Elisha continues a prophetic ministry after Elijah, and later prophets keep calling divided, exiled, and returning Israel back to covenant faithfulness.'
    },
    'world-of-jesus': {
      focus: ['exile', 'jesus'],
      bigIdea: 'Jesus enters Israel’s long story in real villages, contested regions, crowded roads, and a land ruled by Rome.',
      before: 'Israel returns from exile but still waits under foreign empires for the fullness of God’s kingdom promises.',
      now: 'Jesus announces the kingdom through His teaching, actions, journeys, relationships, and confrontations.',
      next: 'The parables explain the kingdom’s surprising character, and Holy Week reveals the decisive shape of Jesus’ mission.'
    },
    'jesus-parables-lab': {
      focus: ['kingdom', 'jesus'],
      bigIdea: 'Jesus’ parables reveal God’s kingdom by surprising hearers, overturning expectations, and calling for a response.',
      before: 'Israel’s Scriptures create the images, hopes, conflicts, and kingdom expectations Jesus’ hearers bring to His stories.',
      now: 'Read each parable inside its Gospel setting: audience, question, expected turn, surprise, and invitation.',
      next: 'Jesus’ death and resurrection become the center from which His kingdom teaching and the Church’s mission are understood.'
    },
    'holy-week': {
      focus: ['covenant', 'kingdom', 'jesus'],
      bigIdea: 'The four Gospels present Jesus’ death and resurrection as the climax of His mission and the turning point of the biblical story.',
      before: 'Covenant, sacrifice, kingship, prophecy, Temple, and Passover all form the Scriptural horizon of Jesus’ final week.',
      now: 'Jesus enters Jerusalem, teaches, shares the supper, is crucified and buried, and rises from the dead.',
      next: 'The risen Jesus commissions witnesses; Acts follows the Spirit-empowered good news from Jerusalem toward the nations.'
    },
    'acts-jerusalem-to-nations': {
      focus: ['jesus', 'church'],
      bigIdea: 'The risen Jesus continues His mission through the Holy Spirit as a diverse Church carries the good news outward.',
      before: 'Jesus announces the kingdom, dies, rises, teaches His disciples, and promises the Holy Spirit.',
      now: 'Witness spreads from Jerusalem through Judea and Samaria and across cultural boundaries toward the nations.',
      next: 'Paul’s journeys show this widening mission at city scale as churches form, face pressure, and receive letters.'
    },
    'pauls-missionary-journeys': {
      focus: ['jesus', 'church'],
      bigIdea: 'Paul’s journeys connect the message of Jesus with real cities, cultures, conflicts, friendships, and emerging churches.',
      before: 'Acts begins in Jerusalem and shows the gospel crossing geographic, ethnic, and social boundaries.',
      now: 'Trace routes, companions, opposition, local responses, and the patient work of strengthening new communities.',
      next: 'The New Testament letters speak into the life of these churches as they learn faithful belief, worship, unity, and practice.'
    },
    'genesis': {
      focus: ['creation', 'fall', 'covenant', 'exodus'],
      bigIdea: 'Genesis tells how a good creation was fractured and how God answers, not by abandoning the world, but by promising to bless every family on earth through one chosen family.',
      before: 'Nothing comes before Genesis: it is the opening of the Bible and of the story of God, humanity, and the world.',
      now: 'Creation gives way to fall, flood, and Babel; God then calls Abram, preserves the family through failure, and moves Joseph and his brothers to Egypt.',
      next: 'Exodus begins where Genesis ends: Jacob’s family in Egypt, growing into a people that God rescues and makes His covenant partner.'
    },
    'exodus': {
      focus: ['covenant', 'exodus', 'kingdom', 'jesus', 'new-creation'],
      bigIdea: 'God hears the cry of enslaved Israel, rescues them from Pharaoh, and binds them to Himself at Sinai, so that rescue becomes covenant and a freed people become His treasured possession.',
      before: 'Genesis ends with Jacob’s family in Egypt, bearing God’s promise to Abraham but now growing into a people the next king does not remember.',
      now: 'Israel is enslaved, Moses is called at the bush, the plagues and Passover break Pharaoh’s grip, the sea is crossed, and Sinai makes Israel a covenant people.',
      next: 'The Tabernacle shows God dwelling among the people He rescued; later, the prophets, Jesus, and Revelation reuse Exodus images of Passover, sea, and song.'
    },
    'joshua-to-david': {
      focus: ['covenant', 'exodus', 'kingdom', 'exile', 'jesus'],
      bigIdea: 'Israel enters the promised land, struggles to remain faithful without a king, asks for one, and receives a flawed king followed by David, to whom God promises a lasting house.',
      before: 'God rescued Israel at the exodus, gave covenant at Sinai, and kept them forty years in the wilderness; Moses dies at the Jordan with the promised land in view.',
      now: 'Joshua leads the settlement, Judges shows a repeating cycle of failure and rescue, Samuel anoints Saul and then David, and 2 Samuel 7 places a covenant promise inside the monarchy.',
      next: 'The kingdoms divide, prophets confront kings, exile follows, and the hope of a son of David reaches the New Testament in Jesus.'
    },
    'job': {
      focus: ['fall', 'covenant', 'kingdom', 'jesus'],
      bigIdea: 'Job gives faithful speech room for grief, protest, silence, and wonder while refusing easy explanations for another person’s suffering.',
      before: 'Wisdom literature asks how to live well before God, while the Bible’s story also contains a world marked by death, injustice, and human limits.',
      now: 'Job loses what he loves, rejects simplistic explanations from his friends, speaks honestly to God, and encounters God without receiving a tidy cause for every wound.',
      next: 'Jesus does not make suffering easy, but the Gospels show God entering human grief; the Church learns to lament, accompany the suffering, and hope for resurrection.'
    },
    'jesus-ministry': {
      focus: ['covenant', 'kingdom', 'exile', 'jesus'],
      bigIdea: 'Jesus announces that Israel’s long-promised kingdom of God has drawn near, and He shows what it looks like by teaching, restoring people, welcoming sinners, and calling followers.',
      before: 'After exile and return, Israel still lived under foreign rule and waited for God to keep His covenant promises, fulfill the prophets, and reign.',
      now: 'Jesus is baptized, tested in the wilderness, announces the kingdom, calls disciples, heals and teaches, meets opposition, and is confessed as the Christ.',
      next: 'The road turns toward Jerusalem and the cross: Holy Week, the resurrection, and the mission of the Church to the nations.'
    },
    'leviticus': {
      focus: ['creation', 'exodus', 'covenant', 'kingdom'],
      bigIdea: 'Leviticus answers the question raised by Exodus: how can the holy God who fills the Tabernacle remain among a vulnerable, imperfect people?',
      before: 'God rescues Israel from slavery, makes covenant at Sinai, and fills the completed Tabernacle with His presence.',
      now: 'Offerings, priests, purity practices, atonement, festivals, justice, and neighbor-love give worship and community life an ordered shape.',
      next: 'Numbers takes the sanctuary-centered camp into the wilderness, where trust and covenant loyalty are tested.'
    },
    'numbers': {
      focus: ['exodus', 'covenant', 'kingdom'],
      bigIdea: 'Numbers follows a sanctuary-centered people whose fear and rebellion bring real consequences without canceling God’s purpose for a new generation.',
      before: 'Exodus and Leviticus form Israel around rescue, covenant, worship, holiness, and God’s presence at the center of the camp.',
      now: 'Israel journeys from Sinai toward the land, but complaint, rivalry, and fear expose mistrust; the book closes by preparing a new generation.',
      next: 'On the plains of Moab, Deuteronomy asks that new generation to remember, love, teach, and choose life before Joshua leads them onward.'
    },
    'deuteronomy': {
      focus: ['exodus', 'covenant', 'kingdom'],
      bigIdea: 'Deuteronomy is a covenant-renewal ceremony: Moses retells rescue and wilderness failure so a new generation will love, teach, practice justice, limit power, and choose life.',
      before: 'The Exodus generation receives covenant instruction but fails repeatedly in the wilderness; their children now stand east of the Jordan.',
      now: 'Moses retells the journey and law in farewell speeches, placing memory and love at the heart of the generation’s future.',
      next: 'Moses dies, Joshua receives leadership, and the story moves across the Jordan into land, judges, kings, and prophets.'
    },
    'sermon-on-the-mount': {
      focus: ['kingdom', 'jesus', 'church'],
      bigIdea: 'Jesus describes kingdom life that reaches beneath visible behavior to motives, trust, relationships, and practiced obedience.',
      before: 'Israel’s law, prophets, wisdom, and kingdom hope form the world in which Jesus addresses His disciples.',
      now: 'The King teaches a community about blessing, reconciliation, enemy love, prayer, treasure, trust, and faithful action.',
      next: 'Disciples carry Jesus’ teaching into the life and mission of the Church while awaiting the kingdom’s complete renewal.'
    }
  };

  var lessonPassages = {
    'world-of-the-bible': [['Genesis',12,1,9],['Joshua',1,1,9],['Luke',3,1,2],['Acts',17,24,28], ['Genesis',46,1,7], ['2 Kings',25,8,12], ['Ezra',1,1,4], ['Luke',2,1,7],['2 Kings',18,13,17]],
    'how-the-bible-reached-us': [['Deuteronomy',31,24,26],['Luke',1,1,4],['2 Timothy',3,14,17],['2 Peter',1,19,21]],
    'the-tabernacle': [['Exodus',25,1,9],['Exodus',40,34,38],['Leviticus',16,29,34],['Hebrews',9,1,12]],
    'temple-and-gods-presence': [['Genesis',3,22,24],['1 Kings',8,22,30],['John',1,14,18],['1 Corinthians',3,16,17],['Revelation',21,22,27], ['Exodus',40,34,38], ['Revelation',22,1,5], ['John',2,13,22], ['Mark',11,15,19]],
    'kingdoms-prophets-exile': [['1 Samuel',8,4,9],['1 Kings',12,16,20],['2 Kings',17,6,18],['2 Kings',25,8,12],['Ezra',1,1,4]],
    'feasts-of-israel': [['Exodus',12,1,14],['Leviticus',23,4,8],['Leviticus',23,15,22],['Leviticus',23,23,25],['Leviticus',16,29,34],['Leviticus',23,33,43],['Nehemiah',8,13,18],['Deuteronomy',16,16,17],['Acts',2,1,13]],
    'elijah': [['1 Kings',17,1,16],['1 Kings',18,20,39],['1 Kings',19,9,18],['2 Kings',2,9,12], ['1 Kings',17,17,24], ['1 Kings',19,1,8], ['1 Kings',21,1,16], ['Luke',4,24,27]],
    'world-of-jesus': [['Matthew',4,12,17],['Luke',4,16,21],['Luke',9,51,56],['John',4,4,10],['John',4,39,42], ['Mark',11,27,33], ['Luke',23,1,4], ['Luke',19,28,40]],
    'jesus-parables-lab': [['Matthew',13,1,9],['Matthew',13,31,33],['Luke',10,25,37],['Luke',15,11,24]],
    'holy-week': [['Matthew',21,1,11],['Zechariah',9,9,10],['Mark',14,22,26],['John',13,1,17],['Mark',14,32,50],['John',18,33,38],['Luke',23,32,49],['Mark',15,42,47],['John',20,1,18]],
    'acts-jerusalem-to-nations': [['Acts',1,6,11],['Acts',2,1,12],['Acts',8,26,40],['Acts',10,34,48],['Acts',13,1,3]],
    'pauls-missionary-journeys': [['Acts',13,1,12],['Acts',16,6,15],['Acts',17,16,34],['Acts',20,17,24],['Romans',1,1,7]],
    'job': [['Job',1,1,22],['Job',2,1,13],['Job',3,1,26],['Job',38,1,18],['Job',42,1,17], ['Job',4,1,11], ['Job',22,1,11], ['Job',31,1,10], ['Job',40,1,8], ['Job',42,1,7]],
    'sermon-on-the-mount': [['Matthew',5,1,12],['Matthew',5,13,20],['Matthew',5,21,26],['Matthew',5,38,48],['Matthew',6,1,18],['Matthew',6,19,34],['Matthew',7,1,12],['Matthew',7,13,23],['Matthew',7,24,29]],
    'genesis': [['Genesis',1,1,5],['Genesis',1,26,31],['Genesis',3,1,15],['Genesis',9,8,17],['Genesis',11,1,9],['Genesis',12,1,9],['Genesis',15,1,6],['Genesis',37,1,11],['Genesis',50,15,21], ['Genesis',2,4,17], ['Genesis',3,22,24], ['Genesis',46,1,7]],
    'exodus': [['Exodus',1,8,14],['Exodus',2,23,25],['Exodus',3,1,15],['Exodus',12,1,14],['Exodus',14,21,31],['Exodus',15,1,13],['Exodus',19,1,8],['Exodus',20,1,17],['Exodus',25,8,9], ['Exodus',12,24,28], ['Exodus',8,12,15], ['Exodus',9,8,12]],
    'leviticus': [['Leviticus',1,1,9],['Leviticus',16,1,10],['Leviticus',19,1,18],['Leviticus',19,32,37],['Leviticus',23,1,8],['Leviticus',25,1,17], ['Leviticus',15,16,18], ['Leviticus',16,15,22], ['Leviticus',25,35,43]],
    'numbers': [['Numbers',1,1,4],['Numbers',2,1,9],['Numbers',11,1,15],['Numbers',13,25,33],['Numbers',14,1,24],['Numbers',21,4,9],['Numbers',27,12,23], ['Numbers',20,1,13], ['Numbers',26,63,65], ['Numbers',10,11,14]],
    'deuteronomy': [['Deuteronomy',1,1,8],['Deuteronomy',5,1,21],['Deuteronomy',6,1,9],['Deuteronomy',8,1,18],['Deuteronomy',10,12,22],['Deuteronomy',15,1,11],['Deuteronomy',17,14,20],['Deuteronomy',18,15,22],['Deuteronomy',26,1,11],['Deuteronomy',30,11,20],['Deuteronomy',31,1,8],['Deuteronomy',34,1,12]],
    'jesus-ministry': [['Mark',1,9,15],['Luke',4,16,30],['Mark',1,16,20],['Mark',1,21,34],['Mark',2,1,12],['Mark',2,13,17],['Mark',4,35,41],['Matthew',16,13,20],['Mark',8,27,38], ['Matthew',4,1,11], ['Isaiah',61,1,3], ['Mark',9,2,8]],
    'joshua-to-david': [['Joshua',1,1,9],['Joshua',24,14,28],['Judges',2,6,23],['Judges',21,25,25],['Ruth',1,16,17],['1 Samuel',8,4,22],['1 Samuel',16,1,13],['1 Samuel',17,45,47],['2 Samuel',7,8,17], ['Ruth',4,13,22], ['2 Samuel',7,18,29]],
    'epistles': [['Romans',1,1,17],['1 Corinthians',12,12,27],['1 Corinthians',13,1,13],['Galatians',3,26,29],['Ephesians',2,11,22]]

  };

  var bibleLanguages = [
    { id: 'en', name: 'English', versions: [
      { id: 'local-bsb', name: 'Berean Standard Bible', short: 'BSB', license: 'Public domain', local: 'bsb' },
      { id: 'en-webbe', name: 'World English Bible (British)', short: 'WEBBE', license: 'Public domain' },
      { id: 'en-kjv', name: 'King James Version', short: 'KJV', license: 'Public domain' },
      { id: 'en-asv', name: 'American Standard Version', short: 'ASV', license: 'Public domain' }
    ]},
    { id: 'es', name: 'Español', versions: [{ id: 'es-rv09', name: 'Reina-Valera 1909', short: 'RV09', license: 'Public-domain edition' }]},
    { id: 'de', name: 'Deutsch', versions: [{ id: 'de-tkw', name: 'Textbibel', short: 'TKW', license: 'Public domain' }]},
    { id: 'pt-BR', name: 'Português', versions: [{ id: 'pt-BR-blt', name: 'Bíblia Livre', short: 'BLT', license: 'Open text; see source metadata' }]},
    { id: 'cmn-Hans-CN', name: '简体中文', versions: [{ id: 'cmn-Hans-CN-feb', name: 'February Bible', short: 'FEB', license: 'See source metadata' }]},
    { id: 'arb', name: 'العربية', rtl: true, versions: [{ id: 'arb-kehm', name: 'Ketab El Hayat', short: 'KEHM', license: 'See source metadata' }]},
    { id: 'he', name: 'עברית', rtl: true, versions: [{ id: 'he-wlc', name: 'Westminster Leningrad Codex', short: 'WLC', license: 'Open Hebrew text; Old Testament only' }]},
    { id: 'grc', name: 'Ελληνικά', versions: [
      { id: 'grc-grcbrent', name: 'Septuagint (Brenton)', short: 'LXX', license: 'Public-domain edition; Old Testament only', testament: 'ot' },
      { id: 'grc-byz1904', name: 'Byzantine Text 1904', short: 'BYZ', license: 'Public-domain edition; New Testament only', testament: 'nt' }
    ]}
  ];

  var localizedBooks = {
    es: {'Genesis':'génesis','Exodus':'éxodo','Leviticus':'levítico','Deuteronomy':'deuteronomio','Joshua':'josué','1 Samuel':'1samuel','1 Kings':'1reyes','2 Kings':'2reyes','Ezra':'esdras','Proverbs':'proverbios','Matthew':'sanmateo','Mark':'sanmarcos','Luke':'sanlucas','John':'sanjuan','Acts':'hechos','Romans':'romanos','1 Corinthians':'1corintios','2 Timothy':'2timoteo','Hebrews':'hebreos','2 Peter':'2pedro','Revelation':'apocalipsis'},
    de: {'Genesis':'1.mose','Exodus':'2.mose','Leviticus':'3.mose','Deuteronomy':'5.mose','Joshua':'josua','1 Samuel':'1.samuel','1 Kings':'1.könige','2 Kings':'2.könige','Ezra':'esra','Proverbs':'sprüche','Matthew':'matthäus','Mark':'markus','Luke':'lukas','John':'johannes','Acts':'apostelgeschichte','Romans':'römer','1 Corinthians':'1.korinther','2 Timothy':'2.timotheus','Hebrews':'hebräer','2 Peter':'2.petrus','Revelation':'offenbarung'},
    'pt-BR': {'Matthew':'mateus','Mark':'marcos','Luke':'lucas','John':'joão','Acts':'atos','Romans':'romanos','1 Corinthians':'1coríntios','2 Timothy':'2timóteo','Hebrews':'hebreus','2 Peter':'2pedro','Revelation':'apocalipse'},
    'cmn-Hans-CN': {'Matthew':'马太福音','Mark':'马克福音','Luke':'路加福音','John':'约翰福音','Acts':'使徒行传','Romans':'罗马书','1 Corinthians':'哥林多前书','2 Timothy':'提摩太后书','Hebrews':'希伯来书','2 Peter':'彼得后书','Revelation':'启示录'},
    arb: {'Genesis':'التكوين','Exodus':'الخروج','Leviticus':'اللاويين','Deuteronomy':'التثنية','Joshua':'يشوع','1 Samuel':'صموئيلالأول','1 Kings':'ملوكالأول','2 Kings':'ملوكالثاني','Ezra':'عزرا','Proverbs':'الأمثال','Matthew':'إنجيلمتى','Mark':'إنجيلمرقس','Luke':'إنجيللوقا','John':'إنجيليوحنا','Acts':'أعمال','Romans':'روما','1 Corinthians':'كورنثوسالأولى','2 Timothy':'تيموثاوسالثانية','Hebrews':'العبرانيين','2 Peter':'بطرسالثانية','Revelation':'رؤيايوحنا'},
    he: {},
    'grc-grcbrent': {'Genesis':'γενεσις','Exodus':'εξοδος','Leviticus':'λευιτικον','Deuteronomy':'δευτερονομιον','Joshua':'ιησους','1 Samuel':'βασιλειωνα','1 Kings':'βασιλειωνγ','2 Kings':'βασιλειωνδ','Ezra':'εσδρας','Proverbs':'παροιμιαι'},
    'grc-byz1904': {'Matthew':'καταματθαιον','Mark':'καταμαρκον','Luke':'καταλουκαν','John':'καταιωαννην','Acts':'πραξειςαποστολων','Romans':'προςρωμαιους','1 Corinthians':'προςκορινθιουςα΄','2 Timothy':'β΄προςτιμοθεον','Hebrews':'προςεβραιους','2 Peter':'β΄πετρου','Revelation':'αποκαλυψηιωαννου'}
  };

  var lessonImages = {
    'world-of-the-bible': {
      src: '../../assets/images/lessons/bible-pathway/a-general-map-of-bible-lands-5c99f1d.webp',
      page: 'https://commons.wikimedia.org/wiki/File:A_general_map_of_Bible_Lands.jpg',
      alt: 'Historic illustrated map of the lands surrounding the eastern Mediterranean and the biblical world',
      caption: 'A 1913 map gives a wide-angle view of the lands, seas, and travel corridors that frame the biblical story.',
      credit: 'Edwin Gardner / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'how-the-bible-reached-us': {
      src: '../../assets/images/lessons/bible-pathway/great-isaiah-scroll-27774b6.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Great_Isaiah_Scroll.jpg',
      alt: 'The Great Isaiah Scroll opened to show columns of handwritten Hebrew text',
      caption: 'The Great Isaiah Scroll is a manuscript witness from Qumran, copied more than a thousand years before the oldest complete Masoretic codices.',
      credit: 'Ardon Bar Hama / Israel Museum', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'the-tabernacle': {
      src: '../../assets/images/lessons/bible-pathway/bijbels-museum-detail-from-a-model-of-the-tabernacle-eeb4b13.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Bijbels_Museum-Detail_from_a_model_of_the_tabernacle.jpg',
      alt: 'Museum model showing the courtyard and tent of the biblical Tabernacle',
      caption: 'A museum model translates Exodus’s spatial description into a visible courtyard and tent. Models are interpretations and should be checked against the text.',
      credit: 'Yair Haklai', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    'temple-and-gods-presence': {
      src: '../../assets/images/lessons/bible-pathway/temple-of-solomon-model-33ad1d2.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Temple_of_Solomon_model.jpg',
      alt: 'Architectural model presenting one reconstruction of Solomon’s Temple',
      caption: 'One modern reconstruction of Solomon’s Temple helps students visualize sacred space while remembering that a model includes interpretive decisions.',
      credit: 'SalemOptix', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    'kingdoms-prophets-exile': {
      src: '../../assets/images/lessons/bible-pathway/judaean-people-are-being-deported-into-exile-after-t-3e8af7c.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Judaean_people_are_being_deported_into_exile_after_the_capture_of_Lachish.jpg',
      alt: 'Assyrian stone relief showing Judean captives deported after the capture of Lachish',
      caption: 'This Assyrian palace relief depicts Judeans leaving Lachish after its capture, giving material context to the empire’s warfare and deportation policy.',
      credit: 'Osama Shukir Muhammed Amin FRCP(Glasg)', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    'feasts-of-israel': {
      src: '../../assets/images/lessons/bible-pathway/feast-of-tabernacle-avram-s-booth-yehia-seated-in-do-0c7a019.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Feast_of_Tabernacle._Avram%27s_booth._Yehia_seated_in_door_of_tabernacle_booth_LOC_matpc.19879.jpg',
      alt: 'Historic photograph of a man seated in the doorway of a booth prepared for the Feast of Tabernacles',
      caption: 'A historic Jerusalem photograph shows an inhabited sukkah, an embodied practice of remembrance during the Feast of Booths.',
      credit: 'Matson Collection / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'elijah': {
      src: '../../assets/images/lessons/bible-pathway/along-the-sea-coast-elijah-s-spring-mount-carmel-loc-6d7741f.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Along_the_sea_coast._Elijah%27s_Spring,_Mount_Carmel_LOC_matpc.01205.jpg',
      alt: 'Historic photograph of springs and grazing goats near a site traditionally associated with Elijah on Mount Carmel',
      caption: 'A traditional site remembered as “Elijah’s Spring” near Mount Carmel, photographed around 1900. Local tradition preserves the memory; Scripture itself does not name this exact spot.',
      credit: 'Matson Collection / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'world-of-jesus': {
      src: '../../assets/images/lessons/bible-pathway/landscape-with-lake-kinnaret-sea-of-galilee-in-dista-5003792.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Landscape_with_Lake_Kinnaret_(Sea_of_Galilee)_in_Distance_-_From_Golan_Heights_(5710776912).jpg',
      alt: 'Landscape view across hills toward the Sea of Galilee',
      caption: 'The Sea of Galilee and its surrounding highlands show why boats, shorelines, slopes, and regional routes repeatedly shape Gospel scenes.',
      credit: 'Adam Jones', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/'
    },
    'jesus-parables-lab': {
      src: '../../assets/images/lessons/bible-pathway/lupinus-pilosus-with-mustard-plant-sinapis-in-the-ba-a2786cd.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Lupinus_pilosus_with_Mustard_plant_(Sinapis)_in_the_background.jpg',
      alt: 'Wildflowers and mustard plants growing in the Lower Galilee',
      caption: 'Mustard grows among other plants in the Lower Galilee. Jesus draws on familiar living things like seeds, fields, birds, and harvests to invite attentive hearing.',
      credit: 'Yuvalr', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    'holy-week': {
      src: '../../assets/images/lessons/bible-pathway/jerusalem-panorama-from-mount-of-olives-07112018-3e1d8a2.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Jerusalem_panorama_from_Mount_of_Olives_07112018.jpg',
      alt: 'Panoramic view of Jerusalem from the Mount of Olives',
      caption: 'Looking west from the Mount of Olives places the Temple Mount, eastern wall, valleys, and the city’s rising terrain in one geographic frame.',
      credit: 'Beko', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    'acts-jerusalem-to-nations': {
      src: '../../assets/images/lessons/bible-pathway/jerusalem-old-city-panorama-36a2cd8.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Jerusalem_old_city_panorama_.jpg',
      alt: 'Wide panorama of Jerusalem’s Old City and surrounding neighborhoods',
      caption: 'Acts begins in Jerusalem, but its witness moves outward through people, roads, households, ports, and cities across the Roman world.',
      credit: 'Nettadi', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    'pauls-missionary-journeys': {
      src: '../../assets/images/lessons/bible-pathway/roman-road-in-tarsus-mersin-province-545904e.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Roman_road_in_Tarsus,_Mersin_Province.jpg',
      alt: 'Excavated Roman road running through Tarsus in modern Turkey',
      caption: 'An excavated Roman road in Tarsus, Paul’s home city, makes the physical infrastructure of travel across the Roman world visible.',
      credit: 'Nedim Ardoğa', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    'job': {
      src: '../../assets/images/lessons/bible-pathway/job-and-his-daughters.webp',
      page: 'https://commons.wikimedia.org/wiki/File:William_Blake_-_Job_and_his_Daughters_-_WGA2229.jpg',
      alt: 'William Blake engraving of Job seated among his daughters',
      caption: 'Blake pictures Job with his daughters near the end of the book. Read Job 42:13–15 to see which details the text names and what the artist supplies.',
      credit: 'William Blake, Job and His Daughters', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'genesis': {
      src: '../../assets/images/lessons/bible-pathway/001-the-creation-of-light-0d18b7a.webp',
      page: 'https://commons.wikimedia.org/wiki/File:001.The_Creation_of_Light.jpg',
      alt: 'Engraving of a figure rising above darkness as rays of light break across the waters',
      caption: 'Gustave Doré pictures Genesis 1:3, “Let there be light.” It is a nineteenth-century artistic interpretation. Compare its drama with the text’s calm, repeated pattern of speaking, separating, naming, and calling good.',
      credit: 'Gustave Doré, 1866', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'exodus': {
      src: '../../assets/images/lessons/bible-pathway/mount-sinai-bw-4-e1fcfe2.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Mount_Sinai_BW_4.jpg',
      alt: 'Rugged granite peaks and a dry valley on the Sinai Peninsula on the way to Jebel Musa',
      caption: 'The granite wilderness of the southern Sinai Peninsula, on the way to Jebel Musa, the traditional Mount Sinai. The mountain’s identity is debated, but the biblical story places Israel’s covenant in a wilderness like this one.',
      credit: 'Berthold Werner', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    'joshua-to-david': {
      src: '../../assets/images/lessons/bible-pathway/felix-joseph-barrias-anointing-of-david-by-samuel-8ba6e6d.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Felix-Joseph_Barrias_-_Anointing_of_David_by_Samuel.jpg',
      alt: 'Nineteenth-century painting of the prophet Samuel anointing the young David with oil before his brothers',
      caption: 'Barrias pictures Samuel anointing David in front of his brothers (1 Samuel 16:1–13). It is a nineteenth-century interpretation. Notice how the text stresses that God looks at the heart, not at height or appearance.',
      credit: 'Félix-Joseph Barrias', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'jesus-ministry': {
      src: '../../assets/images/lessons/bible-pathway/rembrandt-christ-in-the-storm-on-the-lake-of-galilee-fd68b92.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Rembrandt_Christ_in_the_Storm_on_the_Lake_of_Galilee.jpg',
      alt: 'Rembrandt painting of a small fishing boat tossed by large waves while frightened disciples struggle with the sails and Jesus is at the stern',
      caption: 'Rembrandt’s 1633 painting of Mark 4:35–41 catches the moment before the disciples ask, “Who then is this, that even the wind and the sea obey him?” It is an artist’s interpretation, not an eyewitness record.',
      credit: 'Rembrandt van Rijn, 1633', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'sermon-on-the-mount': {
      src: '../../assets/images/lessons/bible-pathway/view-from-the-mount-of-beatitudes-7723721162-e564698.webp',
      page: 'https://commons.wikimedia.org/wiki/File:VIEW_FROM_THE_MOUNT_OF_BEATITUDES_(7723721162).jpg',
      alt: 'View across the green slopes toward the Sea of Galilee from the traditional Mount of Beatitudes',
      caption: 'The traditional Mount of Beatitudes overlooks the Sea of Galilee. The exact setting of the sermon is not identified with certainty in Matthew.',
      credit: 'israeltourism', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/'
    }
  };

  lessonImages.deuteronomy = {
    src: '../../assets/images/lessons/bible-pathway/view-from-mount-nebo-2007-05-830-1330159327-a908ad0.webp',
    page: 'https://commons.wikimedia.org/wiki/File:View_from_Mount_Nebo_(2007-05-830)_(1330159327).jpg',
    alt: 'Hazy view from the ridge of Mount Nebo in Jordan across the Jordan Valley toward the land west of the river',
    caption: 'The view from Mount Nebo toward the land west of the Jordan. Deuteronomy 34 says Moses was shown the land from here and did not enter it. This modern photograph orients the setting; it does not prove which viewpoint the text means.',
    credit: 'Vyacheslav Argenberg', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/'
  };

  var lessonVisualJourneys = {
    'deuteronomy': [
      {
        title: 'East of the Jordan',
        note: 'Moses speaks on the plains of Moab and the book ends on Mount Nebo. Compare the landscape with the text, then compare an artist’s ending with Deuteronomy 34.',
        items: [
          {
            title: 'The Jordan Valley from Mount Nebo', kind: 'Photograph · Jordan · Deuteronomy 34:1–4',
            src: '../../assets/images/lessons/bible-pathway/overhead-view-from-mount-nebo-of-the-dead-sea-and-jo-2ad3861.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Overhead_view_from_Mount_Nebo_of_the_Dead_Sea_and_Jordan_Valley_area.jpg',
            alt: 'Wide panorama from Mount Nebo showing the Dead Sea at left and the Jordan Valley stretching toward Jericho',
            caption: 'From Nebo the Dead Sea, the Jordan Valley, and the Jericho area lie in one frame. Deuteronomy 34:1–3 lists the regions the Lord showed Moses; trace how many you can place in this view.',
            credit: 'Mohammad hajeer', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
          },
          {
            title: 'The Testament and Death of Moses', kind: 'Fresco · Luca Signorelli · Deuteronomy 31–34',
            src: '../../assets/images/lessons/bible-pathway/signorelli-luca-moses-s-testament-and-death-1481-82-3bbe48f.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Signorelli,_Luca_-_Moses%27s_Testament_and_Death_-_1481-82.jpg',
            alt: 'Renaissance fresco in which Moses addresses the people, hands over a staff, and is shown dying, in one crowded landscape',
            caption: 'Signorelli, painting in the Sistine Chapel in 1481–82, puts several moments from the book’s ending into one scene, including the handoff and Moses’ death. Deuteronomy 34:6 adds that no one knows his burial place. Which moment can you find, and what did the artist choose to leave out?',
            credit: 'Luca Signorelli, 1482', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Words that were kept and practiced',
        note: 'The Shema was copied, recited, and bound on the body long before it reached us. Weigh a manuscript against a later practice.',
        items: [
          {
            title: 'The Nash Papyrus', kind: 'Manuscript · 2nd–1st century BC · Deuteronomy 5–6',
            src: '../../assets/images/lessons/bible-pathway/2nd-century-hebrew-decalogue-0218352.webp',
            page: 'https://commons.wikimedia.org/wiki/File:2nd_century_Hebrew_decalogue.jpg',
            alt: 'Torn fragment of papyrus with lines of ancient Hebrew writing',
            caption: 'This Hebrew fragment combines a form of the Ten Commandments, blending Exodus 20 and Deuteronomy 5, with the Shema (6:4–5). It shows these texts were being copied and used together over two thousand years ago.',
            credit: 'Unknown author; Nash Papyrus', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Wrapping tefillin before prayer', kind: 'Photograph · Samarkand · c. 1865–72 · Deuteronomy 6:8',
            src: '../../assets/images/lessons/bible-pathway/zeravshan-okrug-samarkand-a-jewish-man-wearing-a-pra-1a3e5e8.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Zeravshan_Okrug._Samarkand._A_Jewish_Man,_Wearing_a_Prayer_Shawl,_Wrapping_His_Arm_in_Phylactery,_in_Preparation_for_Prayer_WDL11152.png',
            alt: 'Nineteenth-century photograph of a man in a prayer shawl winding the strap of a small box around his arm',
            caption: 'Tefillin are small boxes holding Torah verses, including Deuteronomy 6:4–9, bound on the arm and head: one Jewish reading of “bind them as a sign on your hand.” This is a later, living practice, not temple-era Israel, and not every tradition reads verse 8 literally.',
            credit: 'Aleksandr L. Kun, Turkestan Album', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      }
    ],
    'feasts-of-israel': [
      {
        title: 'The text and the spring',
        note: 'The calendar is written down in Leviticus 23 and begins with Passover in the first month.',
        items: [
          {
            title: 'Leviticus scroll, paleo-Hebrew', kind: 'Dead Sea Scroll · Qumran Cave 11 · Leviticus',
            src: '../../assets/images/lessons/bible-pathway/11qpaleolev-qumran-cave-11-1c0ef25.webp',
            page: 'https://commons.wikimedia.org/wiki/File:11QpaleoLev_-_Qumran_Cave_11.jpg',
            alt: 'Close-up of a fragment of a Leviticus scroll written in ancient Hebrew script',
            caption: 'Leviticus 23 is where the appointed times are listed. This scroll fragment from Qumran, written in the older paleo-Hebrew script, shows how the book was copied by hand about two thousand years ago.',
            credit: 'Shai Halevi / Israel Antiquities Authority', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'A Passover Seder plate', kind: 'Photograph · Today · Exodus 12; Leviticus 23:4–8',
            src: '../../assets/images/lessons/bible-pathway/passover-seder-plate-original-f526de5.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Passover_Seder_plate,_original.jpg',
            alt: 'Seder plate with shankbone, egg, bitter herbs, greens, and charoset',
            caption: 'Passover turns an event (the exodus) into a meal that families repeat. Each item on the plate is a small prompt to remember. Judaism today keeps Passover through the Seder, which developed after the temple’s fall.',
            credit: 'Edsel Little', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/'
          }
        ]
      },
      {
        title: 'Autumn: Trumpets and Atonement',
        note: 'The seventh month holds three feasts in three weeks: trumpet blasts, fasting, and booths.',
        items: [
          {
            title: 'Blowing the shofar', kind: 'Photograph · Rosh Hashanah · Leviticus 23:23–25',
            src: '../../assets/images/lessons/bible-pathway/shofar-in-rosh-hashanah-5dfb1c2.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Shofar_in_Rosh_Hashanah.jpg',
            alt: 'A man blowing a ram’s-horn shofar',
            caption: 'The text says only “a memorial proclaimed with blasts of trumpets,” and gives no further detail. The shofar, a ram’s horn, became the central sound of Rosh Hashanah in later Jewish practice.',
            credit: 'MinoZig', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'Jews Praying in the Synagogue on Yom Kippur', kind: 'Painting · Maurycy Gottlieb, 1878 · Leviticus 16; 23:26–32',
            src: '../../assets/images/lessons/bible-pathway/maurycy-gottlieb-jews-praying-in-the-synagogue-on-yo-9ce26dd.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Maurycy_Gottlieb_-_Jews_Praying_in_the_Synagogue_on_Yom_Kippur.jpg',
            alt: 'Nineteenth-century painting of men in prayer shawls praying intently in a synagogue',
            caption: 'Leviticus 16 describes sanctuary rites; after the temple’s destruction, Yom Kippur continued in synagogue prayer, fasting, and repentance. This painting shows that later form, not Israel’s temple service.',
            credit: 'Maurycy Gottlieb, 1878', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      }
    ],
    'joshua-to-david': [
      {
        title: 'Land and judges',
        note: 'Settlement and the judges are known mainly from the biblical text; archaeology adds context but not simple confirmations.',
        items: [
          {
            title: 'The tower of Jericho', kind: 'Photograph · Tell es-Sultan · Joshua 6',
            src: '../../assets/images/lessons/bible-pathway/excavated-walls-of-jericho-b05b121.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Excavated_walls_of_Jericho.jpg',
            alt: 'Excavated stone tower at ancient Jericho beneath a blue sky',
            caption: 'This tower is far older than Joshua, from the Neolithic period. Jericho is among the oldest settlements in the world, so the site shows the antiquity of the place, not the walls of Joshua 6. Archaeologists debate how to relate Joshua’s story to the evidence.',
            credit: 'Daniel Case', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          },
          {
            title: 'Samson and Delilah', kind: 'Painting · Rembrandt, c. 1628 · Judges 16',
            src: '../../assets/images/lessons/bible-pathway/rembrandt-samson-and-delilah-about-1628-29-gem-ldega-a5afac1.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Rembrandt_Samson_and_Delilah_about_1628-29_Gem%C3%A4ldegalerie_Berlin_9407.jpg',
            alt: 'Painting of Samson asleep in Delilah’s lap as a man cuts his hair',
            caption: 'The judges are flawed deliverers. Samson is strong and reckless, and his story ends in blindness, a prayer, and death. The book of Judges asks its readers to notice what the nation needs beyond a strong leader.',
            credit: 'Rembrandt', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'Ruth and Naomi', kind: 'Painting · Jan Victors, 1653 · Ruth 1',
            src: '../../assets/images/lessons/bible-pathway/ruth-and-naomi-by-jan-victors-1653-2cad427.webp',
            page: 'https://commons.wikimedia.org/wiki/File:%27Ruth_and_Naomi%27_by_Jan_Victors%2C_1653.jpg',
            alt: 'Seventeenth-century painting of Ruth and Naomi parting on a road with Orpah',
            caption: 'Ruth is set “in the days when the judges ruled” (1:1). Loyalty (hesed) and a foreign woman’s commitment lead to David’s family line, a quiet counterweight to the violence of Judges.',
            credit: 'Jan Victors, 1653', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Samuel, Saul, and David in art',
        note: 'These are artists’ readings of the text. Compare the artists’ choices with what 1 Samuel actually says.',
        items: [
          {
            title: 'David with the Head of Goliath', kind: 'Painting · Caravaggio, c. 1607 · 1 Samuel 17',
            src: '../../assets/images/lessons/bible-pathway/caravaggio-david-with-the-head-of-goliath-vienna-f950303.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Caravaggio_-_David_with_the_Head_of_Goliath_-_Vienna.jpg',
            alt: 'Dark painting of a young David holding up the severed head of Goliath',
            caption: 'Caravaggio focuses on the aftermath, not the battle. In 1 Samuel 17:45–47 David names the reason for the fight: “that all the earth may know that there is a God in Israel.”',
            credit: 'Caravaggio', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Anointing of David', kind: 'Painting · Félix-Joseph Barrias · 1 Samuel 16',
            src: '../../assets/images/lessons/bible-pathway/felix-joseph-barrias-anointing-of-david-by-samuel-8ba6e6d.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Felix-Joseph_Barrias_-_Anointing_of_David_by_Samuel.jpg',
            alt: 'Painting of Samuel anointing the youngest son David with oil',
            caption: '1 Samuel 16:7 says “the LORD looks on the heart.” Samuel is surprised by who is chosen, as are the brothers. David is anointed years before he reigns.',
            credit: 'Félix-Joseph Barrias', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Evidence from the ground',
        note: 'Inscriptions and fortifications show that a Judahite kingdom existed. They do not settle every question about David’s reign.',
        items: [
          {
            title: 'Khirbet Qeiyafa', kind: 'Photograph · Judah · about 1000 BCE',
            src: '../../assets/images/lessons/bible-pathway/khirbet-qeiyafa-15-dc042ea.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Khirbet_Qeiyafa_15.jpg',
            alt: 'Excavated stone fortification walls and gate at Khirbet Qeiyafa',
            caption: 'This fortified town in the Elah Valley is dated by its excavators to about 1000 BCE, the time often assigned to David. Scholars disagree about whether it was Judahite, Israelite, or Philistine, so it is evidence to weigh, not a proof.',
            credit: 'Hoshvilim', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'The Tel Dan Stele', kind: 'Inscription · about 840–800 BCE · Israel Museum',
            src: '../../assets/images/lessons/bible-pathway/tel-dan-stele.webp',
            page: 'https://commons.wikimedia.org/wiki/File:%D7%9B%D7%AA%D7%95%D7%91%D7%AA_%D7%91%D7%99%D7%AA_%D7%93%D7%95%D7%93.jpg',
            alt: 'Fragments of a basalt stone inscribed with Aramaic letters',
            caption: 'An Aramaic inscription from Tel Dan, written by a rival king about 150 years after David, appears to mention a “house of David” (bytdwd). It is the earliest widely accepted reference outside the Bible to David’s dynasty.',
            credit: 'Liadmalone', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          }
        ]
      }
    ],
    'exodus': [
      {
        title: 'Egypt and the call',
        note: 'Start with Pharaoh’s world and God’s call from the bush. Both are interpreted by the text itself.',
        items: [
          {
            title: 'Great Temple of Ramesses II, Abu Simbel', kind: 'Photograph · Egypt · Exodus 1',
            src: '../../assets/images/lessons/bible-pathway/templo-de-rams-s-ii-abu-simbel-egipto-2022-04-02-dd-de10b50.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Templo_de_Rams%C3%A9s_II,_Abu_Simbel,_Egipto,_2022-04-02,_DD_26-28_HDR.jpg',
            alt: 'Colossal seated statues carved into the facade of the Great Temple at Abu Simbel',
            caption: 'Colossal monuments show the scale of Egyptian royal power. Exodus does not name its pharaoh, and scholars debate the date, so treat this as the world of Egyptian kingship, not as proof of which ruler is meant.',
            credit: 'Diego Delso', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'The Burning Bush', kind: 'Painting · Sébastien Bourdon · Exodus 3',
            src: '../../assets/images/lessons/bible-pathway/bourdon-s-bastien-burning-bush-254244e.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Bourdon,_S%C3%A9bastien_-_Burning_bush.jpg',
            alt: 'Seventeenth-century painting of Moses removing his sandals before a bush aflame in a pastoral landscape',
            caption: 'Bourdon shows Moses and his flock. In Exodus 3 the bush burns without being consumed, and God says He has seen the affliction, heard the cry, and come down to deliver. Compare the painting’s calm with the text’s urgency.',
            credit: 'Sébastien Bourdon, 17th century', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Plagues, Passover, and the sea',
        note: 'Artists and a living tradition each remember the rescue differently. Compare them with Exodus 10–15.',
        items: [
          {
            title: 'The Ninth Plague: Darkness', kind: 'Engraving · Gustave Doré · Exodus 10:21–23',
            src: '../../assets/images/lessons/bible-pathway/034-the-ninth-plague-darkness-d1a66af.webp',
            page: 'https://commons.wikimedia.org/wiki/File:034.The_Ninth_Plague._Darkness.jpg',
            alt: 'Engraving of Egyptians groping in gloom while light shines elsewhere',
            caption: 'Exodus 10 says there was darkness over Egypt “but all the people of Israel had light where they lived.” The plagues are presented as a contest between the Lord and Egypt’s claims to power.',
            credit: 'Gustave Doré, 1866', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'A Passover Seder plate', kind: 'Photograph · Today · Exodus 12',
            src: '../../assets/images/lessons/bible-pathway/passover-seder-plate-original-f526de5.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Passover_Seder_plate,_original.jpg',
            alt: 'Seder plate holding a shankbone, egg, bitter herbs, greens, and charoset',
            caption: 'Each food on the Seder plate recalls part of the rescue story, such as bitter herbs for bitter slavery. Exodus 12:26–27 expects children to ask “What does this mean?” and anticipates a memory handed down.',
            credit: 'Edsel Little', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/'
          },
          {
            title: 'The Crossing of the Red Sea', kind: 'Painting · Possibly Hans Jordaens III · Exodus 14',
            src: '../../assets/images/lessons/bible-pathway/jordaens-crossing-of-the-red-sea-6a388a2.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Jordaens_Crossing_of_the_Red_Sea.jpg',
            alt: 'Baroque painting of Israelites crossing between walls of water while Egyptian chariots approach',
            caption: 'The artist fills the scene with people and animals. Exodus 14 adds the pillar of cloud, the east wind, and walls of water, and Exodus 15 answers with a song that Revelation 15:3 echoes.',
            credit: 'Attributed to Hans Jordaens III', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Wilderness and Sinai',
        note: 'The law is given in a real wilderness to a people God has already rescued.',
        items: [
          {
            title: 'The wilderness way to Sinai', kind: 'Photograph · Sinai Peninsula · Exodus 19',
            src: '../../assets/images/lessons/bible-pathway/mount-sinai-bw-4-e1fcfe2.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Mount_Sinai_BW_4.jpg',
            alt: 'Granite mountains and a dry valley in the southern Sinai Peninsula',
            caption: 'Israel arrives at the mountain three months after leaving Egypt (19:1). The landscape shows why the story keeps asking where bread, water, and guidance will come from.',
            credit: 'Berthold Werner', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          },
          {
            title: 'Moses with the Ten Commandments', kind: 'Painting · Rembrandt, 1659 · Exodus 20; 32',
            src: '../../assets/images/lessons/bible-pathway/rembrandt-moses-with-the-ten-commandments-google-art-d050829.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Rembrandt_-_Moses_with_the_Ten_Commandments_-_Google_Art_Project.jpg',
            alt: 'Rembrandt painting of Moses lifting stone tablets overhead with a troubled expression',
            caption: 'Rembrandt’s Moses seems poised to break the tablets, a moment from Exodus 32 after the golden calf. Notice that the law was given to a people already rescued (20:2) and almost immediately broken.',
            credit: 'Rembrandt, 1659', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      }
    ],
    'genesis': [
      {
        title: 'Creation and the fall',
        note: 'These are artists’ readings of Genesis 1–3. Check each against the words of the text.',
        items: [
          {
            title: 'Creation of Light', kind: 'Engraving · Gustave Doré · Genesis 1:3',
            src: '../../assets/images/lessons/bible-pathway/001-the-creation-of-light-0d18b7a.webp',
            page: 'https://commons.wikimedia.org/wiki/File:001.The_Creation_of_Light.jpg',
            alt: 'Engraving of a figure above dark waters as light breaks through',
            caption: 'Genesis 1 moves in a pattern: God speaks, separates, names, and calls it good. Doré gives the first day a single dramatic moment; the text gives it a rhythm.',
            credit: 'Gustave Doré, 1866', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Expulsion from the Garden of Eden', kind: 'Painting · Thomas Cole · Genesis 3:23–24',
            src: '../../assets/images/lessons/bible-pathway/cole-thomas-expulsion-from-the-garden-of-eden-1828-33a00d3.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Cole_Thomas_Expulsion_from_the_Garden_of_Eden_1828.jpg',
            alt: 'Romantic landscape of Adam and Eve leaving a bright garden for a stormy wilderness',
            caption: 'Cole contrasts garden light with wilderness storm. Genesis 3:24 adds cherubim and a flaming sword guarding the way to the tree of life, an image Revelation 22 later answers.',
            credit: 'Thomas Cole, 1828', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Babel and the world Abram leaves',
        note: 'A painter’s tower beside a real Mesopotamian ziggurat: one is imagination, the other archaeology.',
        items: [
          {
            title: 'The Tower of Babel', kind: 'Painting · Pieter Bruegel the Elder · Genesis 11:1–9',
            src: '../../assets/images/lessons/bible-pathway/pieter-bruegel-the-elder-the-tower-of-babel-vienna-g-df60ddd.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Pieter_Bruegel_the_Elder_-_The_Tower_of_Babel_(Vienna)_-_Google_Art_Project_-_edited.jpg',
            alt: 'Sixteenth-century painting of a vast spiraling tower under construction above a harbor city',
            caption: 'Bruegel paints a Renaissance port and a spiral tower. Genesis says only that people built a city and tower “to make a name for ourselves.” Ask what the painter added and what the text leaves out.',
            credit: 'Pieter Bruegel the Elder, 1563', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Ziggurat of Ur', kind: 'Photograph · Mesopotamia · Genesis 11:31',
            src: '../../assets/images/lessons/bible-pathway/ziggarat-of-ur-001-84bc038.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Ziggarat_of_Ur_001.jpg',
            alt: 'Reconstructed stepped mud-brick ziggurat of Ur under a blue sky',
            caption: 'Ur was a major Mesopotamian city with a stepped temple tower like this one. Genesis 11:31 places Abram’s family there; the ziggurat shows the world he is called to leave, not a proof of Babel.',
            credit: 'Tla2006', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'The family heads for Egypt',
        note: 'The patriarchal story ends with a family in crisis and a surprising reading of providence.',
        items: [
          {
            title: 'Joseph Sold into Slavery', kind: 'Painting · Károly Ferenczy, 1900 · Genesis 37:25–28',
            src: '../../assets/images/lessons/bible-pathway/ferenczy-k-roly-joseph-sold-into-slavery-by-his-brot-bb5e731.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Ferenczy,_K%C3%A1roly_-_Joseph_Sold_into_Slavery_by_his_Brothers_(1900).jpg',
            alt: 'Painting of Joseph being handed to traders by his brothers in a desert landscape',
            caption: 'The family story turns on a betrayal. Genesis 50:20 later reads it back: “you meant evil against me, but God meant it for good.” Compare what the painting shows with what the narrator tells us.',
            credit: 'Károly Ferenczy, 1900', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      }
    ],
    'holy-week': [
      {
        title: 'Palm branches and the garden',
        note: 'Sunday and Thursday night: the crowd in the city, then the quiet olive grove across the Kidron Valley.',
        items: [
          {
            title: 'Entry into Jerusalem', kind: 'Painting · Giotto, c. 1305 · Matthew 21:1–11; Mark 11:1–11',
            src: '../../assets/images/lessons/bible-pathway/giotto-scrovegni-26-entry-into-jerusalem-64ac983.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Giotto_-_Scrovegni_-_-26-_-_Entry_into_Jerusalem.jpg',
            alt: 'Fresco of Jesus riding a donkey into Jerusalem while people lay cloaks before Him and others climb olive trees',
            caption: 'Giotto paints what all four Gospels report: Jesus on a donkey, cloaks spread on the road, branches cut from trees. It is a fourteenth-century interpretation. Compare it with Matthew’s mention of the prophecy in Zechariah 9:9 and ask what the humble animal says about the kind of king He is.',
            credit: 'Giotto di Bondone, Scrovegni Chapel, Padua', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Old olive trees in the Garden of Gethsemane', kind: 'Photograph · Mount of Olives · Mark 14:32–42',
            src: '../../assets/images/lessons/bible-pathway/ld-olive-trees-in-the-garden-of-gethsemane-05-06a785c.webp',
            page: 'https://commons.wikimedia.org/wiki/File:%D0%9Eld_Olive_trees_in_the_Garden_of_Gethsemane,_05.jpg',
            alt: 'Gnarled ancient olive trunks with silvery leaves in a walled garden',
            caption: 'Gethsemane means “oil press,” and the slope of the Mount of Olives has long been planted with olives. These gnarled trees are old, but they are not claimed to date from Jesus’ time. They show the setting, an olive grove just east of the city, where Mark 14 places the prayer and the arrest.',
            credit: 'Beko', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          }
        ]
      },
      {
        title: 'The supper',
        note: 'Thursday evening: a Passover-week meal that the Church has remembered ever since.',
        items: [
          {
            title: 'The Last Supper', kind: 'Painting · Leonardo da Vinci, 1495–1498 · Mark 14:17–26; John 13',
            src: '../../assets/images/lessons/bible-pathway/leonardo-da-vinci-1452-1519-the-last-supper-1495-149-d4ffdec.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Leonardo_da_Vinci_(1452-1519)_-_The_Last_Supper_(1495-1498).jpg',
            alt: 'Wall painting of Jesus at the center of a long table with twelve disciples reacting in groups of three',
            caption: 'Leonardo freezes the moment after Jesus says one of them will betray Him (Mark 14:18). He seats the Twelve at a long table, which first-century guests would probably not have done: they reclined. Treat it as a Renaissance reading of the scene, and look for the reactions the text actually reports.',
            credit: 'Leonardo da Vinci, Santa Maria delle Grazie, Milan', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Priest and governor',
        note: 'Thursday night to Friday morning: two authorities, one named in stone and one in an ossuary.',
        items: [
          {
            title: 'Ossuary of the high priest Joseph Caiaphas', kind: 'Archaeology · Israel Museum · Matthew 26:57–68',
            src: '../../assets/images/lessons/bible-pathway/ossuary-of-the-high-priest-caiaphas-p1180853-1c8b28a.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Ossuary_of_the_high_priest_Caiaphas_P1180853.jpg',
            alt: 'Ornately carved limestone bone box with rosettes, displayed in a museum case',
            caption: 'Found in a Jerusalem burial cave in 1990, this carved bone box is inscribed with the name Caiaphas. Many scholars think it belonged to the high priest of the Gospels (Matthew 26:3, 57; John 18:13), though some question the identification. Either way, it shows the wealth and standing of Jerusalem’s priestly families.',
            credit: 'Deror avi', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          },
          {
            title: 'The Pilate Stone (copy)', kind: 'Archaeology · Caesarea Maritima · Mark 15:1–15; John 18:28–19:16',
            src: '../../assets/images/lessons/bible-pathway/pilate-stone-copy-milano-9ca1b56.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Pilate_Stone_copy_Milano.JPG',
            alt: 'Weathered limestone block carved with a Latin dedication naming Pontius Pilate',
            caption: 'A Latin dedication found at Caesarea names “Pontius Pilatus, prefect of Judea.” This is a replica of the original in the Israel Museum. It is rare physical evidence outside the Gospels for the Roman governor who judged Jesus (also named by Tacitus and Josephus).',
            credit: 'Reinhard Dietrich', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
          },
          {
            title: 'Christ Leaving the Praetorium', kind: 'Engraving · Gustave Doré, 1872 · John 19:1–16',
            src: '../../assets/images/lessons/bible-pathway/christ-leaving-the-praetorium-lccn2003680648-c29b7e8.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Christ_leaving_the_praetorium_LCCN2003680648.jpg',
            alt: 'Large engraving of Jesus descending steps from a Roman building past soldiers and an agitated crowd',
            caption: 'Doré crowds the stairs with soldiers, officials, and onlookers, so Jesus is the still figure at the center of a noisy scene. It is a nineteenth-century interpretation of John 19. Ask what it adds that the text does not say, and what it leaves out.',
            credit: 'Gustave Doré (Library of Congress)', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Cross, tomb, and morning',
        note: 'Friday afternoon to Sunday dawn: a death, a burial, and a stone.',
        items: [
          {
            title: 'The Crucifixion', kind: 'Painting · Matthias Grünewald, c. 1512–1516 · Mark 15:33–39; John 19:16–37',
            src: '../../assets/images/lessons/bible-pathway/matthias-gr-newald-the-crucifixion-wga10723-697d344.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Matthias_Gr%C3%BCnewald_-_The_Crucifixion_-_WGA10723.jpg',
            alt: 'Painting of the crucified Jesus with Mary, John, and Mary Magdalene mourning at the foot of the cross',
            caption: 'Grünewald does not soften the suffering, and he adds John the Baptist pointing at the cross, a figure who could not have been there. That is a clue that this is a theological painting and not a reconstruction. Compare the mourners with the women named in Mark 15:40 and John 19:25.',
            credit: 'Matthias Grünewald', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Rolling stone at the Tomb of the Herods', kind: 'Photograph · Jerusalem · Mark 15:46; 16:3–4',
            src: '../../assets/images/lessons/bible-pathway/schijfvormige-steen-bij-het-familiegraf-van-herodus-37823f7.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Schijfvormige_steen_bij_het_familiegraf_van_Herodus,_Bestanddeelnr_255-2387.jpg',
            alt: 'Black-and-white photograph of a large disc-shaped stone beside the entrance to a rock-cut tomb',
            caption: 'A few wealthy first-century tombs in Jerusalem were closed with a disc-shaped rolling stone like this one. Most tombs were closed with a flat blocking stone. The Gospels say a large stone closed Jesus’ tomb (Mark 15:46; 16:3–4). This photograph shows the kind of thing the writers describe, not Jesus’ own tomb.',
            credit: 'Willem van de Poll (Nationaal Archief)', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
          }
        ]
      }
    ],
    'temple-and-gods-presence': [
      {
        title: 'Garden and promise',
        note: 'Eden is known through the biblical text, so artists visualize it rather than document it.',
        items: [
          {
            title: 'The Garden of Eden', kind: 'Artistic depiction · Genesis 2–3',
            src: '../../assets/images/lessons/bible-pathway/thomas-cole-the-garden-of-eden-1828-5f15d2d.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Thomas_Cole_-_The_Garden_of_Eden_-_1828.jpg',
            alt: 'Thomas Cole painting of a luminous, mountain-ringed Garden of Eden',
            caption: 'Thomas Cole imagines Eden as a place where garden, river, mountain, light, and human life meet before exile.',
            credit: 'Thomas Cole, 1828', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Mountains of encounter',
        note: 'In Scripture, mountains often become places of covenant, prayer, revelation, and glory.',
        items: [
          {
            title: 'Mount Sinai', kind: 'Traditional identification · Exodus 19–20',
            src: '../../assets/images/lessons/bible-pathway/mount-sinai-bw-4-e1fcfe2.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Mount_Sinai_BW_4.jpg',
            alt: 'Rocky summit of the mountain traditionally identified as Mount Sinai in Egypt',
            caption: 'Sinai recalls God descending in fire and cloud to give the covenant; the mountain’s exact biblical location remains debated.',
            credit: 'Berthold Werner', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          },
          {
            title: 'Mount Tabor', kind: 'Traditional identification · Matthew 17:1–8',
            src: '../../assets/images/lessons/bible-pathway/mount-tabor4-1da204c.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Mount_Tabor4.jpg',
            alt: 'Rounded green profile of Mount Tabor rising above the surrounding plain in Israel',
            caption: 'Christian tradition connects Tabor with the Transfiguration, when Christ’s glory was revealed to Peter, James, and John.',
            credit: 'Eliot / TheCuriousGnome', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/'
          },
          {
            title: 'Mount of Olives', kind: 'Biblical place · Gospels and Acts',
            src: '../../assets/images/lessons/bible-pathway/2013-aerial-mount-of-olives-9c46c84.webp',
            page: 'https://commons.wikimedia.org/wiki/File:2013-Aerial-Mount_of_Olives.jpg',
            alt: 'Aerial view of the Mount of Olives and its churches overlooking Jerusalem',
            caption: 'The Mount of Olives frames Jesus’ prayer, teaching, entry into Jerusalem, and ascension in the Gospel and Acts narratives.',
            credit: 'Godot13', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          }
        ]
      },
      {
        title: 'The Church in stone',
        note: 'Christians across centuries have shaped worship spaces to gather communities around Word, sacrament, prayer, and praise.',
        items: [
          {
            title: 'St. Peter’s Basilica', kind: 'Vatican City · Renaissance and Baroque',
            src: '../../assets/images/lessons/bible-pathway/exterior-of-saint-peter-s-basilica-5eebb02.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Exterior_of_Saint_Peter%27s_Basilica.jpg',
            alt: 'Facade and dome of Saint Peter’s Basilica seen from Saint Peter’s Square',
            caption: 'One of Christianity’s most recognized churches, St. Peter’s joins a vast gathering place to imagery of apostles, saints, and the cross.',
            credit: 'Yair Haklai', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'Notre-Dame de Paris', kind: 'France · Gothic',
            src: '../../assets/images/lessons/bible-pathway/paris-notre-dame-2014-1448-b9a4b87.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Paris,_Notre_Dame_--_2014_--_1448.jpg',
            alt: 'Western facade and twin towers of Notre-Dame Cathedral in Paris',
            caption: 'Notre-Dame’s portals, towers, and rose window turn stone and colored light into a public proclamation of the Christian story.',
            credit: 'Dietmar Rabich', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'Sagrada Família', kind: 'Barcelona · Modernisme',
            src: '../../assets/images/lessons/bible-pathway/exterior-of-the-sagrada-fam-lia-20171225-5d2aaa3.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Exterior_of_the_Sagrada_Fam%C3%ADlia_20171225.jpg',
            alt: 'Sculpted towers and facade of the Sagrada Família basilica in Barcelona',
            caption: 'Antoni Gaudí’s basilica uses branching columns, sculpted Scripture scenes, and changing light to join creation with the gospel story.',
            credit: 'Suicasmo', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'Church of the Holy Sepulchre', kind: 'Jerusalem · Pilgrimage church',
            src: '../../assets/images/lessons/bible-pathway/jerusalem-holy-sepulchre-bw-22-7a8d636.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Jerusalem_Holy_Sepulchre_BW_22.JPG',
            alt: 'Stone entrance facade of the Church of the Holy Sepulchre in Jerusalem',
            caption: 'The Holy Sepulchre gathers Christian memory around the traditional sites of Jesus’ crucifixion, burial, and resurrection.',
            credit: 'Berthold Werner', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          }
        ]
      },
      {
        title: 'Artists picture revelation',
        note: 'Sacred art interprets biblical testimony through visual symbols; it is not a photograph of the event.',
        items: [
          {
            title: 'The Baptism of Christ', kind: 'Artistic depiction · Matthew 3:13–17',
            src: '../../assets/images/lessons/bible-pathway/the-baptism-of-christ-verrocchio-leonardo-71cd00f.webp',
            page: 'https://commons.wikimedia.org/wiki/File:The_Baptism_of_Christ_(Verrocchio_%26_Leonardo).jpg',
            alt: 'Renaissance painting of Jesus’ baptism, with the Spirit represented as a dove and heaven opening above',
            caption: 'This Renaissance work pictures the Father’s voice, the Spirit descending like a dove, and the Son standing in the Jordan.',
            credit: 'Verrocchio and Leonardo da Vinci', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'The Transfiguration', kind: 'Icon · Matthew 17:1–8',
            src: '../../assets/images/lessons/bible-pathway/transfiguration-by-feofan-grek-from-spaso-preobrazhe-5911d22.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Transfiguration_by_Feofan_Grek_from_Spaso-Preobrazhensky_Cathedral_in_Pereslavl-Zalessky_(15th_c,_Tretyakov_gallery).jpeg',
            alt: 'Fifteenth-century icon of the radiant Christ above the disciples at the Transfiguration',
            caption: 'The icon uses radiating light and height to confess what the Gospel narrates: Christ’s glory disclosed before the disciples.',
            credit: 'Unknown 15th-century icon painter', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      }
    ],
    'jesus-ministry': [
      {
        title: 'Places of the ministry',
        note: 'Capernaum on the lake’s northwest shore became Jesus’ base in Galilee; Caesarea Philippi lay far to the north at the foot of Mount Hermon.',
        items: [
          {
            title: 'Capernaum synagogue ruins', kind: 'Galilee · Aerial photograph, 1937–38',
            src: '../../assets/images/lessons/bible-pathway/zoltan-kluger-ruins-of-the-synagogue-at-capernaum-43ac604.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Zoltan_Kluger._Ruins_of_the_Synagogue_at_Capernaum.jpg',
            alt: 'Black-and-white aerial photograph of the excavated stone synagogue and surrounding ruins at Capernaum',
            caption: 'Mark 1:21 places Jesus teaching in the synagogue at Capernaum. The white limestone ruins visible today are from a later building (about the 4th–5th century), which sits near older basalt foundations, so this photograph shows the site, not the synagogue Jesus entered.',
            credit: 'Zoltan Kluger, 1937–38', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Banias, ancient Caesarea Philippi', kind: 'Foot of Mount Hermon · Photograph, 1910',
            src: '../../assets/images/lessons/bible-pathway/banias-ancient-caesarea-philippi-5f03dfe.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Banias,_Ancient_Caesarea_Philippi.jpg',
            alt: 'Early twentieth-century photograph of the rocky hillside and ruins at Banias, ancient Caesarea Philippi',
            caption: 'Matthew 16:13 sets Peter’s confession “in the district of Caesarea Philippi,” a city dedicated to Pan and the emperor. Jesus asks who He is in a place full of rival claims about divinity and power.',
            credit: 'OSU Special Collections & Archives, 1910', license: 'No known copyright restrictions', licenseUrl: 'https://www.flickr.com/commons/usage/'
          }
        ]
      },
      {
        title: 'Scenes in art',
        note: 'Tissot, a French painter who traveled to the Holy Land to study its landscape and dress, painted the Gospel scenes in the 1880s–90s.',
        items: [
          {
            title: 'The Calling of Saint Peter and Saint Andrew', kind: 'James Tissot · c. 1886–1894',
            src: '../../assets/images/lessons/bible-pathway/brooklyn-museum-the-calling-of-saint-peter-and-saint-7a2525d.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Brooklyn_Museum_-_The_Calling_of_Saint_Peter_and_Saint_Andrew_(Vocation_de_Saint_Pierre_et_Saint_Andr%C3%A9)_-_James_Tissot_-_overall.jpg',
            alt: 'Watercolor of Jesus beckoning two fishermen at the shore of the lake as they work with their nets',
            caption: 'Mark 1:16–20: Jesus calls working people at their work, with a promise and a task: “Follow me, and I will make you become fishers of men.”',
            credit: 'James Tissot, Brooklyn Museum', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'The Palsied Man Let Down through the Roof', kind: 'James Tissot · c. 1886–1894',
            src: '../../assets/images/lessons/bible-pathway/brooklyn-museum-the-palsied-man-let-down-through-the-08d5354.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Brooklyn_Museum_-_The_Palsied_Man_Let_Down_through_the_Roof_(Le_paralytique_descendu_du_toit)_-_James_Tissot_-_overall.jpg',
            alt: 'Watercolor showing a man on a mat lowered through an opening in a roof into a crowded house where Jesus is teaching',
            caption: 'Mark 2:1–12: four friends refuse to let a crowd stop them. Notice the roof, the mat, and the faces below, then ask why Jesus speaks of forgiveness first.',
            credit: 'James Tissot, Brooklyn Museum', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      }
    ],
    'sermon-on-the-mount': [
      {
        title: 'The Galilean setting',
        note: 'Jesus delivered the Sermon on the Mount on the hills overlooking the Sea of Galilee.',
        items: [
          {
            title: 'Mount of Beatitudes', kind: 'Galilee · Traditional site of Matthew 5–7',
            src: '../../assets/images/lessons/bible-pathway/mount-of-beatitudes-view-sea-of-galilee-200704-7e8b4c0.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Mount_of_Beatitudes_View_Sea_of_Galilee_200704.JPG',
            alt: 'View looking down from the Mount of Beatitudes toward the tranquil waters of the Sea of Galilee',
            caption: 'Looking south from the traditional Mount of Beatitudes over the Sea of Galilee, where Jesus gathered crowds from Galilee, the Decapolis, Jerusalem, and Judea (Matthew 4:25–5:1).',
            credit: 'Wikimedia Commons contributor', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          }
        ]
      },
      {
        title: 'The Sermon in historical art',
        note: 'European painters visualized the crowds, the mountainside, and the radical teachings of the kingdom.',
        items: [
          {
            title: 'The Sermon on the Mount', kind: 'Carl Bloch · 1877',
            src: '../../assets/images/lessons/bible-pathway/bloch-sermononthemount-2f78065.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Bloch-SermonOnTheMount.jpg',
            alt: 'Carl Bloch painting of Jesus standing with arm raised on a sunlit hillside teaching diverse men, women, and children',
            caption: 'Danish master Carl Bloch portrays Jesus surrounded by listeners of all ages, capturing the intimate yet cosmic authority of the Beatitudes.',
            credit: 'Carl Bloch, 1877, Frederiksborg Castle', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Sermon on the Mount & Healing', kind: 'Cosimo Rosselli · Sistine Chapel (1481–1482)',
            src: '../../assets/images/lessons/bible-pathway/cosimo-rosselli-sermone-della-montagna-f3ff39a.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Cosimo_Rosselli_Sermone_della_Montagna.jpg',
            alt: 'Renaissance fresco from the Sistine Chapel showing Jesus on a green hill preaching to gathered Renaissance figures',
            caption: 'Painted opposite the Giving of the Law to Moses on the Sistine Chapel walls, Rosselli’s fresco pairs the proclamation of the new covenant with the healing of the leper (Matthew 8:1–4).',
            credit: 'Cosimo Rosselli, 1481–1482, Sistine Chapel, Vatican', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'Ancient manuscript witness',
        note: 'Surviving Greek manuscripts from antiquity show how the text was preserved and read.',
        items: [
          {
            title: 'Codex Sinaiticus · Matthew 6 (The Lord’s Prayer)', kind: 'Greek Uncial Manuscript · 4th century CE',
            src: '../../assets/images/lessons/bible-pathway/codex-sinaiticus-matthew-6-4-32-7ee2a68.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Codex_Sinaiticus_Matthew_6,4-32.JPG',
            alt: 'Folio page of ancient Greek uncial script on parchment from Codex Sinaiticus containing Matthew 6',
            caption: 'This 4th-century parchment page from Codex Sinaiticus (British Library Add MS 43725) preserves Matthew 6:4–32 in four uncial columns, including Jesus’ teaching on prayer and the Lord’s Prayer.',
            credit: 'The British Library / Codex Sinaiticus Project', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      }
    ],
    'how-the-bible-reached-us': [
      {
        title: 'Ancient manuscript witnesses',
        note: 'Before printing, every copy of Scripture was transcribed by hand onto leather, papyrus, or parchment.',
        items: [
          {
            title: 'The Great Isaiah Scroll', kind: 'Dead Sea Scrolls · c. 125 BCE',
            src: '../../assets/images/lessons/bible-pathway/great-isaiah-scroll-27774b6.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Great_Isaiah_Scroll.jpg',
            alt: 'Parchment scroll opened to reveal columns of ancient Hebrew calligraphy',
            caption: 'Preserved in the caves of Qumran, this 24-foot Hebrew scroll shows how Jewish scribes copied and guarded biblical books a thousand years before medieval codices.',
            credit: 'Israel Museum, Jerusalem / Ardon Bar Hama', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Codex Sinaiticus', kind: 'Greek Bible · 4th century CE',
            src: '../../assets/images/lessons/bible-pathway/codex-sinaiticus-matthew-6-4-32-7ee2a68.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Codex_Sinaiticus_Matthew_6,4-32.JPG',
            alt: 'Ancient four-column Greek uncial text handwritten on fine animal vellum',
            caption: 'Written on fine parchment sheets bound as a codex (book) rather than a scroll, Sinaiticus is the oldest surviving complete manuscript of the Christian New Testament.',
            credit: 'British Library / Codex Sinaiticus Project', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      },
      {
        title: 'The invention of printing',
        note: 'Movable type allowed copies to be reproduced with speed and consistency.',
        items: [
          {
            title: 'The Gutenberg Bible', kind: 'Mainz, Germany · c. 1455',
            src: '../../assets/images/lessons/bible-pathway/gutenberg-bible-library-of-congress-06615fa.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Gutenberg_Bible_-_Library_of_Congress.jpg',
            alt: 'Johannes Gutenberg’s 42-line Latin Bible on display with hand-illuminated capitals in a glass exhibition case',
            caption: 'Johannes Gutenberg’s 42-line Latin Vulgate marked the birth of mass printing in Europe, launching the widespread availability of Scripture across languages and borders.',
            credit: 'Library of Congress, Washington, D.C.', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          }
        ]
      }
    ],
    'acts-jerusalem-to-nations': [
      {
        title: 'Preaching in the Greco-Roman forum',
        note: 'In Acts, the Christian witness steps out of the synagogue into the imperial public square.',
        items: [
          {
            title: 'The Areopagus (Mars Hill) in Athens', kind: 'Athens, Greece · Acts 17:16–34',
            src: '../../assets/images/lessons/bible-pathway/20101024-acropolis-panoramic-view-from-areopagus-hil-6edf0b4.webp',
            page: 'https://commons.wikimedia.org/wiki/File:20101024_Acropolis_panoramic_view_from_Areopagus_hill_Athens_Greece.jpg',
            alt: 'View looking up from the rocky Areopagus hill toward the monumental Parthenon and temples of the Athenian Acropolis',
            caption: 'Standing on the limestone outcrop of the Areopagus below the monumental Parthenon, the Apostle Paul addressed the philosophers of the Epicurean and Stoic schools about the “Unknown God.”',
            credit: 'Wikimedia Commons contributor', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          }
        ]
      },
      {
        title: 'Roman epigraphy and infrastructure',
        note: 'Archaeological discoveries confirm specific civic officials and travel routes named across Acts.',
        items: [
          {
            title: 'The Erastus Inscription at Corinth', kind: 'Corinth, Greece · Romans 16:23 / Acts 19:22',
            src: '../../assets/images/lessons/bible-pathway/erastus-stone-at-theater-of-corinth-cropped-c281024.webp',
            page: 'https://commons.wikimedia.org/wiki/File:Erastus_stone_at_Theater_of_Corinth_(cropped).jpg',
            alt: 'Carved Latin inscription on a paved limestone plaza near the theater of ancient Corinth',
            caption: 'Carved in limestone paving near the Corinthian theater, this Latin inscription reads: “ERASTVS PRO AEDILITATE SVA PECVNIA STRAVIT” (Erastus in return for his aedileship laid this pavement at his own expense), directly corroborating Erastus, “the city treasurer” greeted in Romans 16:23.',
            credit: 'Wikimedia Commons contributor', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          }
        ]
      }
    ]
  };

  var geographyMaps = {
    nearEast: {
      src: '../../assets/images/lessons/bible-pathway/map-of-the-ancient-near-east-cf8dbb2.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Map_of_the_Ancient_Near_East.jpg',
      alt: 'Historical map of the ancient Near East from Egypt and the Mediterranean to Mesopotamia',
      credit: 'Dodd, Mead, and Company', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    bibleLands: {
      src: '../../assets/images/lessons/bible-pathway/a-general-map-of-bible-lands-5c99f1d.webp',
      page: 'https://commons.wikimedia.org/wiki/File:A_general_map_of_Bible_Lands.jpg',
      alt: 'Historical map showing the broad lands associated with the biblical story',
      credit: 'Edwin Gardner / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    sinai: {
      src: '../../assets/images/lessons/bible-pathway/sinai-peninsula-map-4d8ccac.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Sinai-peninsula-map.jpg',
      alt: 'Shaded relief reference map of the Sinai Peninsula between Egypt and the southern Levant',
      credit: 'U.S. Central Intelligence Agency', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    jerusalem: {
      src: '../../assets/images/lessons/bible-pathway/map-of-the-old-city-and-surroundings-of-jerusalem-b57b9df.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Map_of_the_Old_City_and_surroundings_of_Jerusalem.svg',
      alt: 'Modern reference map of Jerusalem’s Old City and surrounding valleys and neighborhoods',
      credit: 'Obendorf', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    kingdoms: {
      src: '../../assets/images/lessons/bible-pathway/kingdoms-of-israel-and-judah-8th-century-bce-c6ccb44.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Kingdoms_of_Israel_and_Judah_(8th_century_BCE).svg',
      alt: 'Map of Israel, Judah, and neighboring states in the eighth century BCE',
      credit: 'Tobias Schäfer 87', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
    },
    tribes: {
      src: '../../assets/images/lessons/bible-pathway/12-tribes-of-israel-map-bcaf694.webp',
      page: 'https://commons.wikimedia.org/wiki/File:12_Tribes_of_Israel_Map.svg',
      alt: 'Map presenting the tribal allotments described in Joshua chapters 13 through 19',
      credit: 'Richardprins and contributors', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    jesus: {
      src: '../../assets/images/lessons/bible-pathway/palestine-in-the-time-of-jesus-b8fb863.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Palestine_in_the_time_of_Jesus.jpg',
      alt: 'Historical map of Galilee, Samaria, Judea, Perea, and neighboring regions around the time of Jesus',
      credit: 'Charles Foster Kent / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    galilee: {
      src: '../../assets/images/lessons/bible-pathway/sea-of-galilee-map-1903-ae3bbf3.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Sea_of_galilee_map_1903.jpg',
      alt: 'Historical reference map of the Sea of Galilee and surrounding towns and terrain',
      credit: 'Paul Waterhouse', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    romanEmpire: {
      src: '../../assets/images/lessons/bible-pathway/romanempire-117-4439819.webp',
      page: 'https://commons.wikimedia.org/wiki/File:RomanEmpire_117.svg',
      alt: 'Map showing the extent and provinces of the Roman Empire in 117 CE',
      credit: 'ArdadN', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    paulFirstJourney: {
      src: '../../assets/images/lessons/bible-pathway/paul-the-apostle-first-missionary-journey-fdc4756.webp',
      page: 'https://commons.wikimedia.org/wiki/File:Paul_the_Apostle,_first_missionary_journey.svg',
      alt: 'Map tracing Paul and Barnabas’s first missionary journey from Antioch through Cyprus and southern Galatia',
      credit: 'Roberto Reggi', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    }
  };

  function journeyImage(image, title, kind, caption) {
    return Object.assign({}, image, { title: title, kind: kind, caption: caption });
  }

  lessonImages.leviticus = journeyImage(lessonVisualJourneys['feasts-of-israel'][0].items[0],
    'A Leviticus manuscript', 'Dead Sea Scroll', 'A fragment of Leviticus from Qumran shows how the book was copied by hand. The lesson reader gives the English text for close comparison.');
  lessonImages.numbers = journeyImage(lessonVisualJourneys.deuteronomy[0].items[0],
    'From Moab toward the Jordan', 'Modern landscape', 'Looking west from Mount Nebo, use the Dead Sea and Jordan Valley to orient the final setting of Numbers. The view shows the terrain today.');
  lessonVisualJourneys.leviticus = [{
    title: 'Atonement across two settings',
    note: 'Compare the sanctuary described in Leviticus 16 with a much later depiction of the day’s observance.',
    items: [
      journeyImage(lessonImages['the-tabernacle'], 'The tent and courtyard', 'Modern model · Leviticus 16:15–19', 'Use the model to locate the courtyard and inner tent. Follow the priest’s movements in the passage and label features that the model supplies.'),
      lessonVisualJourneys['feasts-of-israel'][1].items[1]
    ]
  }];
  lessonVisualJourneys.numbers = [{
    title: 'From Sinai to the edge of the land',
    note: 'Compare wilderness terrain with the broad approach to the Jordan Valley.',
    items: [
      journeyImage(lessonImages.exodus, 'Wilderness terrain', 'Modern photograph · Numbers 10:11–14', 'Numbers begins its journey from the wilderness of Sinai. Observe the terrain in this photograph of a traditional Sinai identification. The text gives no exact modern route.'),
      journeyImage(geographyMaps.tribes, 'The land beyond the Jordan', 'Interpretive map · Numbers 27:12–23', 'Locate the Dead Sea and the Jordan. The tribal allotments are from Joshua and belong to a later point in the story than Moses’ commissioning of Joshua.')
    ]
  }];
  lessonVisualJourneys.elijah = [{
    title: 'Two mountains, two encounters',
    note: 'Place the public encounter at Carmel alongside Elijah’s journey to Horeb.',
    items: [
      journeyImage(lessonImages.elijah, 'A spring near Mount Carmel', 'Historic photograph · 1 Kings 18:20–39', 'This photograph shows terrain near a site traditionally associated with Elijah. Read the story and identify what the crowd sees and hears.'),
      journeyImage(lessonImages.exodus, 'A traditional Sinai landscape', 'Modern photograph · 1 Kings 19:8–13', 'Horeb is called the mountain of God. This landscape shows a traditional Sinai location and gives context for the journey. The narrative gives no coordinates for Elijah’s cave.')
    ]
  }];
  lessonVisualJourneys.job = [{
    title: 'How an artist reads Job',
    note: 'Compare William Blake’s illustrations with the opening scenes and the ending.',
    items: [
      {
        title: 'Job’s Comforters', kind: 'Print · William Blake · Job 2:11–13',
        src: '../../assets/images/lessons/bible-pathway/jobs-comforters.webp',
        page: 'https://commons.wikimedia.org/wiki/File:Blake-Job%27s-Comforters.jpg',
        alt: 'William Blake print of Job and the friends who come to comfort him',
        caption: 'Blake gives gestures and expressions to an encounter the narrator describes mainly through weeping, silence and shared time. Which actions can you trace to the passage?',
        credit: 'William Blake', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
      },
      journeyImage(lessonImages.job, 'Job and his daughters', 'Engraving · William Blake · Job 42:13–15', 'The book names Job’s daughters and says he gives them a share of his inheritance. Which parts of Blake’s scene are his own interpretation?')
    ]
  }];
  lessonVisualJourneys['world-of-the-bible'] = [{
    title: 'Landscape and empire',
    note: 'Compare physical geography with an imperial record of a particular event.',
    items: [
      journeyImage(geographyMaps.nearEast, 'Egypt, Canaan and Mesopotamia', 'Reference map · Genesis 12:1–9', 'Locate the Nile and the Euphrates. Use coastal routes, rivers and deserts to explain why movement between these regions matters to the stories.'),
      journeyImage(lessonImages['kingdoms-prophets-exile'], 'The Lachish relief', 'Assyrian relief · Compare 2 Kings 18:13–17', 'The relief portrays the Assyrian capture of Lachish. Read the biblical notice alongside it and ask whose point of view each source preserves.')
    ]
  }];
  lessonVisualJourneys['world-of-jesus'] = [{
    title: 'From the lake to Jerusalem',
    note: 'Compare the settings of early ministry in Galilee and later events in and around Jerusalem.',
    items: [
      journeyImage(lessonImages['world-of-jesus'], 'Hills above the Sea of Galilee', 'Modern photograph · Matthew 4:12–22', 'Look at the hills and shore. Name the places, occupations and movements Matthew gives for the opening of Jesus’ ministry.'),
      journeyImage(lessonImages['holy-week'], 'Jerusalem from the Mount of Olives', 'Modern photograph · Luke 19:28–40', 'Compare the approach in Luke with the modern view across the valley. Buildings and walls have changed since the Gospel period.')
    ]
  }];

  var lessonMapKeys = {
    'world-of-the-bible': 'nearEast',
    'how-the-bible-reached-us': 'bibleLands',
    'the-tabernacle': 'sinai',
    'temple-and-gods-presence': 'jerusalem',
    'kingdoms-prophets-exile': 'kingdoms',
    'feasts-of-israel': 'tribes',
    'elijah': 'kingdoms',
    'world-of-jesus': 'jesus',
    'jesus-parables-lab': 'galilee',
    'holy-week': 'jerusalem',
    'acts-jerusalem-to-nations': 'romanEmpire',
    'pauls-missionary-journeys': 'paulFirstJourney',
    'job': 'nearEast',
    'jesus-ministry': 'jesus',
    'sermon-on-the-mount': 'galilee',
    'genesis': 'nearEast',
    'exodus': 'sinai',
    'leviticus': 'sinai',
    'numbers': 'bibleLands',
    'joshua-to-david': 'tribes',
    'deuteronomy': 'tribes'
  };

  var lessonMapNotes = {
    'leviticus': 'Locate the Sinai Peninsula and the surrounding gulfs. Leviticus is framed around the tent of meeting in Israel’s camp. The map shows the physical region rather than the camp’s location or layout.',
    'numbers': 'Locate the Sinai Peninsula, the Negev, the Dead Sea and Moab east of the Jordan. Use Numbers 13, 20 and 33 to compare the named stops. The map provides orientation because several wilderness sites are disputed.',
    'deuteronomy': 'Look east of the Jordan: Moses speaks on the plains of Moab opposite Jericho, and Mount Nebo overlooks the land. This map shows the tribal allotments described in Joshua 13–19, so use it for location, not for the situation in Moses’ day.',
    'world-of-the-bible': 'Zoom out: Egypt anchors the southwest, Mesopotamia the east, and the narrow Levantine land bridge lies between them. Locate seas, rivers, deserts, and imperial routes before focusing on Canaan.',
    'how-the-bible-reached-us': 'The biblical writings emerged across connected lands and languages. Use the map to locate Israel between Egypt, Mesopotamia, Anatolia, and the Mediterranean world—then remember that manuscripts later traveled far beyond this frame.',
    'the-tabernacle': 'This modern relief map supplies physical orientation only; it does not settle the debated route of the exodus or the location of Mount Sinai. Find Egypt, the gulfs, desert interiors, and the route north toward the southern Levant.',
    'temple-and-gods-presence': 'This is a modern reference map, not a reconstruction of biblical Jerusalem. Use its hills and valleys to orient the Old City, Temple Mount, Mount of Olives, and approaches to Jerusalem across changing historical periods.',
    'kingdoms-prophets-exile': 'The eighth-century frame distinguishes Israel from Judah and places both among Aram-Damascus, Phoenicia, Philistia, Ammon, Moab, and Edom. Then zoom outward mentally toward Assyria and Babylon.',
    'feasts-of-israel': 'This interpretive map visualizes the tribal allotments described in Joshua 13–19. Use it to consider the distances and terrain involved when worshipers traveled toward a central place of worship.',
    'elijah': 'This map is a later eighth-century snapshot, roughly a century after Elijah, but it still shows the divided kingdom—Israel in the north, Judah in the south—alongside Phoenicia, the homeland of Jezebel and the Baal worship she promoted in Israel.',
    'world-of-jesus': 'Read the regional labels first: Galilee, Samaria, Judea, Perea, and surrounding territories. Next locate the Sea of Galilee, Jordan Valley, Mediterranean coast, and the ascent to Jerusalem.',
    'jesus-parables-lab': 'Many parables were heard in a Galilean ministry setting. Locate Capernaum, the lake shore, nearby agricultural land, roads, and hills while remembering that individual parables are not always tied to a named place.',
    'holy-week': 'Use this modern map only for enduring topography and relative position. Locate the Mount of Olives east of the Old City, the Kidron Valley between them, and the city gates; ancient walls and street lines differed.',
    'acts-jerusalem-to-nations': 'This map shows the empire in 117 CE, later than Acts, so its borders should not be treated as an exact Acts-era snapshot. It still reveals the continental scale, seas, and provincial network through which early Christian witness traveled.',
    'pauls-missionary-journeys': 'Begin with one route in detail: Antioch to Cyprus, Asia Minor, and back. Use it as a scale model for reading later journeys—always checking Acts for the sequence and distinguishing mapped reconstruction from explicit text.',
    'job': 'Job is set in the land of Uz, whose location is not certain. Use the wider ancient Near Eastern map to see the cultural world of wisdom literature, but do not turn a schematic map into a precise identification of Uz.',
    'joshua-to-david': 'This map presents the tribal allotments of Joshua 13–19. Trace Israel’s entry from the Jordan, then locate Jericho, Shechem, Shiloh, Gibeah in Benjamin (Saul’s home), and Bethlehem and Hebron in Judah (David’s home). The boundaries are a literary and interpretive reconstruction.',
    'exodus': 'Find Egypt and the Nile Delta, the two gulfs of the Red Sea region, and the Sinai Peninsula’s granite interior. Several routes and mountain identifications have been proposed, so treat this map as orientation for the story, not a finished answer.',
    'genesis': 'Trace the world of Genesis: Mesopotamia in the east (Ur, Haran), Canaan along the Mediterranean, and Egypt to the southwest. Abram travels from the first toward the second; Joseph’s family ends in the third. A map locates places; it cannot settle every ancient identification.',
    'jesus-ministry': 'Find Nazareth in the hills of Galilee, then Capernaum on the lake’s northwest shore, where much of Mark 1–4 happens. Caesarea Philippi lies far north, near Mount Hermon. Notice how the story moves from the lake to the north before the road turns south to Jerusalem.',
    'sermon-on-the-mount': 'Locate the lake, Capernaum, surrounding settlements, slopes, and roads. The map clarifies the Galilean setting, but Matthew does not identify the sermon’s exact hillside.'
  };

  // Each investigation asks for a prediction before showing the passage-based reasoning.
  // The choices are reading strategies, not claims that every interpretive question is settled.
  var lessonInvestigations = {
    'world-of-the-bible': ['Genesis 12:1–9', 'Abram leaves Haran. What would a map help you test?', ['Whether Canaan lay on a route from Mesopotamia', 'Whether a modern border proves the promise was fulfilled'], 0, 'Trace the journey and locate Canaan. A modern political border cannot answer what the ancient passage promises.', 'Mark Haran and Canaan; then identify one question the map cannot answer.'],
    'how-the-bible-reached-us': ['Luke 1:1–4', 'Luke mentions earlier accounts and investigation. Which question belongs to manuscript study?', ['How surviving copies differ in wording', 'Which modern translation has the best cover design'], 0, 'Manuscript witnesses help us compare transmitted wording. Luke’s introduction addresses how his account was prepared; it does not list the surviving copies.', 'Separate composition, copying, canon, and translation in four short notes.'],
    'the-tabernacle': ['Exodus 25:8–9', 'What does the passage explicitly connect to the sanctuary?', ['God dwelling among the people and a shown pattern', 'A confirmed location for every stop in the wilderness'], 0, 'The text states the sanctuary’s purpose and pattern. It does not settle a modern reconstruction of the exodus route.', 'Find one detail in Exodus 25–27 that a model can show, and one uncertainty it cannot settle.'],
    'temple-and-gods-presence': ['1 Kings 8:27–30', 'Solomon dedicates the temple. Which reading follows his prayer?', ['The building directs prayer toward God, who cannot be contained by it', 'God is physically confined to the building'], 0, 'Solomon asks whether God can dwell on earth and says even heaven cannot contain him. The temple is a place of prayer, not a container for God.', 'Compare Solomon’s prayer with one later passage about God’s presence.'],
    'kingdoms-prophets-exile': ['2 Kings 17:5–6; 25:8–12', 'What must a timeline keep distinct?', ['Assyria’s conquest of Israel and Babylon’s later conquest of Judah', 'One single conquest of both kingdoms by Rome'], 0, 'The northern kingdom and Judah fell to different empires at different times. Place each passage and empire separately before drawing a larger conclusion.', 'Put the two passages on a timeline and name who was displaced.'],
    'feasts-of-israel': ['Leviticus 23:39–43', 'The Feast of Booths recalls what experience?', ['Israel living in booths after the exodus', 'The dedication of Solomon’s temple'], 0, 'The passage explicitly connects the practice with Israel’s wilderness dwelling. Harvest timing is also part of the calendar context.', 'Explain how the feast joins a seasonal practice to remembered history.'],
    'elijah': ['1 Kings 18:20–39; 19:1–18', 'What changes between Carmel and Horeb?', ['Elijah moves from a public contest to fear and renewed commission', 'Elijah immediately becomes king of Israel'], 0, 'The dramatic public event does not prevent Elijah’s fear. In chapter 19, he is fed, heard, and given further work.', 'Use one verse from each chapter to describe Elijah’s circumstances.'],
    'world-of-jesus': ['John 4:3–10; Luke 9:51–56', 'Two Gospel journeys involve Samaria. What should you compare first?', ['Each journey’s route, encounter, and immediate context', 'A claim that every Samaritan reacts the same way'], 0, 'John narrates an encounter at a well; Luke narrates rejection in a village. Geography helps locate both, while the passages keep the people and situations distinct.', 'Trace Galilee, Samaria, and Judea on the map. Compare the people’s responses in the two passages.'],
    'jesus-parables-lab': ['Luke 10:25–37', 'Before assigning meanings to every object, what should you identify?', ['The lawyer’s question and Jesus’ closing question', 'A hidden meaning for the oil, coins, and animal'], 0, 'The exchange begins with a question about neighbor and ends with Jesus asking who acted as one. That frame guides a responsible reading.', 'Write the opening question, the reversal, and Jesus’ final instruction.'],
    'holy-week': ['Mark 15:40–16:8; John 20:1–18', 'How can you compare the resurrection accounts?', ['Name shared claims and each writer’s chosen scene', 'Force both accounts into the same sentence order'], 0, 'Both witness to the empty tomb, but they select and arrange details differently. Compare the witnesses and narrative emphasis before attempting a sequence.', 'Make two columns: details shared and details each Gospel emphasizes.'],
    'acts-jerusalem-to-nations': ['Acts 1:8; 8:26–40', 'How does the Ethiopian official’s story relate to Acts 1:8?', ['It shows witness crossing a social and geographic boundary', 'It proves the whole book happens in Jerusalem'], 0, 'Acts moves outward through particular people and encounters. The official’s story is one example, not a complete map of the mission.', 'Locate the road named in Acts 8 and explain what the text says about the encounter.'],
    'pauls-missionary-journeys': ['Acts 13:4–14', 'Which route is actually named in this passage?', ['From Syrian Antioch to Cyprus and onward to Perga', 'A direct flight from Rome to Jerusalem'], 0, 'The text names Seleucia, Cyprus, Paphos, and Perga. A route map is a reconstruction of travel between named places.', 'List the places in order, then label any connecting line as a reconstruction.'],
    'job': ['Job 2:11–13; 4:7–8; 42:7', 'Job’s friends begin by sitting with him, then offer explanations. What should a careful reader test?', ['Whether their confident explanation is actually supported by the book', 'Whether suffering always proves a person committed a hidden sin'], 0, 'The friends speak at length, but God later says they have not spoken what is right about Him as Job has. Their opening silence models presence; their later certainty becomes part of the book’s critique.', 'Compare one speech from a friend with Job 42:7. Name one claim, its evidence, and the judgment the book gives it.'],
    'joshua-to-david': ['Judges 17:6; 21:25', 'The book ends “In those days there was no king in Israel; everyone did what was right in his own eyes.” How should a reader take this refrain?', ['As the narrator’s diagnosis of moral chaos, shown by the stories just told', 'As praise for individual freedom and independence'], 0, 'The chapters before it describe theft, idolatry, assault, and civil war. The refrain interprets those stories: Israel lacks faithful leadership and has drifted from covenant loyalty.', 'List two episodes from Judges 17–21. For each, say what “right in his own eyes” led to.'],
    'exodus': ['Exodus 20:1–3', 'The Ten Commandments begin with a statement before any command. What does it do?', ['It grounds the law in rescue: “I am the Lord your God, who brought you out of Egypt”', 'It makes the law a payment Israel must make before being freed'], 0, 'Verse 2 recalls what God has already done. Israel is rescued first, then given the covenant. The commands describe how a freed people live, not how a slave earns freedom.', 'Find one earlier verse in Exodus 1–19 where God acts to rescue before any command is given. Explain how 20:2 relies on it.'],
    'leviticus': ['Leviticus 19:9–18', 'Which summary best matches the movement of this passage?', ['Holiness shapes harvesting, justice, speech, relationships, and love of neighbor', 'Holiness is only about ceremonies inside the sanctuary'], 0, 'The passage moves repeatedly between reverence for God and concrete treatment of other people, including the poor, workers, disabled neighbors, and enemies.', 'Choose three commands and name the person or relationship each one protects.'],
    'numbers': ['Numbers 13:27–33', 'The scouts largely agree about what they see. Where do they differ?', ['In how they interpret the land, its people, and Israel’s ability to continue', 'In whether they traveled to Canaan at all'], 0, 'The report includes shared observations, then competing conclusions. Caleb urges action; other scouts magnify danger and describe themselves as grasshoppers.', 'Make separate lists for observation, interpretation, and proposed response.'],
    'deuteronomy': ['Deuteronomy 6:4–9', 'How is love for God meant to be learned?', ['Through repeated words and practices woven into ordinary family life', 'Only through a once-a-year private test'], 0, 'The Shema joins hearing, wholehearted love, repeated teaching, conversation, and visible reminders throughout the day.', 'Design a simple morning, travel, and evening rhythm based only on actions named in the passage.'],
    'genesis': ['Genesis 12:1–3', 'God calls Abram. Whom is the promised blessing ultimately for?', ['Abram’s family, so that all the families of the earth are blessed through him', 'Abram’s family alone, with no concern for other nations'], 0, 'The promise runs from Abram to “all the families of the earth” (12:3). After Babel scattered the nations, God begins with one family to reach all of them.', 'Underline every “bless” and “blessing” in 12:1–3. Count how many are for Abram and how many reach beyond him.'],
    'jesus-ministry': ['Mark 2:1–12', 'Before healing the paralyzed man, Jesus says, “Son, your sins are forgiven.” What question does the scene press on the reader?', ['Who has authority to forgive sins, and does Jesus’ healing show that He has it?', 'Whether the man’s paralysis proves he committed a particular sin'], 0, 'The scribes ask, “Who can forgive sins but God alone?” and Jesus heals “that you may know that the Son of Man has authority on earth to forgive sins” (2:7, 10). The passage never says the man’s condition was a punishment; it joins forgiveness and restoration under Jesus’ authority.', 'List the four groups in the scene (the friends, the man, the scribes, the crowd). Find one verse that shows how each group responds.'],
    'sermon-on-the-mount': ['Matthew 6:1–6', 'What contrast frames Jesus’ teaching about giving and prayer?', ['Performing for public praise versus seeking the Father', 'Galilee versus Jerusalem as the correct place to pray'], 0, 'Jesus repeats the contrast between being seen by people and the Father who sees in secret. The passage examines motive and audience.', 'Find repeated words or actions and explain how they develop the contrast.']
  };

  var lessonEntities = {
    'world-of-the-bible': [
      { title: 'Abraham', kind: 'Biblical figure', note: "Trace the named stops in Genesis 12:1–9." },
      { title: 'Moses', kind: 'Biblical figure', note: "Compare his death in Deuteronomy 34 with the opening of Joshua." },
      { title: 'Joshua', kind: 'Biblical figure', note: "Read the commission to lead Israel across the Jordan in Joshua 1:1–9." },
      { title: 'Jerusalem', kind: 'Place', note: "Follow the city from the Babylonian conquest in 2 Kings 25 to the rebuilding decree in Ezra 1." },
      { title: 'Roman Empire', kind: 'Historical setting', note: "Luke 3:1–2 places John the Baptist’s ministry during the reign of Tiberius." }
    ],
    'how-the-bible-reached-us': [
      { title: 'Dead Sea Scrolls', kind: 'Manuscript collection' },
      { title: 'Codex Sinaiticus', kind: 'Biblical manuscript' },
      { title: 'Masoretic Text', kind: 'Textual tradition' },
      { title: 'Jerome', kind: 'Translator and scholar' },
      { title: 'Gutenberg Bible', kind: 'Printed Bible' }
    ],
    'the-tabernacle': [
      { title: 'Moses', kind: 'Biblical figure' },
      { title: 'Aaron', kind: 'Biblical figure' },
      { title: 'Bezalel', kind: 'Biblical artisan' },
      { title: 'Ark of the Covenant', kind: 'Sacred object' },
      { title: 'Tabernacle', kind: 'Sacred space' }
    ],
    'temple-and-gods-presence': [
      { title: 'Solomon', kind: 'Biblical king', note: "Read his prayer at the dedication in 1 Kings 8:22–30." },
      { title: 'David', kind: 'Biblical king', note: "In 2 Samuel 7, David proposes a house for God and receives the promise of a house of his own." },
      { title: 'First Temple', kind: 'Sacred space', note: "The temple built by Solomon is dedicated in 1 Kings 8." },
      { title: 'Second Temple', kind: 'Historical sanctuary', note: "Ezra 6:14–18 describes the completion and dedication after the exile." },
      { title: 'Herod the Great', kind: 'Historical ruler', note: "The Gospels open the story of Jesus’ family during his reign in Matthew 2." },
      { title: 'Temple Mount', kind: 'Place', note: "Use the map to locate the temple precinct relative to the Mount of Olives." }
    ],
    'kingdoms-prophets-exile': [
      { title: 'David', kind: 'Biblical king' },
      { title: 'Solomon', kind: 'Biblical king' },
      { title: 'Isaiah', kind: 'Biblical prophet' },
      { title: 'Jeremiah', kind: 'Biblical prophet' },
      { title: 'Neo-Assyrian Empire', kind: 'Historical empire' },
      { title: 'Neo-Babylonian Empire', kind: 'Historical empire' }
    ],
    'feasts-of-israel': [
      { title: 'Passover', kind: 'Festival' },
      { title: 'Shavuot', kind: 'Festival' },
      { title: 'Sukkot', kind: 'Festival' },
      { title: 'Yom Kippur', kind: 'Holy day' },
      { title: 'Moses', kind: 'Biblical figure' },
      { title: 'Jerusalem', kind: 'Pilgrimage destination' }
    ],
    'elijah': [
      { title: 'Elijah', kind: 'Biblical prophet', note: "Trace his movement from the brook at Cherith to the mountain at Horeb in 1 Kings 17–19." },
      { title: 'Ahab', kind: 'Biblical king of Israel', note: "Compare his exchange with Elijah on Carmel with the dispute over Naboth’s vineyard." },
      { title: 'Jezebel', kind: 'Biblical queen', note: "Read her threat after Carmel in 1 Kings 19:1–2." },
      { title: 'Mount Carmel', kind: 'Place', note: "The crowd gathers here in 1 Kings 18:19–20." },
      { title: 'Mount Horeb', kind: 'Place', note: "Elijah encounters God here in 1 Kings 19:8–18." },
      { title: 'Elisha', kind: 'Biblical prophet', note: "His call in 1 Kings 19:19–21 leads into the succession in 2 Kings 2." }
    ],
    'world-of-jesus': [
      { title: 'Jesus', kind: 'Historical and biblical figure', note: "Mark his named stops in Matthew 4, John 4 and Luke 9." },
      { title: 'Herod Antipas', kind: 'Historical ruler', note: "Luke calls him tetrarch of Galilee in Luke 3:1." },
      { title: 'Pontius Pilate', kind: 'Roman governor', note: "In Luke 23:1–4, Jesus is brought before this Roman official." },
      { title: 'Sea of Galilee', kind: 'Place', note: "Matthew 4:18–22 places the call of fishermen beside this lake." },
      { title: 'Jerusalem', kind: 'Place', note: "Luke 9:51 names the city as Jesus’ destination." },
      { title: 'Pharisees', kind: 'Second Temple Jewish movement', note: "Luke 7:36–50 records a discussion at the table of a Pharisee." }
    ],
    'jesus-parables-lab': [
      { title: 'Jesus', kind: 'Historical and biblical figure' },
      { title: 'Parables of Jesus', kind: 'Teaching form' },
      { title: 'Parable of the Good Samaritan', label: 'The Good Samaritan', kind: 'Parable' },
      { title: 'Parable of the Prodigal Son', label: 'The Prodigal Son', kind: 'Parable' },
      { title: 'Mustard seed', kind: 'Natural object' }
    ],
    'holy-week': [
      { title: 'Jesus', kind: 'Historical and biblical figure' },
      { title: 'Mary Magdalene', kind: 'New Testament figure' },
      { title: 'Caiaphas', kind: 'High priest' },
      { title: 'Pontius Pilate', kind: 'Roman governor' },
      { title: 'Saint Peter', label: 'Peter', kind: 'Apostle' },
      { title: 'Judas Iscariot', kind: 'New Testament figure' }
    ],
    'acts-jerusalem-to-nations': [
      { title: 'Jesus', kind: 'Historical and biblical figure' },
      { title: 'Saint Peter', label: 'Peter', kind: 'Apostle' },
      { title: 'Saint Stephen', label: 'Stephen', kind: 'Acts figure' },
      { title: 'Philip the Evangelist', label: 'Philip the Evangelist', kind: 'Acts figure' },
      { title: 'Cornelius the Centurion', label: 'Cornelius', kind: 'Acts figure' },
      { title: 'Paul the Apostle', label: 'Paul', kind: 'Apostle and missionary' }
    ],
    'pauls-missionary-journeys': [
      { title: 'Paul the Apostle', label: 'Paul', kind: 'Apostle and missionary' },
      { title: 'Barnabas', kind: 'Missionary coworker' },
      { title: 'Silas', kind: 'Missionary coworker' },
      { title: 'Saint Timothy', label: 'Timothy', kind: 'Missionary coworker' },
      { title: 'Luke the Evangelist', label: 'Luke', kind: 'New Testament figure' },
      { title: 'Priscilla and Aquila', kind: 'Missionary coworkers' }
    ],
    'job': [
      { title: 'Job', kind: 'Wisdom-literature figure', note: "The narrator introduces him as blameless and upright in Job 1:1." },
      { title: 'Eliphaz the Temanite', label: 'Eliphaz', kind: 'Job’s friend', note: "Compare his general claim in chapter 4 with his specific allegations in chapter 22." },
      { title: 'Bildad the Shuhite', label: 'Bildad', kind: 'Job’s friend', note: "In Job 8:3–7, Bildad turns a claim about divine justice into advice for Job." },
      { title: 'Zophar the Naamathite', label: 'Zophar', kind: 'Job’s friend', note: "Job 11:5–6 shows how far Zophar’s claim about Job’s guilt goes." },
      { title: 'Elihu', kind: 'Speaker in Job 32–37', note: "Job 32:1–5 introduces a later speaker and explains why he breaks his silence." },
      { title: 'Book of Job', kind: 'Wisdom literature', note: "The opening narrative, poetic speeches and final narrative give the reader different kinds of evidence." }
    ],
    'joshua-to-david': [
      { title: 'Book of Joshua', kind: 'Biblical book', note: "Joshua 1 and 24 frame the leadership of Joshua with commission and covenant renewal." },
      { title: 'Book of Judges', kind: 'Biblical book', note: "Judges 2 explains the generational failure that frames the cycle of the book." },
      { title: 'Books of Samuel', kind: 'Biblical books', note: "First Samuel 8 and 16 trace the request for monarchy and David’s anointing." },
      { title: 'Saul', kind: 'Biblical figure', note: "Compare Israel’s desire for a king in 1 Samuel 8 with Saul’s public selection in chapter 10." },
      { title: 'David', kind: 'Biblical figure', note: "Trace his descent in Ruth 4 and the promise to his house in 2 Samuel 7." },
      { title: 'Tel Dan Stele', kind: 'Archaeological inscription', note: "Compare the inscription shown in the visual journey with the lesson’s question about the name House of David." }
    ],
    'exodus': [
      { title: 'Book of Exodus', kind: 'Biblical book', note: "Trace the movement from forced labor through deliverance to a sanctuary for worship." },
      { title: 'Moses', kind: 'Biblical figure', note: "Compare his question in Exodus 3:11 with God’s answer in verse 12." },
      { title: 'Passover', kind: 'Jewish festival', note: "Exodus 12 links rescue to a recurring meal and explanation for children." },
      { title: 'Mount Sinai', kind: 'Place', note: "Exodus 19 places Israel at the mountain before introducing the covenant." },
      { title: 'Ten Commandments', kind: 'Covenant law', note: "Exodus 20:2 grounds the commands in deliverance from Egypt." },
      { title: 'Pharaoh', kind: 'Egyptian office', note: "Compare the ruler’s fears in Exodus 1 with his later responses to Moses." }
    ],
    'leviticus': [
      { title: 'Book of Leviticus', kind: 'Biblical book', note: "Read the instructions for worship in chapter 1 beside the community laws in chapter 19." },
      { title: 'Aaron', kind: 'Biblical priest', note: "Follow his responsibilities in the atonement rites in Leviticus 16." },
      { title: 'Day of Atonement', kind: 'Holy day', note: "Compare the stated purpose of the rites in Leviticus 16:29–34 with the two goats’ roles." },
      { title: 'Tabernacle', kind: 'Sacred space', note: "Leviticus 1:1 places the opening speech at the tent of meeting." },
      { title: 'Jubilee (biblical)', label: 'Jubilee', kind: 'Covenant practice', note: "Leviticus 25 ties liberty and the return of land to a recurring cycle." }
    ],
    'numbers': [
      { title: 'Book of Numbers', kind: 'Biblical book', note: "Compare the opening census with the generation described at the end of Numbers 26." },
      { title: 'Moses', kind: 'Biblical leader', note: "Compare his complaint in Numbers 11 with his public commissioning of Joshua in chapter 27." },
      { title: 'Miriam', kind: 'Biblical leader', note: "Numbers 12 records her challenge alongside Aaron, and Numbers 20:1 records her death." },
      { title: 'Caleb', kind: 'Biblical scout', note: "Compare what he says alone in Numbers 13:30 with what he and Joshua say in 14:6–9." },
      { title: 'Joshua', kind: 'Biblical leader', note: "His commission in Numbers 27 prepares for the opening of the next book." }
    ],
    'deuteronomy': [
      { title: 'Book of Deuteronomy', kind: 'Biblical book' },
      { title: 'Moses', kind: 'Biblical leader' },
      { title: 'Shema Yisrael', label: 'The Shema', kind: 'Biblical confession' },
      { title: 'Plains of Moab', kind: 'Place' },
      { title: 'Mount Nebo', kind: 'Place' },
      { title: 'Song of Moses', kind: 'Biblical poem' },
      { title: 'Nash Papyrus', kind: 'Ancient manuscript' },
      { title: 'Joshua', kind: 'Successor to Moses' }
    ],
    'genesis': [
      { title: 'Book of Genesis', kind: 'Biblical book', note: "Follow the movement from the creation of the world to a family living in Egypt." },
      { title: 'Abraham', kind: 'Biblical figure', note: "Genesis 12:1–3 names land, descendants and wider blessing in the call." },
      { title: 'Joseph (Genesis)', label: 'Joseph', kind: 'Biblical figure', note: "Genesis 50:20 distinguishes his brothers’ intention from God’s purpose." },
      { title: 'Garden of Eden', kind: 'Biblical place', note: "Compare the humans’ responsibilities in Genesis 2:15–17 with their departure in 3:22–24." },
      { title: 'Tower of Babel', kind: 'Biblical narrative', note: "Read the builders’ reason in Genesis 11:4 alongside the outcome in 11:8–9." },
      { title: 'Ur', kind: 'Mesopotamian city', note: "Genesis 11:31 names Ur as the starting point of a family migration through Haran." }
    ],
    'jesus-ministry': [
      { title: 'Jesus', kind: 'Historical and biblical figure', note: "Compare the voice at his baptism with the disciples’ question after the storm." },
      { title: 'John the Baptist', kind: 'Biblical figure', note: "Mark 1:4–11 introduces John’s preaching and his baptism of Jesus." },
      { title: 'Baptism of Jesus', kind: 'Gospel event', note: "Read the voice and the descent of the Spirit in Mark 1:9–11." },
      { title: 'Temptation of Christ', kind: 'Gospel event', note: "Compare Mark’s brief telling with Jesus’ replies in Matthew 4." },
      { title: 'Kingship and kingdom of God', kind: 'Theme', note: "Mark 1:14–15 ties the kingdom’s nearness to repentance and belief." },
      { title: 'Calling of the disciples', kind: 'Gospel event', note: "Compare the call of the fishermen in Mark 1 with the call of Levi in Mark 2." },
      { title: 'Miracles of Jesus', kind: 'Gospel signs', note: "Compare who responds and what they say after the healing in Mark 2 and the storm in Mark 4." },
      { title: 'Capernaum', kind: 'Place', note: "Mark 1:21 brings Jesus and the disciples to the synagogue here." },
      { title: 'Sea of Galilee', kind: 'Place', note: "The disciples cross the lake when the storm rises in Mark 4:35–41." },
      { title: 'Banias', kind: 'Place · ancient Caesarea Philippi', note: "Use the visual journey to orient Caesarea Philippi, the area where Mark places Peter’s confession." },
      { title: 'Gospel of Mark', kind: 'Biblical book', note: "Trace how the question of Jesus’ identity develops between Mark 1 and Mark 8." }
    ],
    'sermon-on-the-mount': [
      { title: 'Jesus', kind: 'Historical and biblical figure' },
      { title: 'Sermon on the Mount', kind: 'Gospel discourse' },
      { title: "Lord's Prayer", kind: 'Prayer' },
      { title: 'Beatitudes', kind: 'Teachings' },
      { title: 'Sea of Galilee', kind: 'Place' },
      { title: 'Gospel of Matthew', kind: 'Biblical book' }
    ]
  };

  var main = document.querySelector('[data-bible-lesson]');
  if (!main) return;
  var id = main.getAttribute('data-bible-lesson');
  var index = lessons.findIndex(function (lesson) { return lesson.id === id; });
  var lesson = lessons[index];
  if (!lesson || !lesson.lenses) { main.innerHTML = '<p>Lesson data could not be loaded.</p>'; return; }
  lesson.image = lessonImages[lesson.id] || lessonImages['world-of-the-bible'];
  lesson.visualJourney = lessonVisualJourneys[lesson.id] || [];
  lesson.map = Object.assign({}, geographyMaps[lessonMapKeys[lesson.id]] || geographyMaps.nearEast, {
    note: lessonMapNotes[lesson.id] || 'Use this reference map for broad orientation. It clarifies relative place and scale, but it is not a complete reconstruction of every biblical setting.'
  });
  lesson.entities = lessonEntities[lesson.id] || [{ title: 'Bible', kind: 'Scriptural library' }];
  lesson.passages = lessonPassages[lesson.id] || [['Genesis',1,1,3]];
  lesson.story = lessonStoryContext[lesson.id] || {
    focus: ['creation', 'covenant', 'jesus', 'church', 'new-creation'],
    bigIdea: 'This lesson places a particular biblical text inside the Bible’s unfolding story without flattening its own context.',
    before: 'Earlier Scripture establishes the world, promises, crises, and questions that shape this lesson.',
    now: lesson.title + ' gives students a focused way to read its text, setting, and theological movement.',
    next: 'Carry the lesson’s question forward into the next stage of the pathway and return to the text for evidence.'
  };
  lesson.investigation = lessonInvestigations[lesson.id] || [lesson.scripture, 'What should a careful reader do first?', ['Observe the passage and its context', 'Skip directly to a conclusion'], 0, 'Begin with the passage, its setting, and its repeated details before making a claim.', 'Record two observations and one question before explaining the text.'];
  main.setAttribute('data-stage-theme', lesson.code.charAt(0));

  // Extended-lesson data. A lesson is "deep" when its lenses carry the optional trailing fields
  // [passageIndex, connectForward, hardQuestion]; the fields below then replace the single check,
  // the single notes box, and add a hard-questions panel.
  var lessonChecks = {
    "world-of-the-bible": [
      ["Why does Genesis name stopping places?", ["The stops mark movement and worship", "They list Roman provinces", "They give exact travel times"], 0, "Genesis 12 names Shechem, the hills and the Negev, and describes Abram building altars."],
      ["What changes at the opening of Joshua?", ["Joshua takes responsibility after Moses dies", "The monarchy begins", "Israel returns to Egypt"], 2, "Joshua 1 names Moses’ death and commissions Joshua to lead the crossing."],
      ["How does Luke anchor John’s ministry?", ["By naming Abraham’s sons", "By naming rulers and offices", "By giving the distance to Rome"], 1, "Luke 3:1–2 situates the word to John alongside several overlapping authorities."],
      ["What does Paul appeal to in Acts 17:24–28?", ["A Roman census", "The God who made the world and gives life", "The walls of Jericho"], 0, "Paul begins with creation and the life shared by his hearers."],
      ["Can a named ruler date an account exactly?", ["Can named rulers narrow the setting?", "Does every name give an exact day?"], 0, "Named offices can constrain the period. Dating systems and overlaps still matter."],
      ["Can a map give Abram’s exact itinerary?", ["Can it identify every campsite?", "Can it locate named places relative to one another?"], 1, "Genesis names some stops. Any connecting line adds an interpretive choice."]
    ],
    "temple-and-gods-presence": [
      ["What is guarded in Genesis 3:24?", ["The way to the tree of life", "An altar in Jerusalem", "The gate to a Roman city"], 0, "The cherubim guard the way after the humans are sent out."],
      ["What does Solomon say cannot contain God?", ["Even the highest heaven", "Only the courtyard", "The altar alone"], 2, "His dedication prayer holds together God’s presence and the limits of the building."],
      ["Who dwells among the witnesses in John 1?", ["The Word made flesh", "Solomon", "Moses"], 1, "John describes the witnesses seeing the Word’s glory in the incarnation."],
      ["What does John see in place of a temple building?", ["God and the Lamb as the city’s temple", "A rebuilt tabernacle", "A new palace for Solomon"], 0, "Revelation 21:22 identifies God and the Lamb as the temple."],
      ["Who is called a temple in 1 Corinthians 3:16–17?", ["The community Paul addresses", "Only a priest in Jerusalem"], 0, "Paul addresses a community divided by rival loyalties. His warning makes their common life matter."],
      ["Does an echo make two scenes identical?", ["Treat every repeated detail as a code", "Read each scene in context first"], 1, "A guarded garden and an open city can echo one another precisely because what changes matters."]
    ],
    "elijah": [
      ["What happens to the brook in 1 Kings 17?", ["It dries up", "It carries Elijah to Carmel", "It turns to oil"], 0, "The drought affects Elijah’s own water source, and the next word sends him elsewhere."],
      ["What does the widow say after her son is restored?", ["The Lord’s word in Elijah’s mouth is true", "Ahab has kept his promise", "The drought never happened"], 2, "Her words in verse 24 interpret what has happened in her household."],
      ["What reason does Elijah give for his prayer?", ["That the altar may remain dry", "That Israel may know the Lord and turn back", "That Ahab may declare Elijah king"], 1, "Elijah’s prayer in verses 36–37 names what he wants the people to know."],
      ["What follows Elijah’s encounter at Horeb?", ["He is sent back with assignments", "He is told he is the only faithful Israelite", "He retires permanently"], 0, "The passage gives instructions, names Elisha and speaks of seven thousand."],
      ["Why does Naboth refuse Ahab’s offer?", ["He invokes his ancestral inheritance", "He has already sold the vineyard"], 0, "First Kings 21:3 makes the inheritance central to the refusal."],
      ["What separates Elijah and Elisha in 2 Kings 2:11?", ["A drought at Cherith", "A fiery chariot and horses"], 1, "The chariot separates them, and the whirlwind carries Elijah up."]
    ],
    "job": [
      ["How does the narrator first describe Job?", ["Blameless and upright", "Secretly unjust", "A king in Israel"], 0, "Job 1:1 gives this description before Job suffers."],
      ["What do the friends do on their arrival?", ["They sit with him in silence", "They demand restitution", "They diagnose Job immediately"], 2, "Verse 13 says they sit seven days and nights because his suffering is so great."],
      ["What does Job curse at the start of chapter 3?", ["The creation of the sea", "The day of his birth", "His friends’ hometowns"], 1, "The poem opens by grieving that he was born."],
      ["What does God ask Job about?", ["The foundations of the earth and the bounds of the sea", "Which friend brought him food", "How to divide his estate"], 0, "The questions turn toward creation and Job’s limits as an observer."],
      ["What does God say about the friends’ speech?", ["They have not spoken rightly about God as Job has", "Their diagnosis was entirely correct"], 0, "Job 42:7 directly addresses Eliphaz and the two friends."],
      ["Does Job 38 give Job the conversation of chapter 1?", ["God recites it to Job from the storm", "The reader hears that conversation in the opening"], 1, "The narrative gives the reader access to a scene Job does not hear."]
    ],
    "world-of-jesus": [
      ["Where does Jesus settle after leaving Nazareth in Matthew 4?", ["Capernaum", "Jericho", "Bethany"], 0, "Matthew 4:13 names Capernaum by the lake."],
      ["What surprises the woman at the well?", ["That the well has no water", "That she has arrived in Jerusalem", "That Jesus asks her for a drink"], 2, "John 4:9 grounds the surprise in their identities."],
      ["What destination shapes the refusal in Luke 9:53?", ["Rome", "Capernaum", "Jerusalem"], 1, "The narrator connects the village’s response to Jesus’ destination."],
      ["What do the authorities ask about in Mark 11:28?", ["Who gave Jesus authority", "Where Nazareth is located", "How to cross the Jordan"], 0, "Their question concerns the authority behind his actions."],
      ["Can a map recover each overnight stop?", ["Use named locations and distinguish inferred segments", "Treat a modern road route as certain"], 0, "The passages supply endpoints and selected encounters, leaving many details unstated."],
      ["Do Luke 9 and John 4 describe the same reception?", ["Both stories end with rejection", "The responses differ in the two passages"], 1, "Compare the refusing village in Luke with the invitation to stay in John."]
    ],
    "genesis": [
      ["Who bears God’s image in Genesis 1?", ["Humanity, male and female", "Only rulers", "Only one family"], 0, "Genesis 1:27 applies image-bearing to humanity."],
      ["What do the humans do when they hear God in the garden?", ["They build an altar", "They name the animals again", "They hide"], 2, "Genesis 3:8 depicts damaged fellowship before the later expulsion."],
      ["Who is included in the horizon of Abram’s blessing?", ["Only Pharaoh’s officials", "All families of the earth", "Abram alone"], 1, "Genesis 12:3 looks outward from Abram to the families of the earth."],
      ["How does Joseph describe his brothers’ intention?", ["They intended harm", "They planned to preserve life", "They had no role in his story"], 0, "Joseph distinguishes their intention from God’s purpose in verse 20."],
      ["What reason does Genesis 11:4 give for building the city?", ["The builders fear being scattered", "The builders want to cross the sea"], 0, "The story puts this concern in their own speech before the scattering."],
      ["Does Joseph tell his brothers that their act was good?", ["He declares that no harm was intended", "He names their intent as harm and God’s aim as good"], 1, "Verse 20 holds two intentions in view."]
    ],
    "exodus": [
      ["What motivates Pharaoh’s oppression in Exodus 1?", ["Fear of Israel’s growth and potential alliances", "An invitation from Moses", "A famine reported by Joseph"], 0, "Verses 9–10 give Pharaoh’s stated fears before the narrator describes forced work."],
      ["What does God promise Moses in Exodus 3:12?", ["God’s presence with him", "A route that avoids Pharaoh", "An immediate coronation"], 2, "God responds to “Who am I?” with a promise to be with Moses."],
      ["How does Exodus 12 describe the day for later generations?", ["A festival restricted to Pharaoh", "A memorial to keep", "A census deadline"], 1, "The instructions establish a remembrance as part of the rescue account."],
      ["What does God recall before the commandments?", ["Israel’s release from slavery", "Israel’s successful temple building", "Israel’s return from Babylon"], 0, "Exodus 20:2 puts the rescue before the commandments."],
      ["What changes between Exodus 14:21–31 and 15:1–13?", ["The event becomes a song addressed to God", "A different army arrives"], 0, "The song lets the community retell deliverance as praise."],
      ["What image of rescue appears in Exodus 19:4?", ["Climbing a royal staircase", "Being borne on eagles’ wings"], 1, "The image leads into God’s covenant proposal in verses 5–6."]
    ],
    "leviticus": [
      ["Who is addressed at the beginning of Leviticus 1?", ["Moses, with instructions for the Israelites", "Solomon, with instructions for builders", "Joshua alone"], 0, "God calls to Moses from the tent and tells him to speak to Israel."],
      ["What response does Leviticus 15:16 specify?", ["Pay a worker’s wages early", "Leave Israel permanently", "Wash and remain unclean until evening"], 2, "The verse assigns washing and a time limit to a bodily condition."],
      ["How are the goats assigned their roles?", ["By having each household choose", "By casting lots", "By counting their ages"], 1, "Verses 8–10 distinguish the goat for the Lord from the living goat sent away."],
      ["For whom are the field edges and gleanings left?", ["The poor and the foreigner", "The priests alone", "The landowner’s household alone"], 0, "Leviticus 19:9–10 names the people who benefit."],
      ["How do verses 18 and 34 relate?", ["Both require love and verse 34 names the resident foreigner", "Verse 34 revokes verse 18"], 0, "Verse 34 adds Israel’s memory of living in Egypt as a reason."],
      ["What happens in Leviticus 25:10?", ["Israel leaves Egypt a second time", "Liberty is proclaimed and people return to their holdings and clans"], 1, "The Jubilee passage connects time, freedom and land."]
    ],
    "numbers": [
      ["What is the camp arranged around?", ["The tent of meeting", "A palace", "The city of Jericho"], 0, "Numbers 2:2 locates the tribal encampments in relation to the tent."],
      ["What does Moses say about carrying the people?", ["The census solved the problem", "No one complained", "The burden is too heavy for him alone"], 2, "Moses’ complaint leads into God’s provision of elders."],
      ["What observation and conclusion are distinct?", ["Caleb calls the land barren", "Fortified towns are reported, and the scouts disagree about going up", "The scouts disagree whether towns exist"], 1, "The shared report leads to rival judgments about what Israel should do."],
      ["What does Moses do before the congregation?", ["He commissions Joshua", "He makes Caleb priest", "He appoints himself king"], 0, "Joshua receives a public commission in Numbers 27:22–23."],
      ["What follows Moses’ intercession in Numbers 14:19–24?", ["Pardon is announced, and the generation still faces consequences", "Everyone enters immediately"], 0, "The passage gives both pardon and an exclusion from the land."],
      ["Why compare Numbers 13 with Deuteronomy 1?", ["To combine every speech into one speaker’s words", "To see how Moses retells the event for a later audience"], 1, "Read each account’s speaker and purpose before bringing details together."]
    ],
    "joshua-to-david": [
      ["What is Joshua told to keep close at hand?", ["The book of the law", "Saul’s armor", "David’s harp"], 0, "Joshua 1:7–8 connects courage with careful attention to the law."],
      ["What changes after Joshua’s generation dies?", ["Israel immediately requests Saul as king", "The temple is rebuilt", "A generation arises that does not know the Lord’s work for Israel"], 2, "Judges 2:10 links the generational break to loss of memory."],
      ["How is Ruth’s son related to David?", ["Obed succeeds David as king", "Obed is David’s grandfather", "Obed is David’s father"], 1, "Ruth 4:17 gives the line from Obed through Jesse to David."],
      ["What two meanings of house matter in the promise?", ["A dynasty and a sanctuary", "A tent and a farm", "A palace and a city wall"], 0, "God promises David a house, and David’s offspring will build a house for God’s name."],
      ["What does Samuel warn a king will do in 1 Samuel 8?", ["Take people and property for royal service", "Eliminate every tax and levy"], 0, "The repeated verb “take” gives the warning its force."],
      ["Why does Samuel initially think Eliab is chosen?", ["He has read the genealogy in Ruth", "He sees Eliab’s appearance"], 1, "First Samuel 16:6–7 contrasts Samuel’s impression with the Lord’s judgment."]
    ],
    "jesus-ministry": [
      ["What happens before Jesus announces the kingdom in Mark 1:14–15?", ["Jesus is baptized and driven into the wilderness", "Peter confesses Jesus as Christ", "The spies return from Canaan"], 0, "Mark places the baptism and wilderness before the public proclamation."],
      ["What does Jesus say is fulfilled “today”?", ["A request from Pilate", "The promise of a new Roman road", "The Scripture just read in the synagogue"], 2, "Luke ties the claim to the reading before the audience."],
      ["Why does Jesus tell the man to rise?", ["To settle an argument over travel", "To make his authority to forgive visible", "To test whether the roof is stable"], 1, "Jesus gives his purpose in Mark 2:10."],
      ["What follows Peter’s confession in Mark?", ["Jesus teaches about suffering and following him", "Peter is sent to govern Capernaum", "Jesus ends the journey"], 0, "Peter’s answer opens further teaching about the Messiah and discipleship."],
      ["What question closes Mark 4:35–41?", ["Who is this, that even wind and sea obey?", "Which side of the lake has better fishing?"], 0, "The response draws the reader toward Jesus’ identity."],
      ["What picture does Jesus use to explain his company?", ["A king inspecting his army", "A physician and people who are sick"], 1, "The image explains the purpose of his call in Mark 2:17."]
    ],
    'deuteronomy': [
      ['Deuteronomy 5:3 says the Lord made this covenant “not with our fathers… but with us, who are all of us here alive today.” What is Moses doing?', ['Claiming Sinai never happened', 'Making the old covenant present and binding on a new generation', 'Replacing the covenant with one that has no connection to Sinai'], 1, 'Retelling makes the Sinai covenant the responsibility of the generation now standing at the Jordan. It neither denies Sinai nor replaces it.'],
      ['The Sabbath command in 5:12–15 gives a different reason than Exodus 20:8–11. What does that show?', ['One book copied the other wrongly', 'Moses retells and applies the law, here tying rest to rescue from slavery', 'The Sabbath is dropped in Deuteronomy'], 1, 'Exodus 20:11 grounds the Sabbath in creation; Deuteronomy 5:15 grounds it in the exodus. Same command, new emphasis for a new audience.'],
      ['Why does Moses tie care for the sojourner to Israel’s own history (10:19)?', ['Foreigners were banned from the land', 'It was a purely ceremonial rule', 'Remembering slavery is meant to shape how the strong treat the vulnerable'], 2, '“You were sojourners in the land of Egypt” turns memory into a reason for justice. The laws on debt and harvest in chapters 15 and 24 use the same reason.'],
      ['What is the main danger of prosperity in chapter 8?', ['Forgetting God and crediting “my power and the might of my hand”', 'The land will have no water', 'Only the priests will forget the law'], 0, 'Deuteronomy 8:11–18 warns that comfort tempts a people to forget where it came from and to claim its success as its own doing.'],
      ['How does Deuteronomy 17:14–20 treat a king?', ['It commands Israel to appoint a king immediately', 'It allows a king but limits his wealth, army, and wives and puts him under the written law', 'It forbids any form of leadership'], 1, 'The king must be one the Lord chooses, may not multiply horses, wives, or gold, and must copy and read the law “all the days of his life” (17:15–19).'],
      ['What is the purpose of remembering in Deuteronomy?', ['To replace action with nostalgia', 'To claim the wilderness had no failures', 'To shape present love, gratitude, teaching, and faithfulness'], 2, 'Moses retells the past so a new generation can live faithfully in the future.'],
      ['How does the book of Deuteronomy end?', ['With Israel crossing the Jordan', 'With Moses on Mount Nebo, shown the land, and his death', 'With the fall of Jericho'], 1, 'Chapter 34 ends with Moses viewing the land from Nebo and dying. The crossing begins the book of Joshua.']
    ]
  };
  var lessonReflectFields = {
    "world-of-the-bible": [
      ["A route in the text", "Cite a verse and describe one detail you can observe."],
      ["A generation changes", "Compare this lens with the first. Name a change and support it with a verse."],
      ["Rulers as time markers", "Explain how a detail in this passage supports one of your claims."],
      ["The story travels", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "temple-and-gods-presence": [
      ["A guarded garden", "Cite a verse and describe one detail you can observe."],
      ["A house for prayer", "Compare this lens with the first. Name a change and support it with a verse."],
      ["The Word dwells", "Explain how a detail in this passage supports one of your claims."],
      ["The city’s temple", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "elijah": [
      ["Cherith in drought", "Cite a verse and describe one detail you can observe."],
      ["A widow’s household", "Compare this lens with the first. Name a change and support it with a verse."],
      ["Carmel before Israel", "Explain how a detail in this passage supports one of your claims."],
      ["Horeb and return", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "job": [
      ["The narrator’s frame", "Cite a verse and describe one detail you can observe."],
      ["The friends arrive", "Compare this lens with the first. Name a change and support it with a verse."],
      ["Job laments", "Explain how a detail in this passage supports one of your claims."],
      ["Questions from the storm", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "world-of-jesus": [
      ["Galilee’s towns", "Cite a verse and describe one detail you can observe."],
      ["Samaria and reception", "Compare this lens with the first. Name a change and support it with a verse."],
      ["Judea and the road", "Explain how a detail in this passage supports one of your claims."],
      ["Jerusalem and authority", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "genesis": [
      ["Image and blessing", "Cite a verse and describe one detail you can observe."],
      ["After disobedience", "Compare this lens with the first. Name a change and support it with a verse."],
      ["Promise after Babel", "Explain how a detail in this passage supports one of your claims."],
      ["Joseph looks back", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "exodus": [
      ["Labor and memory", "Cite a verse and describe one detail you can observe."],
      ["Moses sent", "Compare this lens with the first. Name a change and support it with a verse."],
      ["Passover remembered", "Explain how a detail in this passage supports one of your claims."],
      ["The covenant opens", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "leviticus": [
      ["An offering brought", "Cite a verse and describe one detail you can observe."],
      ["Ritual status", "Compare this lens with the first. Name a change and support it with a verse."],
      ["The two goats", "Explain how a detail in this passage supports one of your claims."],
      ["Holiness in the field", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "numbers": [
      ["The camp’s center", "Cite a verse and describe one detail you can observe."],
      ["Leadership under strain", "Compare this lens with the first. Name a change and support it with a verse."],
      ["A divided report", "Explain how a detail in this passage supports one of your claims."],
      ["A successor", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "joshua-to-david": [
      ["Leadership after Moses", "Cite a verse and describe one detail you can observe."],
      ["Judges and memory", "Compare this lens with the first. Name a change and support it with a verse."],
      ["Ruth and a household", "Explain how a detail in this passage supports one of your claims."],
      ["Promise to David", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    "jesus-ministry": [
      ["The beloved Son", "Cite a verse and describe one detail you can observe."],
      ["Nazareth hears Isaiah", "Compare this lens with the first. Name a change and support it with a verse."],
      ["At the crowded house", "Explain how a detail in this passage supports one of your claims."],
      ["Confession and cost", "Use this lens to revisit the lesson question. Record one question you would take back to the text."]
    ],
    'deuteronomy': [
      ['What happened', 'Name one event Moses retells (for example the spies, the manna, or the golden calf) and cite the chapter.'],
      ['What it reveals about God', 'What does the event show about who God is and how God acts? Use a verse as evidence.'],
      ['The danger of forgetting', 'What does Moses say could go wrong if this is forgotten? Look at chapter 8 or 6:10–12.'],
      ['One faithful practice for today', 'Name one concrete habit that keeps this memory alive, like the Shema’s morning-and-evening rhythm or the firstfruits creed.']
    ]
  };
  var lessonHardQuestions = {
    "world-of-the-bible": [
      ["Where was Abram’s Ur?", "Genesis 11:28–31 calls it Ur of the Chaldeans and names Haran as a stop.", "Readers commonly identify Ur with the southern Mesopotamian city. The text gives no coordinates or road log.", "Label the proposed location and leave the path between named stops open."],
      ["How much does a chronological anchor tell us?", "Luke 3 names imperial, regional and priestly authorities before John begins to speak.", "An anchor can narrow the setting. Dating the start of a reign can depend on which calendar or starting point is used.", "Explain what Luke’s list establishes even if readers differ on the precise year."],
      ["How do two sources tell the fall of Lachish?", "Second Kings 18:13–17 mentions the Assyrian campaign and Lachish. The relief depicts the capture and deportation from an Assyrian perspective.", "A royal relief and a biblical narrative select details for different audiences and purposes.", "Find one overlapping detail and one question that only one of the sources addresses."],
      ["Does a regional label apply in every era?", "Genesis describes Abram traveling to Canaan. Luke 3 identifies several territories under named officials.", "Maps typically represent a particular period or the physical landscape. Political lines change over time.", "Choose a map appropriate to each passage and explain which labels can carry over."]
    ],
    "temple-and-gods-presence": [
      ["Can God inhabit a building?", "The cloud fills the house in 1 Kings 8:10–11, and Solomon asks in verse 27 whether even heaven can contain God.", "Readers distinguish a place where God makes his presence known from a place that encloses him.", "Read verses 28–30 for what Solomon asks God to do when people pray toward the house."],
      ["Are all temple images interchangeable?", "John 2:21 identifies Jesus’ body as the temple, and 1 Corinthians 3:16 addresses the community as God’s temple.", "Both passages use sanctuary language. The first concerns Jesus and the second explains why destroying a community is serious.", "Name the referent in each passage before drawing a connection."],
      ["How does Ezekiel picture absence and return?", "Ezekiel 10:18–19 depicts glory departing, and 43:1–5 depicts it returning to the house from the east.", "The visions use movement to frame judgment and hope. Readers debate the relationship between the envisioned temple and later sanctuaries.", "Compare the direction and location of the glory in both scenes before considering fulfillment."],
      ["Why does the final city lack a sanctuary building?", "Revelation 21:22–25 identifies God and the Lamb as the temple and describes the city’s open gates.", "Many readers see the scene as an expansion of sacred presence to the whole city.", "Compare the city’s access and light with the guarded way in Genesis 3:24."]
    ],
    "elijah": [
      ["What does Carmel establish?", "In 1 Kings 18:36–39 Elijah prays for Israel to turn back, and the people acclaim the Lord.", "The story presents a covenant confrontation within Ahab’s Israel. Its religious claims and the violent aftermath in verse 40 raise distinct questions.", "Track the people’s changing response from verse 21 to verse 39 before discussing the aftermath."],
      ["Do Carmel and Horeb contradict each other?", "Fire answers prayer at Carmel. At Horeb, 1 Kings 19:11–13 distinguishes the Lord’s presence from the wind, earthquake and fire.", "Some readers emphasize the contrast in intensity. Others emphasize that the two encounters address different needs and audiences.", "Compare who hears, what God says or does, and what each encounter asks of Elijah."],
      ["Why does the story dwell on Naboth’s vineyard?", "First Kings 21 describes Naboth’s refusal, his death through false accusation, and Elijah’s confrontation with Ahab.", "Readers see prophetic speech addressing the use of royal power as well as the people’s worship.", "Compare what Ahab wants with what Naboth says he has inherited."],
      ["What does Elisha inherit?", "Elisha asks for a double portion of Elijah’s spirit in 2 Kings 2:9, and he later picks up Elijah’s cloak.", "Some readers hear the language of an heir’s share. The story shows Elisha assuming Elijah’s prophetic role.", "Use 2 Kings 2:13–15 to identify how the other prophets respond to the succession."]
    ],
    "job": [
      ["Does suffering prove guilt?", "Eliphaz links trouble with wrongdoing in Job 4:7–8. Job 1:1 and 2:3 present Job as upright.", "Proverbs often connect conduct and consequence. Job puts pressure on turning that pattern into a diagnosis of another person.", "Cite the speaker of each claim and compare both claims with the verdict in 42:7."],
      ["Do the speeches answer Job’s question?", "God’s speech asks about creation and its creatures. It gives Job no account of the conversation in chapter 1.", "Readers differ on whether the speeches offer an answer through perspective, relationship, or both.", "Compare what Job says he now knows in 42:1–6 with what the opening lets the reader know."],
      ["What changes when a friend becomes an accuser?", "Job 2:11–13 depicts the friends sitting in silence. In Job 22:5–11 Eliphaz accuses Job of specific abuses.", "Readers often distinguish the friends’ initial act of solidarity from the claims they make after the debate begins.", "Check Eliphaz’s allegations against the narrator and against Job’s defense in chapter 31."],
      ["Does restoration undo the opening losses?", "Job 42:10–17 speaks of prosperity and children after Job’s earlier children die in chapter 1.", "Readers may hear the ending as renewed life while also asking how a restored future relates to grief for particular people.", "Compare the two household scenes and name what is restored and what remains painful."]
    ],
    "world-of-jesus": [
      ["What can we infer about travel through Samaria?", "John 4 names a journey through Samaria and a stop at Sychar. Luke 9 describes a village that refuses Jesus.", "The two settings show different responses. A map can locate the region and help explain the journey while the narratives supply social context.", "Mark the named places, then compare what each narrator says about the encounter."],
      ["Who has authority in Jerusalem?", "Mark 11 names chief priests, scribes and elders. In Luke 23:1–4, Jesus is brought before Pilate.", "The passages focus on different proceedings and kinds of authority within Roman rule.", "Identify the question each group asks and the authority it assumes."],
      ["What does Luke explain through geography?", "Luke 9:53 connects a village’s refusal with Jesus’ intention to go to Jerusalem.", "Readers look to competing worship centers and regional identity for context. John 4:20 names the dispute over where to worship.", "Distinguish Luke’s stated reason from details a reader learns in John."],
      ["Why do some Gospel location labels need care?", "Matthew 4:13 locates Capernaum by the sea. The text gives no precise point on the shore for every encounter.", "Archaeological sites and regional maps help readers orient named places. A traditional site can also reflect centuries of commemoration.", "Identify one site the passage names and one detail that comes from a modern map or tradition."]
    ],
    "genesis": [
      ["How do Genesis 1 and 2 focus attention differently?", "Genesis 1 orders creation in days. Genesis 2 follows the human, garden, work and relationships.", "Readers differ on how the sequences fit. Both chapters frame humanity’s place and responsibilities within creation.", "Compare the scope of each account before proposing how they relate."],
      ["How does promise follow scattering?", "Genesis 11 depicts divided languages and dispersal. Genesis 12 promises blessing to all families through Abram.", "Many readers see the placement as a literary response to Babel. The narrative gives no order to reunite everyone around a single city.", "Compare who seeks a name in Genesis 11:4 with who promises a name in 12:2."],
      ["What does the flood story say about the future?", "Genesis 9:8–17 describes a covenant with Noah, his descendants and living creatures.", "The promise has a wider scope than Noah’s household and a specific focus on the waters of the flood.", "Name the recipients and the stated promise. Compare its scope with Genesis 12:1–3."],
      ["How much work can a genealogy do?", "Genesis repeatedly introduces sections with a statement about generations or family history, including Genesis 5:1 and 37:2.", "Readers use these headings to track family descent and the movement of the book. Traditions differ in how they use the lists for chronology.", "Compare the kind of material each heading introduces before using either for a date."]
    ],
    "exodus": [
      ["Who hardens Pharaoh’s heart?", "Exodus 8:15 depicts Pharaoh hardening his heart, and 9:12 attributes hardening to the Lord.", "Readers ask how the narrative holds divine agency and Pharaoh’s responsibility together. The passages place both claims in the story.", "Trace the stated subject and Pharaoh’s responses in several episodes before explaining either claim."],
      ["Where was the sea crossing?", "Exodus 14 names encampments and gives movement and direction in narrative terms.", "Proposed locations vary with the identification of ancient place names and the meaning of the Hebrew sea name.", "Mark the difference between a location named in the story and a proposed modern identification."],
      ["Why put questions into the Passover instructions?", "Exodus 12:24–27 anticipates children asking what the observance means.", "Readers see the meal teaching a household to connect an action with a shared story.", "Write the question from the child’s perspective, then answer it using the reasons in verse 27."],
      ["Why does Exodus keep going after the crossing?", "Exodus 14 ends with rescue, chapter 19 names a covenant vocation and 25:8 looks toward a sanctuary.", "Readers trace a movement from deliverance to a community ordered around worship and service.", "Compare what Israel is delivered from with the responsibilities and practices later named."]
    ],
    "leviticus": [
      ["When does uncleanness carry blame?", "Leviticus 15 prescribes temporary uncleanness and washing after some ordinary bodily processes.", "Ritual status determines participation in worship in this setting. Other laws address injury, injustice and wrongdoing.", "For each example, identify the trigger, required response and any stated duration."],
      ["How do the goats work together?", "Leviticus 16 depicts blood used to purify the sanctuary and a living goat sent away bearing confessed wrongs.", "Readers distinguish the actions and also see both as parts of the same atonement rite.", "Trace where each goat goes and what the text says happens there."],
      ["Who counts as a neighbor?", "Leviticus 19:18 commands love for one’s neighbor, and verse 34 gives a parallel command about the resident foreigner.", "The placements invite comparison. The second command expressly recalls Israel’s time as foreigners in Egypt.", "Read both commands with the instructions surrounding them and name what each prohibits."],
      ["What happens to a sale at Jubilee?", "Leviticus 25:13–17 ties the price to the number of harvests before the next Jubilee.", "Readers distinguish the law’s stated structure from the historical question of when and how widely it was practiced.", "Explain the price of the harvest years in terms of the land’s eventual return."]
    ],
    "numbers": [
      ["How can pardon and judgment coexist?", "Numbers 14:19–24 says God pardons and that the generation will fail to see the land.", "Readers distinguish preserving the people from removing every consequence of rebellion.", "List who is addressed in the verdict and compare the futures stated for the community and Caleb."],
      ["What does the narrative say Moses did at Meribah?", "Numbers 20:7–13 says Moses strikes the rock and that he and Aaron fail to uphold God’s holiness before the people.", "Readers emphasize different details, including the command to speak, Moses’ words and his striking the rock.", "Underline the command, mark the actual actions and read the reason given in verse 12."],
      ["Why count the people twice?", "Numbers 1 introduces the first census, and 26:63–65 contrasts the later count with the earlier generation at Sinai.", "The census records serve a practical purpose and mark a generational transition in the narrative.", "Compare the settings and ask what the second count prepares the people to do."],
      ["How do we tell observation from fear?", "Numbers 13:27–33 moves from fruit and fortified towns to forecasts of defeat and the grasshopper comparison.", "Readers can track the point where agreement about what was seen becomes disagreement about what it means.", "Quote one observation, one prediction and one comparison. Identify who speaks each one."]
    ],
    "joshua-to-david": [
      ["Does Judges give an uncomplicated endorsement of monarchy?", "Judges 21:25 pairs the lack of a king with people doing what is right in their own eyes. First Samuel 8 warns about what a king can take.", "Some readers emphasize the need for faithful leadership. The warning in Samuel makes the character and limits of that leadership important.", "Compare the problems named in each passage before treating monarchy as the solution."],
      ["What kind of house is promised to David?", "Second Samuel 7:11–16 promises David a dynasty and says his offspring will build a house for God’s name.", "The wordplay connects David’s line and the temple while distinguishing the people who build each house.", "Make a two-column record of builder and meaning for each use."],
      ["Why does Ruth end with names?", "Ruth 4:17–22 connects a household in Bethlehem to David through Obed and Jesse.", "The closing genealogy gives a local family story national significance while leaving many intervening stories untold.", "Use the tree to trace the named links and explain what the genealogy contributes to the ending."],
      ["How does Joshua 24 frame covenant choice?", "Joshua reviews what God did and calls the people to choose whom they will serve.", "Readers often notice the order of memory, choice and witness. Joshua also presses the people on the difficulty of what they promise.", "Compare their assurances in verses 16–18 with Joshua’s reply in verses 19–20."]
    ],
    "jesus-ministry": [
      ["Why place forgiveness and healing in one scene?", "In Mark 2:5–12 the scribes question Jesus’ words of forgiveness, and Jesus identifies a purpose for the visible healing.", "Readers connect the healing and Jesus’ claim to authority. Mark gives no cause for the man’s condition.", "Track what the people can see and the conclusion Jesus says the action supports."],
      ["What does Peter understand by calling Jesus the Christ?", "Peter confesses Jesus in Mark 8:29, then rebukes him after hearing about suffering.", "The confession expresses recognition, and the argument shows that Peter still resists what Jesus says his mission entails.", "Compare Peter’s words with Jesus’ call to take up the cross in 8:34."],
      ["Why does Nazareth react so sharply?", "Luke 4:22–30 moves from astonishment to anger after Jesus recalls Elijah and Elisha helping people outside Israel.", "Readers debate which part of Jesus’ reply chiefly provokes the crowd. Luke places the examples just before the reversal.", "Trace the responses before and after each example and explain what they share."],
      ["How much can one Gospel scene tell us about order?", "Mark 1:9–13 summarizes the baptism and testing. Matthew 4:1–11 gives fuller dialogue in the testing.", "A short telling and a detailed telling can emphasize different features. Luke and Matthew also order their last two temptations differently.", "Compare what each author includes and how it frames Jesus’ later ministry."]
    ],
    'deuteronomy': [
      ['The command to destroy the nations (7:1–6; 20:10–18)',
       'Moses tells Israel to “devote to destruction” the peoples of Canaan and to make no treaties or marriages with them, because their worship would draw Israel away (7:1–6; 20:16–18). The same book offers peace to distant cities (20:10–15) and says God drives the nations out “because of the wickedness of these nations,” not because of Israel’s righteousness (9:4–6).',
       'Readers disagree. Some take the commands as literal history and ask about God’s justice and Canaan’s guilt. Others point out that Joshua and Judges say the peoples were not fully driven out (Joshua 15:63; Judges 1:27–36), and some scholars argue that ancient war language was often sweeping and stylized. Others read it mainly as a warning about Israel’s own risk of idolatry. Mainstream Jewish and Christian traditions do not read it as permission for violence today.',
       'Keep three things apart: what the text commands, what the text says happened, and what any later reader may do. Do not skip the discomfort, and do not use the passage as a weapon.'],
      ['Blessings and curses (chapter 28)',
       'Obedience brings rain, harvest, and safety; disobedience brings drought, defeat, and finally exile (28:1–68). Chapter 30:1–10 then imagines return after exile.',
       'Many readers hear a simple formula in which good behavior is rewarded and bad behavior punished. Job, Psalm 73, and Jesus’ words in Luke 13:1–5 and John 9:1–3 all press against applying that pattern to any one person’s suffering. Deuteronomy itself frames chapter 28 as covenant consequences for a whole people.',
       'Ask: is this a promise to individuals, a warning to a nation, or both? What do Job, Psalm 73, and Luke 13:1–5 add?'],
      ['Why Moses cannot enter the land (32:48–52)',
       'The Lord tells Moses he will see the land but not enter it, “because you broke faith with me… at the waters of Meribah-kadesh… you did not treat me as holy” (32:51). Elsewhere Moses says the Lord was angry with him “on your account” (1:37; 3:26).',
       'Numbers 20:1–13 tells the story of the water from the rock. Readers debate exactly what the offense was and whether the penalty seems proportionate. Moses’ own speech places part of the burden on the people.',
       'Notice that the book does not hide its hero’s limits. What does that say about where the book locates its authority, and about leadership that outlasts the leader?'],
      ['Who wrote Deuteronomy, and when?',
       'The book presents itself as words Moses spoke and wrote (1:1; 31:9, 24), and its last chapter narrates Moses’ death (34:5–12).',
       'Many traditional readers hold that Moses wrote nearly all of it, with the last chapter added later. Many critical scholars date the book’s final form centuries after Moses and often connect it to Josiah’s reform (2 Kings 22–23). Scholars also compare the book’s structure to ancient Near Eastern treaties and debate which treaties fit and when. The evidence is contested on every side.',
       'Name the claim, the evidence, and who holds it. Students can learn the book well without settling a question scholars have not settled.']
    ]
  };

  function esc(value) {
    return String(value).replace(/[&<>\"]/g, function (char) { return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]; });
  }
  function link(item, direction) {
    if ((id === 'elijah' && direction === 'next') || (id === 'world-of-jesus' && direction === 'prev')) item = { id: 'daniel', title: 'Daniel: Faithfulness in Exile' };
    if (!item) return '<span></span>';
    return '<a href="' + item.id + '.html">' + (direction === 'prev' ? '&larr; ' : '') + esc(item.title) + (direction === 'next' ? ' &rarr;' : '') + '</a>';
  }
  function passageLabel(passage) {
    return passage[0] + ' ' + passage[1] + ':' + passage[2] + (passage[3] === passage[2] ? '' : '–' + passage[3]);
  }

  function storyThreadMarkup(story) {
    return '<section class="bpl-card bpl-story" aria-labelledby="bpl-story-title">' +
      '<div class="bpl-story-head"><div><p class="bpl-label">The whole-Bible story</p><h2 id="bpl-story-title">Find this lesson in the bigger picture</h2></div><p class="bpl-big-idea"><strong>Big idea:</strong> ' + esc(story.bigIdea) + '</p></div>' +
      '<div class="bpl-story-scroll" tabindex="0" aria-label="Scrollable biblical story timeline"><ol class="bpl-story-line">' + storyAnchors.map(function (anchor, anchorIndex) {
        var active = story.focus.indexOf(anchor.id) !== -1;
        var boundary = anchorIndex === 6 ? ' bpl-story-node--nt' : '';
        return '<li class="bpl-story-node' + boundary + (active ? ' is-focus' : '') + '"><span class="bpl-story-dot" aria-hidden="true"></span>' + ((anchorIndex === 0 || anchorIndex === 6) ? '<span class="bpl-story-era">' + esc(anchor.testament) + '</span>' : '') + '<strong>' + esc(anchor.label) + '</strong><small>' + esc(anchor.short) + (active ? '<span class="bpl-visually-hidden">; this lesson connects here</span>' : '') + '</small></li>';
      }).join('') + '</ol></div>' +
      '<p class="bpl-story-key"><span aria-hidden="true"></span>Highlighted moments connect directly to this lesson. The line continues because every passage belongs to a larger story.</p>' +
      '<div class="bpl-story-bridge"><article><span>What came before</span><p>' + esc(story.before) + '</p></article><article class="is-now"><span>This lesson</span><p>' + esc(story.now) + '</p></article><article><span>Where it leads</span><p>' + esc(story.next) + '</p></article></div>' +
    '</section>';
  }

  var visualJourneyMeta = {
    'deuteronomy': {
      title: 'From the Plains of Moab to the Scroll and the Doorpost',
      subtitle: 'See the landscape Moses speaks from, an artist’s ending, an ancient manuscript, and a living practice.',
      note: 'Photographs of Mount Nebo document the landscape east of the Jordan. Signorelli’s fresco is a 15th-century artistic interpretation. The Nash Papyrus is an ancient manuscript witness, and the Samarkand photograph shows later Jewish practice of tefillin.'
    },
    'feasts-of-israel': {
      title: 'From Leviticus 23 to the Table',
      subtitle: 'See the written calendar, then the practices that carried it forward in Jewish life.',
      note: 'The scroll is an ancient witness to the text. The Seder plate, shofar, and Yom Kippur painting show later and present-day Jewish practice, which developed after the temple’s fall and should not be mistaken for the temple-era festival itself.'
    },
    'joshua-to-david': {
      title: 'From Jericho to the House of David',
      subtitle: 'Compare archaeological evidence with paintings of Judges and Samuel.',
      note: 'Photographs and inscriptions are evidence to weigh, with real scholarly disagreement about how they connect to the biblical narrative. Rembrandt, Victors, Caravaggio, and Barrias are later artistic interpretations.'
    },
    'exodus': {
      title: 'From Pharaoh’s Egypt to Sinai',
      subtitle: 'Compare Egyptian monuments, Sinai’s landscape, a living Passover tradition, and artists’ visions of the rescue.',
      note: 'Photographs show places and a present-day practice, not proof of specific biblical events. Bourdon, Doré, Jordaens, and Rembrandt are later artistic interpretations of the text.'
    },
    'genesis': {
      title: 'From Garden to Egypt',
      subtitle: 'Compare artists’ pictures of Genesis with a real Mesopotamian monument.',
      note: 'The ziggurat photograph documents a real place from Abram’s world. Doré, Cole, Bruegel, and Ferenczy are later artistic interpretations of the text, not records of the events.'
    },
    'holy-week': {
      title: 'From Palm Sunday to the Empty Tomb',
      subtitle: 'Follow the week through places, evidence from the period, and artists’ pictures of each scene.',
      note: 'The ossuary, the Pilate Stone replica, and the tomb stone are evidence from the period, and the garden is a real setting, but none is proof of a particular Gospel scene. Giotto, Leonardo, Doré, and Grünewald are later artistic interpretations, so compare them with the text.'
    },
    'temple-and-gods-presence': {
      title: 'From garden to gathered Church',
      subtitle: 'Compare biblical places, Christian architecture, and artists’ interpretations of divine presence.',
      note: 'Photographs document present-day places and buildings. Eden and divine manifestations are artistic interpretations, while several mountain identifications come from Christian tradition rather than certainty.'
    },
    'jesus-ministry': {
      title: 'From the Lake to Caesarea Philippi',
      subtitle: 'Locate the places of the ministry, then compare how artists have pictured its scenes.',
      note: 'The two photographs document real places named in the Gospels. Tissot and Rembrandt are later artistic interpretations; the Capernaum ruins date from after the first century.'
    },
    'sermon-on-the-mount': {
      title: 'The Mountain, the Lake, and the Word',
      subtitle: 'Explore the Galilean landscape, early Gospel manuscripts, and masterwork depictions of the Sermon.',
      note: 'Photographs document the landscape around the Sea of Galilee and the 4th-century Codex Sinaiticus. Paintings depict the Sermon through Renaissance and 19th-century artistic traditions.'
    },
    'how-the-bible-reached-us': {
      title: 'From Ancient Scrolls to the Printed Word',
      subtitle: 'Trace the physical artifacts and manuscripts that carried the biblical writings across three millennia.',
      note: 'Artifacts and manuscripts provide primary historical evidence for how Scripture was written, preserved by hand, and transmitted across eras.'
    },
    'acts-jerusalem-to-nations': {
      title: 'The Greco-Roman World of the Apostles',
      subtitle: 'Explore the cities, Roman roads, public forums, and inscriptions visited by Peter and Paul.',
      note: 'Archaeological photographs document the actual civic spaces, roads, and inscriptions from the first-century Roman provinces named across Acts.'
    }
  };

  function entityReferencesMarkup(entities) {
    return '<section class="bpl-card bpl-entities"><div class="bpl-entities-head"><div><p class="bpl-label">People, places &amp; sources</p><h2>Reference links</h2></div></div><div class="bpl-entity-grid">' +
      entities.map(function (entity) {
        var url = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(entity.title.replace(/ /g, '_'));
        return '<article class="bpl-entity"><div class="bpl-entity-copy"><span>' + esc(entity.kind) + '</span><h3><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(entity.label || entity.title) + '</a></h3>' +
          (entity.note ? '<p>' + esc(entity.note) + '</p>' : '') + '</div></article>';
      }).join('') + '</div></section>';
  }

  function visualJourneyMarkup(groups, lesson) {
    if (!groups || !groups.length) return '';
    var meta = (lesson && visualJourneyMeta[lesson.id]) || {
      title: 'Visual journey',
      subtitle: 'Explore biblical places, historical artifacts, and classical art.',
      note: 'Photographs document surviving archaeological artifacts, ancient manuscripts, and historical locations. Masterpieces represent later artistic interpretations.'
    };
    return '<section class="bpl-card bpl-visual-journey"><div class="bpl-visual-head"><div><p class="bpl-label">Visual journey</p><h2>' + esc(meta.title) + '</h2></div><p>' + esc(meta.subtitle) + '</p></div>' +
      '<aside class="bpl-visual-note"><strong>Read the image type:</strong> ' + esc(meta.note) + '</aside>' +
      groups.map(function (group) {
        return '<section class="bpl-visual-group"><header><h3>' + esc(group.title) + '</h3><p>' + esc(group.note) + '</p></header><div class="bpl-visual-grid bpl-visual-grid--' + group.items.length + '">' + group.items.map(function (item) {
          return '<figure class="bpl-visual-card" data-zoomable data-lightbox-group="bible-visual-journey"><a href="' + esc(item.page) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(item.src) + '" alt="' + esc(item.alt) + '" loading="lazy" referrerpolicy="no-referrer"></a><figcaption><span>' + esc(item.kind) + '</span><h4>' + esc(item.title) + '</h4><p>' + esc(item.caption) + '</p><small>Image: <a href="' + esc(item.page) + '" target="_blank" rel="noopener noreferrer">' + esc(item.credit) + '</a> · <a href="' + esc(item.licenseUrl) + '" target="_blank" rel="license noopener noreferrer">' + esc(item.license) + '</a> · Wikimedia Commons</small></figcaption></figure>';
        }).join('') + '</div></section>';
      }).join('') + '</section>';
  }

  function investigationMarkup(investigation) {
    var choiceOrder = index % 2 ? [1, 0] : [0, 1];
    return '<section class="bpl-card bpl-investigation" aria-labelledby="bpl-investigation-title">' +
      '<div class="bpl-investigation-head"><div><p class="bpl-label">Passage investigation</p><h2 id="bpl-investigation-title">Predict, read, explain</h2></div><p>Read ' + esc(investigation[0]) + ' in the Scripture reader or your Bible. Choose a reading, then compare it with the passage.</p></div>' +
      '<p class="bpl-investigation-question">' + esc(investigation[1]) + '</p><div class="bpl-investigation-choices" role="group" aria-label="Choose a reading">' + choiceOrder.map(function (choiceIndex) {
        return '<button type="button" class="bpl-investigation-choice" data-investigation-choice="' + choiceIndex + '" aria-pressed="false">' + esc(investigation[2][choiceIndex]) + '</button>';
      }).join('') + '</div><p class="bpl-investigation-feedback" role="status">Choose a reading before revealing the passage reasoning.</p>' +
      '<div class="bpl-investigation-reveal" hidden><p><strong>Compare with the passage:</strong> ' + esc(investigation[4]) + '</p><p><strong>Try it:</strong> ' + esc(investigation[5]) + '</p></div></section>';
  }

  function gospelRoutesMarkup() {
    if (id !== 'world-of-jesus') return '';
    return '<section class="bpl-card bpl-routes" aria-labelledby="bpl-routes-title"><p class="bpl-label">Gospel geography lab</p><h2 id="bpl-routes-title">Compare three journeys</h2>' +
      '<p>Use the map above, then select a passage. The region sequence is a reading aid; the Gospels do not give a turn-by-turn itinerary.</p>' +
      '<div class="bpl-route-buttons" role="group" aria-label="Gospel journey"><button type="button" data-route="0" aria-pressed="true">Matthew 4 · Galilee</button><button type="button" data-route="1" aria-pressed="false">John 4 · Through Samaria</button><button type="button" data-route="2" aria-pressed="false">Luke 9 · Toward Jerusalem</button></div>' +
      '<div class="bpl-route-panel" aria-live="polite"><p class="bpl-route-regions"></p><p class="bpl-route-evidence"></p><p class="bpl-route-caution"></p></div></section>';
  }

  var ministryScenes = [["Baptism", "Mark 1:9–11", "Israel waits for God to act, and John is calling people to repent.", "Is baptized; the Spirit descends and the Father speaks.", "The voice names Him the beloved Son. Mark records no crowd reaction.", "His identity is given before His work, and He stands with the people He came to save."], ["Wilderness", "Mark 1:12–13 · Matthew 4:1–11", "The Spirit leads Jesus into forty days of testing.", "Resists the tempter; Matthew and Luke show Him answering from Deuteronomy.", "The tempter leaves, and angels serve Him.", "Sonship means trusting the Father rather than seizing shortcuts to power."], ["Nazareth", "Luke 4:16–30", "The poor, captives, blind, and oppressed named in Isaiah.", "Reads Isaiah and says it is fulfilled “today.”", "Admiration turns to fury, and the crowd drives Him out of town.", "The kingdom is good news for the poor and open to outsiders, and that offends."], ["Capernaum", "Mark 1:21–34", "A man with an unclean spirit, Simon’s mother-in-law with a fever, and a city of sick people.", "Teaches with authority, silences the spirit, and lifts her by the hand.", "Amazement: “What is this? A new teaching with authority!” The whole town gathers.", "God’s reign confronts what binds people and restores them."], ["The roof", "Mark 2:1–12", "A paralyzed man carried by four friends into a crowded house.", "Forgives his sins, then tells him to rise and walk.", "Scribes accuse Him of blasphemy; the crowd says, “We never saw anything like this!”", "Authority to forgive and to restore go together, and friends’ faith matters."], ["Levi’s table", "Mark 2:13–17", "A tax collector, an outsider to respectable company.", "Calls Levi, then eats with tax collectors and sinners.", "Scribes ask why He eats with sinners.", "“I came not to call the righteous, but sinners”: the kingdom welcomes the sick to the physician."], ["The storm", "Mark 4:35–41", "Disciples in a boat in a violent windstorm, with Jesus asleep.", "Rebukes the wind and sea: “Peace! Be still!”", "Great fear, and the question, “Who then is this?”", "The question of His identity grows sharper."], ["Caesarea Philippi", "Matthew 16:13–20 · Mark 8:27–38", "The disciples must say who Jesus is, amid rumors that He is a prophet.", "Asks, “Who do you say that I am?” In Mark He then speaks of suffering and the cross.", "Peter answers, “You are the Christ.” In Mark, Peter objects to the talk of suffering.", "Confessing Him leads onto the road of the cross, and the story turns toward Jerusalem."]];

  var sceneBoards = {
    'jesus-ministry': {
      title: 'Walk through eight scenes',
      label: 'Ministry scene board',
      instructions: 'Select a scene and test each observation against the passage. Mark, Matthew, and Luke arrange some events differently.',
      fields: ['Need', 'Jesus’ word or action', 'Response', 'What it reveals'],
      scenes: ministryScenes
    },
    'elijah': {
      title: 'From Cherith to Horeb',
      label: 'Elijah scene board',
      instructions: 'Move through four scenes. Compare what Elijah faces, what God provides, and what Elijah does next.',
      fields: ['Circumstances', 'Provision or word', 'Elijah’s response', 'Compare'],
      scenes: [
        ['Cherith', '1 Kings 17:1–7', 'A drought is announced to Ahab.', 'God directs Elijah to a brook and sends food through ravens.', 'Elijah goes as instructed and stays until the brook dries up.', 'The drought reaches Elijah himself. What changes at Zarephath?'],
        ['Zarephath', '1 Kings 17:8–24', 'A widow and her son face famine. Later her child stops breathing.', 'The flour and oil last through the famine, and God hears Elijah’s prayer for the child.', 'He follows the command to go, stays with the family and petitions God for the boy.', 'Compare what Elijah asks of the widow and what he asks of God.'],
        ['Carmel', '1 Kings 18:20–39', 'Elijah confronts the divided allegiance of Israel before a crowd.', 'Fire answers the prayer, and the people acknowledge the Lord.', 'He repairs the altar and asks God to turn the people’s hearts back.', 'Compare the crowd’s silence in verse 21 with its response in verse 39.'],
        ['Horeb', '1 Kings 19:1–18', 'Elijah flees a threat and says he has had enough.', 'He receives food for the journey, hears a quiet voice and receives new assignments.', 'He eats, travels, covers his face and tells God what he fears.', 'What changes between the strength provided at the start and the instructions at the end?']
      ]
    },
    'job': {
      title: 'Test explanations for Job’s suffering',
      label: 'Job evidence lab',
      instructions: 'Choose a claim. Read the evidence and decide how far the claim holds before reading the assessment.',
      fields: ['Claim', 'Evidence to check', 'Assessment', 'Discuss'],
      revealField: 2,
      scenes: [
        ['Hidden wrongdoing', 'Job 4:7–8; 1:1, 8; 42:7', 'Eliphaz infers that severe suffering points to wrongdoing.', 'Compare his question about the innocent with the narrator’s description of Job.', 'The opening undermines the inference in Job’s case. God later challenges the friends’ speech.', 'What changes when a general pattern is treated as a diagnosis?'],
        ['Faith depends on reward', 'Job 1:9–11, 20–22; 2:9–10', 'The accuser predicts that Job will curse God if his protection is removed.', 'Compare the prediction with Job’s response to his losses and illness.', 'Job grieves and refuses to curse God. His later lament shows how much that faith costs him.', 'How do chapters 1 and 3 hold worship and grief together?'],
        ['The storm explains every loss', 'Job 38:1–18; 42:1–7', 'God’s appearance supplies Job with the cause of each loss.', 'List the subjects God asks about. Compare them with the conversation in Job 1.', 'God speaks about creation and knowledge. The conversation in the opening remains known to the reader.', 'What does the encounter give Job that a causal explanation would not give?']
      ]
    },
    'numbers': {
      title: 'Read the scouts’ report',
      label: 'Wilderness evidence lab',
      instructions: 'Select each response to the same land. Track shared observations, interpretations and proposed actions.',
      fields: ['Shared evidence', 'Interpretation', 'Response', 'Check the wording'],
      scenes: [
        ['Shared report', 'Numbers 13:25–29', 'The scouts display the fruit and report strong inhabitants and fortified towns.', 'The land is fruitful and the settlements present a challenge.', 'The report reaches Moses, Aaron and the gathered congregation.', 'Which statements describe what the scouts saw?'],
        ['Caleb', 'Numbers 13:30; 14:6–9', 'Caleb heard the report and was part of the scouting mission.', 'Caleb urges entry. With Joshua he later frames the decision around trust in God.', 'Go up and take possession of the land.', 'What reason do Joshua and Caleb add in chapter 14?'],
        ['The other scouts', 'Numbers 13:31–33; 14:1–4', 'The towns and inhabitants are the same ones described in the earlier report.', 'The scouts conclude that the people are stronger and describe themselves as grasshoppers.', 'They oppose going up, and the congregation talks of returning to Egypt.', 'Where does the account shift from observation to comparison and prediction?']
      ]
    },
    'leviticus': {
      title: 'Compare practices of holiness',
      label: 'Worship and community lab',
      instructions: 'Select a practice. Look for who acts, what the passage asks for, and who is affected.',
      fields: ['Setting', 'Action', 'Who is affected', 'Check the wording'],
      scenes: [
        ['Offer an offering', 'Leviticus 1:1–9', 'The Lord speaks to Moses from the tent of meeting.', 'The worshiper brings an animal and the priests handle the blood and altar.', 'The offering is accepted on the worshiper’s behalf.', 'Use verses 4–9 to distinguish the worshiper’s actions from the priests’ actions.'],
        ['Leave the field edges', 'Leviticus 19:9–10', 'A landowner harvests a field or vineyard.', 'The edges and fallen produce are left for others to gather.', 'Poor people and resident foreigners can glean.', 'Who is named as the reason for the practice?'],
        ['Proclaim liberty', 'Leviticus 25:8–17', 'Seven cycles of seven years have been counted.', 'Liberty is proclaimed and people return to their property and families.', 'Households and anyone buying or selling land are affected.', 'How does the number of harvests left before Jubilee affect a sale?']
      ]
    }
  };

  function sceneBoardMarkup(board) {
    if (!board) return '';
    var scenes = board.scenes;
    return '<section class="bpl-card bpl-routes bpl-scenes" aria-labelledby="bpl-scenes-title"><p class="bpl-label">' + esc(board.label) + '</p><h2 id="bpl-scenes-title">' + esc(board.title) + '</h2>' +
      '<p>' + esc(board.instructions) + '</p>' +
      '<div class="bpl-route-buttons" role="group" aria-label="' + esc(board.label) + '">' + scenes.map(function (scene, i) {
        return '<button type="button" data-scene="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(scene[0]) + '</button>';
      }).join('') + '</div>' +
      '<div class="bpl-route-panel bpl-scene-panel" aria-live="polite"><p class="bpl-route-regions bpl-scene-title"></p><dl class="bpl-scene-grid">' + board.fields.map(function (field, i) {
        var text = '<span data-scene-field="' + (i + 2) + '"></span>';
        if (i === board.revealField) text = '<details><summary>Show assessment</summary>' + text + '</details>';
        return '<div><dt>' + esc(field) + '</dt><dd>' + text + '</dd></div>';
      }).join('') + '</dl></div>' +
      '<ol class="bpl-scene-print" aria-hidden="true">' + scenes.map(function (scene) {
        return '<li><strong>' + esc(scene[0]) + '</strong> (' + esc(scene[1]) + '). ' + board.fields.map(function (field, i) {
          return '<em>' + esc(field) + ':</em> ' + esc(scene[i + 2]);
        }).join(' ') + '</li>';
      }).join('') + '</ol></section>';
  }

  var deep = !!(lesson.lenses[0] && lesson.lenses[0].length > 4);
  var checkItems = lessonChecks[lesson.id];
  if (checkItems && lesson.id !== 'deuteronomy') {
    checkItems = checkItems.concat([[lesson.check[0], lesson.check[1], lesson.check[1].indexOf(lesson.check[2]), lesson.check[3]]]);
  }
  var reflectFields = lessonReflectFields[lesson.id];
  var hardItems = lessonHardQuestions[lesson.id];
  var levels = [
    ['guided', 'Guided', 'Teacher-led: read the lens, open the passage, and retell the main idea together.'],
    ['build', 'Build', 'Add the close-reading task and trace each lens forward into later Scripture.'],
    ['investigate', 'Investigate', 'Add the hard question: weigh passages, interpretations, and evidence.']
  ];
  var level = 'build';
  try { level = localStorage.getItem('bible-pathway-level') || 'build'; } catch (ignore) {}
  if (!levels.some(function (item) { return item[0] === level; })) level = 'build';
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function levelMarkup() {
    return '<section class="bpl-level" aria-label="Choose your depth"><span class="bpl-level-label">Depth</span><div class="bpl-level-buttons" role="group" aria-label="Lesson depth">' +
      levels.map(function (item) { return '<button type="button" data-level="' + item[0] + '" aria-pressed="' + (item[0] === level) + '">' + esc(item[1]) + '</button>'; }).join('') +
      '</div><p class="bpl-level-note" aria-live="polite"></p></section>';
  }
  function lensPrintMarkup() {
    if (!deep) return '';
    return '<ol class="bpl-lens-print" aria-hidden="true">' + lesson.lenses.map(function (lens) {
      var passage = typeof lens[4] === 'number' && lesson.passages[lens[4]];
      return '<li><strong>' + esc(lens[0]) + ': ' + esc(lens[1]) + '.</strong> ' + esc(lens[2]) + ' <em>Look closely:</em> ' + esc(lens[3]) +
        (passage ? ' <em>Read:</em> ' + esc(passageLabel(passage)) + '.' : '') +
        (lens[5] ? ' <em>Connect forward:</em> ' + esc(lens[5]) : '') +
        (lens[6] ? ' <em>Hard question:</em> ' + esc(lens[6]) : '') + '</li>';
    }).join('') + '</ol>';
  }
  function exploreMarkup() {
    return '<section class="bpl-card bpl-explore" id="bpl-explore"><p class="bpl-label">Guided exploration</p><h2>Study through ' + ['zero','one','two','three','four','five','six','seven','eight'][lesson.lenses.length] + ' lenses</h2><div class="bpl-lenses" role="group" aria-label="Exploration lenses">' +
      lesson.lenses.map(function (lens, i) { return '<button class="bpl-lens" type="button" data-lens="' + i + '" aria-pressed="' + (i === 0) + '"><span>Lens ' + (i + 1) + '</span><strong>' + esc(lens[0]) + ': ' + esc(lens[1]) + '</strong></button>'; }).join('') +
      '</div><article class="bpl-workspace" aria-live="polite"><h3></h3><p></p><p class="bpl-notice' + (deep ? ' bpl-lv-build' : '') + '"></p>' + (deep ? '<div class="bpl-lens-extras"></div>' : '') + '</article>' + lensPrintMarkup() + '</section>';
  }
  function hardMarkup() {
    if (!deep || !hardItems) return '';
    return '<section class="bpl-card bpl-hard" id="bpl-hard"><p class="bpl-label">Hard questions</p><h2>Texts that deserve a slower look</h2><p class="bpl-hard-intro">Some passages raise questions a class should meet on purpose, not by accident. Open one when you are ready to discuss it. Each separates what the text says, how readers have taken it, and how to hold the question carefully.</p>' +
      hardItems.map(function (item) { return '<details class="bpl-hard-item"><summary>' + esc(item[0]) + '</summary><div><p><strong>What the text says.</strong> ' + esc(item[1]) + '</p><p><strong>How readers have taken it.</strong> ' + esc(item[2]) + '</p><p><strong>Holding it carefully.</strong> ' + esc(item[3]) + '</p></div></details>'; }).join('') + '</section>';
  }
  function checkMarkup() {
    if (deep && checkItems) {
      return '<section class="bpl-card bpl-checks" id="bpl-explain"><p class="bpl-label">Check and explain</p><h2>Test your reading</h2><p class="bpl-checks-score" aria-live="polite">Answer each one, then read why.</p>' +
        checkItems.map(function (item, qi) {
          return '<fieldset class="bpl-check-item" data-check="' + qi + '"><legend>' + (qi + 1) + '. ' + esc(item[0]) + '</legend><div class="bpl-choices">' +
            item[1].map(function (choice, ci) { return '<button class="bpl-choice bpl-multi-choice" type="button" data-choice="' + ci + '">' + esc(choice) + '</button>'; }).join('') +
            '</div><p class="bpl-feedback" aria-live="polite"></p></fieldset>';
        }).join('') + '</section>';
    }
    return '<section class="bpl-card" id="bpl-explain"><p class="bpl-label">Check and explain</p><h2>' + esc(lesson.check[0]) + '</h2><div class="bpl-choices">' + lesson.check[1].map(function (choice) { return '<button class="bpl-choice" type="button">' + esc(choice) + '</button>'; }).join('') + '</div><p class="bpl-feedback" aria-live="polite">Choose the strongest answer, then explain why.</p></section>';
  }
  function reflectMarkup() {
    var fields = (deep && reflectFields) ? reflectFields.map(function (field, fi) {
      return '<div class="bpl-reflect-field"><label class="bpl-label" for="bpl-field-' + fi + '">' + (fi + 1) + '. ' + esc(field[0]) + '</label><textarea id="bpl-field-' + fi + '" data-reflect-field="' + fi + '" placeholder="' + esc(field[1]) + '"></textarea></div>';
    }).join('') : '';
    return '<section class="bpl-card bpl-reflection" id="bpl-reflect"><p class="bpl-label">Reflect and respond</p><h2>Make the connection</h2><p>' + esc(lesson.reflect) + '</p>' + fields + '<label class="bpl-label" for="bpl-notes">' + (fields ? 'Other notes and questions' : 'Your notes') + '</label><textarea id="bpl-notes" placeholder="Write observations, evidence, questions, and a faithful response…"></textarea><p class="bpl-save" aria-live="polite">Notes save in this browser.</p></section>';
  }

  main.className = 'bpl-page' + (deep ? ' bpl-page--deep' : '');
  if (deep) main.setAttribute('data-level', level);
  main.innerHTML =
    '<a class="bpl-back" href="bible-foundations-pathway.html">&larr; Bible Foundations &amp; Pathway</a>' +
    '<section class="bpl-hero" data-code="' + esc(lesson.code) + '">' +
      '<p class="bpl-eyebrow">' + esc(lesson.stage) + ' · Lesson ' + esc(lesson.code) + '</p>' +
      '<h1>' + esc(lesson.title) + '</h1><p class="bpl-lede">' + esc(lesson.lede) + '</p>' +
      '<div class="bpl-meta"><span>' + esc(lesson.grades) + '</span><span>' + esc(lesson.time) + '</span><span>Guided exploration</span><span>Print-ready</span></div>' + (deep ? '<a class="bpl-start" href="#bpl-question">Start with the big question ↓</a>' : '') +
    '</section>' +
    '<nav class="bpl-learning-flow" aria-label="Lesson learning flow"><span>Start here:</span><a href="#bpl-question">1 · Big question</a><a href="#bpl-read">2 · Read</a><a href="#bpl-explore">3 · Explore</a><a href="#bpl-explain">4 · Explain</a><a href="#bpl-reflect">5 · Reflect</a></nav>' +
    (deep ? levelMarkup() : '<details class="bpl-level-guide"><summary>Choose the right depth for your learner</summary><div><p><strong>Grades K–5 · guided together:</strong> Ask the big question, read one passage aloud, use the picture or map, and retell the main idea.</p><p><strong>Grades 6–8 · build the story:</strong> Read the selected passages, complete the investigation, and support one claim with evidence.</p><p><strong>Grades 9–12 · investigate deeply:</strong> Compare context and interpretations, evaluate sources, and write a passage-based explanation.</p></div></details>') +
    storyThreadMarkup(lesson.story) +
    '<figure class="bpl-figure" data-zoomable><a href="' + esc(lesson.image.page) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(lesson.image.src) + '" alt="' + esc(lesson.image.alt) + '" loading="eager" referrerpolicy="no-referrer"></a><figcaption><p>' + esc(lesson.image.caption) + '</p><small>Image: <a href="' + esc(lesson.image.page) + '" target="_blank" rel="noopener noreferrer">' + esc(lesson.image.credit) + '</a> · <a href="' + esc(lesson.image.licenseUrl) + '" target="_blank" rel="license noopener noreferrer">' + esc(lesson.image.license) + '</a> · Wikimedia Commons</small></figcaption></figure>' +
    '<div class="bpl-grid"><section class="bpl-card" id="bpl-question"><p class="bpl-label">Essential question</p><p class="bpl-question">' + esc(lesson.question) + '</p><p class="bpl-scripture"><strong>Read:</strong> ' + esc(lesson.scripture) + '</p></section>' +
    '<section class="bpl-card"><p class="bpl-label">Learning goals</p><h2>By the end, you can…</h2><ul class="bpl-goals">' + lesson.goals.map(function (goal) { return '<li>' + esc(goal) + '</li>'; }).join('') + '</ul></section></div>' +
    visualJourneyMarkup(lesson.visualJourney, lesson) +
    '<section class="bpl-card bpl-reader" id="bpl-read"><div class="bpl-reader-head"><div><p class="bpl-label">Open Scripture reader</p><h2>Read in context</h2></div><p>Switch passages, translations, and languages while keeping the same verse reference in view.</p></div>' +
      '<div class="bpl-reader-controls"><label><span>Passage</span><select class="bpl-passage-select">' + lesson.passages.map(function (passage, passageIndex) { return '<option value="' + passageIndex + '">' + esc(passageLabel(passage)) + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Language</span><select class="bpl-language-select">' + bibleLanguages.map(function (language) { return '<option value="' + esc(language.id) + '">' + esc(language.name) + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Version</span><select class="bpl-version-select"></select></label></div>' +
      '<div class="bpl-reader-toolbar"><div><button class="bpl-passage-prev" type="button" aria-label="Previous passage">&larr; Previous</button><button class="bpl-passage-next" type="button">Next &rarr;</button></div><span class="bpl-reader-status" role="status" aria-live="polite">Loading Scripture…</span></div>' +
      '<article class="bpl-scripture-panel" aria-live="polite" aria-busy="true"><header><div><p class="bpl-reader-reference"></p><p class="bpl-reader-version"></p></div></header><div class="bpl-verses"></div></article>' +
      '<p class="bpl-reader-credit">The default Berean Standard Bible is stored locally and was dedicated to the public domain in 2023. Other editions load from the open <a href="https://github.com/wldeh/bible-api" target="_blank" rel="noopener noreferrer">Bible API dataset</a>; availability and licensing vary and are labeled above. For publication or close textual study, verify wording in an authorized edition.</p>' +
    '</section>' +
    (deep ? exploreMarkup() : '') +
    '<section class="bpl-card bpl-map"><div class="bpl-map-head"><div><p class="bpl-label">Geographic context</p><h2>See the bigger picture</h2></div><p>Select the map to enlarge labels and terrain.</p></div><div class="bpl-map-grid"><figure class="bpl-map-figure" data-zoomable><a class="bpl-map-image" href="' + esc(lesson.map.page) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(lesson.map.src) + '" alt="' + esc(lesson.map.alt) + '" loading="lazy" referrerpolicy="no-referrer"></a><figcaption>' + esc(lesson.map.note) + '<small>Map: <a href="' + esc(lesson.map.page) + '" target="_blank" rel="noopener noreferrer">' + esc(lesson.map.credit) + '</a> · <a href="' + esc(lesson.map.licenseUrl) + '" target="_blank" rel="license noopener noreferrer">' + esc(lesson.map.license) + '</a> · Wikimedia Commons</small></figcaption></figure></div></section>' +
    gospelRoutesMarkup() +
    sceneBoardMarkup(sceneBoards[id]) +
    investigationMarkup(lesson.investigation) +
    entityReferencesMarkup(lesson.entities) +
    (deep ? '' : exploreMarkup()) +
    hardMarkup() +
    '<div class="bpl-practice">' + checkMarkup() + reflectMarkup() + '</div>' +
    '<nav class="bpl-nav" aria-label="Bible pathway lesson navigation">' + link(lessons[index - 1], 'prev') + '<a class="bpl-hub" href="bible-foundations-pathway.html">Pathway hub</a>' + link(lessons[index + 1], 'next') + '</nav>';

  // Optional page-owned genealogy, placed beside the Scripture reading.
  var familyTemplate = document.querySelector('template[data-bible-family-tree]');
  if (familyTemplate) {
    main.querySelector('.bpl-reader').after(familyTemplate.content.cloneNode(true));
    if (window.ClassroomOSFamilyTree) window.ClassroomOSFamilyTree.scan(main);
  }

  var lensButtons = Array.prototype.slice.call(main.querySelectorAll('.bpl-lens'));
  var workspace = main.querySelector('.bpl-workspace');
  function selectLens(i) {
    var lens = lesson.lenses[i];
    lensButtons.forEach(function (button, buttonIndex) { button.setAttribute('aria-pressed', String(buttonIndex === i)); });
    workspace.querySelector('h3').textContent = lens[0] + ' · ' + lens[1];
    workspace.querySelector('p').textContent = lens[2];
    workspace.querySelector('.bpl-notice').textContent = (deep ? 'Look closely: ' : '') + lens[3];
    var extras = workspace.querySelector('.bpl-lens-extras');
    if (extras) {
      var html = '';
      if (typeof lens[4] === 'number' && lesson.passages[lens[4]]) html += '<button type="button" class="bpl-open-passage" data-passage="' + lens[4] + '">Read it: ' + esc(passageLabel(lesson.passages[lens[4]])) + ' ↑</button>';
      if (lens[5]) html += '<div class="bpl-lens-bridge bpl-lv-build"><strong>Connect forward</strong><span>' + esc(lens[5]) + '</span></div>';
      if (lens[6]) html += '<div class="bpl-lens-hard bpl-lv-investigate"><strong>Hard question</strong><span>' + esc(lens[6]) + '</span></div>';
      extras.innerHTML = html;
    }
  }
  lensButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      selectLens(Number(button.dataset.lens));
      if (deep && workspace.getBoundingClientRect().top > window.innerHeight * 0.7) workspace.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
  });
  workspace.addEventListener('click', function (event) {
    var open = event.target.closest && event.target.closest('.bpl-open-passage');
    if (!open) return;
    var picker = main.querySelector('.bpl-passage-select');
    picker.value = open.getAttribute('data-passage');
    picker.dispatchEvent(new Event('change'));
    main.querySelector('#bpl-read').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
  selectLens(0);

  if (id === 'world-of-jesus') {
    var routeData = [
      ['Galilee: Nazareth → Capernaum → towns around the lake', 'Matthew 4:12–25 places Jesus in Capernaum and describes teaching throughout Galilee.', 'The passage names places and a region; it does not supply every road or stop.'],
      ['Judea → Samaria → Galilee', 'John 4:3–10 says Jesus left Judea for Galilee, passed through Samaria, and met a woman at Jacob’s well.', 'Read the encounter itself before generalizing about Samaritan responses.'],
      ['Galilee → a Samaritan village → Jerusalem as the destination', 'Luke 9:51–56 says Jesus set his face toward Jerusalem and sent messengers into a Samaritan village.', 'The text gives the destination and one village encounter, not a complete mapped route.']
    ];
    var routeButtons = Array.prototype.slice.call(main.querySelectorAll('[data-route]'));
    var routePanel = main.querySelector('.bpl-route-panel');
    function selectRoute(routeIndex) {
      routeButtons.forEach(function (button, buttonIndex) { button.setAttribute('aria-pressed', String(buttonIndex === routeIndex)); });
      routePanel.querySelector('.bpl-route-regions').textContent = routeData[routeIndex][0];
      routePanel.querySelector('.bpl-route-evidence').textContent = 'Passage evidence: ' + routeData[routeIndex][1];
      routePanel.querySelector('.bpl-route-caution').textContent = 'Map limit: ' + routeData[routeIndex][2];
    }
    routeButtons.forEach(function (button) { button.addEventListener('click', function () { selectRoute(Number(button.getAttribute('data-route'))); }); });
    selectRoute(0);
  }

  if (sceneBoards[id]) {
    var sceneButtons = Array.prototype.slice.call(main.querySelectorAll('[data-scene]'));
    var scenePanel = main.querySelector('.bpl-scene-panel');
    var selectScene = function (sceneIndex) {
      var scene = sceneBoards[id].scenes[sceneIndex];
      sceneButtons.forEach(function (button, buttonIndex) { button.setAttribute('aria-pressed', String(buttonIndex === sceneIndex)); });
      var assessment = scenePanel.querySelector('details');
      if (assessment) assessment.open = false;
      scenePanel.querySelector('.bpl-scene-title').textContent = scene[0] + ' · ' + scene[1];
      Array.prototype.forEach.call(scenePanel.querySelectorAll('[data-scene-field]'), function (cell) { cell.textContent = scene[Number(cell.getAttribute('data-scene-field'))]; });
    };
    sceneButtons.forEach(function (button) { button.addEventListener('click', function () { selectScene(Number(button.getAttribute('data-scene'))); }); });
    selectScene(0);
  }

  var investigationChoices = Array.prototype.slice.call(main.querySelectorAll('.bpl-investigation-choice'));
  var investigationFeedback = main.querySelector('.bpl-investigation-feedback');
  var investigationReveal = main.querySelector('.bpl-investigation-reveal');
  investigationChoices.forEach(function (button) {
    button.addEventListener('click', function () {
      var selected = Number(button.getAttribute('data-investigation-choice'));
      investigationChoices.forEach(function (candidate) {
        var active = candidate === button;
        candidate.setAttribute('aria-pressed', String(active));
        candidate.classList.toggle('is-selected', active);
      });
      investigationFeedback.textContent = selected === lesson.investigation[3]
        ? 'This reading fits the passage. Compare your reason with the explanation below.'
        : 'Recheck the named passage and compare your reason with the explanation below.';
      investigationReveal.hidden = false;
    });
  });

  var passageSelect = main.querySelector('.bpl-passage-select');
  var languageSelect = main.querySelector('.bpl-language-select');
  var versionSelect = main.querySelector('.bpl-version-select');
  var scripturePanel = main.querySelector('.bpl-scripture-panel');
  var versesPanel = main.querySelector('.bpl-verses');
  var readerReference = main.querySelector('.bpl-reader-reference');
  var readerVersion = main.querySelector('.bpl-reader-version');
  var readerStatus = main.querySelector('.bpl-reader-status');
  var prevPassage = main.querySelector('.bpl-passage-prev');
  var nextPassage = main.querySelector('.bpl-passage-next');
  var bibleCache = {};
  var readerRequest = 0;
  var readerPreferenceKey = 'bible-pathway-reader';

  function currentLanguage() {
    return bibleLanguages.find(function (language) { return language.id === languageSelect.value; }) || bibleLanguages[0];
  }
  function currentVersion() {
    var language = currentLanguage();
    return language.versions.find(function (version) { return version.id === versionSelect.value; }) || language.versions[0];
  }
  function isNewTestament(book) {
    return ['Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Timothy','Hebrews','2 Peter','Revelation'].indexOf(book) !== -1;
  }
  function localizedBook(book, language, version) {
    var map = localizedBooks[version.id] || localizedBooks[language.id] || {};
    return map[book] || book.toLowerCase().replace(/\s+/g, '');
  }
  function saveReaderPreference() {
    try { localStorage.setItem(readerPreferenceKey, JSON.stringify({ language: languageSelect.value, version: versionSelect.value })); } catch (ignore) {}
  }
  function populateVersions(preferredVersion) {
    var language = currentLanguage();
    var passage = lesson.passages[Number(passageSelect.value) || 0];
    var testament = isNewTestament(passage[0]) ? 'nt' : 'ot';
    versionSelect.innerHTML = language.versions.map(function (version) {
      var unavailable = version.testament && version.testament !== testament;
      return '<option value="' + esc(version.id) + '"' + (unavailable ? ' disabled' : '') + '>' + esc(version.name) + (unavailable ? ' — not in this testament' : '') + '</option>';
    }).join('');
    var preferred = language.versions.find(function (version) { return version.id === preferredVersion && (!version.testament || version.testament === testament); });
    var available = language.versions.find(function (version) { return !version.testament || version.testament === testament; });
    versionSelect.value = (preferred || available || language.versions[0]).id;
  }
  function readerError(message) {
    scripturePanel.setAttribute('aria-busy', 'false');
    versesPanel.innerHTML = '<div class="bpl-reader-error"><strong>Text unavailable here.</strong><p>' + esc(message) + '</p><p>The reference remains above so you can find it in another edition.</p></div>';
    readerStatus.textContent = 'Choose another language, version, or passage.';
  }
  function loadPassage() {
    var request = ++readerRequest;
    var passage = lesson.passages[Number(passageSelect.value) || 0];
    var language = currentLanguage();
    var version = currentVersion();
    var folder = localizedBook(passage[0], language, version);
    var reference = passageLabel(passage);
    var cacheKey = version.id + '|' + folder + '|' + passage[1];
    var localBook = passage[0].toLowerCase().replace(/\s+/g, '-');
    var endpoint = version.local
      ? '../../assets/data/bible/' + encodeURIComponent(version.local) + '/' + encodeURIComponent(localBook) + '.json'
      : 'https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/' + encodeURIComponent(version.id) + '/books/' + encodeURIComponent(folder) + '/chapters/' + passage[1] + '.json';
    readerReference.textContent = reference;
    readerVersion.textContent = language.name + ' · ' + version.name + ' · ' + version.license;
    scripturePanel.lang = language.id;
    scripturePanel.dir = language.rtl ? 'rtl' : 'ltr';
    scripturePanel.setAttribute('aria-busy', 'true');
    versesPanel.innerHTML = '<p class="bpl-reader-loading">Loading ' + esc(reference) + '…</p>';
    readerStatus.textContent = 'Loading ' + reference + '…';
    prevPassage.disabled = Number(passageSelect.value) === 0;
    nextPassage.disabled = Number(passageSelect.value) === lesson.passages.length - 1;
    saveReaderPreference();
    var result = bibleCache[cacheKey] ? Promise.resolve(bibleCache[cacheKey]) : fetch(endpoint).then(function (response) {
      if (!response.ok) throw new Error('This edition does not contain the selected book or chapter.');
      return response.json();
    }).then(function (data) {
      var normalized = version.local
        ? ((data[passage[1] - 1] || []).map(function (text, verseIndex) { return { verse: verseIndex + 1, text: text }; }))
        : data;
      bibleCache[cacheKey] = normalized;
      return normalized;
    });
    result.then(function (data) {
      if (request !== readerRequest) return;
      var rows = Array.isArray(data) ? data : data.data;
      var seenVerses = {};
      var selected = (rows || []).filter(function (verse) {
        var number = Number(verse.verse);
        if (number < passage[2] || number > passage[3] || seenVerses[number]) return false;
        seenVerses[number] = true;
        return true;
      });
      if (!selected.length) throw new Error('No verses were returned for this reference.');
      versesPanel.innerHTML = selected.map(function (verse) {
        return '<p class="bpl-verse"><sup aria-label="Verse ' + esc(verse.verse) + '">' + esc(verse.verse) + '</sup><span>' + esc(String(verse.text || '').trim()) + '</span></p>';
      }).join('');
      scripturePanel.setAttribute('aria-busy', 'false');
      readerStatus.textContent = selected.length + (selected.length === 1 ? ' verse' : ' verses') + ' loaded.';
    }).catch(function (error) {
      if (request !== readerRequest) return;
      readerError(error.message || 'The open text service could not be reached.');
    });
  }

  var readerPreference = {};
  try { readerPreference = JSON.parse(localStorage.getItem(readerPreferenceKey) || '{}'); } catch (ignore) {}
  if (bibleLanguages.some(function (language) { return language.id === readerPreference.language; })) languageSelect.value = readerPreference.language;
  populateVersions(readerPreference.version);
  languageSelect.addEventListener('change', function () { populateVersions(); loadPassage(); });
  versionSelect.addEventListener('change', loadPassage);
  passageSelect.addEventListener('change', function () { var selectedVersion = versionSelect.value; populateVersions(selectedVersion); loadPassage(); });
  prevPassage.addEventListener('click', function () { passageSelect.selectedIndex -= 1; passageSelect.dispatchEvent(new Event('change')); });
  nextPassage.addEventListener('click', function () { passageSelect.selectedIndex += 1; passageSelect.dispatchEvent(new Event('change')); });
  loadPassage();

  var choices = Array.prototype.slice.call(main.querySelectorAll('.bpl-choice:not(.bpl-multi-choice)'));
  var feedback = main.querySelector('.bpl-feedback');
  choices.forEach(function (button) {
    button.addEventListener('click', function () {
      choices.forEach(function (candidate) { candidate.classList.remove('is-right', 'is-wrong'); });
      var right = button.textContent === lesson.check[2];
      button.classList.add(right ? 'is-right' : 'is-wrong');
      if (!right) choices.filter(function (candidate) { return candidate.textContent === lesson.check[2]; })[0].classList.add('is-right');
      feedback.textContent = lesson.check[3];
    });
  });

  var notes = main.querySelector('#bpl-notes');
  var key = 'bible-pathway-notes:' + lesson.id;
  try { notes.value = localStorage.getItem(key) || ''; } catch (ignore) {}
  notes.addEventListener('input', function () {
    try { localStorage.setItem(key, notes.value); } catch (ignore) {}
    main.querySelector('.bpl-save').textContent = 'Notes saved in this browser.';
  });

  Array.prototype.forEach.call(main.querySelectorAll('[data-reflect-field]'), function (area) {
    var fieldKey = key + ':field' + area.getAttribute('data-reflect-field');
    try { area.value = localStorage.getItem(fieldKey) || ''; } catch (ignore) {}
    area.addEventListener('input', function () {
      try { localStorage.setItem(fieldKey, area.value); } catch (ignore) {}
      main.querySelector('.bpl-save').textContent = 'Notes saved in this browser.';
    });
  });

  var checkBlocks = Array.prototype.slice.call(main.querySelectorAll('.bpl-check-item'));
  var checkScore = main.querySelector('.bpl-checks-score');
  checkBlocks.forEach(function (block) {
    var item = checkItems[Number(block.getAttribute('data-check'))];
    var buttons = Array.prototype.slice.call(block.querySelectorAll('.bpl-multi-choice'));
    var note = block.querySelector('.bpl-feedback');
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var pick = Number(button.getAttribute('data-choice'));
        var right = pick === item[2];
        buttons.forEach(function (candidate) { candidate.classList.remove('is-right', 'is-wrong'); });
        button.classList.add(right ? 'is-right' : 'is-wrong');
        if (!right) buttons[item[2]].classList.add('is-right');
        note.textContent = (right ? 'Yes. ' : 'Not quite. ') + item[3];
        if (!block.hasAttribute('data-done')) {
          block.setAttribute('data-done', '');
          if (right) block.setAttribute('data-first-try', '');
        }
        checkScore.textContent = main.querySelectorAll('.bpl-check-item[data-done]').length + ' of ' + checkBlocks.length + ' answered · ' + main.querySelectorAll('.bpl-check-item[data-first-try]').length + ' right on the first try';
      });
    });
  });

  var levelButtons = Array.prototype.slice.call(main.querySelectorAll('.bpl-level-buttons button'));
  var levelNote = main.querySelector('.bpl-level-note');
  function applyLevel(next, remember) {
    main.setAttribute('data-level', next);
    levelButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-level') === next)); });
    levels.forEach(function (item) { if (item[0] === next && levelNote) levelNote.textContent = item[2]; });
    if (remember) { try { localStorage.setItem('bible-pathway-level', next); } catch (ignore) {} }
  }
  levelButtons.forEach(function (button) { button.addEventListener('click', function () { applyLevel(button.getAttribute('data-level'), true); }); });
  if (levelButtons.length) applyLevel(level, false);

  var rail = main.querySelector('.bpl-learning-flow');
  if (deep && rail) {
    var railLinks = Array.prototype.slice.call(rail.querySelectorAll('a'));
    var seenKey = 'bible-pathway-seen:' + lesson.id;
    var seen = [];
    try { seen = JSON.parse(localStorage.getItem(seenKey) || '[]'); } catch (ignore) {}
    var paintRail = function (activeId) {
      railLinks.forEach(function (anchor) {
        var sectionId = anchor.getAttribute('href').slice(1);
        anchor.classList.toggle('is-seen', seen.indexOf(sectionId) > -1);
        if (sectionId === activeId) {
          anchor.setAttribute('aria-current', 'location');
          rail.scrollTo({ left: Math.max(0, anchor.offsetLeft - rail.clientWidth / 2 + anchor.offsetWidth / 2), behavior: 'auto' });
        } else anchor.removeAttribute('aria-current');
      });
    };
    paintRail(null);
    if ('IntersectionObserver' in window) {
      var railTargets = railLinks.map(function (anchor) { return main.querySelector(anchor.getAttribute('href')); }).filter(Boolean);
      var visibleRatio = {};
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { visibleRatio[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0; });
        var best = null; var bestRatio = 0;
        railTargets.forEach(function (target) { if ((visibleRatio[target.id] || 0) > bestRatio) { best = target.id; bestRatio = visibleRatio[target.id]; } });
        if (!best) return;
        if (seen.indexOf(best) < 0) { seen.push(best); try { localStorage.setItem(seenKey, JSON.stringify(seen)); } catch (ignore) {} }
        paintRail(best);
      }, { threshold: [0.15, 0.4, 0.7] });
      railTargets.forEach(function (target) { observer.observe(target); });
    }
  }

}());
