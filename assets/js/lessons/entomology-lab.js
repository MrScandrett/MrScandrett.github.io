(() => {
  const specimens = [
    { id: 'A', photo: 'beetle', label: 'spotted shell', traits: ['6 legs', '3 body regions', '1 pair of antennae', 'hardened forewings'], clue: 'The wings and all six legs attach to the thorax.', answer: 'insect', why: 'It has the insect blueprint: six legs, three body regions, and one pair of antennae. It is a beetle.' },
    { id: 'B', photo: 'spider', label: 'silent hunter', traits: ['8 legs', '2 main body regions', 'no antennae', 'spinnerets'], clue: 'Its first pair of walking legs is not an antenna.', answer: 'arachnid', why: 'Eight legs, two main body regions, and no antennae identify an arachnid. This one is a spider.' },
    { id: 'C', photo: 'ant', label: 'colony worker', traits: ['6 legs', '3 body regions', 'elbowed antennae', 'narrow waist'], clue: 'Workers communicate with chemicals and touch.', answer: 'insect', why: 'Six legs and three body regions make this ant an insect.' },
    { id: 'D', photo: 'pillbug', label: 'garden roller', traits: ['14 legs', 'segmented plates', '2 pairs of antennae', 'breathes with gill-like structures'], clue: 'It is more closely related to crabs than to insects.', answer: 'crustacean', why: 'A pill bug is a land-dwelling crustacean, not an insect.' },
    { id: 'E', photo: 'centipede', label: 'many-legged hunter', traits: ['many segments', '1 pair of legs per segment', '1 pair of antennae', 'venom claws'], clue: 'Its long body repeats a segment pattern.', answer: 'myriapod', why: 'This centipede belongs to the many-legged arthropod group Myriapoda.' },
    { id: 'F', photo: 'butterfly', label: 'scaled-wing visitor', traits: ['6 legs', '3 body regions', '2 pairs of wings', 'coiled proboscis'], clue: 'It develops through egg, larva, pupa, and adult.', answer: 'insect', why: 'This butterfly has all the insect traits and undergoes complete metamorphosis.' }
  ];
  const imgBase = '../../assets/images/entomology/';
  const list = document.getElementById('specimenList');
  const icon = document.getElementById('mysteryIcon');
  const name = document.getElementById('mysteryName');
  const traits = document.getElementById('traits');
  const clue = document.getElementById('clue');
  const select = document.getElementById('classification');
  const feedback = document.getElementById('feedback');
  const score = document.getElementById('score');
  let current = 0;
  const solved = new Set();

  if (list && icon && name && traits && clue && select && feedback && score) {
    specimens.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'specimen-btn';
      b.setAttribute('role', 'tab');
      b.innerHTML = `<span class="specimen-icon icon-plate" aria-hidden="true"><img src="${imgBase}${s.photo}.webp" alt="" width="700" height="700" loading="lazy" decoding="async" /></span><span><b>Specimen ${s.id}</b><small>${s.label}</small></span>`;
      b.addEventListener('click', () => show(i));
      list.appendChild(b);
    });

    function show(i) {
      current = i;
      const s = specimens[i];
      [...list.children].forEach((b, n) => {
        b.classList.toggle('active', n === i);
        b.setAttribute('aria-selected', n === i ? 'true' : 'false');
      });
      icon.className = 'mystery-icon icon-plate';
      icon.innerHTML = `<figure class="mystery-icon-figure" data-zoomable data-lightbox-group="specimens"><div class="mystery-icon-frame"><img src="${imgBase}${s.photo}.webp" alt="Photograph of mystery specimen ${s.id}" width="700" height="700" loading="lazy" decoding="async" /></div><figcaption class="sr-only">Mystery specimen ${s.id}: ${s.label}.</figcaption></figure>`;
      name.textContent = `Mystery specimen ${s.id}`;
      traits.innerHTML = s.traits.map(t => `<span class="trait">${t}</span>`).join('');
      clue.textContent = s.clue;
      select.value = '';
      feedback.className = 'feedback';
      feedback.textContent = solved.has(i) ? s.why : 'Tip: begin with the number of legs and body regions.';
    }

    document.getElementById('checkAnswer').addEventListener('click', () => {
      const s = specimens[current];
      if (!select.value) {
        feedback.className = 'feedback try';
        feedback.textContent = 'Choose a classification first, then check the evidence.';
        return;
      }
      if (select.value === s.answer) {
        solved.add(current);
        feedback.className = 'feedback correct';
        feedback.textContent = `Correct. ${s.why}`;
        score.textContent = `${solved.size} of ${specimens.length} identified`;
      } else {
        feedback.className = 'feedback try';
        feedback.textContent = 'Not yet. Recheck the leg count, number of body regions, and antennae.';
      }
    });

    document.getElementById('nextSpecimen').addEventListener('click', () => show((current + 1) % specimens.length));
    show(0);
  }
})();

(() => {
  const missions = {
    identify: {
      label: 'Mission 01 · Body evidence', title: 'Start broad, then narrow',
      intro: 'A useful identification does not always need a species name. Some invertebrates require expert experience or magnification, so begin with features you can actually see.',
      steps: ['Ask whether the animal has jointed legs.', 'Count legs, antennae, and main body regions.', 'Check wings, mouthparts, segmentation, and movement.', 'Stop at the group you can support with evidence—then compare a field key.'],
      url: 'https://www.buglife.org.uk/bugs/identify-a-bug/', link: 'Open Buglife’s identification guide ↗'
    },
    photo: {
      label: 'Mission 02 · Photo evidence', title: 'Build a photograph an expert can use',
      intro: 'A phone is enough to begin. Clear views of diagnostic features and a little habitat context are more valuable than a dramatic but blurry close-up.',
      steps: ['Move slowly and avoid casting your shadow over the animal.', 'Photograph the top, side, and front when possible.', 'Keep some surrounding habitat in at least one frame.', 'Try early morning or evening, when many invertebrates are less active.'],
      url: 'https://www.buglife.org.uk/bugs/identify-a-bug/photo-tips/', link: 'Open Buglife’s photography tips ↗'
    },
    habitat: {
      label: 'Mission 03 · Habitat clues', title: 'Let the habitat narrow the search',
      intro: 'Invertebrates occupy land, freshwater, and marine habitats. Life stages can even switch worlds: dragonfly and mayfly young develop in freshwater before the winged adults emerge onto land.',
      steps: ['Name the habitat before naming the animal.', 'Look at vegetation, moisture, shelter, and nearby water.', 'Observe under logs or stones only with permission—and replace them gently.', 'Record the microhabitat: flower, leaf, bark, soil, pond edge, or open water.'],
      url: 'https://www.buglife.org.uk/bugs/types-of-invertebrates-by-habitat/', link: 'Explore Buglife’s habitat guide ↗'
    },
    pollinator: {
      label: 'Mission 04 · Flower visitors', title: 'Sort six pollinator groups',
      intro: 'A flower visitor might be a bumblebee, another bee, fly, beetle, butterfly or moth, or wasp. Compare structures before assuming every striped insect is a bee.',
      steps: ['Check whether the body is furry, smooth, banded, or armored.', 'Compare antenna length and the number of visible wings.', 'Look for pollen baskets or pollen carried on body hairs.', 'For beetles, find hardened wing cases meeting in a straight center seam.'],
      url: 'https://buglife.b-cdn.net/app/uploads/2019/07/Pollinator-identification-chart.pdf', link: 'Open the pollinator ID chart (PDF) ↗'
    },
    record: {
      label: 'Mission 05 · Citizen science', title: 'Turn a sighting into a biodiversity record',
      intro: 'A record becomes scientifically useful when it connects evidence to a time and place. Shared observations help researchers understand where invertebrates occur and how populations change.',
      steps: ['Save clear photographs without handling the animal.', 'Record the date, general location, and habitat.', 'Add your best identification and say what evidence supports it.', 'With a teacher or adult, submit through an approved recording platform.'],
      url: 'https://www.inaturalist.org/', link: 'Explore iNaturalist ↗'
    }
  };
  const tabs = [...document.querySelectorAll('.mission-tab')];
  const panel = document.getElementById('missionPanel');
  if (!tabs.length || !panel) return;
  function showMission(id) {
    const mission = missions[id]; if (!mission) return;
    tabs.forEach(tab => { const active = tab.dataset.mission === id; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', active ? 'true' : 'false'); });
    panel.innerHTML = `<span class="mission-label">${mission.label}</span><h3>${mission.title}</h3><p>${mission.intro}</p><ol class="mission-steps">${mission.steps.map(step => `<li>${step}</li>`).join('')}</ol><a class="source-link" href="${mission.url}" target="_blank" rel="noopener noreferrer">${mission.link}</a>`;
  }
  tabs.forEach(tab => tab.addEventListener('click', () => showMission(tab.dataset.mission)));
  showMission('identify');
})();
