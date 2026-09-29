// Monte Carlo Tree Search (UCT with RAVE) for small-board Go.
//
// This is the algorithm that broke open computer Go in 2006-07 (Coulom's Crazy
// Stone; Kocsis & Szepesvari's UCT; Gelly et al.'s MoGo), and the search half
// of AlphaGo. Each iteration has four steps:
//   1. Selection: walk down the tree, at each node picking the child with the
//      best score (win rate, blended with RAVE, plus an exploration bonus)
//   2. Expansion: a leaf visited a second time gets its children added
//   3. Simulation: play the game out with fast moves ("playout"); like MoGo,
//      it answers atari (capture or escape) and otherwise plays randomly,
//      never filling its own eyes
//   4. Backpropagation: record the win or loss in every node on the path
// When the budget runs out, it plays the most-visited move.
//
// Boards are 1-D arrays of size*size: 0 empty, 1 black, 2 white.
// Scoring is area scoring (stones + surrounded empty points) with komi for White.

export const PASS = -1;
const EMPTY = 0;
const other = (color) => 3 - color;

export function createGoRules(size, komi) {
  const area = size * size;
  const neighbors = [];
  const diagonals = [];
  for (let p = 0; p < area; p += 1) {
    const r = Math.floor(p / size);
    const c = p % size;
    const n = [];
    const d = [];
    if (r > 0) n.push(p - size);
    if (r < size - 1) n.push(p + size);
    if (c > 0) n.push(p - 1);
    if (c < size - 1) n.push(p + 1);
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < size && cc >= 0 && cc < size) d.push(rr * size + cc);
    }
    neighbors.push(n);
    diagonals.push(d);
  }

  // scratch buffers for flood fills
  const mark = new Int32Array(area);
  const libMark = new Int32Array(area);
  const stack = new Int32Array(area);
  let stamp = 0;
  let lastLiberty = -1; // a liberty found by the most recent liberties() call

  // count liberties of the group at p, stopping early once `limit` is reached
  function liberties(board, p, limit = area) {
    stamp += 1;
    const color = board[p];
    let top = 0;
    let libs = 0;
    stack[top++] = p;
    mark[p] = stamp;
    while (top) {
      const q = stack[--top];
      for (const n of neighbors[q]) {
        const v = board[n];
        if (v === EMPTY) {
          if (libMark[n] !== stamp) {
            libMark[n] = stamp;
            lastLiberty = n;
            libs += 1;
            if (libs >= limit) return libs;
          }
        } else if (v === color && mark[n] !== stamp) {
          mark[n] = stamp;
          stack[top++] = n;
        }
      }
    }
    return libs;
  }

  function removeGroup(board, p) {
    const color = board[p];
    let top = 0;
    let removed = 0;
    stack[top++] = p;
    board[p] = EMPTY;
    while (top) {
      const q = stack[--top];
      removed += 1;
      for (const n of neighbors[q]) {
        if (board[n] === color) {
          board[n] = EMPTY;
          stack[top++] = n;
        }
      }
    }
    return removed;
  }

  // state = { board: Int8Array, ko: point forbidden by simple ko or -1 }
  function isLegal(state, p, color) {
    const { board } = state;
    if (board[p] !== EMPTY || p === state.ko) return false;
    for (const n of neighbors[p]) {
      const v = board[n];
      if (v === EMPTY) return true;
      if (v === color) {
        if (liberties(board, n, 2) >= 2) return true;
      } else if (liberties(board, n, 2) === 1) {
        return true; // captures
      }
    }
    return false; // suicide
  }

  // a point whose neighbors are all our stones and that the opponent cannot
  // usefully contest; filling it would only destroy our own life
  function isOwnEye(board, p, color) {
    for (const n of neighbors[p]) if (board[n] !== color) return false;
    let enemy = 0;
    for (const d of diagonals[p]) if (board[d] === other(color)) enemy += 1;
    const onEdge = diagonals[p].length < 4;
    return onEdge ? enemy === 0 : enemy <= 1;
  }

  function play(state, p, color) {
    if (p === PASS) {
      state.ko = -1;
      return;
    }
    const { board } = state;
    board[p] = color;
    let captured = 0;
    let lastCaptured = -1;
    for (const n of neighbors[p]) {
      if (board[n] === other(color) && liberties(board, n, 1) === 0) {
        lastCaptured = n;
        captured += removeGroup(board, n);
      }
    }
    // simple ko: a lone stone that captured exactly one stone and is in atari
    state.ko =
      captured === 1 && neighbors[p].every((n) => board[n] !== color) && liberties(board, p, 2) === 1
        ? lastCaptured
        : -1;
  }

  function candidateMoves(state, color) {
    const moves = [];
    for (let p = 0; p < area; p += 1) {
      if (state.board[p] === EMPTY && !isOwnEye(state.board, p, color) && isLegal(state, p, color)) {
        moves.push(p);
      }
    }
    return moves;
  }

  // area score from Black's point of view (positive means Black is ahead)
  function score(board) {
    let total = -komi;
    for (let p = 0; p < area; p += 1) {
      const v = board[p];
      if (v === 1) total += 1;
      else if (v === 2) total -= 1;
      else {
        let owner = 0;
        for (const n of neighbors[p]) {
          const nv = board[n];
          if (nv === EMPTY) continue;
          if (owner === 0) owner = nv;
          else if (owner !== nv) {
            owner = -1;
            break;
          }
        }
        if (owner === 1) total += 1;
        else if (owner === 2) total -= 1;
      }
    }
    return total;
  }

  // MoGo-style playout heuristic: answer the opponent's last move by capturing
  // a group it left in atari, or by saving one of our groups it put in atari
  function urgentMove(state, color, lastMove) {
    if (lastMove < 0) return PASS;
    const { board } = state;
    if (board[lastMove] === other(color) && liberties(board, lastMove, 2) === 1) {
      const lib = lastLiberty;
      if (isLegal(state, lib, color)) return lib;
    }
    for (const n of neighbors[lastMove]) {
      if (board[n] === color && liberties(board, n, 2) === 1) {
        const lib = lastLiberty;
        if (isLegal(state, lib, color)) return lib;
      }
    }
    return PASS;
  }

  // play to the end of the game; returns the winning color.
  // `record(point, color)` is told about every stone placed (for RAVE).
  function playout(state, toPlay, passes, lastMove, random, record) {
    const empties = new Int32Array(area);
    const maxMoves = area * 3;
    let color = toPlay;
    for (let moveNo = 0; moveNo < maxMoves && passes < 2; moveNo += 1) {
      let chosen = urgentMove(state, color, lastMove);
      if (chosen === PASS) {
        let count = 0;
        for (let p = 0; p < area; p += 1) if (state.board[p] === EMPTY) empties[count++] = p;
        while (count) {
          const i = Math.floor(random() * count);
          const p = empties[i];
          if (!isOwnEye(state.board, p, color) && isLegal(state, p, color)) {
            chosen = p;
            break;
          }
          empties[i] = empties[--count];
        }
      }
      play(state, chosen, color);
      if (chosen !== PASS) record(chosen, color);
      passes = chosen === PASS ? passes + 1 : 0;
      lastMove = chosen;
      color = other(color);
    }
    return score(state.board) > 0 ? 1 : 2;
  }

  return { area, isLegal, isOwnEye, play, candidateMoves, score, playout };
}

// Build a search that can be advanced in slices so the page stays responsive.
//   rootMoves: the game's legal moves for `toPlay` (this respects the game's
//   full ko rule); passing is always allowed as well.
//
// Selection uses UCT with RAVE (Gelly & Silver 2007): a child's value blends its
// real win rate with its "all moves as first" win rate, which counts every
// simulation where that player played the same point later on. RAVE dominates
// while a move has few visits and fades out as real results accumulate.
export function createSearch({ rules, board, toPlay, rootMoves, lastMove = -1, random = Math.random }) {
  const RAVE_K = 1000; // visits at which real and RAVE results weigh equally-ish
  const EXPLORATION = 0.2;
  const area = rules.area;
  const rootBoard = Int8Array.from(board);

  function makeNode(move, color, parent) {
    return {
      move,
      color, // the player who made `move`
      parent,
      children: null,
      visits: 0,
      wins: 0,
      passes: move === PASS ? (parent ? parent.passes : 0) + 1 : 0,
      // AMAF statistics for the player to move at this node, indexed by point
      amafVisits: null,
      amafWins: null
    };
  }

  function expand(node, state, moves) {
    node.children = [...moves, PASS].map((m) => makeNode(m, other(node.color), node));
    node.amafVisits = new Float32Array(area);
    node.amafWins = new Float32Array(area);
  }

  const root = makeNode(lastMove, other(toPlay), null);
  root.passes = 0;
  expand(root, null, rootMoves.filter((p) => !rules.isOwnEye(rootBoard, p, toPlay)));
  let playouts = 0;

  function value(parent, child) {
    const n = child.visits;
    const q = n ? child.wins / n : 0.5;
    if (child.move === PASS) return n ? q : 0.1; // try passing only when little else is left
    const an = parent.amafVisits[child.move];
    const aq = an ? parent.amafWins[child.move] / an : 0.5;
    const beta = Math.sqrt(RAVE_K / (3 * n + RAVE_K));
    const explore = n ? EXPLORATION * Math.sqrt(Math.log(parent.visits + 1) / n) : 1;
    return (1 - beta) * q + beta * aq + explore;
  }

  function select(node) {
    let best = null;
    let bestValue = -Infinity;
    for (const child of node.children) {
      const v = value(node, child) + random() * 1e-6;
      if (v > bestValue) {
        bestValue = v;
        best = child;
      }
    }
    return best;
  }

  function iterate() {
    const state = { board: Int8Array.from(rootBoard), ko: -1 };
    const path = [root];
    const seqPoint = [];
    const seqColor = [];
    let node = root;

    // 1-2. selection and expansion (a node is expanded on its second visit)
    while (node.passes < 2) {
      if (!node.children) {
        if (node.visits === 0) break;
        expand(node, state, rules.candidateMoves(state, other(node.color)));
      }
      node = select(node);
      rules.play(state, node.move, node.color);
      if (node.move !== PASS) {
        seqPoint.push(node.move);
        seqColor.push(node.color);
      }
      path.push(node);
    }
    const treeMoves = seqPoint.length;

    // 3. simulation
    const winner =
      node.passes >= 2
        ? (rules.score(state.board) > 0 ? 1 : 2)
        : rules.playout(state, other(node.color), node.passes, node.move ?? -1, random, (p, c) => {
            seqPoint.push(p);
            seqColor.push(c);
          });
    playouts += 1;

    // 4. backpropagation, plus AMAF updates for every move played after each node
    let seqStart = treeMoves;
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const n = path[i];
      n.visits += 1;
      if (winner === n.color) n.wins += 1;
      if (n.amafVisits) {
        const mover = other(n.color);
        const won = winner === mover ? 1 : 0;
        const seen = new Uint8Array(area);
        for (let k = seqStart; k < seqPoint.length; k += 1) {
          const p = seqPoint[k];
          if (seqColor[k] !== mover || seen[p]) continue;
          seen[p] = 1;
          n.amafVisits[p] += 1;
          n.amafWins[p] += won;
        }
      }
      // moving up one level adds that level's move to "played afterwards"
      if (i > 0 && path[i].move !== PASS) seqStart -= 1;
    }
  }

  function ranked() {
    return root.children
      .filter((c) => c.visits)
      .map((c) => ({ move: c.move, visits: c.visits, winRate: c.wins / c.visits }))
      .sort((a, b) => b.visits - a.visits);
  }

  return {
    run(iterations) {
      for (let i = 0; i < iterations; i += 1) iterate();
    },
    get playouts() {
      return playouts;
    },
    ranked,
    best() {
      const [top] = ranked();
      return top ? top.move : PASS;
    }
  };
}
