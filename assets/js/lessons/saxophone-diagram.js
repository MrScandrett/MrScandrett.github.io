/* Original vector illustration studied from Yamaha's YAS-280 product photograph.
 * Front three-quarter view. Hidden touches use separate, explicitly labeled insets.
 * This is a teaching illustration, not a dimensioned engineering drawing.
 */
(() => {
  'use strict';
  let serial=0;
  const main={L1:[500,698,24],L2:[508,750,24],bis:[517,798,16],L3:[518,848,23],R1:[450,1450,23],R2:[464,1555,24],R3:[435,1644,23]};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  window.SaxDiagram = function(keys,label){
    const id='sax'+(++serial), metal=`url(#${id}gold)`, shade=`url(#${id}shade)`, pearl=`url(#${id}pearl)`;
    const touch=(key,x,y,r,ellipse=false)=>`<g data-touch="${key}"><title>${escape(key)}: ${keys.includes(key)?'press':'release'}</title>${ellipse?`<ellipse cx="${x}" cy="${y}" rx="${r*1.35}" ry="${r}"`:`<circle cx="${x}" cy="${y}" r="${r}"`} fill="${keys.includes(key)?'#151c24':'#fff'}" stroke="#151c24" stroke-width="${r>20?5:2.5}"/></g>`;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 850" role="img" aria-label="${escape(label)}"><defs><linearGradient id="${id}gold"><stop stop-color="#89601c"/><stop offset=".22" stop-color="#e1b65b"/><stop offset=".43" stop-color="#fff1ba"/><stop offset=".62" stop-color="#d2a54a"/><stop offset=".85" stop-color="#9e7021"/><stop offset="1" stop-color="#f1d484"/></linearGradient><linearGradient id="${id}shade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#392818"/><stop offset=".5" stop-color="#8b551a"/><stop offset="1" stop-color="#d4a139"/></linearGradient><radialGradient id="${id}pearl"><stop stop-color="#fff"/><stop offset=".8" stop-color="#e9e7dc"/><stop offset="1" stop-color="#c4c0b1"/></radialGradient></defs><rect width="560" height="850" rx="12" fill="#fff"/>
    <g transform="translate(8 20) scale(.38)" stroke="#775725" stroke-width="5" stroke-linejoin="round">
    <!-- Tapered body, return bow, and flaring bell. -->
    <path d="M422 309 L499 309 L504 1743 Q520 1855 579 1851 Q626 1850 650 1748 L657 1240 L848 1260 L746 1788 Q739 2010 592 2042 Q388 2091 353 1780 Z" fill="${metal}"/>
    <path d="M391 1770 Q400 1975 555 1987 Q674 1994 705 1781" fill="none" stroke="#eed397" stroke-width="24"/>
    <path d="M516 1774 Q527 1915 578 1931 Q633 1947 666 1802" fill="none" stroke="#8d631f" stroke-width="8"/>
    <path d="M657 1768 L649 1342 Q639 1190 587 1109 Q562 1062 601 1049 Q736 1047 871 1150 Q929 1196 915 1236 Q898 1271 847 1264 L747 1778 Z" fill="${metal}"/>
    <ellipse cx="753" cy="1166" rx="190" ry="79" transform="rotate(29 753 1166)" fill="${metal}"/>
    <ellipse cx="753" cy="1166" rx="163" ry="57" transform="rotate(29 753 1166)" fill="${shade}"/>
    <path d="M619 1101 Q741 1111 869 1217" fill="none" stroke="#fff0b7" stroke-width="8"/>
    <path d="M650 1752 Q689 1769 747 1759 M651 1770 Q690 1788 744 1777 M355 1745 Q423 1767 505 1754 M356 1763 Q426 1785 508 1770" fill="none" stroke-width="7"/>
    <!-- Curved neck, cork, mouthpiece, ligature and octave linkage. -->
    <path d="M428 313 Q431 206 381 171 Q356 146 208 104 L215 67 Q383 106 438 157 Q504 213 499 313 Z" fill="${metal}"/>
    <path d="M216 87 Q359 129 408 164 Q469 206 462 302" fill="none" stroke="#fff1b6" stroke-width="8"/>
    <path d="M199 62 L225 72 L214 110 L188 98 Z" fill="#a77952"/>
    <path d="M7 18 Q85 11 142 15 L203 63 L191 105 L126 90 Z" fill="#202326" stroke="#111820"/>
    <path d="M84 14 L71 61 L93 73 L110 20 M134 24 L117 82 L138 89 L155 36" fill="none" stroke="#dbb56a" stroke-width="12"/>
    <path d="M116 85 L110 105 M86 73 L80 94" stroke-width="9"/>
    <path d="M300 78 L379 95 Q500 133 513 250 Q516 290 496 319 M387 320 Q461 282 479 216" fill="none" stroke="#c6a254" stroke-width="12"/>
    <ellipse cx="308" cy="77" rx="15" ry="7" fill="${metal}"/><path d="M308 83 V99 M375 95 V122" stroke-width="10"/>
    <path d="M420 299 H502 M418 316 H502" stroke-width="8"/>
    <path d="M495 327 H522" stroke-width="13"/><circle cx="522" cy="327" r="10" fill="${metal}"/>
    <!-- Long hinge rods and posts, visible alongside the pad cups. -->
    ${[350,369,390,412,533].map((x,i)=>`<path d="M${x} ${i===4?1025:420} L${x-13} 1808" fill="none" stroke="#795b2e" stroke-width="12"/><path d="M${x-2} ${i===4?1025:420} L${x-15} 1808" fill="none" stroke="#f7de9a" stroke-width="5"/>`).join('')}
    ${[420,503,584,695,811,899,1050,1188,1260,1402,1557,1650,1780].map(y=>`<path d="M347 ${y} H416" stroke-width="10"/><circle cx="354" cy="${y}" r="10" fill="${metal}"/><circle cx="393" cy="${y}" r="9" fill="${metal}"/>`).join('')}
    <!-- Individual tone-hole cups remain brass: pressed indicators mark touches only. -->
    ${[[482,414,28],[456,507,29],[492,653,29],[485,826,37],[489,948,37],[489,1049,40],[481,1169,43],[464,1295,47],[463,1394,48],[455,1520,51],[441,1660,54],[451,1924,57]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${metal}"/><ellipse cx="${x-3}" cy="${y-3}" rx="${r-8}" ry="${r-10}" fill="none" stroke="#e8cc8b" stroke-width="3"/><path d="M378 ${y-3} Q411 ${y+4} ${x+13} ${y-4}" fill="none" stroke="#9c772f" stroke-width="9"/><path d="M378 ${y-6} L${x+11} ${y-7}" stroke="#f3d99a" stroke-width="3"/>`).join('')}
    <!-- Upper stack pearl touch stems. -->
    ${Object.entries(main).map(([k,[x,y,r]])=>`<path d="M408 ${y+9} L${x-8} ${y+9}" stroke-width="10"/><circle cx="${x}" cy="${y}" r="${r+7}" fill="${metal}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${pearl}"/>`).join('')}
    <!-- Palm and side levers, left little-finger table, low-key guards. -->
    <path d="M511 457 Q533 496 529 562 L543 627 M515 536 Q548 577 548 624 L565 665 M530 591 Q569 630 578 698 L585 747" fill="none" stroke-width="11"/>
    <path d="M552 669 Q575 689 574 713 L561 722 L546 685 Z M573 722 L598 741 L605 791 L591 798 L580 748 Z M584 772 L616 801 L619 844 L606 851 Z" fill="${metal}"/>
    <ellipse cx="597" cy="944" rx="17" ry="26" transform="rotate(29 597 944)" fill="${metal}"/>
    <path d="M545 974 L614 966 L629 1006 L561 1026 Z M556 1030 L629 1013 L641 1045 L572 1062 Z" fill="${metal}"/>
    <path d="M574 985 L609 979 M581 1040 L623 1028" stroke="#222" stroke-width="12"/>
    <path d="M351 1220 Q318 1239 333 1277 L334 1335 M345 1340 L330 1398 M336 1434 L327 1498" fill="none" stroke-width="15"/>
    <path d="M340 1670 Q310 1687 325 1725 L364 1750 L384 1717 Z" fill="${metal}"/><path d="M321 1690 L374 1716" stroke="#222" stroke-width="13"/>
    <path d="M540 1405 Q620 1375 645 1453 L625 1665 Q634 1810 623 1929 L576 1985 Q555 1840 556 1704 Z" fill="${metal}"/>
    <path d="M563 1490 L617 1510 L601 1580 L568 1589 Z M568 1692 L608 1705 L610 1807 L579 1832 Z" fill="#fff"/>
    <ellipse cx="583" cy="1518" rx="23" ry="33" fill="none"/><ellipse cx="591" cy="1745" rx="22" ry="34" fill="none"/>
    <path d="M370 1945 Q405 1984 448 1997 L489 1961 L481 2020 L420 2039 Z" fill="${metal}"/>
    ${Object.entries(main).map(([k,[x,y,r]])=>touch(k,x,y,r)).join('')}
    </g>
    <!-- Detail panels show surfaces hidden behind the tube or bell. -->
    <g font-family="Arial,sans-serif" fill="#26313b" font-size="13">
    <text x="18" y="17" font-weight="bold">ALTO · YAS-280 reference proportions</text>
    <path d="M200 282 H350 M186 570 H350" fill="none" stroke="#64717a" stroke-width="1"/>
    <text x="350" y="276" text-anchor="end">Left hand</text><text x="350" y="564" text-anchor="end">Right hand</text>
    <rect x="365" y="40" width="177" height="117" rx="8" fill="#f5f3ed" stroke="#c6bdab"/>
    <text x="376" y="62" font-weight="bold">Rear · left thumb</text>
    <circle cx="404" cy="118" r="15" fill="#333"/><path d="M430 127 V94 Q430 76 441 76 Q452 76 452 94 V127 Z" fill="${metal}" stroke="#806022"/>
    ${touch('octave',441,92,8)}<text x="467" y="95">Octave</text>
    <rect x="365" y="180" width="177" height="160" rx="8" fill="#f5f3ed" stroke="#c6bdab"/>
    <text x="376" y="203" font-weight="bold">Left little finger · table</text>
    <path d="M400 222 H498 Q513 222 513 237 V252 H390 V237 Q390 222 400 222 Z M390 261 H450 V296 H390 Z M458 261 H513 V296 H458 Z M395 304 H513 V324 H395 Z" fill="${metal}" stroke="#806022"/>
    ${touch('Gsharp',452,238,9,true)}${touch('lowCsharp',418,278,9,true)}${touch('lowB',485,278,9,true)}${touch('lowBflat',452,314,7,true)}
    <text x="422" y="255" text-anchor="middle" font-size="10">C♯</text><text x="488" y="255" text-anchor="middle" font-size="10">B</text><text x="524" y="241" font-size="11">G♯</text><text x="524" y="318" font-size="11">B♭</text>
    <rect x="365" y="373" width="177" height="135" rx="8" fill="#f5f3ed" stroke="#c6bdab"/>
    <text x="376" y="395" font-weight="bold">Right side · index</text>
    <path d="M390 481 V425 H414 V481 Z M430 481 V425 H454 V481 Z M470 481 V425 H494 V481 Z" fill="${metal}" stroke="#806022"/>
    ${touch('sideBflat',402,455,8)}<text x="402" y="498" text-anchor="middle">B♭</text><text x="444" y="498" text-anchor="middle">C</text><text x="482" y="498" text-anchor="middle">E</text>
    <rect x="365" y="600" width="177" height="142" rx="8" fill="#f5f3ed" stroke="#c6bdab"/>
    <text x="376" y="623" font-weight="bold">Right little finger</text>
    <path d="M392 646 Q407 635 426 646 L426 683 H392 Z M448 667 Q464 655 483 667 L483 704 H448 Z" fill="${metal}" stroke="#806022"/>
    ${touch('Eflat',409,660,9,true)}${touch('lowC',466,681,9,true)}
    <text x="408" y="720" text-anchor="middle">E♭</text><text x="466" y="720" text-anchor="middle">C</text>
    <text x="20" y="825">● Press touch   ○ Release touch · Brass cups show the mechanism.</text>
    <text x="20" y="843" font-size="11">Original ClassroomOS illustration · detail views enlarged; not a scale drawing.</text>
    </g></svg>`;
    return svg;
  };
})();
