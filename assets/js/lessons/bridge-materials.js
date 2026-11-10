/* Solid miniature props, constructed in member-local coordinates so grain and
   fasteners follow every beam through edits, sagging, and collapse. */
window.BridgeMaterials = {
  member(member, a, b, style, stress) {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const road = member.type === 'road';
    const steel = member.type === 'steel';
    const half = road ? 3.5 : 3;
    const span = length.toFixed(2);
    const active = Boolean(stress && stress.ratio > 0.001);
    const color = active
      ? (style.className.includes('--active') ? style.stroke : (stress.mode === 'tension' ? '#4d9ac9' : '#ce7667'))
      : (steel ? '#9bb4b2' : '#bd9867');
    const face = steel ? 'bridgeIronFace' : (road ? 'bridgeDeckFace' : 'bridgeTimberFace');
    const texture = steel ? 'bridgeMetalGrain' : (road ? 'bridgeDeckGrain' : 'bridgeTimberGrain');
    return `<g data-member-id="${member.id}" class="bridge-prop-member" transform="translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${angle.toFixed(3)})">
      <line class="bridge-member-hit" x1="0" y1="0" x2="${span}" y2="0"/>
      <g class="bridge-material-solid" pointer-events="none" filter="url(#bridgeMaterialShadow)">
        <path d="M0 ${half}H${span}l1.5 2.5H1.5Z" fill="${steel ? '#344f51' : '#503e2c'}"/>
        <rect x="0" y="${-half}" width="${span}" height="${half * 2}" rx=".35" fill="url(#${face})" stroke="${steel ? '#435a58' : '#6d5438'}" stroke-width=".6"/>
        <rect x="0" y="${-half}" width="${span}" height="${half * 2}" fill="url(#${steel ? 'bridgeIronPhoto' : 'bridgeOakPhoto'})"/>
        <rect x="0" y="${-half}" width="${span}" height="${half * 2}" fill="url(#${texture})"/>
        ${steel ? `<path d="M0 -2H${span}M0 2H${span}" stroke="#405d5e" stroke-width=".7"/><path d="M0 -1.2H${span}" stroke="#bec8b8" stroke-width=".35"/>` : ''}
        <path d="M.5 ${-half + 0.4}H${(length - 0.5).toFixed(2)}" stroke="${steel ? '#d3d6c2' : '#e3c694'}" stroke-width=".65" opacity=".8"/>
        <path d="M.5 ${half - 0.25}H${(length - 0.5).toFixed(2)}" stroke="${steel ? '#334c4d' : '#654b30'}" stroke-width=".8"/>
        ${road ? `<path d="M0 -3H${span}" stroke="#e5d2a7" stroke-width="1"/><path d="M0 1H${span}" stroke="#453d32" stroke-opacity=".45" stroke-width=".6"/>` : ''}
      </g>
      <line class="bridge-material-force ${active ? 'is-loaded' : ''}" x1="0" y1="0" x2="${span}" y2="0" stroke="${color}" stroke-width="${road ? 1.8 : 2.2}"/>
      <line class="bridge-material-plan" x1="0" y1="0" x2="${span}" y2="0" stroke="${active ? color : (steel ? '#b0d3e4' : '#dcc79e')}" stroke-width="${style.width}"/>
    </g>`;
  },

  node(node) {
    const x = node.x.toFixed(2), y = node.y.toFixed(2);
    const plate = node.fixed ? `<g class="bridge-anchor-plate"><rect x="-5.5" y="-4.5" width="11" height="13" rx=".9" fill="url(#bridgeIronFace)" stroke="#43534b" stroke-width=".6"/><path d="M-4.5-3.5H4.5" stroke="#c4c3a6" stroke-width=".55"/><circle cx="-3.4" cy="6" r=".9" fill="#b4af8a"/><circle cx="3.4" cy="6" r=".9" fill="#b4af8a"/></g>` : '';
    return `<g data-node-id="${node.id}" class="bridge-node-visual" transform="translate(${x} ${y})">
      <circle r="13" fill="transparent"/>
      <g class="bridge-fastener" pointer-events="none" filter="url(#bridgeMaterialShadow)">
        ${plate}
        <circle r="3.6" fill="#4b5144" stroke="#c5b58d" stroke-width=".5"/>
        <circle r="2.9" fill="url(#bridgeFastenerFace)" stroke="#65664f" stroke-width=".4"/>
        <path d="M-1-1.8H1L2.1 0 1 1.8H-1L-2.1 0Z" fill="url(#bridgeFastenerFace)" stroke="#72745c" stroke-width=".45"/>
        <path d="M-1.1.7L1.1-.7" stroke="#515a49" stroke-width=".65"/>
      </g>
    </g>`;
  }
};
