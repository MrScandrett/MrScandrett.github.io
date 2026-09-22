// Supply & sustainability stats per element (RSC/WebElements-style fields).
// crust = crustal abundance in ppm by mass (approximate, WebElements/CRC values); null = not tracked.
// Every other field defaults to "Unknown" in the lesson until a sourced value is added here, e.g.
//   Cu: { supplyRisk: "...", recycling: 43, producers: ["Chile", "Peru", "DR Congo"], ... }
(function () {
  var crust = {H:1400,He:0.008,Li:20,Be:2.8,B:10,C:200,N:19,O:461000,F:585,Ne:0.005,Na:23600,Mg:23300,Al:82300,Si:282000,P:1050,S:350,Cl:145,Ar:3.5,K:20900,Ca:41500,Sc:22,Ti:5650,V:120,Cr:102,Mn:950,Fe:56300,Co:25,Ni:84,Cu:60,Zn:70,Ga:19,Ge:1.5,As:1.8,Se:0.05,Br:2.4,Kr:0.0001,Rb:90,Sr:370,Y:33,Zr:165,Nb:20,Mo:1.2,Ru:0.001,Rh:0.001,Pd:0.015,Ag:0.075,Cd:0.15,In:0.25,Sn:2.3,Sb:0.2,Te:0.001,I:0.45,Xe:0.00003,Cs:3,Ba:425,La:39,Ce:66.5,Pr:9.2,Nd:41.5,Sm:7.05,Eu:2,Gd:6.2,Tb:1.2,Dy:5.2,Ho:1.3,Er:3.5,Tm:0.52,Yb:3.2,Lu:0.8,Hf:3,Ta:2,W:1.3,Re:0.0007,Os:0.0015,Ir:0.001,Pt:0.005,Au:0.004,Hg:0.085,Tl:0.85,Pb:14,Bi:0.009,Ra:0.0000009,Th:9.6,Pa:0.0000014,U:2.7};
  var data = {};
  Object.keys(crust).forEach(function (s) { data[s] = { crust: crust[s] }; });

  // Rough, approximate figures recalled from USGS Mineral Commodity Summaries (~2023-2025) and UNEP recycling
  // reports. NOT verified against the source documents; compiled 2026-09-21. Treat as classroom estimates.
  // [top-3 producers, top producer share %, top-3 reserve holders, top reserve holder share %, recycling %]
  var RG = [["China","USA","Myanmar"],70,["China","Vietnam","Brazil"],40,1];
  var PG = [["South Africa","Russia","Zimbabwe"],70,["South Africa","Russia","Zimbabwe"],90,60];
  var rough = {
    Li:[["Australia","Chile","China"],47,["Chile","Australia","Argentina"],33,1],
    Co:[["DR Congo","Indonesia","Russia"],74,["DR Congo","Australia","Indonesia"],48,32],
    Ni:[["Indonesia","Philippines","Russia"],55,["Indonesia","Australia","Brazil"],42,57],
    Cu:[["Chile","DR Congo","Peru"],23,["Chile","Australia","Peru"],19,45],
    Fe:[["Australia","Brazil","China"],37,["Australia","Brazil","Russia"],27,52],
    Al:[["Australia","Guinea","China"],28,["Guinea","Australia","Vietnam"],24,42],
    Zn:[["China","Peru","Australia"],33,["Australia","China","Russia"],30,30],
    Pb:[["China","Australia","USA"],45,["Australia","China","Russia"],40,70],
    Sn:[["China","Indonesia","Myanmar"],30,["China","Indonesia","Myanmar"],20,30],
    W:[["China","Vietnam","Russia"],80,["China","Australia","Russia"],50,35],
    Mo:[["China","Chile","Peru"],40,["China","Peru","USA"],38,30],
    V:[["China","Russia","South Africa"],70,["China","Russia","Australia"],37,1],
    Cr:[["South Africa","Turkey","Kazakhstan"],44,["Kazakhstan","South Africa","India"],40,34],
    Mn:[["South Africa","Gabon","Australia"],37,["South Africa","Australia","Brazil"],40,37],
    Au:[["China","Australia","Russia"],10,["Australia","Russia","South Africa"],20,50],
    Ag:[["Mexico","China","Peru"],24,["Peru","Australia","Russia"],22,55],
    Pt:PG,Pd:PG,Rh:PG,Ru:PG,Ir:PG,Os:PG,
    Sb:[["China","Tajikistan","Russia"],48,["China","Russia","Bolivia"],25,10],
    In:[["China","South Korea","Japan"],60,null,null,1],
    Ga:[["China","Japan","South Korea"],98,null,null,1],
    Nb:[["Brazil","Canada","Nigeria"],90,["Brazil","Canada"],90,20],
    Ta:[["DR Congo","Rwanda","Brazil"],40,null,null,20],
    Zr:[["Australia","South Africa","Mozambique"],35,["Australia","South Africa","Mozambique"],50,25],
    U:[["Kazakhstan","Canada","Namibia"],43,["Australia","Kazakhstan","Canada"],28,null],
    B:[["Turkey","USA","Chile"],45,["Turkey","China","Russia"],70,null],
    F:[["China","Mexico","Mongolia"],60,["Mexico","China","South Africa"],20,null],
    P:[["China","Morocco","USA"],40,["Morocco","China","Egypt"],70,null],
    K:[["Canada","Russia","Belarus"],30,["Canada","Russia","Belarus"],33,null],
    I:[["Chile","Japan","USA"],60,["Chile","Japan","USA"],60,null],
    Mg:[["China","Russia","Israel"],85,null,null,33],
    Bi:[["China","Laos","Vietnam"],80,null,null,null]
  };
  ["Sc","Y","La","Ce","Pr","Nd","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu"].forEach(function (s) { rough[s] = RG; });
  Object.keys(rough).forEach(function (s) {
    var r = rough[s], d = data[s] = data[s] || {};
    d.producers = r[0]; d.prodConcentration = "~" + r[1] + " (top producer)";
    if (r[2]) d.reserveHolders = r[2];
    if (r[3] != null) d.reserveDistribution = "~" + r[3] + " (top holder)";
    if (r[4] != null) d.recycling = "~" + r[4];
  });
  window.ELEMENT_SUPPLY_ASOF = "Rough estimates recalled from USGS Mineral Commodity Summaries (~2023\u20132025) and UNEP recycling reports; unverified, compiled 21 Sep 2026. Shares are for the mined commodity.";
  var history = {"Cu": "Cyprus supplied the Roman world (the name comes from Latin cyprium); Cornwall, Wales and Michigan led in the 1700s\u20131800s, the USA through most of the 1900s, then Chile. Compounds: bronze, brass, verdigris.", "Sn": "Cornwall and Devon were the ancient and medieval source for the Bronze Age trade; Malaya led from the late 1800s, with Bolivia a major producer, before China and Indonesia.", "Pb": "Roman-era mines in Spain and Britain made lead a mass material (pipes, coins, sweetener). Compounds: white lead paint, lead acetate, tetraethyl lead (phased out of petrol).", "Au": "Egypt and Nubia, then Lydia in ancient times; California (1849), Australia (1851) and the Witwatersrand in South Africa (1886) drove the modern rushes. South Africa produced most of the world's gold by ~1970; China has led since about 2007.", "Ag": "Laurion (Athens) funded classical Greece; Potosi (Bolivia) and Mexico's mines fed the Spanish Empire from the 1500s; Nevada's Comstock Lode followed in the 1800s.", "Fe": "Anatolia (Hittites) began iron working; Britain and Sweden led early industry; the USA and USSR led in the mid-1900s; China has been the top steel maker since the 1990s.", "Al": "Cryolite from Ivigtut, Greenland, helped enable the 1886 Hall-Heroult process. Bauxite is named for Les Baux, France; Jamaica and later Guinea and Australia became major sources.", "Li": "The USA (North Carolina pegmatites) led in the mid-1900s; Chile's brines and Australia's spodumene took over from the 1980s onward.", "Hg": "Almaden in Spain supplied mercury from Roman times into the 2000s; Idrija in Slovenia was the other great mine. Compound: cinnabar, prized as red pigment.", "Sb": "Stibnite was ground into kohl eye cosmetic in ancient Egypt; China (Xikuangshan, Hunan) has dominated supply since the late 1800s.", "W": "Portugal and Spain supplied wolframite in the World War era; China has dominated since the 1980s.", "Ni": "New Caledonia led in the late 1800s; Sudbury, Canada dominated much of the 1900s; Norilsk (Russia) followed, and Indonesia leads today. Name: German Kupfernickel, 'devil's copper'.", "Co": "Saxony and Norway mined cobalt for blue glass and pigment; Ontario's Cobalt camp led in the early 1900s; Katanga (Congo) has dominated since the 1920s.", "U": "Joachimsthal (Bohemia) was the early source of pitchblende; Shinkolobwe in the Belgian Congo supplied the Manhattan Project; Canada led for decades, then Kazakhstan from 2009.", "Zn": "Zawar in India ran the first large-scale zinc smelting (~1100s\u20131200s); Belgium and Germany led industrial output in the 1800s. Compound: brass (copper + zinc) has ancient roots.", "Pt": "Colombia's Choco region was the first European source; the Urals in Russia followed in the 1820s; Sudbury, then South Africa's Bushveld Complex (1920s onward) took the lead.", "Pd": "Russia's Norilsk and South Africa's Bushveld have supplied most palladium since the mid-1900s.", "K": "'Pot ash' was leached from wood ashes; Germany (Stassfurt) held a near-monopoly from the 1860s until World War I; Canada's Saskatchewan potash now dominates.", "P": "Bones and guano (Peru's Chincha Islands, then Nauru) were 1800s sources; Morocco holds the largest phosphate rock reserves today.", "N": "Chilean saltpetre (sodium nitrate) from the Atacama was the world's nitrogen source until the Haber-Bosch process (1913), which ended that monopoly.", "S": "Sicily dominated sulfur until the Frasch process opened Louisiana and Texas in the 1890s.", "I": "Kelp ash in Scotland and Normandy gave the first iodine (1811); Chilean caliche later became the main source, and Chile still leads.", "B": "Tuscany (Larderello), then Tibet and California's Death Valley ('20 Mule Team' borax) supplied borax; Turkey has led since the late 1900s.", "Sr": "Named for Strontian, Scotland, where the mineral strontianite was found in the 1790s.", "As": "Cornwall and Devon supplied much of the world's arsenic in the 1800s as a mining by-product. Compounds: orpiment and realgar pigments, Paris green.", "V": "Peru's Minasragra mine (patronite) dominated early 1900s vanadium; South Africa, Russia and China lead today.", "Cr": "Crocoite from Siberia gave the element its discovery in 1797; Zimbabwe (Rhodesia), Turkey and South Africa supplied chromite through the 1900s.", "Mo": "Climax, Colorado supplied most of the world's molybdenum for much of the 1900s.", "Mn": "India, Russia and Georgia (Chiatura) were major historic sources; South Africa leads today.", "He": "The USA (Hugoton field, Kansas) supplied most helium from the 1920s; Qatar and Algeria grew later.", "C": "India (Golconda) was the only diamond source until the 1720s; Brazil followed, then Kimberley in South Africa (1867), then Russia and Botswana. Coal made Britain the top carbon producer of the 1800s.", "Ra": "Radium was first refined from Joachimsthal pitchblende; Colorado carnotite and the Belgian Congo later supplied it.", "Th": "Monazite beach sands in India, Brazil and North Carolina supplied thorium in the 1800s\u20131900s.", "Nb": "Brazil (Araxa) has dominated since the mid-1900s. Nigeria and Canada were earlier sources.", "Ta": "'Coltan' from the DR Congo and Rwanda became controversial as a conflict mineral; Australia (Greenbushes) was once the leading source."};
  var REH = "Rare earths: monazite sands (India, Brazil) in the early 1900s; Mountain Pass, California led in the 1960s\u20131980s; China has dominated since the 1990s.";
  ["Sc","Y","La","Ce","Pr","Nd","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu"].forEach(function (s) { history[s] = REH; });
  Object.keys(history).forEach(function (s) { (data[s] = data[s] || {}).history = history[s]; });
  window.ELEMENT_SUPPLY = data;
})();
