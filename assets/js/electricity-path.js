(function () {
  'use strict';

  var main = document.querySelector('main');
  if (!main || document.querySelector('.electricity-path')) return;

  var current = location.pathname.split('/').pop() || '';
  var sequence = [
    ['what-is-electricity.html', '1', 'What is electricity?'],
    ['coulombs-law.html', '2', 'Charge & force'],
    ['ohms-law.html', '3', 'Voltage, current & resistance'],
    ['ac-vs-dc.html', '4', 'AC vs. DC'],
    ['faradays-law.html', '5', 'Induction & transformers'],
    ['electronic-components.html', '6', 'Components'],
    ['electronic-schematics.html', '7', 'Schematics'],
    ['breadboard-basics.html', '8', 'Build a circuit'],
    ['inputs-beyond-the-button.html', '9', 'Creative inputs'],
    ['outputs-beyond-the-led.html', '10', 'Driving outputs'],
    ['sensor-modules.html', '11', 'Sensors & control']
  ];

  var section = document.createElement('section');
  section.className = 'electricity-path';
  section.setAttribute('aria-labelledby', 'electricity-path-title');

  var links = sequence.map(function (item) {
    var active = current === item[0] ? ' aria-current="page"' : '';
    return '<a class="electricity-path__link" href="' + item[0] + '"' + active +
      '><span aria-hidden="true">' + item[1] + '</span><span>' + item[2] + '</span></a>';
  }).join('');

  section.innerHTML =
    '<p class="electricity-path__eyebrow">Electricity learning path</p>' +
    '<h2 id="electricity-path-title">From electric charge to working electronics</h2>' +
    '<p class="electricity-path__intro">Follow the core sequence in order, or jump to the idea you need. Electricity is the physics of charge and fields; electronics uses components to control current and information.</p>' +
    '<nav class="electricity-path__links" aria-label="Electricity lesson sequence">' + links + '</nav>' +
    '<p class="electricity-path__more">Also in this path: <a href="nikola-tesla.html">Nikola Tesla</a>, <a href="james-clerk-maxwell.html">James Clerk Maxwell</a>, <a href="faraday-cage.html">Faraday cages</a>, <a href="falling-coil.html">the falling coil</a>, <a href="van-de-graaff-generator.html">Van de Graaff generators</a>, <a href="maglev-train.html">maglev engineering</a>, <a href="soldering.html">soldering</a>, and <a href="pid-control.html">feedback control</a>.</p>';

  var footer = main.querySelector('footer');
  if (footer) main.insertBefore(section, footer);
  else main.appendChild(section);
})();
