/* Navigation metadata only. The reference scan and its musical content are not bundled. */
(function () {
  'use strict';
  window.FakeBookPDFTemplates = [{
    fingerprint: 'e0919b36ff1adf8e51a5fe895be6588f', pages: 512,
    label: 'Real Book Vol. 1 in C · fifth-edition scan',
    note: 'Image-only scan. Contents: PDF 3–8. Corrections: PDF 10–13. Main printed page 1 = PDF 14. Additions printed page 1 = PDF 498. The starter index is partial; add further entries from the scanned contents.',
    sections: [{ id: 'main', label: 'Main book' }, { id: 'additions', label: 'Additions' }],
    anchors: [{ section: 'main', printed: 1, pdf: 14 }, { section: 'additions', printed: 1, pdf: 498 }],
    bookmarks: [{ label: 'Contents (3–8)', pdf: 3 }, { label: 'Corrections (10–13)', pdf: 10 }, { label: 'First song', pdf: 14 }, { label: 'Additions', pdf: 498, section: 'additions' }],
    songs: [
      ['A Call for All Demons', 1], ['A Child Is Born', 2], ['A Fine Romance', 3], ['A Family Joy', 4, 5], ['A Foggy Day', 6],
      ['A Night in Tunisia', 7], ['African Flower', 8], ['Afro Blue', 9], ['Afternoon in Paris', 10], ['Airegin', 11],
      ['Alice in Wonderland', 12], ['All Blues', 13]
    ].map(function (s) { return { title: s[0], printed: s[1], end: s[2] || s[1], section: 'main' }; }).concat([
      'Alfie', 'Black Monday', 'Contemplation', 'The Disguise, The Sphinx', 'Kelo', "I’m Afraid", 'Mr. Jin', 'Clinoqui Valley',
      'Perfect Love, Jamala', 'Plain Jane', 'Reflections', 'Road Song', 'Valse Hot'
    ].map(function (title, i) { return { title: title, printed: i + 1, end: i + 1, section: 'additions' }; }))
  }];
})();
