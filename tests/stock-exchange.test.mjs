import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../assets/js/lessons/stock-exchange-core.js');

test('buildState initializes cash and all four companies', () => {
  const state = core.buildState();
  assert.equal(state.cash, 10000);
  assert.equal(Object.keys(state.companies).length, 4);
  for (const ticker of core.TICKERS) {
    assert.equal(state.companies[ticker].holdings, 0);
    assert.equal(state.companies[ticker].ohlcHistory.length, 18);
  }
});

test('applyTrade updates cash and weighted average cost and validates balances', () => {
  const state = core.buildState();
  const buy1 = core.applyTrade(state, 'buy', 'TSPK', 4, 100);
  assert.equal(buy1.ok, true);
  assert.equal(state.cash, 9600);
  assert.equal(state.companies.TSPK.holdings, 4);
  assert.equal(state.companies.TSPK.avgCost, 100);

  const buy2 = core.applyTrade(state, 'buy', 'TSPK', 4, 200);
  assert.equal(buy2.ok, true);
  assert.equal(state.cash, 8800);
  assert.equal(state.companies.TSPK.holdings, 8);
  assert.equal(state.companies.TSPK.avgCost, 150);

  const tooCostly = core.applyTrade(state, 'buy', 'TSPK', 100, 200);
  assert.equal(tooCostly.ok, false);
  assert.equal(state.cash, 8800);

  const oversell = core.applyTrade(state, 'sell', 'TSPK', 10, 200);
  assert.equal(oversell.ok, false);

  const sellAll = core.applyTrade(state, 'sell', 'TSPK', 8, 200);
  assert.equal(sellAll.ok, true);
  assert.equal(state.cash, 10400);
  assert.equal(state.companies.TSPK.holdings, 0);
  assert.equal(state.companies.TSPK.avgCost, 0);
});

test('limit orders queue, trigger at target prices, cancel, and compute portfolio totals', () => {
  const state = core.buildState();
  state.companies.GRLE.price = 60;

  const qBuy = core.queueLimitOrder(state, { ticker: 'GRLE', type: 'buy', price: 55, shares: 10 });
  assert.equal(qBuy.ok, true);
  const qCancel = core.queueLimitOrder(state, { ticker: 'GRLE', type: 'buy', price: 50, shares: 5 });
  assert.equal(core.cancelLimitOrderById(state, qCancel.order.id), true);

  // Price stays above 55 -> nothing triggers
  let evalRes = core.evaluateLimitOrders(state);
  assert.equal(evalRes.executed.length, 0);
  assert.equal(state.limitOrders.length, 1);

  // Price drops to 54 -> buy limit executes
  state.companies.GRLE.price = 54;
  evalRes = core.evaluateLimitOrders(state);
  assert.equal(evalRes.executed.length, 1);
  assert.equal(state.companies.GRLE.holdings, 10);
  assert.equal(state.cash, 10000 - 540);

  // Queue sell limit and trigger on rally
  const qSell = core.queueLimitOrder(state, { ticker: 'GRLE', type: 'sell', price: 70, shares: 10 });
  assert.equal(qSell.ok, true);
  state.companies.GRLE.price = 75;
  const beforeTotals = core.computePortfolioTotals(state);
  assert.equal(beforeTotals.holdingsValue, 750);
  assert.equal(beforeTotals.totalValue, 10000 - 540 + 750);

  evalRes = core.evaluateLimitOrders(state);
  assert.equal(evalRes.executed.length, 1);
  assert.equal(state.companies.GRLE.holdings, 0);
  assert.equal(core.computePortfolioTotals(state).totalValue, 10210);
});
