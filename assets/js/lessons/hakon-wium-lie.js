// Håkon Wium Lie: The Cascade & Specificity Lab
(() => {
  const container = document.getElementById('hwl-cascade-lab');
  if (!container) return;

  const buttons = container.querySelectorAll('.hwl-btn');
  const stack = document.getElementById('hwl-rule-stack');
  const target = document.getElementById('hwl-target-element');
  const expl = document.getElementById('hwl-explanation');

  const SCENARIOS = {
    defaults: {
      desc: 'Browser Default vs Author CSS: The author defines a blue background and rounded corners, overriding default grey user-agent styling.',
      targetClass: 'scenario-author',
      inlineStyle: '',
      rules: [
        {
          source: 'User-Agent (Browser Default)',
          spec: '(0, 0, 1)',
          code: 'div { background: #e2e8f0; color: #000; border-radius: 0px; }',
          status: 'overridden'
        },
        {
          source: 'Author Stylesheet (Element)',
          spec: '(0, 0, 1) [Order of Appearance]',
          code: 'div { background: #dbeafe; color: #1e3a8a; border-radius: 12px; }',
          status: 'winning'
        }
      ]
    },
    specificity: {
      desc: 'Element vs Class vs ID: Even if the element selector appears last in the stylesheet, the ID selector (#featured) wins because ID has higher specificity than classes or element tags.',
      targetClass: 'scenario-id',
      inlineStyle: '',
      rules: [
        {
          source: 'Element Selector: p',
          spec: '(0, 0, 1)',
          code: 'p { color: #64748b; font-size: 14px; }',
          status: 'overridden'
        },
        {
          source: 'Class Selector: .announcement',
          spec: '(0, 1, 0)',
          code: '.announcement { color: #2563eb; font-weight: bold; }',
          status: 'overridden'
        },
        {
          source: 'ID Selector: #special-notice',
          spec: '(1, 0, 0)',
          code: '#special-notice { color: #b91c1c; font-size: 18px; border: 2px solid #b91c1c; }',
          status: 'winning'
        }
      ]
    },
    userprefs: {
      desc: "User / Reader Style Preference: Lie's original insight was that the reader should have say over the presentation. High-contrast reader mode overrides decorative background colors for accessibility.",
      targetClass: 'scenario-user',
      inlineStyle: '',
      rules: [
        {
          source: 'Author Stylesheet (Aesthetic)',
          spec: '(0, 1, 0)',
          code: '.card { background: #ede9fe; color: #6d28d9; }',
          status: 'overridden'
        },
        {
          source: 'User Accessibility Preference (High Contrast Mode)',
          spec: 'User Setting [Overrides Author]',
          code: '@media (prefers-contrast: more) { background: #000000; color: #ffff00; }',
          status: 'winning'
        }
      ]
    },
    important: {
      desc: '!important Declaration: In CSS Level 1, Lie added !important so critical rules could bypass normal specificity. If an author uses !important, it overrides normal selectors.',
      targetClass: 'scenario-important',
      inlineStyle: '',
      rules: [
        {
          source: 'ID Selector (#headline)',
          spec: '(1, 0, 0)',
          code: '#headline { color: #0f172a; }',
          status: 'overridden'
        },
        {
          source: 'Utility Class with !important',
          spec: '(0, 1, 0) + !important',
          code: '.text-emerald { color: #059669 !important; font-weight: 800; }',
          status: 'winning'
        }
      ]
    }
  };

  function applyScenario(key) {
    const sc = SCENARIOS[key];
    if (!sc) return;

    buttons.forEach(btn => {
      const active = btn.getAttribute('data-scenario') === key;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    stack.innerHTML = sc.rules.map(r => `
      <div class="hwl-rule-item ${r.status}">
        <span class="hwl-rule-source">${r.source} · Specificity: ${r.spec}</span>
        <code>${r.code}</code>
      </div>
    `).join('');

    target.className = 'hwl-target-element ' + sc.targetClass;
    if (key === 'defaults') {
      target.style = 'background: #dbeafe; color: #1e3a8a; border: 1px solid #93c5fd; border-radius: 12px;';
    } else if (key === 'specificity') {
      target.style = 'background: #fef2f2; color: #b91c1c; font-size: 16px; border: 2px solid #b91c1c; border-radius: 8px;';
    } else if (key === 'userprefs') {
      target.style = 'background: #000000; color: #ffff00; font-size: 16px; border: 2px solid #ffffff; border-radius: 4px;';
    } else if (key === 'important') {
      target.style = 'background: #ecfdf5; color: #059669; font-weight: 800; border: 1px solid #10b981; border-radius: 8px;';
    }

    expl.textContent = sc.desc;
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const scenario = btn.getAttribute('data-scenario');
      applyScenario(scenario);
    });
  });

  applyScenario('defaults');
})();
