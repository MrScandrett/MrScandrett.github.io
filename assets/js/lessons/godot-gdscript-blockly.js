(function () {
  /* Two-color system: RULE = GDScript's fixed grammar (shape never changes).
     CUSTOM = a value the student picks — free to rename, retype, reimagine. */
  const RULE_COLOR = '#478cbf';
  const CUSTOM_COLOR = '#b45309';
  const RULE_TIP = 'Rule block — this shape and keyword are GDScript grammar. Every Godot project uses this exact structure, no matter what game you’re building.';
  const CUSTOM_TIP = 'Your choice — rename it, retype it, or swap the value. This is where your own game’s design lives.';

  const BASE_TYPE_OPTIONS = [['CharacterBody3D', 'CharacterBody3D'], ['Node2D', 'Node2D'], ['Node3D', 'Node3D'], ['Area3D', 'Area3D'], ['CanvasLayer', 'CanvasLayer']];
  const VAR_TYPE_OPTIONS = [['int', 'int'], ['float', 'float'], ['String', 'String'], ['bool', 'bool'], ['Vector3', 'Vector3'], ['Array[String]', 'Array[String]']];
  const NODE_TYPE_OPTIONS = [['Label', 'Label'], ['Sprite2D', 'Sprite2D'], ['Node', 'Node'], ['AnimationPlayer', 'AnimationPlayer'], ['Camera3D', 'Camera3D']];
  const RETURN_TYPE_OPTIONS = [['void', 'void'], ['int', 'int'], ['float', 'float'], ['bool', 'bool'], ['String', 'String']];
  const COMPARE_OPTIONS = [['<=', '<='], ['==', '=='], ['<', '<'], ['>', '>'], ['>=', '>='], ['!=', '!=']];
  const ASSIGN_OPTIONS = [['=', '='], ['-=', '-='], ['+=', '+='], ['*=', '*=']];

  const ALL_BLOCK_TYPES = [
    'gd_extends', 'gd_export_var', 'gd_var', 'gd_onready_var', 'gd_func', 'gd_ready', 'gd_process', 'gd_unhandled_input',
    'gd_if', 'gd_ifelse', 'gd_for_in', 'gd_compare', 'gd_assign', 'gd_call_stmt', 'gd_print1', 'gd_print2', 'gd_method_call',
    'gd_name', 'gd_number', 'gd_string', 'gd_bool', 'gd_vector3', 'gd_join', 'gd_param'
  ];

  const scripts = [
    {
      key: 'variables',
      label: 'Matches 01 / DATA above',
      title: 'Variables — state your data',
      caption: 'The blue pieces are always shaped this way in GDScript: extends, var, and a type slot. The amber pieces — the names, the types you pick, and the starting values — are what make this your game instead of a demo.',
      blocks: [
        { type: 'gd_extends', fields: { TYPE: 'CharacterBody3D' } },
        { type: 'gd_export_var', fields: { TYPE: 'float' }, inputs: {
          NAME: { type: 'gd_name', fields: { NAME: 'speed' } },
          VALUE: { type: 'gd_number', fields: { NUM: 5 } }
        } },
        { type: 'gd_var', fields: { TYPE: 'int' }, inputs: {
          NAME: { type: 'gd_name', fields: { NAME: 'health' } },
          VALUE: { type: 'gd_number', fields: { NUM: 3 } }
        } },
        { type: 'gd_var', fields: { TYPE: 'String' }, inputs: {
          NAME: { type: 'gd_name', fields: { NAME: 'player_name' } },
          VALUE: { type: 'gd_string', fields: { TXT: 'Nova' } }
        } },
        { type: 'gd_var', fields: { TYPE: 'bool' }, inputs: {
          NAME: { type: 'gd_name', fields: { NAME: 'can_move' } },
          VALUE: { type: 'gd_bool', fields: { BOOL: 'true' } }
        } }
      ]
    },
    {
      key: 'logic',
      label: 'Matches 02 / FLOW above',
      title: 'Functions & conditions — decide what happens next',
      caption: 'func, if, and else are rule blocks — every Godot script that branches uses this same shape. What counts as "damage," what the health threshold is, and what respawn resets to are all your calls.',
      blocks: [
        { type: 'gd_func', fields: { RETURN: 'void' }, inputs: {
          NAME: { type: 'gd_name', fields: { NAME: 'take_damage' } },
          PARAM: { type: 'gd_param', fields: { TYPE: 'int' }, inputs: { NAME: { type: 'gd_name', fields: { NAME: 'amount' } } } }
        }, statements: { DO: [
          { type: 'gd_assign', fields: { OP: '-=' }, inputs: {
            TARGET: { type: 'gd_name', fields: { NAME: 'health' } },
            VALUE: { type: 'gd_name', fields: { NAME: 'amount' } }
          } },
          { type: 'gd_ifelse', inputs: {
            COND: { type: 'gd_compare', fields: { OP: '<=' }, inputs: {
              A: { type: 'gd_name', fields: { NAME: 'health' } },
              B: { type: 'gd_number', fields: { NUM: 0 } }
            } }
          }, statements: {
            DO: [ { type: 'gd_call_stmt', inputs: { NAME: { type: 'gd_name', fields: { NAME: 'respawn' } } } } ],
            ELSE: [ { type: 'gd_print2', inputs: {
              A: { type: 'gd_string', fields: { TXT: 'Health: ' } },
              B: { type: 'gd_name', fields: { NAME: 'health' } }
            } } ]
          } }
        ] } },
        { type: 'gd_func', fields: { RETURN: 'void' }, inputs: {
          NAME: { type: 'gd_name', fields: { NAME: 'respawn' } }
        }, statements: { DO: [
          { type: 'gd_assign', fields: { OP: '=' }, inputs: {
            TARGET: { type: 'gd_name', fields: { NAME: 'health' } },
            VALUE: { type: 'gd_number', fields: { NUM: 3 } }
          } },
          { type: 'gd_assign', fields: { OP: '=' }, inputs: {
            TARGET: { type: 'gd_name', fields: { NAME: 'global_position' } },
            VALUE: { type: 'gd_vector3', inputs: {
              X: { type: 'gd_number', fields: { NUM: 0 } },
              Y: { type: 'gd_number', fields: { NUM: 2 } },
              Z: { type: 'gd_number', fields: { NUM: 0 } }
            } }
          } }
        ] } }
      ]
    },
    {
      key: 'nodes',
      label: 'Matches 03 / NODES above',
      title: 'Node references — talk to the scene tree',
      caption: '@onready and Godot’s built-in _ready() / _unhandled_input() are locked rule blocks — Godot calls them by that exact name whether or not you touch them. The node path, the message text, and what you do on a key press are yours.',
      blocks: [
        { type: 'gd_onready_var', fields: { TYPE: 'Label' }, inputs: {
          NAME: { type: 'gd_name', fields: { NAME: 'status_label' } },
          PATH: { type: 'gd_name', fields: { NAME: 'UI/StatusLabel' } }
        } },
        { type: 'gd_ready', statements: { DO: [
          { type: 'gd_assign', fields: { OP: '=' }, inputs: {
            TARGET: { type: 'gd_name', fields: { NAME: 'status_label.text' } },
            VALUE: { type: 'gd_join', inputs: {
              A: { type: 'gd_string', fields: { TXT: 'Ready, ' } },
              B: { type: 'gd_name', fields: { NAME: 'player_name' } }
            } }
          } }
        ] } },
        { type: 'gd_unhandled_input', statements: { DO: [
          { type: 'gd_if', inputs: {
            COND: { type: 'gd_method_call', fields: { METHOD: 'is_action_pressed' }, inputs: {
              TARGET: { type: 'gd_name', fields: { NAME: 'event' } },
              ARG: { type: 'gd_string', fields: { TXT: 'test_damage' } }
            } }
          }, statements: { DO: [
            { type: 'gd_call_stmt', inputs: {
              NAME: { type: 'gd_name', fields: { NAME: 'take_damage' } },
              ARG: { type: 'gd_number', fields: { NUM: 1 } }
            } }
          ] } }
        ] } },
        { type: 'gd_func', fields: { RETURN: 'void' }, inputs: {
          NAME: { type: 'gd_name', fields: { NAME: 'show_inventory' } },
          PARAM: { type: 'gd_param', fields: { TYPE: 'Array[String]' }, inputs: { NAME: { type: 'gd_name', fields: { NAME: 'items' } } } }
        }, statements: { DO: [
          { type: 'gd_for_in', inputs: {
            ITEMNAME: { type: 'gd_name', fields: { NAME: 'item' } },
            LIST: { type: 'gd_name', fields: { NAME: 'items' } }
          }, statements: { DO: [
            { type: 'gd_print1', inputs: { A: { type: 'gd_name', fields: { NAME: 'item' } } } }
          ] } }
        ] } }
      ],
      note: 'Not quite identical, on purpose: the real lesson above also updates the HUD every frame from _process(). That block is dropped here to keep the diagram short — the shape is exactly the same as _ready(), just called every frame instead of once.'
    }
  ];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function legendHtml() {
    return `
      <div class="gd-blocks-legend">
        <span class="gd-blocks-legend-chip"><span class="gd-blocks-swatch" style="background:${RULE_COLOR}"></span>Rule — fixed GDScript grammar</span>
        <span class="gd-blocks-legend-chip"><span class="gd-blocks-swatch" style="background:${CUSTOM_COLOR}"></span>Your choice — customize for your game</span>
      </div>
    `;
  }

  function populateSection(section) {
    const panels = scripts.map((script) => `
      <div class="gd-blocks-script">
        <p class="gd-blocks-script-label">${escapeHtml(script.label)}</p>
        <h4>${escapeHtml(script.title)}</h4>
        <p class="gd-blocks-caption">${escapeHtml(script.caption)}</p>
        <div class="gd-blocks-mini" id="gd-blocks-${script.key}" aria-label="${escapeHtml(script.title)} Blockly workspace"></div>
        <button class="gd-button alt gd-blocks-toggle" type="button" data-workspace="${script.key}">Show the GDScript</button>
        <div class="gd-code gd-blocks-code" id="gd-blocks-code-${script.key}"><div class="gd-code-head"><span>${escapeHtml(script.title.split(' —')[0])}.gd</span></div><pre><code></code></pre></div>
        ${script.note ? `<div class="gd-callout">${escapeHtml(script.note)}</div>` : ''}
      </div>
    `).join('');

    section.innerHTML = `
      <p>Every puzzle piece below is real GDScript, snapped together the same way you’ve snapped blocks together in the block-coding game lessons. Once you can tell a rule piece from a your-choice piece, reading the typed code above stops being new syntax to memorize — it’s the same two ideas, written differently.</p>
      ${legendHtml()}
      <p class="gd-blocks-hint">Live Blockly workspace — drag pieces around, then press "Show the GDScript" to reveal the exact code it builds.</p>
      ${panels}
    `;
  }

  function defineBlocks(Blockly) {
    if (Blockly.Blocks.gd_extends) return;

    Blockly.defineBlocksWithJsonArray([
      /* ---- RULE: fixed GDScript grammar ---- */
      { type: 'gd_extends', message0: 'extends %1', args0: [
        { type: 'field_dropdown', name: 'TYPE', options: BASE_TYPE_OPTIONS }
      ], nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_export_var', message0: '@export var %1 : %2 = %3', args0: [
        { type: 'input_value', name: 'NAME' },
        { type: 'field_dropdown', name: 'TYPE', options: VAR_TYPE_OPTIONS },
        { type: 'input_value', name: 'VALUE' }
      ], inputsInline: true, previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_var', message0: 'var %1 : %2 = %3', args0: [
        { type: 'input_value', name: 'NAME' },
        { type: 'field_dropdown', name: 'TYPE', options: VAR_TYPE_OPTIONS },
        { type: 'input_value', name: 'VALUE' }
      ], inputsInline: true, previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_onready_var', message0: '@onready var %1 : %2 = $%3', args0: [
        { type: 'input_value', name: 'NAME' },
        { type: 'field_dropdown', name: 'TYPE', options: NODE_TYPE_OPTIONS },
        { type: 'input_value', name: 'PATH' }
      ], inputsInline: true, previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_func', message0: 'func %1 ( %2 ) -> %3 %4', args0: [
        { type: 'input_value', name: 'NAME' },
        { type: 'input_value', name: 'PARAM' },
        { type: 'field_dropdown', name: 'RETURN', options: RETURN_TYPE_OPTIONS },
        { type: 'input_statement', name: 'DO' }
      ], previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_ready', message0: 'func _ready() -> void %1', args0: [
        { type: 'input_statement', name: 'DO' }
      ], previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: 'Godot calls this automatically, once, right when the node enters the scene. The name and signature never change — only what you put inside.' },
      { type: 'gd_process', message0: 'func _process(delta) -> void %1', args0: [
        { type: 'input_statement', name: 'DO' }
      ], previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: 'Godot calls this automatically, every single frame. Fixed name and signature — only what you put inside is yours.' },
      { type: 'gd_unhandled_input', message0: 'func _unhandled_input(event) -> void %1', args0: [
        { type: 'input_statement', name: 'DO' }
      ], previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: 'Godot calls this automatically whenever an unhandled input event happens. Fixed name and signature — only what you put inside is yours.' },
      { type: 'gd_if', message0: 'if %1 %2', args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' },
        { type: 'input_statement', name: 'DO' }
      ], previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_ifelse', message0: 'if %1 %2 else %3', args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' },
        { type: 'input_statement', name: 'DO' },
        { type: 'input_statement', name: 'ELSE' }
      ], previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_for_in', message0: 'for %1 in %2 %3', args0: [
        { type: 'input_value', name: 'ITEMNAME' },
        { type: 'input_value', name: 'LIST' },
        { type: 'input_statement', name: 'DO' }
      ], previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_compare', message0: '%1 %2 %3', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'field_dropdown', name: 'OP', options: COMPARE_OPTIONS },
        { type: 'input_value', name: 'B' }
      ], inputsInline: true, output: 'Boolean', colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_assign', message0: '%1 %2 %3', args0: [
        { type: 'input_value', name: 'TARGET' },
        { type: 'field_dropdown', name: 'OP', options: ASSIGN_OPTIONS },
        { type: 'input_value', name: 'VALUE' }
      ], inputsInline: true, previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_call_stmt', message0: '%1 ( %2 )', args0: [
        { type: 'input_value', name: 'NAME' },
        { type: 'input_value', name: 'ARG' }
      ], inputsInline: true, previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_print1', message0: 'print( %1 )', args0: [
        { type: 'input_value', name: 'A' }
      ], inputsInline: true, previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_print2', message0: 'print( %1 , %2 )', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' }
      ], inputsInline: true, previousStatement: null, nextStatement: null, colour: RULE_COLOR, tooltip: RULE_TIP },
      { type: 'gd_method_call', message0: '%1 . %2 ( %3 )', args0: [
        { type: 'input_value', name: 'TARGET' },
        { type: 'field_input', name: 'METHOD', text: 'method_name' },
        { type: 'input_value', name: 'ARG' }
      ], inputsInline: true, output: 'Boolean', colour: RULE_COLOR, tooltip: RULE_TIP },

      /* ---- CUSTOM: the values a student chooses ---- */
      { type: 'gd_name', message0: '%1', args0: [
        { type: 'field_input', name: 'NAME', text: 'my_name' }
      ], output: null, colour: CUSTOM_COLOR, tooltip: CUSTOM_TIP },
      { type: 'gd_number', message0: '%1', args0: [
        { type: 'field_number', name: 'NUM', value: 0 }
      ], output: 'Number', colour: CUSTOM_COLOR, tooltip: CUSTOM_TIP },
      { type: 'gd_string', message0: '" %1 "', args0: [
        { type: 'field_input', name: 'TXT', text: '' }
      ], output: 'String', colour: CUSTOM_COLOR, tooltip: CUSTOM_TIP },
      { type: 'gd_bool', message0: '%1', args0: [
        { type: 'field_dropdown', name: 'BOOL', options: [['true', 'true'], ['false', 'false']] }
      ], output: 'Boolean', colour: CUSTOM_COLOR, tooltip: CUSTOM_TIP },
      { type: 'gd_vector3', message0: 'Vector3( %1 , %2 , %3 )', args0: [
        { type: 'input_value', name: 'X' },
        { type: 'input_value', name: 'Y' },
        { type: 'input_value', name: 'Z' }
      ], inputsInline: true, output: 'Vector3', colour: CUSTOM_COLOR, tooltip: CUSTOM_TIP },
      { type: 'gd_join', message0: '%1 + %2', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' }
      ], inputsInline: true, output: 'String', colour: CUSTOM_COLOR, tooltip: CUSTOM_TIP },
      { type: 'gd_param', message0: '%1 : %2', args0: [
        { type: 'input_value', name: 'NAME' },
        { type: 'field_dropdown', name: 'TYPE', options: VAR_TYPE_OPTIONS }
      ], inputsInline: true, output: null, colour: CUSTOM_COLOR, tooltip: CUSTOM_TIP }
    ]);
  }

  function installGenerators(Blockly) {
    const gen = Blockly.JavaScript || Blockly.javascriptGenerator;
    if (!gen || gen.forBlock.gd_extends) return gen;
    gen.INDENT = '    ';

    gen.forBlock.gd_extends = (block) => `extends ${block.getFieldValue('TYPE')}\n`;
    gen.forBlock.gd_export_var = (block, generator) =>
      `@export var ${generator.valueToCode(block, 'NAME', 0) || 'my_var'}: ${block.getFieldValue('TYPE')} = ${generator.valueToCode(block, 'VALUE', 0) || '0'}\n`;
    gen.forBlock.gd_var = (block, generator) =>
      `var ${generator.valueToCode(block, 'NAME', 0) || 'my_var'}: ${block.getFieldValue('TYPE')} = ${generator.valueToCode(block, 'VALUE', 0) || '0'}\n`;
    gen.forBlock.gd_onready_var = (block, generator) =>
      `@onready var ${generator.valueToCode(block, 'NAME', 0) || 'node_ref'}: ${block.getFieldValue('TYPE')} = $${generator.valueToCode(block, 'PATH', 0) || 'Path'}\n`;
    gen.forBlock.gd_func = (block, generator) => {
      const name = generator.valueToCode(block, 'NAME', 0) || 'my_function';
      const param = generator.valueToCode(block, 'PARAM', 0) || '';
      const body = generator.statementToCode(block, 'DO');
      return `func ${name}(${param}) -> ${block.getFieldValue('RETURN')}:\n${body}`;
    };
    gen.forBlock.gd_ready = (block, generator) => `func _ready() -> void:\n${generator.statementToCode(block, 'DO')}`;
    gen.forBlock.gd_process = (block, generator) => `func _process(delta) -> void:\n${generator.statementToCode(block, 'DO')}`;
    gen.forBlock.gd_unhandled_input = (block, generator) => `func _unhandled_input(event) -> void:\n${generator.statementToCode(block, 'DO')}`;
    gen.forBlock.gd_if = (block, generator) =>
      `if ${generator.valueToCode(block, 'COND', 0) || 'true'}:\n${generator.statementToCode(block, 'DO')}`;
    gen.forBlock.gd_ifelse = (block, generator) =>
      `if ${generator.valueToCode(block, 'COND', 0) || 'true'}:\n${generator.statementToCode(block, 'DO')}else:\n${generator.statementToCode(block, 'ELSE')}`;
    gen.forBlock.gd_for_in = (block, generator) =>
      `for ${generator.valueToCode(block, 'ITEMNAME', 0) || 'item'} in ${generator.valueToCode(block, 'LIST', 0) || 'list'}:\n${generator.statementToCode(block, 'DO')}`;
    gen.forBlock.gd_compare = (block, generator) =>
      [`${generator.valueToCode(block, 'A', 0) || '0'} ${block.getFieldValue('OP')} ${generator.valueToCode(block, 'B', 0) || '0'}`, 0];
    gen.forBlock.gd_assign = (block, generator) =>
      `${generator.valueToCode(block, 'TARGET', 0) || 'value'} ${block.getFieldValue('OP')} ${generator.valueToCode(block, 'VALUE', 0) || '0'}\n`;
    gen.forBlock.gd_call_stmt = (block, generator) =>
      `${generator.valueToCode(block, 'NAME', 0) || 'function_name'}(${generator.valueToCode(block, 'ARG', 0) || ''})\n`;
    gen.forBlock.gd_print1 = (block, generator) => `print(${generator.valueToCode(block, 'A', 0) || "''"})\n`;
    gen.forBlock.gd_print2 = (block, generator) =>
      `print(${generator.valueToCode(block, 'A', 0) || "''"}, ${generator.valueToCode(block, 'B', 0) || "''"})\n`;
    gen.forBlock.gd_method_call = (block, generator) =>
      [`${generator.valueToCode(block, 'TARGET', 0) || 'node'}.${block.getFieldValue('METHOD')}(${generator.valueToCode(block, 'ARG', 0) || ''})`, 0];

    gen.forBlock.gd_name = (block) => [block.getFieldValue('NAME'), 0];
    gen.forBlock.gd_number = (block) => [String(block.getFieldValue('NUM')), 0];
    gen.forBlock.gd_string = (block) => [`"${block.getFieldValue('TXT')}"`, 0];
    gen.forBlock.gd_bool = (block) => [block.getFieldValue('BOOL'), 0];
    gen.forBlock.gd_vector3 = (block, generator) =>
      [`Vector3(${generator.valueToCode(block, 'X', 0) || 0}, ${generator.valueToCode(block, 'Y', 0) || 0}, ${generator.valueToCode(block, 'Z', 0) || 0})`, 0];
    gen.forBlock.gd_join = (block, generator) =>
      [`${generator.valueToCode(block, 'A', 0) || "''"} + ${generator.valueToCode(block, 'B', 0) || "''"}`, 0];
    gen.forBlock.gd_param = (block, generator) =>
      [`${generator.valueToCode(block, 'NAME', 0) || 'param'}: ${block.getFieldValue('TYPE')}`, 0];

    return gen;
  }

  function buildBlockTree(ws, spec) {
    const block = ws.newBlock(spec.type);
    Object.entries(spec.fields || {}).forEach(([name, value]) => {
      const field = block.getField(name);
      if (field) field.setValue(String(value));
    });
    block.initSvg();

    Object.entries(spec.inputs || {}).forEach(([name, childSpec]) => {
      const childBlock = buildBlockTree(ws, childSpec);
      const input = block.getInput(name);
      if (input && input.connection && childBlock.outputConnection) {
        input.connection.connect(childBlock.outputConnection);
      }
    });

    Object.entries(spec.statements || {}).forEach(([name, childSpecs]) => {
      const input = block.getInput(name);
      if (!input || !input.connection) return;
      let prev = null;
      (childSpecs || []).forEach((childSpec) => {
        const childBlock = buildBlockTree(ws, childSpec);
        if (!prev) {
          input.connection.connect(childBlock.previousConnection);
        } else if (prev.nextConnection) {
          prev.nextConnection.connect(childBlock.previousConnection);
        }
        prev = childBlock;
      });
    });

    block.render();
    return block;
  }

  function makeWorkspace(Blockly, el, script) {
    if (!el) return null;
    const toolbox = { kind: 'flyoutToolbox', contents: ALL_BLOCK_TYPES.map((type) => ({ kind: 'block', type })) };
    const ws = Blockly.inject(el, {
      toolbox,
      trashcan: false,
      zoom: { controls: false, wheel: false, startScale: 0.85 },
      scrollbars: true,
      move: { drag: true, wheel: false }
    });

    let prev = null;
    script.blocks.forEach((spec, index) => {
      const block = buildBlockTree(ws, spec);
      if (index === 0) {
        block.moveBy(12, 12);
      } else if (prev && prev.nextConnection && block.previousConnection) {
        prev.nextConnection.connect(block.previousConnection);
      }
      prev = block;
    });

    ws.render();
    setTimeout(() => {
      Blockly.svgResize(ws);
      if (typeof ws.zoomToFit === 'function') ws.zoomToFit();
    }, 0);
    return ws;
  }

  function installStyles() {
    if (document.getElementById('gd-blocks-style')) return;
    const style = document.createElement('style');
    style.id = 'gd-blocks-style';
    style.textContent = `
      .gd-blocks-legend { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0.7rem 0 0.9rem; padding: 0.65rem 0.85rem; border-radius: 10px; background: rgba(71,140,191,0.07); }
      .gd-blocks-legend-chip { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary,#3f4f65); }
      .gd-blocks-swatch { width: 13px; height: 13px; border-radius: 3px; display: inline-block; flex-shrink: 0; }
      .gd-blocks-hint { font-size: 0.76rem; color: #7c93a6; margin: 0 0 0.7rem; }
      .gd-blocks-script { margin: 1.3rem 0; padding-top: 1rem; border-top: 1px solid var(--line,#d2d2d7); }
      .gd-blocks-script:first-of-type { border-top: 0; }
      .gd-blocks-script-label { margin: 0 0 0.2rem; font: 700 0.68rem "JetBrains Mono", monospace; letter-spacing: 0.04em; text-transform: uppercase; color: var(--gd-blue,#478cbf); }
      .gd-blocks-script h4 { margin: 0 0 0.35rem; font-size: 1rem; }
      .gd-blocks-caption { font-size: 0.84rem; line-height: 1.6; color: var(--text-secondary,#465768); margin: 0 0 0.6rem; }
      .gd-blocks-mini { height: 300px; border: 1.5px solid rgba(71,140,191,0.35); border-radius: 10px; background: var(--white,#fff); overflow: hidden; }
      [data-lighting="night"] .gd-blocks-mini, [data-theme="vaporwave"] .gd-blocks-mini, [data-theme="bark"] .gd-blocks-mini { background: rgba(255,255,255,.055); }
      .gd-blocks-toggle { margin-top: 0.65rem; }
      .gd-blocks-code { display: none; }
      .gd-blocks-code.open { display: block; }
      @media (max-width: 760px) { .gd-blocks-mini { height: 340px; } }
    `;
    document.head.appendChild(style);
  }

  function init() {
    const section = document.querySelector('[data-gdscript-blockly]');
    if (!section) return;
    installStyles();
    populateSection(section);

    if (typeof Blockly === 'undefined') {
      const hint = section.querySelector('.gd-blocks-hint');
      if (hint) hint.textContent = 'Blockly could not load, but the code above still shows the full pattern.';
      return;
    }

    defineBlocks(Blockly);
    const gen = installGenerators(Blockly);
    const workspaces = {};

    scripts.forEach((script) => {
      workspaces[script.key] = makeWorkspace(Blockly, section.querySelector(`#gd-blocks-${script.key}`), script);
    });

    section.querySelectorAll('.gd-blocks-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.workspace;
        const ws = workspaces[key];
        const out = document.getElementById(`gd-blocks-code-${key}`);
        if (!out || !ws || !gen) return;
        const open = out.classList.toggle('open');
        button.textContent = open ? 'Hide the GDScript' : 'Show the GDScript';
        if (open) out.querySelector('pre code').textContent = gen.workspaceToCode(ws).trim();
      });
    });

    window.addEventListener('resize', () => {
      Object.values(workspaces).forEach((ws) => ws && Blockly.svgResize(ws));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
