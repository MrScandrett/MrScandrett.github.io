(function () {
  'use strict';

  var lessons = [
    {
      id: 'world-of-the-bible', code: '1A', stage: 'Stage 1 · The Biblical World', grades: 'Grades 4–9', time: '45–60 minutes',
      title: 'The World of the Bible', lede: 'Build a geographic and chronological framework by connecting major places, peoples, covenants, empires, and events.',
      question: 'How does knowing where and when a biblical event happened help us read it more carefully?',
      scripture: 'Genesis 12:1–9 · Joshua 1:1–9 · Luke 3:1–2',
      goals: ['Locate Mesopotamia, Canaan, Egypt, the wilderness, Israel, and the wider Roman world.', 'Place creation, patriarchs, exodus, kingdom, exile, return, Jesus, and the early Church in sequence.', 'Use geography and chronology as context without letting background replace the biblical text.'],
      lenses: [['Place','Land and movement','Trace Abram’s movement from Mesopotamia toward Canaan. Notice rivers, travel corridors, deserts, and the importance of land in the promise.','Ask: What becomes clearer when this passage is located on a map?'],['Time','Anchor eras','Organize the story around the patriarchs, exodus, judges, monarchy, exile, return, Jesus, and the apostolic Church.','Ask: What came before and what changed afterward?'],['People','Nations and empires','Identify Israel’s neighbors and the empires that shape the setting: Egypt, Assyria, Babylon, Persia, Greece, and Rome.','Ask: Which power relationships are explicit in the text?'],['Story','Promise and fulfillment','Follow creation, fall, covenant, kingdom, exile, Messiah, Church, and new creation without flattening distinct covenants or genres.','Ask: Where does this passage sit in Scripture’s unfolding story?']],
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
      lenses: [['Eden','Presence lost','Human beings live before God in a garden of life, then are exiled eastward and barred from the tree of life.','Notice garden, river, precious materials, cherubim, life, and exile.'],['Sanctuary','Presence among Israel','Tabernacle and Temple provide covenantal sacred space, yet Solomon confesses that heaven cannot contain God.','Hold together real divine presence and God’s transcendence in 1 Kings 8.'],['Christ and Church','Presence embodied','John announces that the Word became flesh and “dwelt” among us; the New Testament also calls God’s people a temple.','Distinguish Christ’s unique incarnation from the Spirit’s corporate indwelling of the Church.'],['New Creation','Presence without a temple','Revelation’s city has no temple building because God and the Lamb are its temple; the tree and river of life return.','Compare Genesis 2–3 with Revelation 21–22.']],
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
      id: 'feasts-of-israel', code: '3B', stage: 'Stage 3 · Israel, Covenant & Prophets', grades: 'Grades 5–10', time: '45–60 minutes',
      title: 'The Feasts of Israel', lede: 'Explore sacred time, harvest rhythms, remembrance, worship, and communal identity in Israel’s calendar.',
      question: 'How did Israel’s appointed feasts teach the community to remember God’s works?',
      scripture: 'Exodus 12 · Leviticus 23 · Deuteronomy 16',
      goals: ['Name the major appointed feasts and place them in their agricultural seasons.', 'Connect feast practices with remembered events and covenant worship.', 'Use New Testament connections carefully and distinguish Jewish and Christian practice.'],
      lenses: [['Spring','Passover and Unleavened Bread','Israel remembers deliverance from Egypt through the Passover meal and the week of Unleavened Bread.','Read Exodus 12 alongside Leviticus 23:4–8.'],['First harvest','Firstfruits and Weeks','Firstfruits acknowledges God’s provision; Weeks follows a counted interval and celebrates harvest with an assembly.','Notice how sacred time is joined to ordinary work and provision.'],['Autumn','Trumpets and Atonement','A memorial of trumpet blasts opens the seventh month; the Day of Atonement centers cleansing and solemn rest.','Compare Leviticus 16 and 23 without treating the days as interchangeable.'],['Ingathering','Booths','Israel lives in temporary shelters, rejoices in harvest, and remembers wilderness dependence after the exodus.','Ask how embodied practices form communal memory.']],
      check: ['What do the feasts join together?',['Only agricultural technique','Sacred time, God’s acts, worship, and community memory','A single event repeated every month'],'Sacred time, God’s acts, worship, and community memory','The calendar connects seasons and harvest with remembered acts of God and covenant worship.'],
      reflect: 'Choose one feast. Explain its timing, key practice, remembered event, and the way it formed Israel’s shared memory.'
    },
    {
      id: 'elijah', code: '3C', stage: 'Stage 3 · Israel, Covenant & Prophets', grades: 'Grades 5–10', time: '45–65 minutes',
      title: 'Elijah: Prophet of the Living God', lede: 'Follow Elijah’s confrontations with Ahab and Baal worship from Mount Carmel to the still small voice at Horeb.',
      question: 'How does Elijah’s ministry confront false worship and reveal who the living God really is?',
      scripture: '1 Kings 17–19 · 1 Kings 21 · 2 Kings 2:1–12',
      goals: ['Sequence Elijah’s ministry from the drought announcement to his ascension in the chariot of fire.', 'Explain how Cherith, Zarephath, Carmel, and Horeb each reveal God’s provision, power, and character.', 'Compare God’s dramatic self-revelation in fire at Carmel with His quiet self-revelation in the “still small voice” at Horeb.'],
      lenses: [['Cherith','Provision in hiding','After announcing a drought to King Ahab, Elijah hides at the Kerith Ravine, where ravens bring him bread and meat and he drinks from the brook.','Read 1 Kings 17:2–7 and ask what this hidden scene teaches about obedience before any public confrontation.'],['Zarephath','A widow’s flour and oil','Sent to a foreign widow during the famine, Elijah finds her jar of flour and jug of oil do not run out, and later raises her son to life.','Notice that God’s provision and power reach beyond Israel’s borders even as judgment falls on Israel.'],['Carmel','Fire falls, Baal is silent','Elijah challenges 450 prophets of Baal to a public contest of sacrifice and fire before all Israel; the Lord answers by fire while Baal answers nothing.','Read 1 Kings 18:20–39 and notice the crowd’s response: “The Lord, he is God.”'],['Horeb','The still small voice','Fleeing Jezebel’s threat after his greatest public victory, Elijah journeys forty days to Horeb, where wind, earthquake, and fire precede a quiet voice that recommissions him.','Compare the dramatic fire at Carmel with the quiet voice at Horeb, and ask what both reveal about God.']],
      check: ['What does Elijah’s flight to Horeb right after Carmel teach?',['Public victory guarantees lasting confidence','Even a faithful prophet can grow afraid and discouraged after a great victory','Elijah stopped trusting God after Carmel'],'Even a faithful prophet can grow afraid and discouraged after a great victory','Elijah’s flight after his greatest public triumph shows that dramatic success does not remove fear, exhaustion, or the need for God’s renewing word.'],
      reflect: 'Choose one scene—Cherith, Zarephath, Carmel, or Horeb. Describe Elijah’s circumstances, God’s provision, and Elijah’s response.'
    },
    {
      id: 'world-of-jesus', code: '4A', stage: 'Stage 4 · Jesus & the Kingdom', grades: 'Grades 4–10', time: '45–60 minutes',
      title: 'The World of Jesus', lede: 'Explore Galilee, Samaria, Judea, Jerusalem, roads, terrain, social groups, and Gospel events.',
      question: 'How do geography and historical setting clarify the Gospel accounts of Jesus?',
      scripture: 'Matthew 4:12–25 · Luke 9:51–56 · John 4:1–42',
      goals: ['Locate major regions, towns, bodies of water, and travel routes in the Gospels.', 'Explain how terrain, distance, rule, and regional identity affect events.', 'Use historical context to clarify rather than control Gospel interpretation.'],
      lenses: [['Galilee','Ministry around the lake','Nazareth, Capernaum, the Sea of Galilee, fishing villages, and surrounding roads frame much of Jesus’ public ministry.','Notice movement among towns and the role of boats, crowds, and hillsides.'],['Samaria','A contested region','Samaria lies between Galilee and Judea, yet regional identity and religious history make travel socially significant.','Read John 4 and Luke 9 without reducing Samaritans to a simple label.'],['Judea','Road toward Jerusalem','Judea includes Jerusalem, nearby villages, wilderness, and roads rising through difficult terrain.','Estimate travel by terrain and ancient conditions, not modern driving time.'],['Jerusalem','Temple and Roman rule','The Temple, festivals, leadership groups, crowds, and Roman authority converge in the city.','Name who holds religious or political authority in each scene.']],
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
      goals: ['Sequence the major events from entry into Jerusalem through resurrection appearances.', 'Compare parallel accounts without erasing each Gospel’s literary emphasis.', 'Articulate why Jesus’ death and resurrection are central to Christian faith.'],
      lenses: [['Entry and Temple','The King enters','Jesus enters Jerusalem, receives royal acclamation, and acts in the Temple. The Gospel writers frame these actions with Scripture.','Compare the citations and details each Gospel foregrounds.'],['Teaching and Supper','Conflict and covenant','Public teaching, controversy, preparation, betrayal, and the final meal move the story toward Jesus’ arrest.','Track changes in location, audience, and dramatic tension.'],['Trial and Cross','The crucified Messiah','Jewish hearings, Roman judgment, crucifixion, death, and burial are narrated with converging testimony and distinct selected details.','Distinguish responsible harmonization from forcing every detail into one narrator’s order.'],['Resurrection','The tomb is empty','Women discover the empty tomb and the risen Jesus appears to disciples. Each Gospel selects scenes serving its own conclusion.','List what all four affirm, then note each writer’s emphasis.']],
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
    {
      id: 'proverbs-wisdom-decision-lab', code: '6A', stage: 'Stage 6 · Wisdom & Christian Life', grades: 'Grades 4–10', time: '40–60 minutes',
      title: 'Proverbs: Wisdom Decision Lab', lede: 'Practice wise judgment about speech, friendship, anger, honesty, work, generosity, and money.',
      question: 'How do biblical proverbs train us to fear the Lord and choose fitting action in real situations?',
      scripture: 'Proverbs 1:1–7 · 10:1–12 · 15:1–4 · 26:4–5',
      goals: ['Explain the fear of the Lord as wisdom’s foundation.', 'Read proverbs as concise wisdom observations rather than mechanical guarantees.', 'Compare multiple relevant proverbs and justify a fitting response.'],
      lenses: [['Observe','What is happening?','Describe the people, words, pressures, relationships, likely outcomes, and missing information without rushing to judgment.','Wisdom begins by listening and seeing accurately.'],['Compare','Which sayings apply?','Gather more than one proverb. Some sayings address different sides of a situation, as Proverbs 26:4–5 demonstrates.','Do not use one line as a slogan detached from the larger wisdom tradition.'],['Discern','What response fits?','Consider timing, motive, audience, consequences, justice, mercy, and faithfulness before choosing a response.','A true saying can still be applied poorly.'],['Practice','Act and reflect','Choose a concrete response, seek counsel when needed, and later examine the fruit without turning formation into a score.','The goal is wise character under God, not merely winning a scenario.']],
      check: ['How should a proverb usually be read?',['As a mechanical promise with no exceptions','As wisdom requiring context, comparison, and discernment','As a rule that replaces listening'],'As wisdom requiring context, comparison, and discernment','Proverbs form wise judgment; their concise observations must be applied fittingly in the fear of the Lord.'],
      reflect: 'Describe a realistic decision involving speech or friendship. Compare two proverbs and justify the response that best fits.'
    },
    {
      id: 'job', code: '6B', stage: 'Stage 6 · Wisdom & Christian Life', grades: 'Grades 6–12', time: '50–70 minutes',
      title: 'Job: Suffering, Wisdom & Faithful Speech', lede: 'Read Job as wisdom literature: lament honestly, test easy explanations, and listen for the book’s answer to suffering and human limits.',
      question: 'How can faithful speech make room for suffering without pretending to know more than we do?',
      scripture: 'Job 1–3 · 38–42',
      goals: ['Trace the movement from Job’s loss and lament through the friends’ explanations to God’s speeches and Job’s response.', 'Distinguish lament, accusation, explanation, and divine wisdom instead of treating every speech as equally authoritative.', 'Practice accompanying suffering with humility, truthful presence, and hope rather than assigning blame.'],
      lenses: [['Loss','What happens?','The opening scenes establish Job’s losses and preserve his refusal to curse God, but they do not give the reader a simple formula for explaining suffering.','Name what the text says and what it leaves unexplained.'],['Lament','Faithful protest','Job curses the day of his birth, asks hard questions, and directs his speech toward God. Lament is not the same as indifference or silence.','Listen for grief, desire for justice, and continued relationship in the same speech.'],['Friends','Testing explanations','Eliphaz, Bildad, and Zophar repeatedly connect suffering with wrongdoing. Their confidence sounds orderly, but Job 42:7 makes the book’s judgment on their speech part of the lesson.','A plausible principle can become harmful when applied without evidence or compassion.'],['Encounter','Wonder and limits','God answers from the whirlwind with questions about creation, creatures, justice, and human knowledge. Job receives no secret transcript of the heavenly council; he receives an encounter that reorders his confidence.','Do not turn God’s questions into a claim that every sufferer caused their own pain.']],
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
      goals: ['Trace Genesis through its repeated generations and turning points.', 'Distinguish what the text states from later interpretations or reconstructions.', 'Explain how God’s promise to Abraham carries the story beyond one family.'],
      lenses: [['Creation','A good world','Genesis begins with ordered life, blessing, image-bearing, and rest.','Observe the repeated pattern before asking what it means.'],['Fall','Broken fellowship','Genesis 3 introduces distrust, shame, exile, violence, and the need for promise.','Name consequences without treating every later detail as a direct replay.'],['Promise','A family for blessing','God calls Abram and promises land, descendants, and blessing for the families of the earth.','Follow the promise through failures, delays, and surprising births.'],['Providence','Toward Egypt','Joseph’s descent and rise bring the family to Egypt, where the next book begins.','Trace the story’s movement rather than reducing it to isolated heroes.']],
      check: ['Which thread best connects Genesis 12 to the rest of Scripture?',['A promise to bless the families of the earth through Abraham’s line','A command to build the Jerusalem Temple immediately','A prediction that every event will be easy'],'A promise to bless the families of the earth through Abraham’s line','Genesis gives the family story a wider horizon: blessing is meant to reach beyond Abraham’s household.'],
      reflect: 'Draw a six-stop timeline from creation to Joseph. At each stop, name one fracture and one promise.'
    },
    {
      id: 'exodus', code: '2C', stage: 'Stage 2 · God Dwells With His People', grades: 'Grades 5–10', time: '50–70 minutes',
      title: 'Exodus: Rescue, Covenant & Presence', lede: 'Follow Israel from slavery in Egypt through Passover, the sea, and Sinai into a covenant people.',
      question: 'How do rescue and covenant form a people who did not previously exist as a nation?',
      scripture: 'Exodus 1–3 · 12–14 · 19–20',
      goals: ['Sequence oppression, calling, plagues, Passover, sea crossing, wilderness, and Sinai.', 'Explain how deliverance leads to covenant identity rather than merely escape.', 'Connect Exodus 19–20 with the Tabernacle and later biblical memory.'],
      lenses: [['Oppression','A people under power','Exodus names forced labor, fear, resistance, and the cries of an enslaved people.','Keep the human cost visible before moving to the spectacular scenes.'],['Name','A reluctant calling','At the bush, Moses encounters the God who sees, hears, remembers, and sends.','Compare Moses’ questions with God’s revealed name and promise.'],['Passover','Rescue remembered','The meal, blood, haste, and memorial make deliverance communal and repeatable.','Notice how ritual turns history into shared memory.'],['Sinai','A covenant people','Israel is rescued before receiving the law; covenant gives shape to worship, justice, and neighbor-love.','Read commands as the vocation of a redeemed people, not a ladder to earn rescue.']],
      check: ['What is the order in Exodus?',['Sinai covenant → slavery → Passover → creation','Slavery → calling → Passover and sea → Sinai covenant','Temple building → exile → slavery → Sinai'],'Slavery → calling → Passover and sea → Sinai covenant','Exodus moves from oppression through God’s rescue to covenant identity at Sinai.'],
      reflect: 'Create a route-and-covenant map. Mark one place, one rescue event, and one way Sinai changes Israel’s shared life.'
    },
    {
      id: 'jesus-ministry', code: '4C', stage: 'Stage 4 · Jesus & the Kingdom', grades: 'Grades 4–10', time: '50–70 minutes',
      title: 'Jesus’ Ministry: The Kingdom Arrives', lede: 'Trace Jesus’ baptism, temptation, calling, signs, conflicts, and announcement of God’s kingdom before Holy Week.',
      question: 'What does Jesus announce and embody when He says that God’s kingdom has drawn near?',
      scripture: 'Mark 1:1–45 · Luke 4:14–44 · Matthew 16:13–20',
      goals: ['Sequence the opening movement of Jesus’ public ministry.', 'Compare teaching, healing, exorcism, meals, and calls to discipleship as signs of the kingdom.', 'Read Gospel scenes in context without collapsing their distinct emphases.'],
      lenses: [['Baptism','The beloved Son','Jesus enters the story publicly through baptism, the Spirit, and the Father’s declaration.','Ask what identity comes before public achievement.'],['Announcement','Good news for the poor','Jesus reads Isaiah and announces release, sight, freedom, and the Lord’s favor.','Compare the synagogue claim with the response it provokes.'],['Signs','Restoration and authority','Healings and exorcisms restore people while raising questions about Jesus’ authority.','Do not treat miracles as detachable tricks; read who is restored and what is revealed.'],['Discipleship','A new community','Jesus calls people, eats across boundaries, teaches crowds, and asks who His disciples say He is.','Track both welcome and the cost of following.']],
      check: ['What belongs together in Jesus’ ministry?',['Announcement of the kingdom, restoration, teaching, and a call to follow','Only private moral advice with no public setting','A sequence that begins after the resurrection'],'Announcement of the kingdom, restoration, teaching, and a call to follow','The Gospels present Jesus’ words and works together as the kingdom’s arrival and an invitation to discipleship.'],
      reflect: 'Choose one scene before Holy Week. Identify the need, Jesus’ action or word, the response, and what it reveals about the kingdom.'
    },
    {
      id: 'psalms', code: '6D', stage: 'Stage 6 · Wisdom & Christian Life', grades: 'Grades 4–12', time: '45–65 minutes',
      title: 'Psalms: Learning to Pray the Whole Life', lede: 'Read praise, lament, thanksgiving, wisdom, and protest as truthful speech before God.',
      question: 'How do the Psalms teach people to speak honestly to God across the whole range of life?',
      scripture: 'Psalms 1 · 13 · 23 · 51 · 73 · 103 · 150',
      goals: ['Identify common movements and genres in biblical prayer-poetry.', 'Notice parallelism, image, repetition, and changes in voice.', 'Write a responsible response that makes room for both grief and praise.'],
      lenses: [['Lament','Where are you?','Psalm 13 moves from complaint through request toward renewed trust without pretending the pain is small.','Treat unanswered questions as part of faithful speech.'],['Praise','Who is God?','Psalms praise God as creator, king, shepherd, redeemer, and merciful covenant Lord.','Let the psalm’s images carry their emotional and theological weight.'],['Wisdom','Which way?','Psalm 1 sets two ways before the reader and uses tree, water, wind, and harvest as moral images.','Compare poetry’s picture with the prose claim it communicates.'],['Practice','What does prayer do?','The Psalms give a community words to remember, confess, protest, celebrate, and hope together.','Writing a psalm is a literary exercise, not a promise that every feeling resolves quickly.']],
      check: ['What makes a lament a form of faith rather than indifference?',['It turns pain toward God while continuing to ask, remember, or trust','It avoids naming grief so worship stays cheerful','It proves the writer already understands the cause'],'It turns pain toward God while continuing to ask, remember, or trust','Biblical lament speaks honestly to God and often holds complaint, request, memory, and hope together.'],
      reflect: 'Annotate Psalm 13 with four colors: complaint, request, memory, and trust. Which movement is strongest, and which is hardest to write.'
    },
    {
      id: 'joshua-to-david', code: '3D', stage: 'Stage 3 · Israel, Covenant & Prophets', grades: 'Grades 5–10', time: '55–75 minutes',
      title: 'Joshua to David: Land, Judges & Kings', lede: 'Bridge the story from Joshua’s settlement through Judges, Samuel, Saul, David, and the covenant hope of a king.',
      question: 'Why does Israel’s movement from land to monarchy create both hope and danger?',
      scripture: 'Joshua 1 · Judges 2 · 1 Samuel 8 · 2 Samuel 7',
      goals: ['Place settlement, tribal instability, judges, Saul, and David in sequence.', 'Distinguish the Bible’s theological pattern from a simplistic “good times/bad times” cycle.', 'Explain both the promise and the risk in Israel’s request for a king.'],
      lenses: [['Joshua','A land received','Joshua frames courage, inheritance, memory, and covenant faithfulness after Moses.','Read conquest and settlement with attention to the text’s own claims and limits.'],['Judges','A fractured cycle','Judges repeats crisis, crying out, deliverance, and relapse while showing local variation and moral deterioration.','Do not treat “everyone did what was right” as a compliment.'],['Samuel','A king requested','Israel asks for a king like the nations; the request addresses real insecurity but also reveals misplaced trust.','Hold together God’s warning and God’s continued purpose.'],['David','Promise and failure','David receives a covenant promise, yet his household and kingdom remain morally complicated.','Distinguish promise from approval of every royal action.']],
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
    {
      id: 'revelation', code: '6E', stage: 'Stage 6 · Wisdom & Christian Life', grades: 'Grades 7–12', time: '55–75 minutes',
      title: 'Revelation: Witness, Worship & New Creation', lede: 'Learn to read Revelation’s symbols, letters, heavenly worship, judgment, and new creation with patience and humility.',
      question: 'How does Revelation encourage faithful witness when empire, suffering, and uncertainty seem to dominate?',
      scripture: 'Revelation 1–3 · 4–5 · 12–14 · 21–22',
      goals: ['Identify genre signals and recurring images without treating every symbol as a modern code.', 'Compare the seven churches’ local situations with the book’s worship-centered vision.', 'Explain how Revelation ends the Bible’s story with judgment, presence, healing, and new creation.'],
      lenses: [['Letters','Seven churches','The opening visions address real congregations with distinct strengths, compromises, suffering, and promises.','Start with the named audience before moving to cosmic imagery.'],['Worship','Who is worthy?','Heavenly worship frames the Lamb’s worthiness and challenges rival claims to ultimate power.','Notice how song, throne, scroll, and witness interpret the crisis.'],['Symbols','Read the images','Dragon, beasts, numbers, lampstands, seals, and cities work through biblical echoes and symbolic patterns.','Offer interpretations as argued readings, not certainty where the text leaves room.'],['New creation','God dwells with humanity','The final vision answers Eden’s loss with dwelling, river, tree, healing, light, justice, and the end of death.','Connect Revelation 21–22 to Genesis without erasing the newness of the promise.']],
      check: ['What is a careful way to read Revelation’s symbols?',['Trace their literary and biblical context, then distinguish evidence from interpretation','Assume each number names one modern headline','Ignore the letters to the actual churches'],'Trace their literary and biblical context, then distinguish evidence from interpretation','Revelation invites bold hope and careful reading; symbols should be interpreted with the book’s context and biblical echoes in view.'],
      reflect: 'Compare one image in Revelation with its earlier biblical echo. State what the connection supports and what remains interpretive.'
    }
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
    'proverbs-wisdom-decision-lab': {
      focus: ['covenant', 'kingdom', 'jesus', 'church'],
      bigIdea: 'Biblical wisdom trains people to fear the Lord, notice reality carefully, and choose fitting faithfulness in ordinary life.',
      before: 'God forms a covenant people whose worship must shape speech, work, money, friendship, justice, and family life.',
      now: 'Proverbs offers concise observations that require listening, comparison, context, and discernment—not mechanical use.',
      next: 'Jesus embodies and teaches God’s wisdom, forming disciples whose inner character and outward practice belong together.'
    },
    'job': {
      focus: ['fall', 'covenant', 'kingdom', 'jesus'],
      bigIdea: 'Job gives faithful speech room for grief, protest, silence, and wonder while refusing easy explanations for another person’s suffering.',
      before: 'Wisdom literature asks how to live well before God, while the Bible’s story also contains a world marked by death, injustice, and human limits.',
      now: 'Job loses what he loves, rejects simplistic explanations from his friends, speaks honestly to God, and encounters God without receiving a tidy cause for every wound.',
      next: 'Jesus does not make suffering easy, but the Gospels show God entering human grief; the Church learns to lament, accompany the suffering, and hope for resurrection.'
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
    'world-of-the-bible': [['Genesis',12,1,9],['Joshua',1,1,9],['Luke',3,1,2],['Acts',17,24,28]],
    'how-the-bible-reached-us': [['Deuteronomy',31,24,26],['Luke',1,1,4],['2 Timothy',3,14,17],['2 Peter',1,19,21]],
    'the-tabernacle': [['Exodus',25,1,9],['Exodus',40,34,38],['Leviticus',16,29,34],['Hebrews',9,1,12]],
    'temple-and-gods-presence': [['Genesis',3,22,24],['1 Kings',8,22,30],['John',1,14,18],['1 Corinthians',3,16,17],['Revelation',21,22,27]],
    'kingdoms-prophets-exile': [['1 Samuel',8,4,9],['1 Kings',12,16,20],['2 Kings',17,6,18],['2 Kings',25,8,12],['Ezra',1,1,4]],
    'feasts-of-israel': [['Exodus',12,1,14],['Leviticus',23,4,8],['Leviticus',23,15,22],['Leviticus',23,33,43],['Deuteronomy',16,16,17]],
    'elijah': [['1 Kings',17,1,16],['1 Kings',18,20,39],['1 Kings',19,9,18],['2 Kings',2,9,12]],
    'world-of-jesus': [['Matthew',4,12,17],['Luke',4,16,21],['Luke',9,51,56],['John',4,4,10],['John',4,39,42]],
    'jesus-parables-lab': [['Matthew',13,1,9],['Matthew',13,31,33],['Luke',10,25,37],['Luke',15,11,24]],
    'holy-week': [['Matthew',21,1,11],['Mark',14,22,26],['Luke',23,32,49],['John',20,1,18]],
    'acts-jerusalem-to-nations': [['Acts',1,6,11],['Acts',2,1,12],['Acts',8,26,40],['Acts',10,34,48],['Acts',13,1,3]],
    'pauls-missionary-journeys': [['Acts',13,1,12],['Acts',16,6,15],['Acts',17,16,34],['Acts',20,17,24],['Romans',1,1,7]],
    'proverbs-wisdom-decision-lab': [['Proverbs',1,1,7],['Proverbs',10,1,12],['Proverbs',15,1,4],['Proverbs',26,4,5],['Proverbs',27,5,10]],
    'job': [['Job',1,1,22],['Job',2,1,13],['Job',3,1,26],['Job',38,1,18],['Job',42,1,17]],
    'sermon-on-the-mount': [['Matthew',5,1,12],['Matthew',5,13,20],['Matthew',6,5,15],['Matthew',6,25,34],['Matthew',7,24,29]]
    ,'genesis': [['Genesis',1,1,5],['Genesis',3,1,15],['Genesis',12,1,9],['Genesis',37,1,11],['Genesis',50,15,21]]
    ,'exodus': [['Exodus',1,8,14],['Exodus',3,1,15],['Exodus',12,1,14],['Exodus',14,21,31],['Exodus',19,1,8]]
    ,'jesus-ministry': [['Mark',1,9,15],['Luke',4,16,30],['Mark',2,1,12],['Mark',4,35,41],['Matthew',16,13,20]]
    ,'psalms': [['Psalms',1,1,6],['Psalms',13,1,6],['Psalms',23,1,6],['Psalms',51,1,12],['Psalms',150,1,6]]
    ,'joshua-to-david': [['Joshua',1,1,9],['Judges',2,6,23],['1 Samuel',8,4,22],['1 Samuel',16,1,13],['2 Samuel',7,8,17]]
    ,'epistles': [['Romans',1,1,17],['1 Corinthians',12,12,27],['1 Corinthians',13,1,13],['Galatians',3,26,29],['Ephesians',2,11,22]]
    ,'revelation': [['Revelation',1,9,20],['Revelation',2,1,7],['Revelation',5,1,14],['Revelation',12,1,12],['Revelation',21,1,8]]
  };

  var bibleLanguages = [
    { id: 'en', name: 'English', versions: [
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
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/A_general_map_of_Bible_Lands.jpg/1280px-A_general_map_of_Bible_Lands.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:A_general_map_of_Bible_Lands.jpg',
      alt: 'Historic illustrated map of the lands surrounding the eastern Mediterranean and the biblical world',
      caption: 'A 1913 map gives a wide-angle view of the lands, seas, and travel corridors that frame the biblical story.',
      credit: 'Edwin Gardner / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'how-the-bible-reached-us': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Great_Isaiah_Scroll.jpg/1280px-Great_Isaiah_Scroll.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Great_Isaiah_Scroll.jpg',
      alt: 'The Great Isaiah Scroll opened to show columns of handwritten Hebrew text',
      caption: 'The Great Isaiah Scroll is a manuscript witness from Qumran, copied more than a thousand years before the oldest complete Masoretic codices.',
      credit: 'Ardon Bar Hama / Israel Museum', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'the-tabernacle': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Bijbels_Museum-Detail_from_a_model_of_the_tabernacle.jpg/1280px-Bijbels_Museum-Detail_from_a_model_of_the_tabernacle.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Bijbels_Museum-Detail_from_a_model_of_the_tabernacle.jpg',
      alt: 'Museum model showing the courtyard and tent of the biblical Tabernacle',
      caption: 'A museum model translates Exodus’s spatial description into a visible courtyard and tent. Models are interpretations and should be checked against the text.',
      credit: 'Yair Haklai', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    'temple-and-gods-presence': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Temple_of_Solomon_model.jpg/1280px-Temple_of_Solomon_model.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Temple_of_Solomon_model.jpg',
      alt: 'Architectural model presenting one reconstruction of Solomon’s Temple',
      caption: 'One modern reconstruction of Solomon’s Temple helps students visualize sacred space while remembering that a model includes interpretive decisions.',
      credit: 'SalemOptix', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    'kingdoms-prophets-exile': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Judaean_people_are_being_deported_into_exile_after_the_capture_of_Lachish.jpg/1280px-Judaean_people_are_being_deported_into_exile_after_the_capture_of_Lachish.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Judaean_people_are_being_deported_into_exile_after_the_capture_of_Lachish.jpg',
      alt: 'Assyrian stone relief showing Judean captives deported after the capture of Lachish',
      caption: 'This Assyrian palace relief depicts Judeans leaving Lachish after its capture, giving material context to the empire’s warfare and deportation policy.',
      credit: 'Osama Shukir Muhammed Amin FRCP(Glasg)', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    'feasts-of-israel': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Feast_of_Tabernacle._Avram%27s_booth._Yehia_seated_in_door_of_tabernacle_booth_LOC_matpc.19879.jpg/1280px-Feast_of_Tabernacle._Avram%27s_booth._Yehia_seated_in_door_of_tabernacle_booth_LOC_matpc.19879.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Feast_of_Tabernacle._Avram%27s_booth._Yehia_seated_in_door_of_tabernacle_booth_LOC_matpc.19879.jpg',
      alt: 'Historic photograph of a man seated in the doorway of a booth prepared for the Feast of Tabernacles',
      caption: 'A historic Jerusalem photograph shows an inhabited sukkah, an embodied practice of remembrance during the Feast of Booths.',
      credit: 'Matson Collection / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'elijah': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Along_the_sea_coast._Elijah%27s_Spring%2C_Mount_Carmel_LOC_matpc.01205.jpg/1280px-Along_the_sea_coast._Elijah%27s_Spring%2C_Mount_Carmel_LOC_matpc.01205.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Along_the_sea_coast._Elijah%27s_Spring,_Mount_Carmel_LOC_matpc.01205.jpg',
      alt: 'Historic photograph of springs and grazing goats near a site traditionally associated with Elijah on Mount Carmel',
      caption: 'A traditional site remembered as “Elijah’s Spring” near Mount Carmel, photographed around 1900. Local tradition preserves the memory; Scripture itself does not name this exact spot.',
      credit: 'Matson Collection / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'world-of-jesus': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Landscape_with_Lake_Kinnaret_%28Sea_of_Galilee%29_in_Distance_-_From_Golan_Heights_%285710776912%29.jpg/1280px-Landscape_with_Lake_Kinnaret_%28Sea_of_Galilee%29_in_Distance_-_From_Golan_Heights_%285710776912%29.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Landscape_with_Lake_Kinnaret_(Sea_of_Galilee)_in_Distance_-_From_Golan_Heights_(5710776912).jpg',
      alt: 'Landscape view across hills toward the Sea of Galilee',
      caption: 'The Sea of Galilee and its surrounding highlands show why boats, shorelines, slopes, and regional routes repeatedly shape Gospel scenes.',
      credit: 'Adam Jones', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/'
    },
    'jesus-parables-lab': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Lupinus_pilosus_with_Mustard_plant_%28Sinapis%29_in_the_background.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Lupinus_pilosus_with_Mustard_plant_(Sinapis)_in_the_background.jpg',
      alt: 'Wildflowers and mustard plants growing in the Lower Galilee',
      caption: 'Mustard grows among other plants in the Lower Galilee. Jesus draws on familiar living things like seeds, fields, birds, and harvests to invite attentive hearing.',
      credit: 'Yuvalr', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    'holy-week': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Jerusalem_panorama_from_Mount_of_Olives_07112018.jpg/1280px-Jerusalem_panorama_from_Mount_of_Olives_07112018.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Jerusalem_panorama_from_Mount_of_Olives_07112018.jpg',
      alt: 'Panoramic view of Jerusalem from the Mount of Olives',
      caption: 'Looking west from the Mount of Olives places the Temple Mount, eastern wall, valleys, and the city’s rising terrain in one geographic frame.',
      credit: 'Beko', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    'acts-jerusalem-to-nations': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Jerusalem_old_city_panorama_.jpg/1280px-Jerusalem_old_city_panorama_.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Jerusalem_old_city_panorama_.jpg',
      alt: 'Wide panorama of Jerusalem’s Old City and surrounding neighborhoods',
      caption: 'Acts begins in Jerusalem, but its witness moves outward through people, roads, households, ports, and cities across the Roman world.',
      credit: 'Nettadi', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    'pauls-missionary-journeys': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Roman_road_in_Tarsus%2C_Mersin_Province.jpg/1280px-Roman_road_in_Tarsus%2C_Mersin_Province.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Roman_road_in_Tarsus,_Mersin_Province.jpg',
      alt: 'Excavated Roman road running through Tarsus in modern Turkey',
      caption: 'An excavated Roman road in Tarsus, Paul’s home city, makes the physical infrastructure of travel across the Roman world visible.',
      credit: 'Nedim Ardoğa', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    'proverbs-wisdom-decision-lab': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Proverb_scroll.PNG',
      page: 'https://commons.wikimedia.org/wiki/File:Proverb_scroll.PNG',
      alt: 'Open scroll containing the Book of Proverbs in Hebrew',
      caption: 'A modern Hebrew scroll of Proverbs reminds readers that biblical wisdom is a collected, literary tradition meant to be read in context.',
      credit: 'Pete Unseth', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
    },
    'job': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/William_Blake_-_Job_and_his_Daughters_-_Google_Art_Project.jpg/1280px-William_Blake_-_Job_and_his_Daughters_-_Google_Art_Project.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:William_Blake_-_Job_and_his_Daughters_-_Google_Art_Project.jpg',
      alt: 'William Blake watercolor showing Job and his daughters beneath a radiant heavenly vision',
      caption: 'William Blake visualizes Job’s restoration with a radiant, symbolic composition. It is a later artistic interpretation—not an illustration made in Job’s ancient setting—so compare its choices with the book’s own words.',
      credit: 'William Blake, Job and His Daughters, 1805 / 1816', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    'sermon-on-the-mount': {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/VIEW_FROM_THE_MOUNT_OF_BEATITUDES_%287723721162%29.jpg/1280px-VIEW_FROM_THE_MOUNT_OF_BEATITUDES_%287723721162%29.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:VIEW_FROM_THE_MOUNT_OF_BEATITUDES_(7723721162).jpg',
      alt: 'View across the green slopes toward the Sea of Galilee from the traditional Mount of Beatitudes',
      caption: 'The traditional Mount of Beatitudes overlooks the Sea of Galilee. The exact setting of the sermon is not identified with certainty in Matthew.',
      credit: 'israeltourism', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/'
    }
  };

  var lessonVisualJourneys = {
    'temple-and-gods-presence': [
      {
        title: 'Garden and promise',
        note: 'Eden is known through the biblical text, so artists visualize it rather than document it.',
        items: [
          {
            title: 'The Garden of Eden', kind: 'Artistic depiction · Genesis 2–3',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Thomas_Cole_-_The_Garden_of_Eden_-_1828.jpg/960px-Thomas_Cole_-_The_Garden_of_Eden_-_1828.jpg',
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
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Mount_Sinai_BW_4.jpg/960px-Mount_Sinai_BW_4.jpg',
            page: 'https://commons.wikimedia.org/wiki/File:Mount_Sinai_BW_4.jpg',
            alt: 'Rocky summit of the mountain traditionally identified as Mount Sinai in Egypt',
            caption: 'Sinai recalls God descending in fire and cloud to give the covenant; the mountain’s exact biblical location remains debated.',
            credit: 'Berthold Werner', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
          },
          {
            title: 'Mount Tabor', kind: 'Traditional identification · Matthew 17:1–8',
            src: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Mount_Tabor4.jpg',
            page: 'https://commons.wikimedia.org/wiki/File:Mount_Tabor4.jpg',
            alt: 'Rounded green profile of Mount Tabor rising above the surrounding plain in Israel',
            caption: 'Christian tradition connects Tabor with the Transfiguration, when Christ’s glory was revealed to Peter, James, and John.',
            credit: 'Eliot / TheCuriousGnome', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/'
          },
          {
            title: 'Mount of Olives', kind: 'Biblical place · Gospels and Acts',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/2013-Aerial-Mount_of_Olives.jpg/960px-2013-Aerial-Mount_of_Olives.jpg',
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
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Exterior_of_Saint_Peter%27s_Basilica.jpg/960px-Exterior_of_Saint_Peter%27s_Basilica.jpg',
            page: 'https://commons.wikimedia.org/wiki/File:Exterior_of_Saint_Peter%27s_Basilica.jpg',
            alt: 'Facade and dome of Saint Peter’s Basilica seen from Saint Peter’s Square',
            caption: 'One of Christianity’s most recognized churches, St. Peter’s joins a vast gathering place to imagery of apostles, saints, and the cross.',
            credit: 'Yair Haklai', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'Notre-Dame de Paris', kind: 'France · Gothic',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Paris%2C_Notre_Dame_--_2014_--_1448.jpg/960px-Paris%2C_Notre_Dame_--_2014_--_1448.jpg',
            page: 'https://commons.wikimedia.org/wiki/File:Paris,_Notre_Dame_--_2014_--_1448.jpg',
            alt: 'Western facade and twin towers of Notre-Dame Cathedral in Paris',
            caption: 'Notre-Dame’s portals, towers, and rose window turn stone and colored light into a public proclamation of the Christian story.',
            credit: 'Dietmar Rabich', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'Sagrada Família', kind: 'Barcelona · Modernisme',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Exterior_of_the_Sagrada_Fam%C3%ADlia_20171225.jpg/960px-Exterior_of_the_Sagrada_Fam%C3%ADlia_20171225.jpg',
            page: 'https://commons.wikimedia.org/wiki/File:Exterior_of_the_Sagrada_Fam%C3%ADlia_20171225.jpg',
            alt: 'Sculpted towers and facade of the Sagrada Família basilica in Barcelona',
            caption: 'Antoni Gaudí’s basilica uses branching columns, sculpted Scripture scenes, and changing light to join creation with the gospel story.',
            credit: 'Suicasmo', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'Church of the Holy Sepulchre', kind: 'Jerusalem · Pilgrimage church',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Jerusalem_Holy_Sepulchre_BW_22.JPG/960px-Jerusalem_Holy_Sepulchre_BW_22.JPG',
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
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/The_Baptism_of_Christ_%28Verrocchio_%26_Leonardo%29.jpg/960px-The_Baptism_of_Christ_%28Verrocchio_%26_Leonardo%29.jpg',
            page: 'https://commons.wikimedia.org/wiki/File:The_Baptism_of_Christ_(Verrocchio_%26_Leonardo).jpg',
            alt: 'Renaissance painting of Jesus’ baptism, with the Spirit represented as a dove and heaven opening above',
            caption: 'This Renaissance work pictures the Father’s voice, the Spirit descending like a dove, and the Son standing in the Jordan.',
            credit: 'Verrocchio and Leonardo da Vinci', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
          },
          {
            title: 'The Transfiguration', kind: 'Icon · Matthew 17:1–8',
            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Transfiguration_by_Feofan_Grek_from_Spaso-Preobrazhensky_Cathedral_in_Pereslavl-Zalessky_%2815th_c%2C_Tretyakov_gallery%29.jpeg/960px-Transfiguration_by_Feofan_Grek_from_Spaso-Preobrazhensky_Cathedral_in_Pereslavl-Zalessky_%2815th_c%2C_Tretyakov_gallery%29.jpeg',
            page: 'https://commons.wikimedia.org/wiki/File:Transfiguration_by_Feofan_Grek_from_Spaso-Preobrazhensky_Cathedral_in_Pereslavl-Zalessky_(15th_c,_Tretyakov_gallery).jpeg',
            alt: 'Fifteenth-century icon of the radiant Christ above the disciples at the Transfiguration',
            caption: 'The icon uses radiating light and height to confess what the Gospel narrates: Christ’s glory disclosed before the disciples.',
            credit: 'Unknown 15th-century icon painter', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
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
            src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Mount_of_Beatitudes_View_Sea_of_Galilee_200704.JPG/1280px-Mount_of_Beatitudes_View_Sea_of_Galilee_200704.JPG',
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
            src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Bloch-SermonOnTheMount.jpg/1280px-Bloch-SermonOnTheMount.jpg',
            page: 'https://commons.wikimedia.org/wiki/File:Bloch-SermonOnTheMount.jpg',
            alt: 'Carl Bloch painting of Jesus standing with arm raised on a sunlit hillside teaching diverse men, women, and children',
            caption: 'Danish master Carl Bloch portrays Jesus surrounded by listeners of all ages, capturing the intimate yet cosmic authority of the Beatitudes.',
            credit: 'Carl Bloch, 1877, Frederiksborg Castle', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Sermon on the Mount & Healing', kind: 'Cosimo Rosselli · Sistine Chapel (1481–1482)',
            src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Cosimo_Rosselli_Sermone_della_Montagna.jpg/1280px-Cosimo_Rosselli_Sermone_della_Montagna.jpg',
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
            src: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Codex_Sinaiticus_Matthew_6%2C4-32.JPG',
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
            src: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Great_Isaiah_Scroll.jpg',
            page: 'https://commons.wikimedia.org/wiki/File:Great_Isaiah_Scroll.jpg',
            alt: 'Parchment scroll opened to reveal columns of ancient Hebrew calligraphy',
            caption: 'Preserved in the caves of Qumran, this 24-foot Hebrew scroll shows how Jewish scribes copied and guarded biblical books a thousand years before medieval codices.',
            credit: 'Israel Museum, Jerusalem / Ardon Bar Hama', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
          },
          {
            title: 'Codex Sinaiticus', kind: 'Greek Bible · 4th century CE',
            src: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Codex_Sinaiticus_Matthew_6%2C4-32.JPG',
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
            src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Gutenberg_Bible_-_Library_of_Congress.jpg/1280px-Gutenberg_Bible_-_Library_of_Congress.jpg',
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
            src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/20101024_Acropolis_panoramic_view_from_Areopagus_hill_Athens_Greece.jpg/1280px-20101024_Acropolis_panoramic_view_from_Areopagus_hill_Athens_Greece.jpg',
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
            src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Erastus_stone_at_Theater_of_Corinth_%28cropped%29.jpg/1280px-Erastus_stone_at_Theater_of_Corinth_%28cropped%29.jpg',
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
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Map_of_the_Ancient_Near_East.jpg/1280px-Map_of_the_Ancient_Near_East.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Map_of_the_Ancient_Near_East.jpg',
      alt: 'Historical map of the ancient Near East from Egypt and the Mediterranean to Mesopotamia',
      credit: 'Dodd, Mead, and Company', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    bibleLands: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/A_general_map_of_Bible_Lands.jpg/1280px-A_general_map_of_Bible_Lands.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:A_general_map_of_Bible_Lands.jpg',
      alt: 'Historical map showing the broad lands associated with the biblical story',
      credit: 'Edwin Gardner / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    sinai: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Sinai-peninsula-map.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Sinai-peninsula-map.jpg',
      alt: 'Shaded relief reference map of the Sinai Peninsula between Egypt and the southern Levant',
      credit: 'U.S. Central Intelligence Agency', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    jerusalem: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Map_of_the_Old_City_and_surroundings_of_Jerusalem.svg/1280px-Map_of_the_Old_City_and_surroundings_of_Jerusalem.svg.png',
      page: 'https://commons.wikimedia.org/wiki/File:Map_of_the_Old_City_and_surroundings_of_Jerusalem.svg',
      alt: 'Modern reference map of Jerusalem’s Old City and surrounding valleys and neighborhoods',
      credit: 'Obendorf', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    kingdoms: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Kingdoms_of_Israel_and_Judah_%288th_century_BCE%29.svg/1280px-Kingdoms_of_Israel_and_Judah_%288th_century_BCE%29.svg.png',
      page: 'https://commons.wikimedia.org/wiki/File:Kingdoms_of_Israel_and_Judah_(8th_century_BCE).svg',
      alt: 'Map of Israel, Judah, and neighboring states in the eighth century BCE',
      credit: 'Tobias Schäfer 87', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
    },
    tribes: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/12_Tribes_of_Israel_Map.svg/1280px-12_Tribes_of_Israel_Map.svg.png',
      page: 'https://commons.wikimedia.org/wiki/File:12_Tribes_of_Israel_Map.svg',
      alt: 'Map presenting the tribal allotments described in Joshua chapters 13 through 19',
      credit: 'Richardprins and contributors', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    jesus: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Palestine_in_the_time_of_Jesus.jpg/1280px-Palestine_in_the_time_of_Jesus.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Palestine_in_the_time_of_Jesus.jpg',
      alt: 'Historical map of Galilee, Samaria, Judea, Perea, and neighboring regions around the time of Jesus',
      credit: 'Charles Foster Kent / Library of Congress', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    galilee: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Sea_of_galilee_map_1903.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Sea_of_galilee_map_1903.jpg',
      alt: 'Historical reference map of the Sea of Galilee and surrounding towns and terrain',
      credit: 'Paul Waterhouse', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    romanEmpire: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/RomanEmpire_117.svg/1280px-RomanEmpire_117.svg.png',
      page: 'https://commons.wikimedia.org/wiki/File:RomanEmpire_117.svg',
      alt: 'Map showing the extent and provinces of the Roman Empire in 117 CE',
      credit: 'ArdadN', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    },
    paulFirstJourney: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Paul_the_Apostle%2C_first_missionary_journey.svg/1280px-Paul_the_Apostle%2C_first_missionary_journey.svg.png',
      page: 'https://commons.wikimedia.org/wiki/File:Paul_the_Apostle,_first_missionary_journey.svg',
      alt: 'Map tracing Paul and Barnabas’s first missionary journey from Antioch through Cyprus and southern Galatia',
      credit: 'Roberto Reggi', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
    }
  };

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
    'proverbs-wisdom-decision-lab': 'nearEast',
    'job': 'nearEast',
    'sermon-on-the-mount': 'galilee'
  };

  var lessonMapNotes = {
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
    'proverbs-wisdom-decision-lab': 'Israel’s wisdom belongs to a wider ancient Near Eastern world of courts, trade, agriculture, households, and scribal learning. Geographic context invites comparison without assuming every neighboring tradition says the same thing.',
    'job': 'Job is set in the land of Uz, whose location is not certain. Use the wider ancient Near Eastern map to see the cultural world of wisdom literature, but do not turn a schematic map into a precise identification of Uz.',
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
    'proverbs-wisdom-decision-lab': ['Proverbs 26:4–5', 'Two neighboring sayings give opposite instructions. What should a reader do?', ['Consider which situation calls for each response', 'Discard one verse because it must be a copying error'], 0, 'The paired proverbs train discernment. Their tension warns against treating each short saying as a mechanical rule for every circumstance.', 'Describe two situations in which different responses might be wise.'],
    'job': ['Job 2:11–13; 4:7–8; 42:7', 'Job’s friends begin by sitting with him, then offer explanations. What should a careful reader test?', ['Whether their confident explanation is actually supported by the book', 'Whether suffering always proves a person committed a hidden sin'], 0, 'The friends speak at length, but God later says they have not spoken what is right about Him as Job has. Their opening silence models presence; their later certainty becomes part of the book’s critique.', 'Compare one speech from a friend with Job 42:7. Name one claim, its evidence, and the judgment the book gives it.'],
    'sermon-on-the-mount': ['Matthew 6:1–6', 'What contrast frames Jesus’ teaching about giving and prayer?', ['Performing for public praise versus seeking the Father', 'Galilee versus Jerusalem as the correct place to pray'], 0, 'Jesus repeats the contrast between being seen by people and the Father who sees in secret. The passage examines motive and audience.', 'Find repeated words or actions and explain how they develop the contrast.']
  };

  var lessonEntities = {
    'world-of-the-bible': [
      { title: 'Abraham', kind: 'Biblical figure' },
      { title: 'Moses', kind: 'Biblical figure' },
      { title: 'Joshua', kind: 'Biblical figure' },
      { title: 'Jerusalem', kind: 'Place' },
      { title: 'Roman Empire', kind: 'Historical setting' }
    ],
    'how-the-bible-reached-us': [
      { title: 'Dead Sea Scrolls', kind: 'Manuscript collection', fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Great_Isaiah_Scroll.jpg/1280px-Great_Isaiah_Scroll.jpg' },
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
      { title: 'Solomon', kind: 'Biblical king' },
      { title: 'David', kind: 'Biblical king' },
      { title: 'First Temple', kind: 'Sacred space' },
      { title: 'Second Temple', kind: 'Historical sanctuary' },
      { title: 'Herod the Great', kind: 'Historical ruler' },
      { title: 'Temple Mount', kind: 'Place' }
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
      { title: 'Elijah', kind: 'Biblical prophet' },
      { title: 'Ahab', kind: 'Biblical king of Israel' },
      { title: 'Jezebel', kind: 'Biblical queen' },
      { title: 'Mount Carmel', kind: 'Place' },
      { title: 'Mount Horeb', kind: 'Place' },
      { title: 'Elisha', kind: 'Biblical prophet' }
    ],
    'world-of-jesus': [
      { title: 'Jesus', kind: 'Historical and biblical figure' },
      { title: 'Herod Antipas', kind: 'Historical ruler' },
      { title: 'Pontius Pilate', kind: 'Roman governor' },
      { title: 'Sea of Galilee', kind: 'Place' },
      { title: 'Jerusalem', kind: 'Place' },
      { title: 'Pharisees', kind: 'Second Temple Jewish movement' }
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
    'proverbs-wisdom-decision-lab': [
      { title: 'Solomon', kind: 'Biblical king' },
      { title: 'Book of Proverbs', kind: 'Biblical book', fallback: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Proverb_scroll.PNG' },
      { title: 'Wisdom literature', kind: 'Literary genre' },
      { title: 'Hebrew Bible', kind: 'Scriptural collection' },
      { title: 'Ancient Israel and Judah', kind: 'Historical setting' }
    ],
    'job': [
      { title: 'Job', kind: 'Wisdom-literature figure' },
      { title: 'Eliphaz the Temanite', label: 'Eliphaz', kind: 'Job’s friend' },
      { title: 'Bildad the Shuhite', label: 'Bildad', kind: 'Job’s friend' },
      { title: 'Zophar the Naamathite', label: 'Zophar', kind: 'Job’s friend' },
      { title: 'Elihu', kind: 'Speaker in Job 32–37' },
      { title: 'Book of Job', kind: 'Wisdom literature' }
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
  if (!lesson) { main.innerHTML = '<p>Lesson data could not be loaded.</p>'; return; }
  lesson.image = lessonImages[lesson.id] || lessonImages['world-of-the-bible'];
  lesson.visualJourney = lessonVisualJourneys[lesson.id] || [];
  lesson.map = geographyMaps[lessonMapKeys[lesson.id]] || geographyMaps.nearEast;
  lesson.map.note = lessonMapNotes[lesson.id] || 'Use this reference map for broad orientation. It clarifies relative place and scale, but it is not a complete reconstruction of every biblical setting.';
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
    'temple-and-gods-presence': {
      title: 'From garden to gathered Church',
      subtitle: 'Compare biblical places, Christian architecture, and artists’ interpretations of divine presence.',
      note: 'Photographs document present-day places and buildings. Eden and divine manifestations are artistic interpretations, while several mountain identifications come from Christian tradition rather than certainty.'
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

  main.className = 'bpl-page';
  main.innerHTML =
    '<a class="bpl-back" href="bible-foundations-pathway.html">&larr; Bible Foundations &amp; Pathway</a>' +
    '<section class="bpl-hero" data-code="' + esc(lesson.code) + '">' +
      '<p class="bpl-eyebrow">' + esc(lesson.stage) + ' · Lesson ' + esc(lesson.code) + '</p>' +
      '<h1>' + esc(lesson.title) + '</h1><p class="bpl-lede">' + esc(lesson.lede) + '</p>' +
      '<div class="bpl-meta"><span>' + esc(lesson.grades) + '</span><span>' + esc(lesson.time) + '</span><span>Guided exploration</span><span>Print-ready</span></div>' +
    '</section>' +
    storyThreadMarkup(lesson.story) +
    '<figure class="bpl-figure" data-zoomable><a href="' + esc(lesson.image.page) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(lesson.image.src) + '" alt="' + esc(lesson.image.alt) + '" loading="eager" referrerpolicy="no-referrer"></a><figcaption><p>' + esc(lesson.image.caption) + '</p><small>Image: <a href="' + esc(lesson.image.page) + '" target="_blank" rel="noopener noreferrer">' + esc(lesson.image.credit) + '</a> · <a href="' + esc(lesson.image.licenseUrl) + '" target="_blank" rel="license noopener noreferrer">' + esc(lesson.image.license) + '</a> · Wikimedia Commons</small></figcaption></figure>' +
    '<div class="bpl-grid"><section class="bpl-card"><p class="bpl-label">Essential question</p><p class="bpl-question">' + esc(lesson.question) + '</p><p class="bpl-scripture"><strong>Read:</strong> ' + esc(lesson.scripture) + '</p></section>' +
    '<section class="bpl-card"><p class="bpl-label">Learning goals</p><h2>By the end, you can…</h2><ul class="bpl-goals">' + lesson.goals.map(function (goal) { return '<li>' + esc(goal) + '</li>'; }).join('') + '</ul></section></div>' +
    visualJourneyMarkup(lesson.visualJourney, lesson) +
    '<section class="bpl-card bpl-reader"><div class="bpl-reader-head"><div><p class="bpl-label">Open Scripture reader</p><h2>Read in context</h2></div><p>Switch passages, translations, and languages while keeping the same verse reference in view.</p></div>' +
      '<div class="bpl-reader-controls"><label><span>Passage</span><select class="bpl-passage-select">' + lesson.passages.map(function (passage, passageIndex) { return '<option value="' + passageIndex + '">' + esc(passageLabel(passage)) + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Language</span><select class="bpl-language-select">' + bibleLanguages.map(function (language) { return '<option value="' + esc(language.id) + '">' + esc(language.name) + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Version</span><select class="bpl-version-select"></select></label></div>' +
      '<div class="bpl-reader-toolbar"><div><button class="bpl-passage-prev" type="button" aria-label="Previous passage">&larr; Previous</button><button class="bpl-passage-next" type="button">Next &rarr;</button></div><span class="bpl-reader-status" role="status" aria-live="polite">Loading Scripture…</span></div>' +
      '<article class="bpl-scripture-panel" aria-live="polite" aria-busy="true"><header><div><p class="bpl-reader-reference"></p><p class="bpl-reader-version"></p></div></header><div class="bpl-verses"></div></article>' +
      '<p class="bpl-reader-credit">Text is loaded from the open <a href="https://github.com/wldeh/bible-api" target="_blank" rel="noopener noreferrer">Bible API dataset</a>. Availability and licensing vary by edition; the reader labels each selected source. For publication or close textual study, verify wording in an authorized edition.</p>' +
    '</section>' +
    '<section class="bpl-card bpl-map"><div class="bpl-map-head"><div><p class="bpl-label">Geographic context</p><h2>See the bigger picture</h2></div><p>Select the map to enlarge labels and terrain.</p></div><div class="bpl-map-grid"><figure class="bpl-map-figure" data-zoomable><a class="bpl-map-image" href="' + esc(lesson.map.page) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(lesson.map.src) + '" alt="' + esc(lesson.map.alt) + '" loading="lazy" referrerpolicy="no-referrer"></a><figcaption>' + esc(lesson.map.note) + '<small>Map: <a href="' + esc(lesson.map.page) + '" target="_blank" rel="noopener noreferrer">' + esc(lesson.map.credit) + '</a> · <a href="' + esc(lesson.map.licenseUrl) + '" target="_blank" rel="license noopener noreferrer">' + esc(lesson.map.license) + '</a> · Wikimedia Commons</small></figcaption></figure></div></section>' +
    gospelRoutesMarkup() +
    investigationMarkup(lesson.investigation) +
    '<section class="bpl-card bpl-entities"><div class="bpl-entities-head"><div><p class="bpl-label">People, places &amp; primary sources</p><h2>Picture the names in context</h2></div><p>Reference summaries and lead images come from Wikipedia.</p></div><aside class="bpl-source-note"><strong>Image accuracy:</strong> No verified contemporary portrait survives for the ancient biblical figures shown here. Person images are later artistic depictions, not documentary likenesses. Places, artifacts, manuscripts, maps, and modern observances are identified separately.</aside><div class="bpl-entity-grid">' + lesson.entities.map(function (entity, entityIndex) { var fallback = entity.fallback || lesson.image.src; return '<article class="bpl-entity" data-entity-index="' + entityIndex + '"><a class="bpl-entity-image" href="https://en.wikipedia.org/wiki/' + encodeURIComponent(entity.title.replace(/ /g, '_')) + '" target="_blank" rel="noopener noreferrer"><figure class="bpl-entity-figure" data-zoomable><img src="' + esc(fallback) + '" alt="Reference image for ' + esc(entity.label || entity.title) + '" loading="lazy" referrerpolicy="no-referrer"><figcaption>Reference image for ' + esc(entity.label || entity.title) + '. Read the source article for its origin and image license.</figcaption></figure></a><div class="bpl-entity-copy"><span>' + esc(entity.kind) + '</span><h3>' + esc(entity.label || entity.title) + '</h3><p>Loading a sourced reference summary…</p><a class="bpl-entity-source" href="https://en.wikipedia.org/wiki/' + encodeURIComponent(entity.title.replace(/ /g, '_')) + '" target="_blank" rel="noopener noreferrer">Wikipedia reference ↗</a></div></article>'; }).join('') + '</div><p class="bpl-wikipedia-credit">Text excerpts and lead images: <a href="https://en.wikipedia.org/" target="_blank" rel="noopener noreferrer">Wikipedia contributors</a> · Text available under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="license noopener noreferrer">CC BY-SA 4.0</a>; image licenses may vary and are listed on each linked article/file page.</p></section>' +
    '<section class="bpl-card bpl-explore"><p class="bpl-label">Guided exploration</p><h2>Study through four lenses</h2><div class="bpl-lenses" role="group" aria-label="Exploration lenses">' +
      lesson.lenses.map(function (lens, i) { return '<button class="bpl-lens" type="button" data-lens="' + i + '" aria-pressed="' + (i === 0) + '"><span>Lens ' + (i + 1) + '</span><strong>' + esc(lens[0]) + ': ' + esc(lens[1]) + '</strong></button>'; }).join('') +
      '</div><article class="bpl-workspace" aria-live="polite"><h3></h3><p></p><p class="bpl-notice"></p></article></section>' +
    '<div class="bpl-practice"><section class="bpl-card"><p class="bpl-label">Check your reading</p><h2>' + esc(lesson.check[0]) + '</h2><div class="bpl-choices">' + lesson.check[1].map(function (choice) { return '<button class="bpl-choice" type="button">' + esc(choice) + '</button>'; }).join('') + '</div><p class="bpl-feedback" aria-live="polite">Choose the strongest answer, then explain why.</p></section>' +
    '<section class="bpl-card bpl-reflection"><p class="bpl-label">Reflect and respond</p><h2>Make the connection</h2><p>' + esc(lesson.reflect) + '</p><label class="bpl-label" for="bpl-notes">Your notes</label><textarea id="bpl-notes" placeholder="Write observations, evidence, questions, and a faithful response…"></textarea><p class="bpl-save" aria-live="polite">Notes save in this browser.</p></section></div>' +
    '<nav class="bpl-nav" aria-label="Bible pathway lesson navigation">' + link(lessons[index - 1], 'prev') + '<a class="bpl-hub" href="bible-foundations-pathway.html">Pathway hub</a>' + link(lessons[index + 1], 'next') + '</nav>';

  var lensButtons = Array.prototype.slice.call(main.querySelectorAll('.bpl-lens'));
  var workspace = main.querySelector('.bpl-workspace');
  function selectLens(i) {
    var lens = lesson.lenses[i];
    lensButtons.forEach(function (button, buttonIndex) { button.setAttribute('aria-pressed', String(buttonIndex === i)); });
    workspace.querySelector('h3').textContent = lens[0] + ' · ' + lens[1];
    workspace.querySelector('p').textContent = lens[2];
    workspace.querySelector('.bpl-notice').textContent = lens[3];
  }
  lensButtons.forEach(function (button) { button.addEventListener('click', function () { selectLens(Number(button.dataset.lens)); }); });
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
    var endpoint = 'https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/' + encodeURIComponent(version.id) + '/books/' + encodeURIComponent(folder) + '/chapters/' + passage[1] + '.json';
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
      bibleCache[cacheKey] = data;
      return data;
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

  function loadEntityReferences() {
    var titles = lesson.entities.map(function (entity) { return entity.title; });
    var endpoint = new URL('https://en.wikipedia.org/w/api.php');
    endpoint.searchParams.set('action', 'query');
    endpoint.searchParams.set('prop', 'pageimages|extracts|info');
    endpoint.searchParams.set('titles', titles.join('|'));
    endpoint.searchParams.set('pithumbsize', '360');
    endpoint.searchParams.set('piprop', 'thumbnail');
    endpoint.searchParams.set('exintro', '1');
    endpoint.searchParams.set('explaintext', '1');
    endpoint.searchParams.set('exsentences', '2');
    endpoint.searchParams.set('inprop', 'url');
    endpoint.searchParams.set('redirects', '1');
    endpoint.searchParams.set('format', 'json');
    endpoint.searchParams.set('origin', '*');
    fetch(endpoint.toString()).then(function (response) {
      if (!response.ok) throw new Error('Wikipedia request failed');
      return response.json();
    }).then(function (data) {
      var pages = Object.keys(data.query.pages).map(function (key) { return data.query.pages[key]; });
      var aliases = {};
      titles.forEach(function (title) { aliases[title] = title; });
      (data.query.normalized || []).forEach(function (item) { Object.keys(aliases).forEach(function (key) { if (aliases[key] === item.from) aliases[key] = item.to; }); });
      (data.query.redirects || []).forEach(function (item) { Object.keys(aliases).forEach(function (key) { if (aliases[key] === item.from) aliases[key] = item.to; }); });
      lesson.entities.forEach(function (entity, entityIndex) {
        var page = pages.find(function (candidate) { return candidate.title === aliases[entity.title]; });
        if (!page) return;
        var card = main.querySelector('[data-entity-index="' + entityIndex + '"]');
        var link = page.fullurl || ('https://en.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')));
        card.querySelectorAll('a').forEach(function (anchor) { anchor.href = link; });
        if (page.thumbnail && page.thumbnail.source) {
          var image = card.querySelector('img');
          var fallback = image.src;
          image.addEventListener('error', function () { if (image.src !== fallback) image.src = fallback; }, { once: true });
          image.src = page.thumbnail.source;
        }
        card.querySelector('.bpl-entity-copy p').textContent = page.extract || 'Open the linked article for a sourced overview.';
      });
    }).catch(function () {
      main.querySelectorAll('.bpl-entity-copy p').forEach(function (paragraph) { paragraph.textContent = 'The live Wikipedia summary is unavailable. Open the reference article for details.'; });
    });
  }
  loadEntityReferences();

  var choices = Array.prototype.slice.call(main.querySelectorAll('.bpl-choice'));
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
}());
