/* Adapter boundary between Track Studio and built-in or future plugin hosts. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawPlugins = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 1));

  function localModuleUrl(url, base) {
    const resolved = new URL(url, base || (typeof location !== 'undefined' ? location.href : 'http://localhost/'));
    const origin = new URL(base || (typeof location !== 'undefined' ? location.href : 'http://localhost/')).origin;
    if (resolved.origin !== origin) throw new Error('Only locally hosted WAM modules are allowed.');
    return resolved.href;
  }

  async function loadWam(context, moduleUrl, initialState, options = {}) {
    const href = localModuleUrl(moduleUrl, options.baseUrl);
    const imported = await (options.importModule || (url => import(url)))(href);
    const Constructor = imported.default || imported.WebAudioModule || imported;
    if (!Constructor?.isWebAudioModuleConstructor || typeof Constructor.createInstance !== 'function') {
      throw new Error('Module does not expose a WAM 2 constructor.');
    }
    const wam = await Constructor.createInstance(options.groupId, context, initialState || {});
    if (!wam?.audioNode) throw new Error('WAM did not create an audio node.');
    return {
      wam, input: wam.audioNode, output: wam.audioNode,
      getState: () => wam.audioNode.getState?.(),
      setState: state => wam.audioNode.setState?.(state),
      dispose() { wam.destroy?.(); wam.audioNode.destroy?.(); wam.audioNode.disconnect?.(); },
    };
  }

  function createWetDry(context, source, instance, amount) {
    if (amount >= 1 || !context.createGain) return { output: instance.output, nodes: [] };
    const output = context.createGain(), dry = context.createGain(), wet = context.createGain();
    dry.gain.value = 1 - amount; wet.gain.value = amount;
    source.connect(dry); dry.connect(output); instance.output.connect(wet); wet.connect(output);
    return { output, nodes: [output, dry, wet] };
  }

  function createChain(context, input, inserts, registry, parameterReader) {
    const active = [], missing = [], failed = [];
    let tail = input;
    (inserts || []).forEach(insert => {
      const definition = registry?.[insert.type];
      if (insert.bypass) return;
      if (!definition) { missing.push(insert.type); return; }
      try {
        const params = parameterReader ? parameterReader(insert.type, insert.params) : insert.params || {};
        const instance = definition.create(context, params);
        const source = tail, amount = clamp01(insert.wet);
        source.connect(instance.input);
        const mixed = createWetDry(context, source, instance, amount);
        const dispose = instance.dispose;
        instance.dispose = () => { mixed.nodes.forEach(node => node.disconnect?.()); dispose?.call(instance); };
        tail = mixed.output; active.push(instance);
      } catch (error) {
        failed.push({ type: insert.type, message: error?.message || String(error) });
      }
    });
    return { output: tail, instances: active, missing, failed, dispose() { active.forEach(instance => instance.dispose?.()); } };
  }
  return { createChain, loadWam, localModuleUrl };
}));
