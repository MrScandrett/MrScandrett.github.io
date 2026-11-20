// Daily GeoGuess locations. Entries rotate in order from 2026-11-17 (daily-geo.mjs).
//
// Every view is OFFICIAL Google Street View imagery (the camera car / trekker), never a
// user-uploaded photo sphere. Official imagery has faces and plates blurred and is taken
// on a schedule; photo spheres are uploaded by anyone and are where the trouble came from
// (a nude performer at the Brandenburg Gate, an offensive poster in Italy). Each `view` was
// looked at in all four directions before it went in.
//
// Adding or changing one:
//   1. Find an official pano near the landmark with the Maps JS API:
//      new google.maps.StreetViewService().getPanorama({ location, radius,
//        sources: [StreetViewSource.GOOGLE, StreetViewSource.OUTDOOR] })
//      Official ids are 22 characters of [A-Za-z0-9_-]. A Google Maps "Share → Embed" link
//      whose id starts with CAoS / CIHM / AF1Qip is a user photo sphere: don't use it.
//   2. `at` = the pano's own lat/lng, `heading` faces the landmark (0 = north), `pitch` tilts up.
//   3. Look all the way around it (and a step or two along the street) before committing.
// tests/daily-geo.test.mjs refuses anything that isn't an official pano id.
export const locations = [
  {
    name: "Paris, France",
    point: [2.292261,48.859931],
    clue: "Look for an iron lattice tower on the banks of a river that runs through a European capital.",
    view: { pano: "ZJU6Z8OwXQfrcTEQonKuEA", at: [48.861687, 2.289077], heading: 133, pitch: 10, imagery: "2014-08" }
  },
  {
    name: "Sydney, Australia",
    point: [151.215297,-33.856784],
    clue: "White sail-shaped roofs stand at the end of a peninsula in a large Australian harbor.",
    view: { pano: "8H4GHxkM6S-785Jbxvwm7w", at: [-33.859844, 151.212808], heading: 34, pitch: 5, imagery: "2024-09" }
  },
  {
    name: "New York City, United States",
    point: [-73.9855,40.758],
    clue: "Tall electronic billboards light up a square where Broadway meets Seventh Avenue.",
    view: { pano: "ywskIOsAFskiKHt5fwIUWA", at: [40.758003, -73.985568], heading: 0, pitch: 0, imagery: "2024-08" }
  },
  {
    name: "Tokyo, Japan",
    point: [139.70068,35.6591],
    clue: "Pedestrians stream from several directions at the scramble crossing near Shibuya Station.",
    view: { pano: "VZ8jeaLQSWdT4G2cdWMoXA", at: [35.659145, 139.700506], heading: 0, pitch: 0, imagery: "2023-09" }
  },
  {
    name: "Rio de Janeiro, Brazil",
    point: [-43.21049,-22.95191],
    clue: "An enormous statue watches over a Brazilian city from the top of Corcovado.",
    view: { pano: "cX6VGQFcaoPErUK7XXQLJg", at: [-22.951902, -43.210474], heading: 0, pitch: 0, imagery: "2016-05" }
  },
  {
    name: "Nairobi, Kenya",
    point: [36.82184,-1.28809],
    clue: "A cylindrical convention tower stands in the capital of Kenya.",
    view: { pano: "PESR09btxqwGT84gr0Sgjg", at: [-1.287421, 36.821396], heading: 117, pitch: 20, imagery: "2023-10" }
  },
  {
    name: "London, United Kingdom",
    point: [-0.1225,51.5009],
    clue: "A clock tower stands beside the Houses of Parliament near this crossing over the Thames.",
    view: { pano: "hp-D7YsLDuu4hz3bW6HdwQ", at: [51.500871, -0.12256], heading: 0, pitch: 0, imagery: "2025-07" }
  },
  {
    name: "Mexico City, Mexico",
    point: [-99.13336,19.43255],
    clue: "A large central plaza sits on the site of the former Aztec capital.",
    view: { pano: "tP-WdK5r44aTGxenC6vbGA", at: [19.432537, -99.13337], heading: 0, pitch: 0, imagery: "2016-10" }
  },
  {
    name: "Wellington, New Zealand",
    point: [174.78231,-41.29053],
    clue: "This windy capital sits where the Cook Strait meets a sheltered harbor.",
    view: { pano: "t9UGWba7sK_UwFsx6zdwDw", at: [-41.29085, 174.781176], heading: 0, pitch: 0, imagery: "2024-10" }
  },
  {
    name: "Giza, Egypt",
    point: [31.13759,29.97527],
    clue: "A monumental stone lion with a human head guards a necropolis west of the Nile.",
    view: { pano: "M900wSaWH6CHnyOZP_MV1Q", at: [29.97505, 31.137525], heading: 0, pitch: 0, imagery: "2013-06" }
  },
  {
    name: "Singapore",
    point: [103.85455,1.28678],
    clue: "Near the mouth of the Singapore River, a statue combines a fish’s tail with a lion’s head.",
    view: { pano: "SMNq641TpdPo7sXAUlZlFA", at: [1.286792, 103.854429], heading: 0, pitch: 0, imagery: "2018-07" }
  },
  {
    name: "Lima, Peru",
    point: [-77.03056,-12.04596],
    clue: "The cathedral and Government Palace face the Plaza Mayor in a capital overlooking the Pacific.",
    view: { pano: "Dc_bfC8sh4i0gTd5bMxUkA", at: [-12.045834, -77.030574], heading: 0, pitch: 0, imagery: "2013-09" }
  },
  {
    name: "Rome, Italy",
    point: [12.49198,41.89058],
    clue: "The Romans built an enormous oval amphitheater near the center of their capital.",
    view: { pano: "1YCXLoGIk6G37dpN8Kw-FA", at: [41.891453, 12.490079], heading: 128, pitch: 8, imagery: "2018-08" }
  },
  {
    name: "Honolulu, United States",
    point: [-157.82661,21.27636],
    clue: "The extinct volcanic crater known as Diamond Head rises above Waikīkī.",
    view: { pano: "-R3vR_KpjN530RUWaCt_KQ", at: [21.269301, -157.817486], heading: 124, pitch: 5, imagery: "2024-11" }
  },
  {
    name: "Melbourne, Australia",
    point: [144.96713,-37.8183],
    clue: "A yellow railway station sits at a busy intersection where trams cross central Melbourne.",
    view: { pano: "odChdGwnHZwp345gYHjTsg", at: [-37.818147, 144.967611], heading: 0, pitch: 0, imagery: "2025-12" }
  },
  {
    name: "Taipei, Taiwan",
    point: [121.56447,25.03434],
    clue: "The nearby skyscraper has a silhouette that resembles stacked sections of bamboo.",
    view: { pano: "nXYbet7BphTnWxisfM419A", at: [25.036467, 121.561962], heading: 137, pitch: 30, imagery: "2025-01" }
  },
  {
    name: "Santiago, Chile",
    point: [-70.65046,-33.43778],
    clue: "Chile’s capital lies in a basin between the Andes and the Chilean Coast Range.",
    view: { pano: "M_Tt1TmpoH-JjzsxCarIKQ", at: [-33.43839, -70.650275], heading: 319, pitch: 8, imagery: "2024-06" }
  },
  {
    name: "Lisbon, Portugal",
    point: [-9.13655,38.70777],
    clue: "A monumental arch opens onto a square beside the Tagus River.",
    view: { pano: "FZbf1a-McfahJykGylbjTw", at: [38.707769, -9.136565], heading: 0, pitch: 0, imagery: "2014-08" }
  },
  {
    name: "Istanbul, Türkiye",
    point: [28.98003,41.00858],
    clue: "A huge domed church-turned-mosque faces the Blue Mosque across a park, in a city that spans Europe and Asia.",
    view: { pano: "QE4_1PkSZl8nvEEUG2aX6g", at: [41.00694, 28.977872], heading: 45, pitch: 12, imagery: "2015-10" }
  },
  {
    name: "Québec City, Canada",
    point: [-71.20543,46.812],
    clue: "A grand hotel with steep green roofs overlooks the St. Lawrence River.",
    view: { pano: "vX10043KQTQUsG1Rae9n2w", at: [46.811977, -71.205521], heading: 0, pitch: 0, imagery: "2022-06" }
  },
  {
    name: "Bangkok, Thailand",
    point: [100.49138,13.7515],
    clue: "Roofs with pointed gold spires mark the Grand Palace near the Chao Phraya River.",
    view: { pano: "s16XxV1Vk-XSCry0eSl0UA", at: [13.753922, 100.49174], heading: 163, pitch: 5, imagery: "2024-11" }
  },
  {
    name: "Auckland, New Zealand",
    point: [174.76217,-36.84846],
    clue: "The freestanding Sky Tower rises above New Zealand’s biggest city.",
    view: { pano: "XtXZlYy5_vOhlj6iNk1KjQ", at: [-36.848353, 174.759769], heading: 93, pitch: 30, imagery: "2024-10" }
  },
  {
    name: "Copenhagen, Denmark",
    point: [12.58824,55.67984],
    clue: "Colorful narrow houses line a harbor called Nyhavn.",
    view: { pano: "aJagmribY58GkFvd3h-Zjw", at: [55.679943, 12.589415], heading: 99, pitch: 0, imagery: "2024-09" }
  },
  {
    name: "São Paulo, Brazil",
    point: [-46.63387,-23.55039],
    clue: "A neo-Gothic cathedral faces Praça da Sé in Brazil’s most populous city.",
    view: { pano: "VMJgqPCdfO4yaFkpcy3yhA", at: [-23.552504, -46.634208], heading: 347, pitch: 10, imagery: "2021-05" }
  },
  {
    name: "Kyoto, Japan",
    point: [135.72922,35.03945],
    clue: "A gold-covered pavilion stands beside a pond in a former capital of Japan.",
    view: { pano: "kZYw_PSR7QAk0eFvnh3d1w", at: [35.039274, 135.731908], heading: 0, pitch: 0, imagery: "2024-12" }
  },
  {
    name: "Amsterdam, Netherlands",
    point: [4.89323,52.37297],
    clue: "A royal palace faces Dam Square, near concentric rings of canals.",
    view: { pano: "Q3fh7N8C8GtLCWEt5uopRg", at: [52.372949, 4.893202], heading: 0, pitch: 0, imagery: "2024-05" }
  },
  {
    name: "Dubai, United Arab Emirates",
    point: [55.27431,25.19711],
    clue: "The stepped tower beside a large artificial lake is the Burj Khalifa.",
    view: { pano: "DdumoWAPVWCg6c5y2Q6Iig", at: [25.195596, 55.278013], heading: 296, pitch: 25, imagery: "2021-12" }
  },
  {
    name: "San Francisco, United States",
    point: [-122.47557,37.80772],
    clue: "Reddish-orange towers mark the suspension bridge at the entrance to the bay.",
    view: { pano: "caIJ5q2N_-1zcOVn0NCjmA", at: [37.829868, -122.483419], heading: 158, pitch: 0, imagery: "2025-03" }
  },
  {
    name: "Helsinki, Finland",
    point: [24.95214,60.16924],
    clue: "A white cathedral sits above broad steps on the north side of Senate Square.",
    view: { pano: "hFHT3co-keuXZhbASrPaMw", at: [60.169213, 24.952197], heading: 0, pitch: 0, imagery: "2023-04" }
  },
  {
    name: "Prague, Czechia",
    point: [14.42072,50.08694],
    clue: "The historic square is home to a medieval astronomical clock.",
    view: { pano: "BWcRFPjCzIzsfU9ubFZ7zg", at: [50.086907, 14.420745], heading: 0, pitch: 0, imagery: "2014-06" }
  },
  {
    name: "Reykjavík, Iceland",
    point: [-21.92712,64.14215],
    clue: "The large hilltop church was designed to recall Iceland’s basalt columns.",
    view: { pano: "7s10QKYefau73rMYMrI7Sw", at: [64.144968, -21.929739], heading: 156, pitch: 15, imagery: "2024-07" }
  },
  {
    name: "Stockholm, Sweden",
    point: [18.07079,59.3252],
    clue: "Narrow lanes and old buildings fill an island district called Gamla Stan.",
    view: { pano: "3SY2EGOAxjiulYIAt-SNRg", at: [59.325047, 18.070822], heading: 0, pitch: 0, imagery: "2022-08" }
  },
  {
    name: "Vienna, Austria",
    point: [16.37251,48.20762],
    clue: "A cathedral with a patterned tile roof stands at the heart of this former imperial capital.",
    view: { pano: "Z2zhR4yqDCzp9U4A8wLyKA", at: [48.208521, 16.371764], heading: 92, pitch: 15, imagery: "2024-07" }
  },
  {
    name: "Madrid, Spain",
    point: [-3.70374,40.41683],
    clue: "The clock at Puerta del Sol marks the moment people eat twelve grapes on New Year’s Eve.",
    view: { pano: "OhR7Uw9BShEzj2LCYE3y-g", at: [40.416794, -3.703905], heading: 0, pitch: 0, imagery: "2025-05" }
  },
  {
    name: "Brussels, Belgium",
    point: [4.35246,50.84675],
    clue: "Ornate guildhalls surround a central square known as the Grand-Place.",
    view: { pano: "3ulmgAx97zWwAIlyd1DYVA", at: [50.846873, 4.35256], heading: 0, pitch: 0, imagery: "2010-08" }
  },
  {
    name: "Warsaw, Poland",
    point: [21.01332,52.24721],
    clue: "The capital’s old town was meticulously rebuilt after the Second World War.",
    view: { pano: "ESH4DnmDvf5l7rNb2JxjUg", at: [52.24717, 21.013283], heading: 0, pitch: 0, imagery: "2011-08" }
  },
  {
    name: "Dublin, Ireland",
    point: [-6.25999,53.34759],
    clue: "A slender steel spire rises along O’Connell Street, north of the River Liffey.",
    view: { pano: "zT9RqXgkCQkxL4VmrT8yCg", at: [53.347997, -6.259765], heading: 350, pitch: 25, imagery: "2015-09" }
  },
  {
    name: "Athens, Greece",
    point: [23.72542,37.97144],
    clue: "The rocky hill nearby is crowned by temples built by the ancient Greeks.",
    view: { pano: "oWE20w0YFCBH4D_UMNWJiA", at: [37.969974, 23.724406], heading: 50, pitch: 18, imagery: "2014-08" }
  },
  {
    name: "Berlin, Germany",
    point: [13.37827,52.51629],
    clue: "A chariot tops the neoclassical gate at the western end of Unter den Linden.",
    view: { pano: "PuPfrQ65fQ6E8FAXcFtr3g", at: [52.5163, 13.378243], heading: 265, pitch: 8, imagery: "2022-06" }
  },
  {
    name: "Oslo, Norway",
    point: [10.75123,59.90762],
    clue: "A white opera house with a sloping walkable roof meets a Nordic fjord.",
    view: { pano: "NFhSK9G2IPnLV2A3coVtXQ", at: [59.907643, 10.751146], heading: 0, pitch: 0, imagery: "2024-08" }
  },
  {
    name: "Venice, Italy",
    point: [12.33836,45.43415],
    clue: "Near a lagoon, a tall brick bell tower stands in a square dedicated to St. Mark.",
    view: { pano: "XnncparEkwxw8BWkFuhnEA", at: [45.434383, 12.33814], heading: 145, pitch: 10, imagery: "2018-09" }
  }
];
