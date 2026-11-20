/*
 * piv-rigs — the rig library engine for the Pivot stick-figure animator.
 *
 * A "rig" is a jointed thing described as plain data (data/pivot-rigs.json): a
 * tree of bones, each drawn either as a stroke (line / disc) or as a piece of
 * an SVG already on the site. This file turns that data into the figure type
 * the animator and piv-engine.js already understand, so every rig animates,
 * tweens, mirrors and exports like any other figure. No DOM in here: it runs in
 * Node for tests and in the browser for the library dialog.
 *
 * ── Rig spec ──────────────────────────────────────────────────────────────────
 *   id, name, category, tags[], blurb
 *   dock    "ground" | "center" | "top"   where a new figure lands on the stage
 *   origin  [x, y]                        the point that sits at the figure's x/y
 *   svg     { src, scale }                optional artwork source (+ rig units → px)
 *   credit  { text, license, source }     shown on the card
 *   parts[] in parent-first order, each:
 *     id, name?, parent (id | null)
 *     a [x,y]  the joint: where the bone pivots (rig units, y down)
 *     b [x,y]  the tip:   where children hang and the red handle sits
 *     shape    "line" (default) | "disc" (a and b are the diameter's ends)
 *     w        stroke width        color [r,g,b]       z   draw order (low = back)
 *     els[], clip [x,y,w,h]   artwork: draw these top-level elements of svg.src,
 *                             cropped to clip. The joint is the artwork's pivot.
 *   poses   { "Wave": { "armR": -140 } }   degrees added to a bone's rest angle
 *
 * Rig units are stage pixels unless `svg.scale` says otherwise (sprites are
 * drawn in a 128-unit box and scaled up to about 160 px).
 *
 * Positive angles turn clockwise on screen (y is down), as everywhere in Pivot.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PivRigs = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ID_RE = /^[a-z0-9][a-z0-9-]*$/;
  var SHAPES = { line: 1, disc: 1 };
  var DOCKS = { ground: 1, center: 1, top: 1, free: 1 };
  var MAX_PARTS = 80;
  var DEFAULT_COLOR = [38, 52, 71];

  function finite(n) {
    return typeof n === "number" && isFinite(n) && Math.abs(n) < 1e5;
  }
  function pt(p) {
    return Array.isArray(p) && p.length === 2 && finite(p[0]) && finite(p[1]);
  }
  function round(n, places) {
    var m = Math.pow(10, places == null ? 3 : places);
    return Math.round(n * m) / m;
  }

  /** Throws a readable Error for the first thing wrong with a rig spec. */
  function validateRig(spec) {
    function need(ok, msg) {
      if (!ok) throw new Error((spec && spec.id ? spec.id + ": " : "Rig: ") + msg);
    }
    need(spec && typeof spec === "object", "not an object");
    need(typeof spec.id === "string" && ID_RE.test(spec.id) && spec.id.length <= 48, "id must be lower-case letters, digits and dashes");
    need(typeof spec.name === "string" && spec.name.trim() && spec.name.length <= 60, "needs a name");
    need(typeof spec.category === "string" && ID_RE.test(spec.category), "needs a category");
    need(spec.dock === undefined || DOCKS[spec.dock], "dock must be ground, center, top or free");
    need(spec.origin === undefined || pt(spec.origin), "origin must be [x, y]");
    need(spec.tags === undefined || (Array.isArray(spec.tags) && spec.tags.every(function (t) { return typeof t === "string"; })), "tags must be strings");
    need(Array.isArray(spec.parts) && spec.parts.length > 0 && spec.parts.length <= MAX_PARTS, "needs 1–" + MAX_PARTS + " parts");
    var hasArt = spec.parts.some(function (p) { return p.els; });
    if (spec.svg !== undefined) {
      need(spec.svg && typeof spec.svg.src === "string" && /^assets\/[A-Za-z0-9_\/.-]+\.svg$/.test(spec.svg.src), "svg.src must be a site svg under assets/");
      need(spec.svg.scale === undefined || (finite(spec.svg.scale) && spec.svg.scale > 0 && spec.svg.scale <= 20), "svg.scale must be 0–20");
    }
    need(!hasArt || spec.svg, "parts with els need svg.src");
    var seen = {};
    spec.parts.forEach(function (p, i) {
      need(p && typeof p.id === "string" && ID_RE.test(p.id), "part " + i + " needs an id");
      need(!seen[p.id], "duplicate part id " + p.id);
      need(p.parent === null || p.parent === undefined || (typeof p.parent === "string" && seen[p.parent]), "part " + p.id + " must come after its parent");
      need(pt(p.a) && pt(p.b), "part " + p.id + " needs a and b as [x, y]");
      need(p.shape === undefined || SHAPES[p.shape], "part " + p.id + " has an unknown shape");
      need(p.w === undefined || (finite(p.w) && p.w >= 0 && p.w <= 400), "part " + p.id + " has a bad width");
      need(p.z === undefined || finite(p.z), "part " + p.id + " has a bad z");
      need(p.color === undefined || (Array.isArray(p.color) && p.color.length === 3 && p.color.every(function (c) { return finite(c) && c >= 0 && c <= 255; })), "part " + p.id + " has a bad color");
      if (p.els !== undefined) {
        need(Array.isArray(p.els) && p.els.length > 0 && p.els.every(function (n) { return Number.isInteger(n) && n >= 0; }), "part " + p.id + " els must be element numbers");
        need(Array.isArray(p.clip) && p.clip.length === 4 && p.clip.every(finite) && p.clip[2] > 0 && p.clip[3] > 0, "part " + p.id + " needs clip [x, y, w, h]");
        var k = (spec.svg && spec.svg.scale) || 1;
        need(p.clip[2] * k <= 1200 && p.clip[3] * k <= 1200, "part " + p.id + " artwork is over 1200 px");
      }
      seen[p.id] = 1;
    });
    if (spec.poses !== undefined) {
      need(spec.poses && typeof spec.poses === "object" && !Array.isArray(spec.poses), "poses must be an object");
      Object.keys(spec.poses).forEach(function (name) {
        need(name.length <= 40, "pose name too long");
        var pose = spec.poses[name];
        need(pose && typeof pose === "object", "pose " + name + " must be an object");
        Object.keys(pose).forEach(function (id) {
          need(seen[id], "pose " + name + " moves unknown part " + id);
          need(finite(pose[id]), "pose " + name + " has a bad angle for " + id);
        });
      });
    }
    return spec;
  }

  // ── SVG artwork ───────────────────────────────────────────────────────────────

  var NON_DRAWING = { title: 1, desc: 1, defs: 1, style: 1, metadata: 1 };

  /**
   * Split a site SVG into its top-level pieces without a DOM. `children` are the
   * drawable elements in paint order, numbered from 0 (title/desc/defs/style are
   * not counted); `defs` carries the gradients and styles the pieces rely on.
   */
  function splitSvg(text) {
    var open = /<svg\b[^>]*>/i.exec(text);
    var close = text.lastIndexOf("</svg>");
    if (!open || close < 0) throw new Error("Not an SVG file");
    var head = open[0];
    var vb = /viewBox\s*=\s*["']([^"']+)["']/i.exec(head);
    var box = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : null;
    if (!box || box.length !== 4 || !box.every(isFinite)) throw new Error("SVG needs a viewBox");
    var inner = text.slice(open.index + head.length, close);
    var tokens = /<!--[\s\S]*?-->|<\/?([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    var depth = 0, start = 0, topTag = "", defs = "", children = [], m;
    while ((m = tokens.exec(inner))) {
      if (m[0].slice(0, 4) === "<!--") continue;
      var closing = m[0].charAt(1) === "/";
      var selfClose = !closing && /\/\s*>$/.test(m[0]);
      if (!closing) {
        if (depth === 0) { start = m.index; topTag = m[1].toLowerCase(); }
        if (selfClose) { if (depth === 0) finish(m.index + m[0].length); }
        else depth++;
      } else {
        depth--;
        if (depth === 0) finish(m.index + m[0].length);
      }
    }
    function finish(end) {
      var markup = inner.slice(start, end);
      if (NON_DRAWING[topTag]) { if (topTag === "defs" || topTag === "style") defs += markup; }
      else children.push({ tag: topTag, markup: markup });
    }
    return { viewBox: box, defs: defs, children: children };
  }

  function num(n) { return String(round(n, 3)); }

  /** An SVG document holding only the chosen elements, cropped to `clip`. */
  function cropSvg(split, els, clip, pixelScale) {
    var s = pixelScale || 1;
    var body = els.slice().sort(function (a, b) { return a - b; }).map(function (n) {
      if (!split.children[n]) throw new Error("SVG has no element " + n);
      return split.children[n].markup;
    }).join("");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + clip.map(num).join(" ") +
      '" width="' + num(clip[2] * s) + '" height="' + num(clip[3] * s) + '">' + split.defs + body + "</svg>";
  }

  // ── Compile a rig into a figure type ──────────────────────────────────────────

  function toRad(d) { return d * Math.PI / 180; }

  /**
   * Turn a spec into { type, angles, poses, dock, name } for piv-engine.
   * `art` maps a part id to its rasterised PNG data URI (see `build`).
   */
  function compileRig(spec, art) {
    validateRig(spec);
    var k = (spec.svg && spec.svg.scale) || 1;
    var origin = spec.origin || [0, 0];
    var index = {}, ends = {};
    spec.parts.forEach(function (p, i) { index[p.id] = i; });
    var segments = spec.parts.map(function (p) {
      var dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1];
      var from = p.parent ? ends[p.parent] : origin;
      ends[p.id] = p.b;
      var seg = {
        name: p.name || p.id,
        length: round(Math.hypot(dx, dy) * k),
        restAngle: round(Math.atan2(dy, dx), 6),
        thickness: round((p.w == null ? 10 : p.w) * k, 2),
        parent: p.parent ? index[p.parent] + 1 : 0,
        isCircle: p.shape === "disc",
        isFilled: p.shape === "disc",
        color: (p.color || DEFAULT_COLOR).slice(),
        attachX: round((p.a[0] - from[0]) * k),
        attachY: round((p.a[1] - from[1]) * k)
      };
      if (p.els) {
        var src = art && art[p.id];
        if (!src) throw new Error(spec.id + ": no artwork for part " + p.id);
        seg.artwork = {
          src: src,
          width: round(p.clip[2] * k, 2), height: round(p.clip[3] * k, 2),
          pivotX: round((p.a[0] - p.clip[0]) * k, 2), pivotY: round((p.a[1] - p.clip[1]) * k, 2)
        };
      }
      return seg;
    });
    var order = spec.parts.map(function (p, i) { return { i: i, z: p.z == null ? i : p.z }; })
      .sort(function (x, y) { return x.z - y.z || x.i - y.i; })
      .map(function (o) { return o.i; });
    var type = { name: spec.name, builtIn: false, rigId: spec.id, order: order, segments: segments };
    var rest = segments.map(function (s) { return s.restAngle; });
    var poses = { Rest: rest.slice() };
    Object.keys(spec.poses || {}).forEach(function (name) {
      poses[name] = rest.map(function (angle, i) {
        var delta = spec.poses[name][spec.parts[i].id];
        return delta ? angle + toRad(delta) : angle;
      });
    });
    type.poses = poses; // the stage's Pose menu reads these (absolute angles, radians)
    return { id: spec.id, name: spec.name, dock: spec.dock || "ground", type: type, angles: rest, poses: poses };
  }

  /**
   * Fetch, crop and rasterise a rig's artwork, then compile it. The two I/O hooks
   * are injected so this stays DOM-free:
   *   io.fetchText(url) -> Promise<string>        io.rasterize(svg, w, h) -> Promise<dataUri>
   * Artwork is rasterised at `density` times its stage size so it stays sharp when
   * a figure is scaled up.
   */
  function build(spec, io, options) {
    validateRig(spec);
    var density = (options && options.density) || 3;
    var needsArt = spec.parts.some(function (p) { return p.els; });
    if (!needsArt) return Promise.resolve(compileRig(spec, {}));
    var k = (spec.svg && spec.svg.scale) || 1;
    return io.fetchText(spec.svg.src).then(function (text) {
      var split = splitSvg(text), art = {};
      return Promise.all(spec.parts.filter(function (p) { return p.els; }).map(function (p) {
        var s = density * k;
        var markup = cropSvg(split, p.els, p.clip, s);
        return io.rasterize(markup, Math.ceil(p.clip[2] * s), Math.ceil(p.clip[3] * s)).then(function (uri) { art[p.id] = uri; });
      })).then(function () { return compileRig(spec, art); });
    });
  }

  // ── Library helpers ───────────────────────────────────────────────────────────

  function wordsOf(text) { return String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }

  /** Every typed word must start a word in the rig's name, tags, blurb or category. */
  function matches(rig, query) {
    var q = wordsOf(query);
    if (!q.length) return true;
    var hay = wordsOf([rig.name, rig.category, (rig.tags || []).join(" "), rig.blurb].join(" "));
    return q.every(function (w) { return hay.some(function (h) { return h.indexOf(w) === 0; }); });
  }

  function byCategory(library, query) {
    return library.categories.map(function (c) {
      return { id: c.id, name: c.name, icon: c.icon, blurb: c.blurb, rigs: library.rigs.filter(function (r) { return r.category === c.id && matches(r, query); }) };
    }).filter(function (c) { return c.rigs.length; });
  }

  /** Check a whole library file: categories, unique ids, every rig valid. */
  function validateLibrary(library) {
    if (!library || !Array.isArray(library.categories) || !Array.isArray(library.rigs)) throw new Error("Rig library needs categories and rigs");
    var cats = {}, ids = {};
    library.categories.forEach(function (c) {
      if (!c || !ID_RE.test(c.id || "") || !c.name) throw new Error("Bad category " + JSON.stringify(c));
      cats[c.id] = 1;
    });
    library.rigs.forEach(function (r) {
      validateRig(r);
      if (!cats[r.category]) throw new Error(r.id + ": unknown category " + r.category);
      if (ids[r.id]) throw new Error("Duplicate rig id " + r.id);
      ids[r.id] = 1;
    });
    return library;
  }

  // ── Save a figure as a rig ────────────────────────────────────────────────────

  function slug(text) {
    var s = String(text || "rig").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return (s || "rig").slice(0, 36);
  }

  /**
   * Describe a stage figure as a rig, using its current pose as the rest pose.
   * Stroke figures only: cutout artwork stays in the drawing project file.
   * `doc` is a piv-engine document, `figureJoints` its function of the same name.
   */
  function rigFromFigure(doc, fig, name, figureJoints) {
    var type = doc.types[fig.type];
    if (!type) throw new Error("That figure has no bones");
    if (type.segments.some(function (s) { return s.artwork; })) throw new Error("Figures with artwork (drawing puppets and the site creatures) can only be kept in the drawing project. Use Save drawing project instead.");
    var j = figureJoints(doc, { type: fig.type, x: 0, y: 0, scale: 1, angles: fig.angles });
    var ids = type.segments.map(function (s, i) { return "b" + (i + 1); });
    var color = fig.color;
    var parts = type.segments.map(function (s, i) {
      var part = {
        id: ids[i], name: s.name || (type.builtIn ? undefined : "Bone " + (i + 1)),
        parent: s.parent > 0 ? ids[s.parent - 1] : null,
        a: [round(j.startX[i], 1), round(j.startY[i], 1)],
        b: [round(j.endX[i], 1), round(j.endY[i], 1)],
        w: round(s.thickness, 1),
        color: (color || s.color || DEFAULT_COLOR).slice()
      };
      if (!part.name) delete part.name;
      if (s.isCircle) part.shape = "disc";
      part.z = type.order.indexOf(i);
      return part;
    });
    var spec = { id: slug(name), name: String(name || "My rig").slice(0, 60), category: "mine", dock: "free", tags: ["mine"], blurb: "Saved from the stage.", parts: parts };
    return validateRig(spec);
  }

  return {
    validateRig: validateRig,
    validateLibrary: validateLibrary,
    splitSvg: splitSvg,
    cropSvg: cropSvg,
    compileRig: compileRig,
    build: build,
    matches: matches,
    byCategory: byCategory,
    rigFromFigure: rigFromFigure,
    slug: slug
  };
});
