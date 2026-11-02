    (function () {
      function byId(id) {
        return document.getElementById(id);
      }

      // Featured video: picked from data/video-library.json and played in the ClassroomOS
      // player (watch.html). Nothing loads from a video provider until the student presses Play.
      const VOD_LIST = [
        { slug: "jobs-on-failure", title: "Steve Jobs on Failure", category: "Interview", desc: "An archival interview excerpt about failure, iteration, and continuing to build.", duration: "1:43" },
        { slug: "jobs-secrets-of-life", title: "Steve Jobs — Secrets of Life", category: "Interview", desc: "An archival interview excerpt about questioning assumptions and making useful things.", duration: "1:40" },
        { slug: "pale-blue-dot", title: "Carl Sagan — Pale Blue Dot", category: "Science", desc: "Carl Sagan reflects on Earth seen from 3.7 billion miles away and what that perspective asks of us.", duration: "3:27" },
        { slug: "powers-of-ten", title: "Powers of Ten (1977)", category: "Scale & Space", desc: "The Eames Office film travels from a Chicago picnic to cosmic scale, then inward toward the atom.", duration: "9:01" },
        { slug: "nature-by-numbers", title: "Nature by Numbers — 4K Remastered", category: "Math & Pattern", desc: "An artist-made exploration of Fibonacci numbers, the golden ratio, and geometric patterns in living forms.", duration: "3:44" },
        { slug: "what-is-the-internet", title: "What Is the Internet?", category: "Technology", desc: "A short introduction to the connected systems and shared protocols behind the internet.", duration: "3:45" },
        { slug: "earthrise-apollo-8", title: "Earthrise: The 45th Anniversary", category: "Space", desc: "Lunar Reconnaissance Orbiter data and the Apollo 8 crew's own onboard audio recreate December 24, 1968, when Bill Anders photographed Earth rising over the Moon.", duration: "6:55" },
        { slug: "perpetual-ocean", title: "Perpetual Ocean", category: "Earth Science", desc: "Surface currents of the world ocean from June 2005 to December 2007, drawn from NASA/MIT/JPL ocean-model data: the Gulf Stream, the great gyres and thousands of eddies.", duration: "3:02" },
        { slug: "trip-to-the-moon-1902", title: "A Trip to the Moon (Georges Méliès, 1902)", category: "Film & Animation", desc: "The silent fantasy that imagined a Moon voyage 67 years before Apollo: a capsule fired from a giant cannon straight into the eye of the Man in the Moon.", duration: "12:46" }
      ];

      const v = VOD_LIST[Math.floor(Math.random() * VOD_LIST.length)];

      const vodCategory = byId('vod-category');
      const vodTitle = byId('vod-title');
      const vodDesc = byId('vod-desc');
      const vodFallbackTitle = byId('vod-fallback-title');

      if (vodCategory) vodCategory.textContent = v.category;
      if (vodTitle) vodTitle.textContent = v.title;
      if (vodDesc) vodDesc.textContent = v.desc;
      if (vodFallbackTitle) vodFallbackTitle.textContent = v.title;

      const thumbWrap = byId('vod-thumb-wrap');
      const vodDuration = byId('vod-duration');
      if (vodDuration && v.duration) vodDuration.textContent = v.duration;
      // No thumbnail is fetched ahead of Play, so the title card is the artwork.
      if (thumbWrap) thumbWrap.classList.add('vod-thumb-wrap--fallback');

      function openVod() {
        window.location.href = 'watch.html?v=' + encodeURIComponent(v.slug);
      }

      if (thumbWrap) {
        thumbWrap.addEventListener('click', openVod);
        thumbWrap.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openVod();
          }
        });
      }

    })();
