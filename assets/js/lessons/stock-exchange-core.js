(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.StockExchangeCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COMPANY_DEFS = {
    TSPK: { name: 'TechSpark',        sector: 'Consumer Tech',        sectorKey: 'tech',   tagline: 'Smartphones, laptops &amp; smart devices', start: 142.50, vol: 0.007, color: '#7c3aed' },
    GRLE: { name: 'GreenLeaf Energy', sector: 'Clean Energy',         sectorKey: 'energy', tagline: 'Electric vehicles &amp; solar panels',     start: 67.80,  vol: 0.011, color: '#10b981' },
    MGMT: { name: 'MegaMart',         sector: 'Retail &amp; Logistics', sectorKey: 'retail', tagline: 'Online store &amp; next-day delivery',   start: 221.40, vol: 0.005, color: '#f59e0b' },
    BCHE: { name: 'BioCore Health',   sector: 'Pharmaceuticals',      sectorKey: 'pharma', tagline: 'Medicines, vaccines &amp; clinical trials', start: 54.30, vol: 0.014, color: '#0ea5e9' }
  };

  const NEWS_POOL = [
    /* TechSpark positive */
    { h: 'TechSpark unveils its thinnest smartphone yet — pre-orders shatter records', t: 'TSPK', i: 0.07, w: 'Strong product launches attract buyers, boosting expected revenue.' },
    { h: 'TechSpark reports 28% revenue growth in quarterly earnings call', t: 'TSPK', i: 0.09, w: 'Higher earnings mean the company is worth more to investors.' },
    { h: 'TechSpark wins landmark AI patent — analysts raise price targets', t: 'TSPK', i: 0.05, w: 'Patents protect future revenue streams, making the stock more valuable.' },
    { h: 'TechSpark announces $30B share buyback program — investors cheer', t: 'TSPK', i: 0.06, w: 'Buybacks reduce the number of shares, making each one worth more.' },
    /* TechSpark negative */
    { h: 'TechSpark supply chain disrupted — holiday deliveries at risk', t: 'TSPK', i: -0.06, w: 'Supply problems mean fewer products sold and lower revenue.' },
    { h: 'Regulators open antitrust investigation into TechSpark', t: 'TSPK', i: -0.08, w: "Legal risk makes investors uncertain about the company's future." },
    { h: 'TechSpark flagship device earns poor safety review — recall possible', t: 'TSPK', i: -0.05, w: 'Recalls are expensive and damage consumer trust.' },
    { h: 'Key TechSpark engineer departs to rival company', t: 'TSPK', i: -0.04, w: 'Losing top talent can slow product development and innovation.' },
    /* GreenLeaf positive */
    { h: 'GreenLeaf Energy wins $12B government clean energy contract', t: 'GRLE', i: 0.11, w: 'Government contracts guarantee revenue for years ahead.' },
    { h: 'GreenLeaf battery achieves 40% efficiency breakthrough in lab', t: 'GRLE', i: 0.08, w: 'Better technology creates a competitive edge and future sales.' },
    { h: 'New federal clean energy bill passes — GreenLeaf expansion fast-tracked', t: 'GRLE', i: 0.10, w: 'Favorable laws create business opportunities and reduce costs.' },
    { h: 'GreenLeaf EV deliveries beat expectations by 18% this quarter', t: 'GRLE', i: 0.07, w: 'Beating delivery targets signals strong demand and execution.' },
    /* GreenLeaf negative */
    { h: 'GreenLeaf recalls 50,000 home batteries after fire risk discovered', t: 'GRLE', i: -0.12, w: 'Recalls are expensive and damage brand trust, scaring away customers.' },
    { h: 'Falling oil prices reduce demand for GreenLeaf electric vehicles', t: 'GRLE', i: -0.07, w: 'Cheap oil makes gas cars more competitive, hurting EV sales.' },
    { h: 'GreenLeaf delays new factory opening by 18 months — costs triple', t: 'GRLE', i: -0.09, w: 'Delays cost money and signal operational problems to investors.' },
    { h: 'Rival launches competing EV at significantly lower price point', t: 'GRLE', i: -0.06, w: "New competition threatens GreenLeaf's market share." },
    /* MegaMart positive */
    { h: 'MegaMart same-day delivery expands to 400 new cities', t: 'MGMT', i: 0.06, w: 'More delivery coverage means more potential customers and revenue.' },
    { h: 'MegaMart reports record holiday sales — up 31% year over year', t: 'MGMT', i: 0.08, w: 'Record sales mean higher profits for the company.' },
    { h: 'MegaMart acquires popular grocery chain, doubling food market share', t: 'MGMT', i: 0.07, w: 'Acquisitions expand the business into profitable new markets.' },
    { h: 'MegaMart cloud division revenue surges 47% — analysts upgrade stock', t: 'MGMT', i: 0.09, w: "A fast-growing division increases the company's overall value." },
    /* MegaMart negative */
    { h: 'MegaMart faces antitrust investigation for market dominance', t: 'MGMT', i: -0.06, w: 'Antitrust risk could force the company to change its business model.' },
    { h: 'Major MegaMart data breach exposes 40 million customer records', t: 'MGMT', i: -0.09, w: 'Data breaches cost billions in fines and lose customer trust.' },
    { h: 'MegaMart workers launch nationwide strike over wages', t: 'MGMT', i: -0.05, w: 'Strikes disrupt operations and increase costs for the company.' },
    { h: 'MegaMart warehouse automation project scrapped after $2B write-off', t: 'MGMT', i: -0.06, w: 'Writing off failed investments destroys shareholder value.' },
    /* BioCore positive */
    { h: "BioCore's cancer drug gets fast-track FDA approval — a landmark moment", t: 'BCHE', i: 0.18, w: 'FDA approval allows BioCore to sell the drug, creating massive new revenue.' },
    { h: "BioCore announces breakthrough Alzheimer's treatment in Phase 3 trials", t: 'BCHE', i: 0.13, w: 'Promising trial results signal a future approved drug worth billions.' },
    { h: 'BioCore wins government contract to supply the national flu vaccine', t: 'BCHE', i: 0.09, w: 'Government contracts guarantee large, reliable revenue.' },
    { h: "BioCore's rare disease drug earns orphan drug status and tax incentives", t: 'BCHE', i: 0.07, w: 'Tax breaks and market exclusivity improve future profitability.' },
    /* BioCore negative */
    { h: "BioCore's best-selling drug linked to serious side effects in new study", t: 'BCHE', i: -0.14, w: 'Safety issues can pull a drug from the market, eliminating its revenue.' },
    { h: 'BioCore faces $8B lawsuit over clinical trial misconduct', t: 'BCHE', i: -0.11, w: 'Major lawsuits can cost more than years of company profits.' },
    { h: "BioCore's new drug fails Phase 3 trials — years of research wasted", t: 'BCHE', i: -0.16, w: 'Failed trials mean billions spent on R&D produce no revenue.' },
    { h: 'BioCore loses patent protection on top drug — generics flood market', t: 'BCHE', i: -0.10, w: "Without patent protection, cheap copies reduce the drug's price and BioCore's profit." },
    /* Market-wide */
    { h: 'Federal Reserve raises interest rates — borrowing costs rise for all companies', t: null, i: -0.03, w: 'Higher rates make borrowing expensive, reducing business investment across all sectors.' },
    { h: 'Inflation cools to a two-year low — markets rally broadly', t: null, i: 0.04, w: 'Low inflation means stable prices and confident consumers — good for all businesses.' },
    { h: 'Major trade deal signed with key overseas partners — businesses gain market access', t: null, i: 0.05, w: 'New trade deals open doors to customers in other countries.' },
    { h: 'Recession fears grow as jobs data disappoints — broad market sell-off', t: null, i: -0.05, w: 'A potential recession means consumers spend less, hurting revenues across all sectors.' },
    { h: 'Strong consumer confidence report signals a spending surge ahead', t: null, i: 0.04, w: 'Confident consumers buy more — great for businesses in every sector.' },
    { h: 'Geopolitical tensions escalate — investors flee to safer assets', t: null, i: -0.04, w: 'Uncertainty causes investors to sell stocks and move into cash or bonds.' }
  ];

  const TICKERS = ['TSPK', 'GRLE', 'MGMT', 'BCHE'];
  const HOURS = ['9:00am', '10:00am', '11:00am', '12:00pm', '1:00pm', '2:00pm', '3:00pm', '4:00pm'];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const START_CASH = 10000;
  const MAX_CANDLES = 40;
  const sectorSentimentDefaults = { tech: 1, energy: 1, retail: 1, pharma: 1 };

  function makeSeedSeries(def) {
    const ohlcHistory = [];
    const sparkHistory = [];
    let price = def.start;
    for (let i = 0; i < 18; i++) {
      const open = price;
      const close = Math.max(1, open + (Math.random() - 0.5) * open * def.vol * 1.2 + (def.start - open) * 0.02);
      const wickSwing = open * def.vol * (0.5 + Math.random() * 1.1);
      const high = Math.max(open, close) + wickSwing * Math.random();
      const low = Math.max(1, Math.min(open, close) - wickSwing * Math.random());
      const candle = { o: open, h: high, l: low, c: close };
      ohlcHistory.push(candle);
      sparkHistory.push(close);
      price = close;
    }
    return { price: price, ohlcHistory: ohlcHistory, sparkHistory: sparkHistory, currentCandle: { o: price, h: price, l: price, c: price } };
  }

  function buildState() {
    const companies = {};
    TICKERS.forEach(function (t) {
      const d = COMPANY_DEFS[t];
      const seeded = makeSeedSeries(d);
      companies[t] = Object.assign({}, d, {
        price: seeded.price,
        ohlcHistory: seeded.ohlcHistory,
        currentCandle: seeded.currentCandle,
        sparkHistory: seeded.sparkHistory,
        holdings: 0,
        avgCost: 0
      });
    });
    return {
      companies: companies,
      cash: START_CASH,
      day: 0,
      hour: 0,
      running: false,
      speed: 1,
      selected: 'TSPK',
      tickInterval: null,
      nextNewsIn: 3 + Math.floor(Math.random() * 3),
      tickCount: 0,
      limitOrders: [],
      orderSeq: 1,
      sectorSentiment: Object.assign({}, sectorSentimentDefaults)
    };
  }

  function applyTrade(state, action, ticker, shares, priceOverride) {
    const c = state && state.companies && state.companies[ticker];
    if (!c) return { ok: false, message: 'Unknown ticker.' };
    const count = parseInt(shares, 10) || 0;
    if (count <= 0) return { ok: false, message: 'Enter a valid number of shares.' };
    const executionPrice = priceOverride == null ? c.price : priceOverride;
    const cost = count * executionPrice;

    if (action === 'buy') {
      if (cost > state.cash) {
        return { ok: false, message: 'Not enough cash. Try fewer shares.' };
      }
      const prev = c.holdings * c.avgCost;
      c.holdings += count;
      c.avgCost = (prev + cost) / c.holdings;
      state.cash -= cost;
      return {
        ok: true,
        ticker: ticker,
        action: 'buy',
        shares: count,
        executionPrice: executionPrice,
        message: 'Bought ' + count + ' share' + (count > 1 ? 's' : '') + ' of ' + ticker + ' at $' + executionPrice.toFixed(2) + '.'
      };
    }

    if (count > c.holdings) {
      return {
        ok: false,
        message: 'You only own ' + c.holdings + ' share' + (c.holdings !== 1 ? 's' : '') + '. Sell less.'
      };
    }
    c.holdings -= count;
    if (c.holdings === 0) c.avgCost = 0;
    state.cash += cost;
    return {
      ok: true,
      ticker: ticker,
      action: 'sell',
      shares: count,
      executionPrice: executionPrice,
      message: 'Sold ' + count + ' share' + (count > 1 ? 's' : '') + ' of ' + ticker + ' at $' + executionPrice.toFixed(2) + '.'
    };
  }

  function queueLimitOrder(state, spec) {
    const ticker = spec && spec.ticker ? spec.ticker : state.selected;
    const type = spec && spec.type;
    const price = Number(spec && spec.price);
    const shares = parseInt(spec && spec.shares, 10) || 0;
    const company = state && state.companies && state.companies[ticker];
    if (!company || (type !== 'buy' && type !== 'sell')) {
      return { ok: false, message: 'Unknown order target.' };
    }
    if (!(price > 0) || shares <= 0) {
      return { ok: false, message: 'Enter a valid price and share count.' };
    }
    if (type === 'buy' && price * shares > state.cash) {
      return { ok: false, message: 'This buy limit would cost more cash than you have.' };
    }
    if (type === 'sell' && shares > company.holdings) {
      return {
        ok: false,
        message: 'You only own ' + company.holdings + ' share' + (company.holdings === 1 ? '' : 's') + ' of ' + ticker + '.'
      };
    }

    const order = {
      id: state.orderSeq++,
      ticker: ticker,
      type: type,
      price: price,
      shares: shares
    };
    state.limitOrders.push(order);
    return {
      ok: true,
      order: order,
      message: 'Queued ' + type.toUpperCase() + ' ' + shares + ' ' + ticker + ' @ $' + price.toFixed(2) + '.'
    };
  }

  function cancelLimitOrderById(state, id) {
    const before = state.limitOrders.length;
    state.limitOrders = state.limitOrders.filter(function (order) { return order.id !== id; });
    return state.limitOrders.length !== before;
  }

  function evaluateLimitOrders(state) {
    const executed = [];
    const expired = [];
    state.limitOrders = state.limitOrders.filter(function (order) {
      const currentPrice = state.companies[order.ticker].price;
      const triggered = order.type === 'buy' ? currentPrice <= order.price : currentPrice >= order.price;
      if (!triggered) return true;
      if (order.type === 'buy' && order.shares * currentPrice > state.cash) {
        expired.push({ order: order, reason: 'Buy limit for ' + order.ticker + ' expired: cash is now too low.' });
        return false;
      }
      if (order.type === 'sell' && order.shares > state.companies[order.ticker].holdings) {
        expired.push({ order: order, reason: 'Sell limit for ' + order.ticker + ' expired: shares are no longer available.' });
        return false;
      }
      const trade = applyTrade(state, order.type, order.ticker, order.shares, currentPrice);
      executed.push({ order: order, executionPrice: currentPrice, trade: trade });
      return false;
    });
    return { executed: executed, expired: expired };
  }

  function computePortfolioTotals(state) {
    let holdingsValue = 0;
    const holdings = [];
    TICKERS.forEach(function (t) {
      const c = state.companies[t];
      if (!c) return;
      if (c.holdings > 0) {
        const value = c.holdings * c.price;
        holdingsValue += value;
        holdings.push({
          ticker: t,
          shares: c.holdings,
          price: c.price,
          avgCost: c.avgCost,
          value: value,
          pnl: (c.price - c.avgCost) * c.holdings
        });
      }
    });
    const totalValue = state.cash + holdingsValue;
    const totalPnl = totalValue - START_CASH;
    const totalPnlPct = (totalPnl / START_CASH) * 100;
    return {
      holdingsValue: holdingsValue,
      totalValue: totalValue,
      totalPnl: totalPnl,
      totalPnlPct: totalPnlPct,
      holdings: holdings
    };
  }

  return {
    COMPANY_DEFS: COMPANY_DEFS,
    NEWS_POOL: NEWS_POOL,
    TICKERS: TICKERS,
    HOURS: HOURS,
    DAYS: DAYS,
    START_CASH: START_CASH,
    MAX_CANDLES: MAX_CANDLES,
    sectorSentimentDefaults: sectorSentimentDefaults,
    makeSeedSeries: makeSeedSeries,
    buildState: buildState,
    applyTrade: applyTrade,
    queueLimitOrder: queueLimitOrder,
    cancelLimitOrderById: cancelLimitOrderById,
    evaluateLimitOrders: evaluateLimitOrders,
    computePortfolioTotals: computePortfolioTotals
  };
});
