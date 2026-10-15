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

      const DEFAULT_WEATHER = {
        label: 'LONGWOOD, FL',
        stationId: 'LW_FL_32750',
        latitude: 28.7031,
        longitude: -81.3384
      };

      const weatherEls = {
        shell: document.getElementById('home-weather-shell'),
        station: document.getElementById('home-weather-station'),
        city: document.getElementById('home-weather-city'),
        status: document.getElementById('home-weather-status'),
        condition: document.getElementById('home-weather-condition'),
        temp: document.getElementById('home-weather-temp'),
        min: document.getElementById('home-weather-min'),
        max: document.getElementById('home-weather-max'),
        wind: document.getElementById('home-weather-wind'),
        humidity: document.getElementById('home-weather-humidity'),
        uv: document.getElementById('home-weather-uv'),
        pollen: document.getElementById('home-weather-pollen'),
        forecast: document.getElementById('home-weather-forecast'),
        feels: document.getElementById('home-weather-feels'),
        currentIcon: document.getElementById('home-weather-current-icon'),
        solar: document.getElementById('home-weather-solar'),
        clothing: document.getElementById('home-weather-clothing'),
        precipChart: document.getElementById('home-weather-precip'),
        windCard: document.getElementById('home-weather-wind-card'),
        humidityCard: document.getElementById('home-weather-humidity-card'),
        uvCard: document.getElementById('home-weather-uv-card'),
        pollenCard: document.getElementById('home-weather-pollen-card')
      };

      const WEATHER_LESSONS = {
        temperature: {
          title: 'Temperature & “Feels Like”',
          label: 'Temperature lesson',
          anchor: 'temperature',
          summary: 'Measures ambient thermal energy versus what human skin actually perceives after humidity and wind.',
          takeaway: 'Your body works to maintain 98.6°F. Large gaps between actual and “feels like” change how quickly you overheat or freeze.'
        },
        wind: {
          title: 'Wind Speed & Direction',
          label: 'Wind lesson',
          anchor: 'wind',
          summary: 'Air moving from high to low pressure; direction letters show where the wind arrives from.',
          takeaway: 'Sudden gusts affect vehicle steering, bridge safety, and heat dissipation more than average speed.'
        },
        uv: {
          title: 'UV Index',
          label: 'UV Index lesson',
          anchor: 'uv',
          summary: 'Invisible solar ultraviolet radiation: 0–2 low, 6–7 high, and 8+ requires shade and sunscreen.',
          takeaway: 'Clouds do not block all UV; overcast skies can still sunburn skin.'
        },
        pollen: {
          title: 'Pollen Outlook',
          label: 'Pollen lesson',
          anchor: 'pollen',
          summary: 'Plant reproduction particles carried on wind currents, triggering seasonal allergies.',
          takeaway: 'Counts peak on warm, dry, windy afternoons; rain washes grains out of the air.'
        },
        humidity: {
          title: 'Relative Humidity & Dew Point',
          label: 'Humidity lesson',
          anchor: 'humidity',
          summary: 'Relative humidity measures moisture percentage; dew point measures true moisture quantity.',
          takeaway: 'When dew point exceeds 65°F, sweat evaporates slowly and heat stress rises.'
        },
        forecast: {
          title: 'Multi-Day Forecast',
          label: 'Forecast lesson',
          anchor: 'forecast',
          summary: 'Supercomputer simulations solving fluid atmospheric equations on a 3D grid.',
          takeaway: 'Immediate days carry highest certainty; check again as events approach.'
        },
        sunlight: {
          title: 'Daylight & Moon Phase',
          label: 'Daylight lesson',
          anchor: 'sunlight',
          summary: 'Solar horizon crossings and the 29.5-day synodic lunar illumination cycle.',
          takeaway: 'The Moon is always half-lit; changing phases come from our viewing angle.'
        },
        readiness: {
          title: 'Outdoor & Recess Readiness',
          label: 'Outdoor readiness lesson',
          anchor: 'clothing',
          summary: 'Synthesizes temperature, moisture, and wind into practical 3-layer wardrobe choices.',
          takeaway: 'Layer for morning vs. afternoon shifts; protect extremities in wind.'
        },
        precipitation: {
          title: 'Precipitation Probability',
          label: 'Rain chance lesson',
          anchor: 'precipitation',
          summary: 'Probability of measurable precipitation falling at a point in the forecast area.',
          takeaway: 'A 30% chance can still produce a downpour where storms form; pack rain gear.'
        }
      };

      function weatherLessonMarkup(topic, drawerId) {
        const lesson = WEATHER_LESSONS[topic];
        if (!lesson) return '';
        return `
          <button class="weather-learn-cue" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="${drawerId}"><span aria-hidden="true">+</span> Learn</button>
          <div class="weather-learning-drawer" id="${drawerId}" aria-hidden="true">
            <div class="weather-learning-drawer-inner">
              <span class="weather-field-note">Weather quick note</span>
              <h3>${lesson.title}</h3>
              <div class="weather-learning-notes">
                <p class="weather-learning-note"><strong>Quick takeaway</strong><span>${lesson.summary}</span></p>
                <p class="weather-learning-note"><strong>Field rule</strong><span>${lesson.takeaway}</span></p>
              </div>
              <a href="lessons/earth-science/weather-watch.html#${lesson.anchor}" class="weather-learn-deep-link">Explore in Weather Watch Engine &rarr;</a>
            </div>
          </div>`;
      }

      function weatherPanelReading(panel) {
        const reading = panel.querySelector('.stat-value, .home-weather-temp, .forecast-temp, .solar-time, .clothing-main, .precip-pct');
        return reading ? reading.textContent.trim() : '';
      }

      function hydrateWeatherLearningPanels() {
        if (weatherOpenPanel && !document.contains(weatherOpenPanel)) {
          weatherOpenPanel = null;
        }
        weatherEls.shell.querySelectorAll('.weather-learning-panel[data-weather-topic]').forEach((panel, index) => {
          const topic = panel.dataset.weatherTopic;
          const lesson = WEATHER_LESSONS[topic];
          if (!lesson) return;
          const drawerId = `weather-learning-${topic}-${index}`;
          if (!panel.querySelector('.weather-learning-drawer')) {
            panel.insertAdjacentHTML('beforeend', weatherLessonMarkup(topic, drawerId));
          }
          const cue = panel.querySelector('.weather-learn-cue');
          const reading = weatherPanelReading(panel);
          if (cue) cue.setAttribute('aria-label', `${lesson.label}${reading ? `. Displayed value: ${reading}` : ''}.`);
        });
      }

      // Field-note drawers float in as their own fixed-position panel instead
      // of pushing the widget's layout down. Only one is open at a time.
      let weatherOpenPanel = null;
      let weatherHideTimer = null;

      function canHoverWeather() {
        return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      }

      function positionWeatherDrawer(panel, drawer) {
        const rect = panel.getBoundingClientRect();
        const margin = 12;

        // Sticky site header clearance
        const header = document.querySelector('.site-header');
        const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
        const minTop = headerBottom + margin;
        const maxBottom = window.innerHeight - margin;
        const availableHeight = Math.max(120, maxBottom - minTop);

        // Ensure drawer fits on constrained projector viewports (e.g. 720p / 768p / 125%+ zoom)
        drawer.style.maxHeight = `${availableHeight}px`;

        const drawerRect = drawer.getBoundingClientRect();
        const drawerHeight = drawerRect.height || 320;
        const drawerWidth = drawerRect.width || 320;

        // Smart horizontal alignment:
        // For wide strip cards (Forecast, Solar, Clothing, Precip), align with the cue button
        // so the drawer doesn't fly to the left edge and obstruct the primary weather telemetry.
        let preferredLeft = rect.left;
        const cue = panel.querySelector('.weather-learn-cue');
        if (cue) {
          const cueRect = cue.getBoundingClientRect();
          if (cueRect.left > rect.left + rect.width * 0.45) {
            preferredLeft = cueRect.right - drawerWidth;
          } else {
            preferredLeft = cueRect.left;
          }
        }

        let left = Math.min(preferredLeft, window.innerWidth - drawerWidth - margin);
        left = Math.max(left, margin);

        // Smart vertical placement (below vs above):
        const spaceBelow = maxBottom - rect.bottom;
        const spaceAbove = rect.top - minTop;
        let top;
        let placement = 'bottom';

        if (spaceBelow >= drawerHeight + margin) {
          top = rect.bottom + margin;
          placement = 'bottom';
        } else if (spaceAbove >= drawerHeight + margin) {
          top = rect.top - drawerHeight - margin;
          placement = 'top';
        } else {
          // Constrained space: pick the side with more available headroom/footroom
          if (spaceBelow >= spaceAbove) {
            top = Math.min(rect.bottom + margin, maxBottom - drawerHeight);
            top = Math.max(top, minTop);
            placement = 'bottom';
          } else {
            top = Math.max(minTop, rect.top - drawerHeight - margin);
            placement = 'top';
          }
        }

        // Containing block calculation:
        // If an ancestor establishes the containing block for fixed positioning, offset by its rect.
        // Otherwise, parentRect is { left: 0, top: 0 }.
        const offsetParent = drawer.offsetParent;
        const parentRect = (offsetParent && offsetParent !== document.body && offsetParent !== document.documentElement)
          ? offsetParent.getBoundingClientRect()
          : { left: 0, top: 0 };

        drawer.style.left = `${Math.round(left - parentRect.left)}px`;
        drawer.style.top = `${Math.round(top - parentRect.top)}px`;
        drawer.dataset.placement = placement;
      }

      // Update the cue in place. Replacing its children (innerHTML) swaps the
      // element under the pointer, which re-fires mouseover/mouseout and makes
      // the button strobe while you try to click it.
      function setWeatherCueState(cue, open) {
        if (!cue) return;
        cue.setAttribute('aria-expanded', open ? 'true' : 'false');
        const icon = cue.firstElementChild;
        if (icon) icon.textContent = open ? '\u2212' : '+';
        const label = cue.lastChild;
        if (label && label.nodeType === 3) label.nodeValue = open ? ' Close' : ' Learn';
      }

      function setWeatherDrawerVisible(panel, visible, immediate) {
        const drawer = panel.querySelector('.weather-learning-drawer');
        const cue = panel.querySelector('.weather-learn-cue');
        clearTimeout(weatherHideTimer);
        if (visible) {
          // Hover/focus/mouseover fire for every child the pointer crosses;
          // an already-open panel only needs its hide timer cancelled.
          if (panel.classList.contains('is-open') && drawer && drawer.classList.contains('is-visible')) {
            weatherOpenPanel = panel;
            return;
          }
          weatherEls.shell.querySelectorAll('.weather-learning-panel.is-open').forEach((openPanel) => {
            if (openPanel !== panel) setWeatherDrawerVisible(openPanel, false, true);
          });
          panel.classList.add('is-open');
          weatherEls.shell.classList.add('has-open-drawer');
          weatherOpenPanel = panel;
          if (drawer) {
            drawer.setAttribute('aria-hidden', 'false');
            drawer.classList.add('is-visible');
            positionWeatherDrawer(panel, drawer);
            requestAnimationFrame(() => {
              if (panel.classList.contains('is-open')) positionWeatherDrawer(panel, drawer);
            });
          }
          setWeatherCueState(cue, true);
        } else {
          setWeatherCueState(cue, false);
          delete panel.dataset.pinned;
          if (weatherOpenPanel === panel) weatherOpenPanel = null;
          const doClose = () => {
            panel.classList.remove('is-open');
            if (!weatherEls.shell.querySelector('.weather-learning-panel.is-open')) {
              weatherEls.shell.classList.remove('has-open-drawer');
            }
            if (drawer) {
              drawer.classList.remove('is-visible');
              drawer.setAttribute('aria-hidden', 'true');
            }
          };
          if (immediate) doClose();
          else weatherHideTimer = setTimeout(doClose, 140);
        }
      }

      // Hover, focus and iOS's synthetic mouseover all open the drawer *before*
      // the click lands, so a click on an open panel can't simply mean "close"
      // (that opened then shut it within one tap). First click pins it open;
      // clicking a pinned panel closes it, and hover can't reopen it until
      // the pointer has left the panel.
      function toggleWeatherDrawer(panel) {
        if (panel.classList.contains('is-open') && panel.dataset.pinned === '1') {
          setWeatherDrawerVisible(panel, false, true);
          panel.dataset.dismissed = '1';
        } else {
          setWeatherDrawerVisible(panel, true);
          panel.dataset.pinned = '1';
        }
      }

      weatherEls.shell.addEventListener('mouseover', (event) => {
        if (!canHoverWeather()) return;
        const panel = event.target.closest('.weather-learning-panel');
        if (!panel || panel.dataset.dismissed === '1') return;
        setWeatherDrawerVisible(panel, true);
      });

      weatherEls.shell.addEventListener('mouseout', (event) => {
        if (!canHoverWeather()) return;
        const fromPanel = event.target.closest('.weather-learning-panel');
        if (!fromPanel) return;
        const toPanel = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest('.weather-learning-panel') : null;
        if (toPanel === fromPanel) return;
        delete fromPanel.dataset.dismissed;
        if (fromPanel.dataset.pinned === '1') return;
        setWeatherDrawerVisible(fromPanel, false, false);
      });

      weatherEls.shell.addEventListener('focusin', (event) => {
        const panel = event.target.closest('.weather-learning-panel');
        if (panel && panel.dataset.dismissed !== '1') setWeatherDrawerVisible(panel, true);
      });

      weatherEls.shell.addEventListener('focusout', (event) => {
        const panel = event.target.closest('.weather-learning-panel');
        if (!panel) return;
        const toPanel = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest('.weather-learning-panel') : null;
        if (toPanel === panel) return;
        // A pinned drawer is dismissed by a second click, an outside click or
        // Escape; tapping its (non-focusable) text just moves focus to <body>.
        if (panel.dataset.pinned === '1') return;
        setWeatherDrawerVisible(panel, false, true);
      });

      weatherEls.shell.addEventListener('click', (event) => {
        const panel = event.target.closest('.weather-learning-panel');
        if (!panel || event.target.closest('a, .weather-learning-drawer')) return;
        toggleWeatherDrawer(panel);
      });

      document.addEventListener('click', (event) => {
        if (!weatherOpenPanel) return;
        if (weatherOpenPanel.contains(event.target)) return;
        setWeatherDrawerVisible(weatherOpenPanel, false, true);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && weatherOpenPanel) {
          setWeatherDrawerVisible(weatherOpenPanel, false, true);
        }
      });

      window.addEventListener('scroll', () => {
        if (!weatherOpenPanel) return;
        const panelRect = weatherOpenPanel.getBoundingClientRect();
        const header = document.querySelector('.site-header');
        const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
        // If the calling panel has completely scrolled out of the visible viewport, close it
        if (panelRect.bottom < headerBottom || panelRect.top > window.innerHeight) {
          setWeatherDrawerVisible(weatherOpenPanel, false, true);
        } else {
          const drawer = weatherOpenPanel.querySelector('.weather-learning-drawer');
          if (drawer && drawer.classList.contains('is-visible')) {
            positionWeatherDrawer(weatherOpenPanel, drawer);
          }
        }
      }, { passive: true, capture: true });

      window.addEventListener('resize', () => {
        if (!weatherOpenPanel) return;
        const drawer = weatherOpenPanel.querySelector('.weather-learning-drawer');
        if (drawer && drawer.classList.contains('is-visible')) {
          positionWeatherDrawer(weatherOpenPanel, drawer);
        }
      });

      hydrateWeatherLearningPanels();

      function setWeatherCard(data) {
        weatherEls.city.textContent = data.label.toUpperCase();
        weatherEls.station.textContent = data.stationId;
        weatherEls.status.textContent = data.status;
        weatherEls.shell.dataset.weatherStatus = data.status.includes('WATCH') ? 'watch' : (data.status.includes('ADVISORY') ? 'advisory' : 'nominal');
        weatherEls.condition.textContent = data.condition.toUpperCase();
        weatherEls.currentIcon.textContent = data.currentIcon;
        weatherEls.temp.textContent = `${Math.round(data.temperature)}°`;
        weatherEls.feels.textContent = `FEELS LIKE ${Math.round(data.feelsLike)}°`;
        weatherEls.min.textContent = `${Math.round(data.min)}°`;
        weatherEls.max.textContent = `${Math.round(data.max)}°`;
        const dirLabel = data.windDirection != null ? ` ${windDirectionLabel(data.windDirection)}` : '';
        weatherEls.wind.textContent = `${Math.round(data.wind)} MPH${dirLabel}`;
        weatherEls.humidity.textContent = `${Math.round(data.humidity)}%`;
        weatherEls.uv.textContent = data.uvLabel;
        weatherEls.pollen.textContent = data.pollen.display;
        weatherEls.uvCard.classList.toggle('telemetry-stat--alert', data.uvAlert);
        weatherEls.pollenCard.classList.toggle('telemetry-stat--alert', data.pollenAlert);
        weatherEls.forecast.innerHTML = data.forecast.map((day) => `
          <div class="forecast-slot">
            <span class="forecast-day">${day.label}</span>
            <span class="forecast-icon" aria-hidden="true">${day.icon}</span>
            <span class="forecast-temp">${Math.round(day.max)}°</span>
          </div>
        `).join('');
        weatherEls.solar.innerHTML = buildSolarSection(data);
        weatherEls.clothing.innerHTML = buildClothingAdvice(data);
        weatherEls.precipChart.innerHTML = buildPrecipChart(data.precipData, data.forecast);
        hydrateWeatherLearningPanels();
      }

      function weatherLabelFromCode(code) {
        const map = {
          0: 'Clear sky',
          1: 'Mostly clear',
          2: 'Partly cloudy',
          3: 'Overcast',
          45: 'Fog',
          48: 'Freezing fog',
          51: 'Light drizzle',
          53: 'Drizzle',
          55: 'Heavy drizzle',
          56: 'Freezing drizzle',
          57: 'Heavy freezing drizzle',
          61: 'Light rain',
          63: 'Rain',
          65: 'Heavy rain',
          66: 'Freezing rain',
          67: 'Heavy freezing rain',
          71: 'Light snow',
          73: 'Snow',
          75: 'Heavy snow',
          77: 'Snow grains',
          80: 'Rain showers',
          81: 'Heavy showers',
          82: 'Violent showers',
          85: 'Snow showers',
          86: 'Heavy snow showers',
          95: 'Thunderstorm',
          96: 'Thunderstorm hail',
          99: 'Severe thunderstorm'
        };
        return map[code] || 'Current conditions';
      }

      function weatherIconFromCode(code) {
        if (code === 0) return '☀️';
        if (code <= 3) return '⛅';
        if (code >= 45 && code <= 48) return '🌫️';
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️';
        if (code >= 71 && code <= 86) return '❄️';
        if (code >= 95) return '⛈️';
        return '🌤️';
      }

      function formatForecastLabel(dateString) {
        const date = new Date(`${dateString}T12:00:00`);
        return date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
      }

      function buildStationId(location) {
        if (location.stationId) return location.stationId;
        const lat = Math.abs(Math.round(location.latitude * 10)).toString().padStart(4, '0');
        const lon = Math.abs(Math.round(location.longitude * 10)).toString().padStart(4, '0');
        return `WX_${lat}_${lon}`;
      }

      function getPollenOutlook(dateString) {
        const month = new Date(`${dateString}T12:00:00`).getMonth() + 1;
        if (month >= 2 && month <= 4) {
          return { label: 'HIGH', score: 3, display: 'HIGH' };
        }
        if (month === 5 || month === 6 || month === 10) {
          return { label: 'MODERATE', score: 2, display: 'MOD' };
        }
        return { label: 'LOW', score: 1, display: 'LOW' };
      }

      function buildMissionStatus({ weatherCode, uv, pollenScore, rainChance }) {
        if (weatherCode >= 95 || rainChance >= 75) return 'STATUS: WEATHER WATCH';
        if (uv >= 8 || pollenScore >= 3) return 'STATUS: ADVISORY';
        return 'STATUS: NOMINAL';
      }

      function getUvCategory(uv) {
        if (uv >= 11) return 'EXTREME';
        if (uv >= 8) return 'V HIGH';
        if (uv >= 6) return 'HIGH';
        if (uv >= 3) return 'MOD';
        return 'LOW';
      }

      function buildClothingAdvice({ temperature, rainChance, uvAlert, wind }) {
        const temp = Math.round(temperature);
        let emoji, mainText;
        if (temp >= 95) {
          emoji = '🥵'; mainText = `It's blazing at ${temp}° — wear light, loose clothing. Light colors reflect heat!`;
        } else if (temp >= 85) {
          emoji = '☀️'; mainText = `Hot day at ${temp}°! T-shirt and shorts weather — stay cool and hydrated.`;
        } else if (temp >= 75) {
          emoji = '😎'; mainText = `Warm and comfortable at ${temp}°. Light clothes like a tee and jeans work great.`;
        } else if (temp >= 65) {
          emoji = '🌤️'; mainText = `Mild at ${temp}°. A light layer or long sleeves — perfect for time outside.`;
        } else if (temp >= 50) {
          emoji = '🍂'; mainText = `Cool at ${temp}°. Grab a hoodie or light jacket before heading out!`;
        } else if (temp >= 32) {
          emoji = '🧥'; mainText = `Cold at ${temp}°! Bundle up with a coat, scarf, and warm layers.`;
        } else {
          emoji = '🥶'; mainText = `Freezing at ${temp}°! Heavy coat, hat, gloves, and warm boots — all of it.`;
        }
        const tips = [];
        if (rainChance >= 60) tips.push('☂️ Bring a raincoat or umbrella');
        else if (rainChance >= 35) tips.push('🌂 Light rain chance — maybe pack an umbrella');
        if (uvAlert) tips.push('🕶️ High UV — sunscreen and sunglasses');
        if (wind >= 20) tips.push('💨 Windy out there — a wind-resistant jacket helps');
        return `<span class="clothing-emoji" aria-hidden="true">${emoji}</span><div class="clothing-body"><p class="clothing-main">${mainText}</p>${tips.length ? `<p class="clothing-tips">${tips.join(' &nbsp;·&nbsp; ')}</p>` : ''}</div>`;
      }

      function windDirectionLabel(degrees) {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(degrees / 45) % 8];
      }

      function getMoonPhase(date) {
        const knownNew = new Date('2000-01-06T18:14:00Z');
        const synodicMonth = 29.53058867;
        const elapsed = (date - knownNew) / 86400000;
        const phase = ((elapsed % synodicMonth) + synodicMonth) % synodicMonth;
        const illumination = Math.round((1 - Math.cos((phase / synodicMonth) * 2 * Math.PI)) / 2 * 100);
        let name, emoji;
        if (phase < 1.85)       { name = 'New Moon';        emoji = '🌑'; }
        else if (phase < 7.38)  { name = 'Waxing Crescent'; emoji = '🌒'; }
        else if (phase < 9.22)  { name = 'First Quarter';   emoji = '🌓'; }
        else if (phase < 14.77) { name = 'Waxing Gibbous';  emoji = '🌔'; }
        else if (phase < 16.61) { name = 'Full Moon';       emoji = '🌕'; }
        else if (phase < 22.15) { name = 'Waning Gibbous';  emoji = '🌖'; }
        else if (phase < 23.99) { name = 'Last Quarter';    emoji = '🌗'; }
        else                    { name = 'Waning Crescent'; emoji = '🌘'; }
        return { name, emoji, illumination };
      }

      function buildSolarSection({ sunrise, sunset, utcOffsetSeconds }) {
        if (!sunrise || !sunset) return '';
        const moon = getMoonPhase(new Date());
        const now = Date.now();
        const riseMs = sunrise;
        const setMs = sunset;
        const riseStr = formatClockInZone(riseMs, utcOffsetSeconds);
        const setStr  = formatClockInZone(setMs, utcOffsetSeconds);
        let progress = 0;
        let isDaytime = false;
        if (now >= riseMs && now <= setMs) {
          progress = Math.round(((now - riseMs) / (setMs - riseMs)) * 100);
          isDaytime = true;
        } else if (now > setMs) {
          progress = 100;
        }
        const markerHTML = isDaytime
          ? `<div class="solar-sun-marker" style="left:${progress}%" aria-hidden="true">☀️</div>`
          : '';
        return `
          <div class="solar-times">
            <span class="solar-endpoint"><span class="solar-icon" aria-hidden="true">🌅</span><span class="solar-time">${riseStr}</span></span>
            <div class="solar-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Daylight progress ${progress}%">
              <div class="solar-fill" style="width:${progress}%"></div>
              ${markerHTML}
            </div>
            <span class="solar-endpoint solar-endpoint--right"><span class="solar-time">${setStr}</span><span class="solar-icon" aria-hidden="true">🌇</span></span>
          </div>
          <div class="solar-moon">
            <span class="moon-emoji" aria-hidden="true">${moon.emoji}</span>
            <span class="moon-name">${moon.name}</span>
            <span class="moon-illum">${moon.illumination}% lit</span>
          </div>`;
      }

      function buildPrecipChart(precipData, forecastDays) {
        if (!precipData || !precipData.length) return '';
        const maxH = 46;
        const bars = precipData.map((pct, i) => {
          const day = forecastDays[i] ? forecastDays[i].label : '';
          const barH = Math.max(2, Math.round((pct / 100) * maxH));
          const wet = pct >= 50;
          return `<div class="precip-col"><span class="precip-pct">${pct}%</span><div class="precip-bar${wet ? ' precip-bar--wet' : ''}" style="height:${barH}px"></div><span class="precip-day">${day}</span></div>`;
        }).join('');
        return `<span class="precip-title">Rain Chance</span><div class="precip-bars">${bars}</div>`;
      }

      const WEATHER_FETCH_TIMEOUT_MS = 8000;
      const WEATHER_REFRESH_MS = 15 * 60 * 1000;
      const WEATHER_STALE_MS = 45 * 60 * 1000;
      const WEATHER_CACHE_KEY = 'home-weather-cache-v1';
      const WEATHER_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

      // Open-Meteo returns local wall-clock strings ("2026-10-02T07:15") for the
      // forecast location. Convert with the reported UTC offset so sunrise/sunset
      // are correct no matter where the viewer's own clock is.
      function localIsoToEpoch(iso, offsetSeconds) {
        if (!iso) return null;
        const ms = Date.parse(`${iso}:00Z`);
        return Number.isNaN(ms) ? null : ms - (offsetSeconds || 0) * 1000;
      }

      function formatClockInZone(epochMs, offsetSeconds) {
        const d = new Date(epochMs + (offsetSeconds || 0) * 1000);
        const h24 = d.getUTCHours();
        const m = String(d.getUTCMinutes()).padStart(2, '0');
        return `${h24 % 12 || 12}:${m} ${h24 >= 12 ? 'PM' : 'AM'}`;
      }

      function readWeatherCache() {
        try {
          const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY));
          if (cached && cached.data && Date.now() - cached.savedAt < WEATHER_CACHE_MAX_AGE_MS) return cached;
        } catch (error) { /* storage unavailable or corrupt */ }
        return null;
      }

      function writeWeatherCache(data) {
        try {
          localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
        } catch (error) { /* storage unavailable or full */ }
      }

      async function fetchWeatherForLocation(location) {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.set('latitude', location.latitude);
        url.searchParams.set('longitude', location.longitude);
        url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m,wind_direction_10m');
        url.searchParams.set('daily', 'temperature_2m_min,temperature_2m_max,weather_code,uv_index_max,precipitation_probability_max,sunrise,sunset');
        url.searchParams.set('temperature_unit', 'fahrenheit');
        url.searchParams.set('wind_speed_unit', 'mph');
        url.searchParams.set('forecast_days', '5');
        url.searchParams.set('timezone', 'auto');

        // A stalled connection would otherwise leave the card on "Loading" forever.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEATHER_FETCH_TIMEOUT_MS);
        let payload;
        try {
          const response = await fetch(url.toString(), { signal: controller.signal });
          if (!response.ok) {
            throw new Error(`Weather request failed: ${response.status}`);
          }
          payload = await response.json();
        } finally {
          clearTimeout(timeoutId);
        }
        const current = payload && payload.current;
        const daily = payload && payload.daily;

        if (
          !current ||
          !daily ||
          !daily.temperature_2m_min ||
          !daily.temperature_2m_max ||
          !daily.time ||
          !daily.time.length ||
          current.temperature_2m == null
        ) {
          throw new Error('Incomplete weather payload');
        }

        const todayDate = daily.time[0];
        const pollen = getPollenOutlook(todayDate);
        const uv = Number(daily.uv_index_max && daily.uv_index_max[0]) || 0;
        const rainChance = Number(daily.precipitation_probability_max && daily.precipitation_probability_max[0]) || 0;

        return {
          label: location.label,
          stationId: buildStationId(location),
          status: buildMissionStatus({
            weatherCode: current.weather_code,
            uv,
            pollenScore: pollen.score,
            rainChance
          }),
          condition: weatherLabelFromCode(current.weather_code),
          currentIcon: current.is_day === 0 && current.weather_code <= 1 ? '🌙' : weatherIconFromCode(current.weather_code),
          temperature: current.temperature_2m,
          feelsLike: current.apparent_temperature != null ? current.apparent_temperature : current.temperature_2m,
          wind: current.wind_speed_10m || 0,
          windDirection: current.wind_direction_10m != null ? current.wind_direction_10m : null,
          humidity: current.relative_humidity_2m || 0,
          uvLabel: `${uv.toFixed(1)} ${getUvCategory(uv)}`,
          uvAlert: uv >= 6,
          pollen,
          pollenAlert: pollen.score >= 2,
          min: daily.temperature_2m_min[0],
          max: daily.temperature_2m_max[0],
          forecast: daily.time.slice(0, 5).map((dateString, index) => ({
            label: formatForecastLabel(dateString),
            icon: weatherIconFromCode(daily.weather_code ? daily.weather_code[index] : 0),
            max: daily.temperature_2m_max[index]
          })),
          rainChance,
          precipData: (daily.precipitation_probability_max || []).slice(0, 5).map(v => Number(v) || 0),
          sunrise: localIsoToEpoch(daily.sunrise && daily.sunrise[0], payload.utc_offset_seconds),
          sunset: localIsoToEpoch(daily.sunset && daily.sunset[0], payload.utc_offset_seconds),
          utcOffsetSeconds: payload.utc_offset_seconds || 0
        };
      }

      // Only use the browser's location when the visitor has already granted it.
      // Asking on every page load interrupts a classroom display, and a prompt
      // nobody answers never settles — the card would sit on "Loading" forever.
      async function getBrowserLocation() {
        if (!navigator.geolocation || !navigator.permissions) throw new Error('Geolocation unavailable');
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state !== 'granted') throw new Error('Geolocation not granted');
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({
              label: 'YOUR AREA',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }),
            reject,
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30 * 60 * 1000 }
          );
        });
      }

      let weatherLastUpdated = 0;
      let weatherRetryDelay = 30 * 1000;
      let weatherTimer = null;
      let weatherLoading = false;

      function formatUpdatedTime(epochMs) {
        return new Date(epochMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }

      function renderWeatherUnavailable() {
        const dash = '--';
        weatherEls.city.textContent = DEFAULT_WEATHER.label;
        weatherEls.station.textContent = DEFAULT_WEATHER.stationId;
        weatherEls.status.textContent = 'STATUS: OFFLINE';
        // Collapses the data-only panels (CSS) so a blocked service shows one
        // clear message instead of a grid of dashes.
        weatherEls.shell.dataset.weatherStatus = 'unavailable';
        weatherEls.condition.textContent = 'WEATHER UNAVAILABLE';
        weatherEls.currentIcon.textContent = '—';
        weatherEls.temp.textContent = `${dash}°`;
        weatherEls.feels.textContent = `FEELS LIKE ${dash}°`;
        weatherEls.min.textContent = `${dash}°`;
        weatherEls.max.textContent = `${dash}°`;
        weatherEls.wind.textContent = `${dash} MPH`;
        weatherEls.humidity.textContent = `${dash}%`;
        weatherEls.uv.textContent = dash;
        weatherEls.pollen.textContent = dash;
        weatherEls.uvCard.classList.remove('telemetry-stat--alert');
        weatherEls.pollenCard.classList.remove('telemetry-stat--alert');
        weatherEls.forecast.innerHTML = '';
        weatherEls.solar.innerHTML = '';
        weatherEls.precipChart.innerHTML = '';
        weatherEls.clothing.innerHTML = '<span class="clothing-emoji" aria-hidden="true">📡</span><div class="clothing-body"><p class="clothing-main">Couldn’t reach the weather service. Looking outside is a great backup!</p><p class="clothing-tips"><button type="button" class="weather-retry">Try again</button></p></div>';
        hydrateWeatherLearningPanels();
      }

      function scheduleWeatherRefresh(delay) {
        clearTimeout(weatherTimer);
        weatherTimer = setTimeout(() => loadWeather(), delay);
      }

      async function loadWeather() {
        if (weatherLoading) return;
        weatherLoading = true;
        try {
          let weather = null;
          const location = await getBrowserLocation().catch(() => DEFAULT_WEATHER);
          try {
            weather = await fetchWeatherForLocation(location);
          } catch (error) {
            if (location === DEFAULT_WEATHER) throw error;
            weather = await fetchWeatherForLocation(DEFAULT_WEATHER);
          }
          // Don't rebuild the panels out from under a student reading a field note.
          if (weatherOpenPanel) {
            scheduleWeatherRefresh(30 * 1000);
            return;
          }
          setWeatherCard(weather);
          writeWeatherCache(weather);
          weatherLastUpdated = Date.now();
          weatherRetryDelay = 30 * 1000;
          scheduleWeatherRefresh(WEATHER_REFRESH_MS);
        } catch (error) {
          const cached = readWeatherCache();
          if (cached) {
            setWeatherCard(cached.data);
            weatherEls.status.textContent = `STATUS: STALE · AS OF ${formatUpdatedTime(cached.savedAt)}`;
            weatherEls.shell.dataset.weatherStatus = 'standby';
            weatherLastUpdated = cached.savedAt;
          } else {
            renderWeatherUnavailable();
          }
          scheduleWeatherRefresh(weatherRetryDelay);
          weatherRetryDelay = Math.min(weatherRetryDelay * 2, WEATHER_REFRESH_MS);
        } finally {
          weatherLoading = false;
        }
      }

      weatherEls.shell.addEventListener('click', (event) => {
        if (!event.target.closest('.weather-retry')) return;
        event.stopPropagation();
        weatherEls.status.textContent = 'STATUS: LOADING';
        loadWeather();
      }, true);

      // A projector left on all day shouldn't show yesterday's weather.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Date.now() - weatherLastUpdated > WEATHER_STALE_MS) loadWeather();
      });

      loadWeather();
    })();
  
