/* Port validation and acyclic audio routing, shared by live and offline mixers. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicPatchRouting = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  function ports(tracks, types) {
    const outputs = new Set(['mixout','return0','return1', ...types.map(t => 'fx:'+t)]);
    const inputs = new Set(['main','aux0','aux1','monitor', ...types.map(t => 'fx:'+t)]);
    tracks.forEach(t => {
      outputs.add(t.id); outputs.add(t.id+'@send');
      inputs.add(t.id+'@input'); inputs.add(t.id+'@return');
      (t.effects || []).forEach((fx,i) => { if (!fx.bypass && types.includes(fx.type)) { inputs.add(t.id+'@fx'+i+'-in'); outputs.add(t.id+'@fx'+i+'-out'); } });
    });
    return {outputs, inputs};
  }
  function validate(connections, tracks, types) {
    const {outputs, inputs} = ports(tracks, types);
    if (connections.some(e => !outputs.has(e.from) || !inputs.has(e.to))) return 'That socket is unavailable. Remove stale patches or restore the project.';
    const counts = new Map();
    for (const e of connections) {
      counts.set(e.to,(counts.get(e.to)||0)+1);
      if (counts.get(e.to)>1 && !['main','aux0','aux1'].includes(e.to) && !e.to.endsWith('@input')) return 'That input accepts one cable. Use a summing bus to combine signals.';
    }
    const edges = connections.map(e => [e.from,e.to]);
    tracks.forEach(t => {
      edges.push([t.id+'@input',t.id+'@send']);
      let tail = t.id+'@return';
      (t.effects || []).forEach((fx,i) => {
        if (fx.bypass || !types.includes(fx.type)) return;
        const input = t.id+'@fx'+i+'-in', output = t.id+'@fx'+i+'-out';
        if (!connections.some(e => e.to === input)) edges.push([tail,input]);
        edges.push([input,output]); tail = output;
      });
      edges.push([tail,t.id]);
      if (!connections.some(e => e.to === t.id+'@return')) edges.push([t.id+'@send',t.id+'@return']);
      if (t.patchMain !== false) edges.push([t.id,'main']);
      [0,1].forEach(i => { if (t.sends?.[i] > 0) edges.push([t.id,'aux'+i]); });
    });
    [0,1].forEach(i => {
      edges.push(['aux'+i,'return'+i]);
      if (!connections.some(e => e.from === 'return'+i)) edges.push(['return'+i,'main']);
    });
    edges.push(['main','mixout']);
    if (!connections.some(e => e.to === 'monitor')) edges.push(['mixout','monitor']);
    const graph = new Map();
    edges.forEach(([a,b]) => { if (!graph.has(a)) graph.set(a,[]); graph.get(a).push(b); });
    const active = new Set(), done = new Set();
    function visit(node) {
      if (active.has(node)) return true;
      if (done.has(node)) return false;
      active.add(node);
      if ((graph.get(node)||[]).some(visit)) return true;
      active.delete(node); done.add(node); return false;
    }
    return [...graph.keys()].some(visit) ? 'Feedback loop blocked. Route forwards through the studio; a processor cannot feed itself.' : '';
  }
  function create(context, {master, monitor, monitorNormal, returns, strip, registry, parameters, report = () => {}}) {
    let signature = '', links = [], effects = new Map();
    function clear() {
      links.forEach(([a,b]) => { try { a.disconnect(b); } catch (_) {} }); links = [];
      effects.forEach(fx => fx.dispose?.()); effects.clear();
    }
    function sync(project) {
      const connections = project.patchConnections || [], types = Object.keys(registry);
      const error = validate(connections,project.tracks,types);
      const routes = error ? [] : connections;
      const next = JSON.stringify([routes,project.patchParameters || {}, project.tracks.map(t => [t.id,t.effects])]);
      monitorNormal.gain.setTargetAtTime(routes.some(e => e.to === 'monitor') ? 0 : 1,context.currentTime,.015);
      returns.forEach((r,i) => r.normal.gain.setTargetAtTime(routes.some(e => e.from === 'return'+i) ? 0 : 1,context.currentTime,.015));
      project.tracks.forEach(t => {
        const s = strip(t);
        s.insertNormal.gain.setTargetAtTime(routes.some(e => e.to === t.id+'@return') ? 0 : 1,context.currentTime,.015);
        (s.effectPorts || []).forEach(p => p.normal.gain.setTargetAtTime(routes.some(e => e.to === t.id+'@fx'+p.index+'-in') ? 0 : 1,context.currentTime,.015));
      });
      if (signature === next) return;
      clear(); signature = next;
      if (error) report(error);
      const used = new Set(routes.flatMap(e => [e.from,e.to]).filter(id => id.startsWith('fx:')));
      used.forEach(id => {
        const type = id.slice(3);
        try { effects.set(id,registry[type].create(context,parameters(type,project.patchParameters?.[type]))); }
        catch (e) { report(`${registry[type].name}: ${e.message}`); }
      });
      function node(id, output) {
        if (id.startsWith('fx:')) return effects.get(id)?.[output ? 'output' : 'input'];
        if (id === 'main' || id === 'mixout') return master;
        if (id === 'monitor') return monitor;
        if (/^aux[01]$/.test(id)) return returns[Number(id.at(-1))].input;
        if (/^return[01]$/.test(id)) return returns[Number(id.at(-1))].out;
        const track = project.tracks.find(t => id === t.id || id.startsWith(t.id+'@'));
        if (!track) return null;
        const s = strip(track);
        const insert = /@fx(\d+)-(in|out)$/.exec(id);
        if (insert) return s.effectPorts?.find(p => p.index === Number(insert[1]))?.[insert[2] === 'in' ? 'input' : 'output'];
        if (id.endsWith('@send')) return s.eq.output;
        if (id.endsWith('@return')) return s.inserts;
        if (id.endsWith('@input')) return s.input;
        return s.pan;
      }
      routes.forEach(e => { const a = node(e.from,true), b = node(e.to,false); if (a && b) { a.connect(b); links.push([a,b]); } });
    }
    return {sync, dispose:clear};
  }
  return {ports,validate,create};
});
