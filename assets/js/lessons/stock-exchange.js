(function () {
  'use strict';

  const core = window.StockExchangeCore;
  if (!core || typeof SimKit === 'undefined') return;

  const {
    NEWS_POOL,
    TICKERS,
    HOURS,
    DAYS,
    MAX_CANDLES,
    buildState,
    applyTrade,
    queueLimitOrder,
    cancelLimitOrderById,
    evaluateLimitOrders,
    computePortfolioTotals
  } = core;

  let state = buildState();

  function scheduleInterval() {
    clearInterval(state.tickInterval);
    state.tickInterval = null;
    if (!state.running || document.hidden) return;
    const ms = { 1: 2000, 2: 1000, 4: 500 }[state.speed] || 2000;
    state.tickInterval = setInterval(tick, ms);
  }

  function toggleMarket() {
    const toggleBtn = document.getElementById('sx-toggle-btn');
    const badge = document.getElementById('sx-market-badge');
    if (state.running) {
      state.running = false;
      clearInterval(state.tickInterval);
      state.tickInterval = null;
      toggleBtn.textContent = '▶ Open Market';
      toggleBtn.className = 'sx-btn primary';
      badge.textContent = 'Market Paused';
      badge.className = 'sx-market-badge closed';
    } else {
      state.running = true;
      toggleBtn.textContent = '⏸ Pause';
      toggleBtn.className = 'sx-btn amber';
      badge.textContent = 'Market Open';
      badge.className = 'sx-market-badge open';
      scheduleInterval();
    }
  }

  function setSpeed(s, btn) {
    state.speed = s;
    document.querySelectorAll('.sx-speed-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    if (state.running) scheduleInterval();
  }

  function resetSimulation() {
    clearInterval(state.tickInterval);
    state = buildState();
    const toggleBtn = document.getElementById('sx-toggle-btn');
    const badge = document.getElementById('sx-market-badge');
    toggleBtn.textContent = '▶ Open Market';
    toggleBtn.className = 'sx-btn primary';
    badge.textContent = 'Market Closed';
    badge.className = 'sx-market-badge closed';
    document.getElementById('sx-news-list').innerHTML =
      '<div class="sx-news-item"><div class="sx-news-time">—</div><div class="sx-news-headline" style="color: var(--text-muted, #64748b);font-style:italic;">Open the market to start receiving news.</div></div>';
    document.querySelectorAll('.sx-speed-btn').forEach(function (b, i) { b.classList.toggle('active', i === 0); });
    renderAll();
    selectTicker(state.selected);
  }

  function tick() {
    if (document.hidden || !state.running) return;
    state.hour++;
    if (state.hour >= HOURS.length) {
      state.hour = 0;
      state.day++;
      if (state.day >= DAYS.length) state.day = 0;
    }

    Object.keys(state.sectorSentiment).forEach(function (key) {
      state.sectorSentiment[key] += (1 - state.sectorSentiment[key]) * 0.08;
    });

    TICKERS.forEach(function (t) {
      const c = state.companies[t];
      const sentiment = state.sectorSentiment[c.sectorKey] || 1;
      const open = c.price;
      const drift = (c.start - c.price) * 0.006;
      const noise = (Math.random() - 0.5) * c.price * c.vol * sentiment;
      const close = Math.max(1, c.price + drift + noise);
      const wickSwing = close * c.vol * (0.6 + Math.abs(sentiment - 1) * 1.6);
      const high = Math.max(open, close) + wickSwing * Math.random();
      const low = Math.max(1, Math.min(open, close) - wickSwing * Math.random());
      c.price = close;
      c.currentCandle = { o: open, h: high, l: low, c: close };
      c.ohlcHistory.push(Object.assign({}, c.currentCandle));
      if (c.ohlcHistory.length > MAX_CANDLES) c.ohlcHistory.shift();
      c.sparkHistory.push(close);
      if (c.sparkHistory.length > 90) c.sparkHistory.shift();
    });

    state.tickCount++;
    state.nextNewsIn--;
    if (state.nextNewsIn <= 0) {
      fireNews();
      state.nextNewsIn = 2 + Math.floor(Math.random() * 4);
    }

    checkLimitOrders();
    renderAll();
  }

  function fireNews() {
    const event = NEWS_POOL[Math.floor(Math.random() * NEWS_POOL.length)];
    const impact = event.i + (Math.random() - 0.5) * 0.02;

    if (event.t) {
      const c = state.companies[event.t];
      c.price = Math.max(1, c.price * (1 + impact));
      c.currentCandle.h = Math.max(c.currentCandle.h, c.price);
      c.currentCandle.l = Math.min(c.currentCandle.l, c.price);
      c.currentCandle.c = c.price;
      syncLatestCandle(event.t);
      const sectorBoost = 1 + impact * 0.35;
      state.sectorSentiment[c.sectorKey] = Math.max(0.72, Math.min(1.4, state.sectorSentiment[c.sectorKey] * sectorBoost));
      flashCard(event.t, impact > 0);
    } else {
      TICKERS.forEach(function (t) {
        const c = state.companies[t];
        c.price = Math.max(1, c.price * (1 + impact));
        c.currentCandle.h = Math.max(c.currentCandle.h, c.price);
        c.currentCandle.l = Math.min(c.currentCandle.l, c.price);
        c.currentCandle.c = c.price;
        syncLatestCandle(t);
      });
      Object.keys(state.sectorSentiment).forEach(function (key) {
        state.sectorSentiment[key] = Math.max(0.72, Math.min(1.4, state.sectorSentiment[key] * (1 + impact * 0.22)));
      });
    }

    addNewsItem(event, impact);
  }

  function flashCard(ticker, isUp) {
    const card = document.getElementById('sx-card-' + ticker);
    if (!card) return;
    card.classList.remove('sx-flash-green', 'sx-flash-red');
    void card.offsetWidth;
    card.classList.add(isUp ? 'sx-flash-green' : 'sx-flash-red');
    setTimeout(function () {
      card.classList.remove('sx-flash-green', 'sx-flash-red');
    }, 700);
  }

  function addNewsItem(event, impact) {
    const list = document.getElementById('sx-news-list');
    const sign = impact >= 0 ? '+' : '';
    const pct = (impact * 100).toFixed(1);
    const cls = impact >= 0 ? 'sx-up' : 'sx-down';
    const ticker = event.t ? event.t : 'ALL';
    const timeStr = HOURS[state.hour] || '9:00am';

    const div = document.createElement('div');
    div.className = 'sx-news-item';
    div.innerHTML =
      '<div class="sx-news-time">' + timeStr + ' · <span class="' + cls + '" style="font-weight:700;">' + ticker + '</span> <span class="' + cls + '">' + sign + pct + '%</span></div>' +
      '<div class="sx-news-headline">' + event.h + '</div>' +
      '<div class="sx-news-why">' + event.w + '</div>';
    list.insertBefore(div, list.firstChild);

    while (list.children.length > 20) list.removeChild(list.lastChild);
  }

  function executeTrade(action, ticker, sharesOverride, priceOverride) {
    const targetTicker = ticker || state.selected;
    const shares = sharesOverride == null
      ? (parseInt(document.getElementById('sx-shares-input').value, 10) || 0)
      : sharesOverride;
    const res = applyTrade(state, action, targetTicker, shares, priceOverride);
    showMsg(res.message, res.ok ? 'ok' : 'err');
    if (res.ok) renderPortfolio();
  }

  function showMsg(txt, type) {
    const el = document.getElementById('sx-trade-msg');
    el.textContent = txt;
    el.className = 'sx-trade-msg ' + type;
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.textContent = '';
      el.className = 'sx-trade-msg';
    }, 4000);
  }

  function updateTradeCost() {
    const shares = parseInt(document.getElementById('sx-shares-input').value, 10) || 0;
    const c = state.companies[state.selected];
    const cost = shares * c.price;
    document.getElementById('sx-trade-cost').textContent = 'est. $' + cost.toFixed(2);
  }

  function syncLatestCandle(ticker) {
    const c = state.companies[ticker];
    if (c.ohlcHistory.length) {
      c.ohlcHistory[c.ohlcHistory.length - 1] = Object.assign({}, c.currentCandle);
    }
    if (c.sparkHistory.length) {
      c.sparkHistory[c.sparkHistory.length - 1] = c.price;
    }
  }

  function showLimitMsg(txt, type) {
    const el = document.getElementById('sx-limit-msg');
    el.textContent = txt;
    el.className = 'sx-limit-msg ' + type;
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.textContent = '';
      el.className = 'sx-limit-msg';
    }, 4000);
  }

  function placeLimitOrder() {
    const res = queueLimitOrder(state, {
      ticker: state.selected,
      type: document.getElementById('sx-limit-type').value,
      price: parseFloat(document.getElementById('sx-limit-price').value),
      shares: parseInt(document.getElementById('sx-limit-shares').value, 10) || 0
    });
    showLimitMsg(res.message, res.ok ? 'ok' : 'err');
    if (res.ok) renderLimitOrders();
  }

  function cancelLimitOrder(id) {
    cancelLimitOrderById(state, id);
    renderLimitOrders();
  }

  function checkLimitOrders() {
    const res = evaluateLimitOrders(state);
    res.expired.forEach(function (item) {
      showLimitMsg(item.reason, 'err');
    });
    res.executed.forEach(function (item) {
      showMsg(item.trade.message, 'ok');
      renderPortfolio();
      addNewsItem({
        h: 'Limit order executed for ' + item.order.ticker + ': ' + item.order.type.toUpperCase() + ' ' + item.order.shares + ' @ $' + item.executionPrice.toFixed(2),
        t: item.order.ticker,
        w: 'Automated orders let traders react to price targets even while they are focused somewhere else.'
      }, 0);
    });
    renderLimitOrders();
  }

  function renderLimitOrders() {
    const list = document.getElementById('sx-limit-list');
    if (!list) return;
    const orders = state.limitOrders.filter(function (order) { return order.ticker === state.selected; });
    if (!orders.length) {
      list.innerHTML = '<div class="sx-limit-empty">No queued orders for this ticker.</div>';
      return;
    }
    list.innerHTML = orders.map(function (order) {
      return (
        '<div class="sx-limit-item">' +
          '<div>' +
            '<strong>' + order.type.toUpperCase() + '</strong> ' +
            '<span>' + order.shares + ' ' + order.ticker + ' @ $' + order.price.toFixed(2) + '</span>' +
          '</div>' +
          '<button type="button" class="sx-chip-btn" data-cancel-limit="' + order.id + '">Cancel</button>' +
        '</div>'
      );
    }).join('');
  }

  function updateTickerTape() {
    const tape = document.getElementById('sx-ticker-tape');
    if (!tape) return;
    tape.innerHTML = TICKERS.map(function (t) {
      const c = state.companies[t];
      const change = ((c.price - c.start) / c.start * 100);
      const color = change >= 0 ? '#39FF14' : '#ff3e3e';
      const sentiment = state.sectorSentiment[c.sectorKey] || 1;
      return (
        '<span class="sx-ticker-item" style="color:' + color + ';">' +
          t + ' <em>$' + c.price.toFixed(2) + '</em> ' + (change >= 0 ? '+' : '') + change.toFixed(2) + '% ' +
          '<em>' + sentiment.toFixed(2) + '× ' + c.sector + '</em>' +
        '</span>'
      );
    }).join('');
  }

  function sentimentBadgeMarkup(company) {
    const sentiment = state.sectorSentiment[company.sectorKey] || 1;
    const cls = sentiment > 1.04 ? 'bullish' : sentiment < 0.96 ? 'bearish' : 'neutral';
    const label = sentiment > 1.04 ? 'Sector bullish' : sentiment < 0.96 ? 'Sector cautious' : 'Sector balanced';
    return '<span class="sx-sector-badge ' + cls + '">' + label + '</span>';
  }

  function selectTicker(t) {
    if (!state.companies[t]) return;
    state.selected = t;
    TICKERS.forEach(function (tk) {
      document.getElementById('sx-card-' + tk).classList.toggle('selected', tk === t);
    });
    const c = state.companies[t];
    document.getElementById('sx-sel-name').innerHTML =
      c.name + ' <span style="font-size:0.75rem;font-weight:500;color: var(--text-muted, #64748b);">(' + t + ')</span>';
    document.getElementById('sx-sel-sector').innerHTML = c.sector + sentimentBadgeMarkup(c);
    document.getElementById('sx-sel-tagline').innerHTML = c.tagline;
    document.getElementById('sx-trade-ticker').textContent = t;
    document.getElementById('sx-limit-price').value = c.price.toFixed(2);
    updateTradeCost();
    renderLimitOrders();
    drawChart(t);
  }

  function renderAll() {
    document.getElementById('sx-clock-day').textContent = 'Day ' + (state.day + 1) + ' · ' + DAYS[state.day];
    document.getElementById('sx-clock-time').textContent = HOURS[state.hour];

    TICKERS.forEach(function (t) {
      const c = state.companies[t];
      const chg = (c.price - c.start) / c.start * 100;
      const sign = chg >= 0 ? '+' : '';
      const cls = chg > 0.05 ? 'sx-up' : chg < -0.05 ? 'sx-down' : 'sx-flat';

      document.getElementById('sx-price-' + t).textContent = '$' + c.price.toFixed(2);
      const chgEl = document.getElementById('sx-change-' + t);
      chgEl.textContent = sign + chg.toFixed(2) + '%';
      chgEl.className = 'sx-stock-change ' + cls;

      drawSparkline(t);
    });

    const sc = state.companies[state.selected];
    const schg = (sc.price - sc.start) / sc.start * 100;
    const ssign = schg >= 0 ? '+' : '';
    const scls = schg > 0.05 ? 'sx-up' : schg < -0.05 ? 'sx-down' : 'sx-flat';
    document.getElementById('sx-sel-price').textContent = '$' + sc.price.toFixed(2);
    const schgEl = document.getElementById('sx-sel-change');
    schgEl.textContent = ssign + schg.toFixed(2) + '%';
    schgEl.className = 'sx-selected-change ' + scls;
    document.getElementById('sx-sel-sector').innerHTML = sc.sector + sentimentBadgeMarkup(sc);

    drawChart(state.selected);
    renderPortfolio();
    updateTradeCost();
    renderLimitOrders();
    updateTickerTape();
  }

  function renderPortfolio() {
    const totals = computePortfolioTotals(state);
    const plSign = totals.totalPnl >= 0 ? '+' : '';
    const plCls = totals.totalPnl > 0.01 ? 'sx-up' : totals.totalPnl < -0.01 ? 'sx-down' : 'sx-flat';

    document.getElementById('sx-port-total').textContent = '$' + totals.totalValue.toFixed(2);
    const plEl = document.getElementById('sx-port-pl');
    plEl.textContent = plSign + '$' + Math.abs(totals.totalPnl).toFixed(2) + ' (' + plSign + totals.totalPnlPct.toFixed(2) + '%)';
    plEl.className = 'sx-portfolio-pl ' + plCls;
    document.getElementById('sx-port-cash').textContent = 'Cash: $' + state.cash.toFixed(2);

    const hvEl = document.getElementById('sx-header-value');
    hvEl.textContent = '$' + totals.totalValue.toFixed(2);
    hvEl.className = 'sx-portfolio-value-inline ' + plCls;

    const holdEl = document.getElementById('sx-holdings');
    if (totals.holdings.length === 0) {
      holdEl.innerHTML = '<div class="sx-no-holdings">No positions yet.</div>';
    } else {
      holdEl.innerHTML = totals.holdings.map(function (h) {
        const holdPlCls = h.pnl > 0.01 ? 'sx-up' : h.pnl < -0.01 ? 'sx-down' : 'sx-flat';
        const holdSign = h.pnl >= 0 ? '+' : '';
        return (
          '<div class="sx-holding-row">' +
            '<div>' +
              '<div class="sx-holding-name">' + h.ticker + '</div>' +
              '<div class="sx-holding-detail">' + h.shares + ' sh · avg $' + h.avgCost.toFixed(2) + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<div class="sx-holding-detail" style="color:inherit;">$' + h.value.toFixed(2) + '</div>' +
              '<div class="sx-holding-detail ' + holdPlCls + '">' + holdSign + '$' + Math.abs(h.pnl).toFixed(2) + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  const chartEl = document.getElementById('sx-chart');
  if (!chartEl) return;

  let chartSimCanvas = null;
  chartSimCanvas = SimKit.canvas2d(chartEl, {
    height: 160,
    dpr: 2,
    onResize: function () { drawChart(state.selected); }
  });
  const sparkCanvases = {};
  TICKERS.forEach(function (t) {
    const el = document.getElementById('sx-spark-' + t);
    if (el) sparkCanvases[t] = SimKit.canvas2d(el, { height: 28, dpr: 2 });
  });

  function drawChart(ticker) {
    if (!chartSimCanvas) return;
    const ctx = chartSimCanvas.ctx;
    const c = state.companies[ticker];
    if (!c) return;
    const hist = c.ohlcHistory.slice(-MAX_CANDLES);
    const W = chartSimCanvas.width;
    const H = chartSimCanvas.height;
    const PADR = 8;
    const PADL = 48;
    const PADT = 12;
    const PADB = 18;
    const colors = SimKit.theme.colors();

    ctx.clearRect(0, 0, W, H);
    if (hist.length < 2) return;
    const allPrices = hist.flatMap(function (d) { return [d.h, d.l]; });
    const minP = Math.min.apply(null, allPrices) * 0.993;
    const maxP = Math.max.apply(null, allPrices) * 1.007;
    const rng = maxP - minP || 1;

    function fx(i) { return PADL + (i / Math.max(hist.length - 1, 1)) * (W - PADL - PADR); }
    function fy(p) { return PADT + (1 - (p - minP) / rng) * (H - PADT - PADB); }

    for (let g = 0; g < 4; g++) {
      const p = minP + (g / 3) * rng;
      const y = fy(p);
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADL, y);
      ctx.lineTo(W - PADR, y);
      ctx.stroke();

      ctx.globalAlpha = 0.6;
      ctx.fillStyle = colors.textMuted;
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('$' + p.toFixed(0), PADL - 4, y + 3.5);
    }
    ctx.globalAlpha = 1.0;

    const startY = fy(c.start);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(PADL, startY);
    ctx.lineTo(W - PADR, startY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    const candleWidth = Math.max(6, (W - PADL - PADR) / hist.length - 3);
    hist.forEach(function (d, i) {
      const x = fx(i) - candleWidth / 2;
      const isBull = d.c >= d.o;
      const color = isBull ? '#22c55e' : '#ef4444';
      const yOpen = fy(d.o);
      const yClose = fy(d.c);
      const yHigh = fy(d.h);
      const yLow = fy(d.l);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, yHigh);
      ctx.lineTo(x + candleWidth / 2, yLow);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(x, Math.min(yOpen, yClose), candleWidth, Math.max(1.5, Math.abs(yOpen - yClose)));
    });
  }

  function drawSparkline(ticker) {
    if (!sparkCanvases[ticker]) return;
    const canvas = sparkCanvases[ticker];
    const ctx = canvas.ctx;
    const c = state.companies[ticker];
    const hist = c.sparkHistory.slice(-22);
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    if (hist.length < 2) return;

    const min = Math.min.apply(null, hist);
    const max = Math.max.apply(null, hist);
    const rng = max - min || 1;
    const isUp = c.price >= c.start;
    ctx.strokeStyle = isUp ? '#10b981' : '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    hist.forEach(function (p, i) {
      const x = (i / (hist.length - 1)) * W;
      const y = H - 2 - ((p - min) / rng) * (H - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Event wiring (replaces inline on* attributes)
  const toggleBtn = document.getElementById('sx-toggle-btn');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleMarket);

  document.querySelectorAll('[data-speed]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setSpeed(Number(btn.dataset.speed) || 1, btn);
    });
  });

  document.querySelectorAll('[data-ticker]').forEach(function (card) {
    card.addEventListener('click', function () {
      selectTicker(card.dataset.ticker);
    });
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectTicker(card.dataset.ticker);
      }
    });
  });

  const sharesInput = document.getElementById('sx-shares-input');
  if (sharesInput) sharesInput.addEventListener('input', updateTradeCost);

  document.querySelectorAll('[data-trade]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      executeTrade(btn.dataset.trade);
    });
  });

  const placeLimitBtn = document.getElementById('sx-place-limit-btn');
  if (placeLimitBtn) placeLimitBtn.addEventListener('click', placeLimitOrder);

  const resetBtn = document.getElementById('sx-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

  const limitList = document.getElementById('sx-limit-list');
  if (limitList) {
    limitList.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-cancel-limit]');
      if (!btn) return;
      cancelLimitOrder(Number(btn.dataset.cancelLimit));
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (!state.running) return;
    if (document.hidden) {
      clearInterval(state.tickInterval);
      state.tickInterval = null;
    } else {
      scheduleInterval();
    }
  });

  SimKit.theme.onChange(renderAll);
  selectTicker(state.selected);
})();
