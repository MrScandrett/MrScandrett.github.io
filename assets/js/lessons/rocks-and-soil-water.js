(() => {
  /* =========================================================================
     4. STOKES' JAR SIMULATION LOGIC
     ========================================================================= */
  const sampleJar = document.querySelector('.sample-jar');
  const jarStatus = document.getElementById('jarStatus');
  const jarStages = document.querySelectorAll('[data-jar-stage]');
  const jarMessages = [
    'Shake the jar or choose a time to inspect the sample.',
    'Just shaken. Sand, silt, and clay are suspended in the cloudy water.',
    '1 minute. Coarse sand forms the bottom layer. Finer grains remain suspended.',
    '2 hours. Silt forms a middle layer above the sand. Clay still clouds the water.',
    '48 hours. Fine clay forms the top sediment layer and the water is clearer.'
  ];
  let jarTimers = [];

  function showJarStage(stage) {
    sampleJar.dataset.stage = stage;
    jarStatus.textContent = jarMessages[stage];
    jarStages.forEach(button => {
      button.setAttribute('aria-pressed', Number(button.dataset.jarStage) === stage);
    });
  }

  function stopJarPlayback() {
    jarTimers.forEach(timer => clearTimeout(timer));
    jarTimers = [];
  }

  document.getElementById('shakeJarBtn').addEventListener('click', () => {
    stopJarPlayback();
    showJarStage(1);
    jarTimers = [1200, 2800, 4600].map((delay, index) =>
      setTimeout(() => showJarStage(index + 2), delay)
    );
  });

  document.getElementById('resetJarBtn').addEventListener('click', () => {
    stopJarPlayback();
    showJarStage(0);
  });

  jarStages.forEach(button => {
    button.addEventListener('click', () => {
      stopJarPlayback();
      showJarStage(Number(button.dataset.jarStage));
    });
  });

  /* =========================================================================
     5. PERCOLATION & INFILTRATION SANDBOX
     ========================================================================= */
  const drainColumns = document.querySelectorAll('.percolation-col');
  const drainStatus = document.getElementById('drainStatus');
  let drainTimers = [];

  document.getElementById('pourWaterBtn').addEventListener('click', () => {
    drainTimers.forEach(timer => clearTimeout(timer));
    drainStatus.textContent = '100 mL poured into each column. Watch the collectors fill.';

    drainTimers = Array.from(drainColumns, (column, index) => {
      const collected = Number(column.dataset.collected);
      const collectedLabel = column.querySelector('.drain-collected');
      const remainingLabel = column.querySelector('.drain-remaining');
      const water = column.querySelector('.tube-water-drop');
      const beaker = column.querySelector('.beaker-fill');

      water.style.height = '24%';
      beaker.style.height = '0%';
      collectedLabel.textContent = '0 mL';
      remainingLabel.textContent = '100 mL';

      return setTimeout(() => {
        water.style.height = index === 2 ? '12%' : '0%';
        beaker.style.height = collected + '%';
        collectedLabel.textContent = collected + ' mL';
        remainingLabel.textContent = (100 - collected) + ' mL';

        if (index === drainColumns.length - 1) {
          drainStatus.textContent = 'Trial complete. Sand collected 90 mL, loam 50 mL, and clay 15 mL.';
        }
      }, [1000, 2300, 3900][index]);
    });
  });
})();
