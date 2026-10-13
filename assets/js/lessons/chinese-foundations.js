/* Original classroom retrieval tasks: answers explain the rule, not just a score. */
(() => {
  const sets = {
    speechPractice: [
      ['你好: how does the first syllable sound in this pair?', ['ní hǎo', 'nǐ hào', 'nī hǎo'], 0, 'Two third tones together: the first becomes rising. Dictionary Pinyin remains nǐ hǎo.', '你好'],
      ['不 before 是: choose the spoken form.', ['bù shì', 'bú shì', 'bū shì'], 1, '不 becomes second tone before a fourth tone: bú shì (is not).', '不是'],
      ['一杯茶: choose the spoken form of 一.', ['yī bēi chá', 'yí bēi chá', 'yì bēi chá'], 2, '杯 is first tone, so 一 takes fourth tone in this phrase: yì bēi chá.', '一杯茶'],
      ['一个: choose the spoken form of 一 before the full fourth tone of 个.', ['yí gè', 'yì gè', 'yī gè'], 0, '一 becomes rising before a fourth tone: yí gè. In everyday speech 个 can also be light/neutral.', '一个'],
      ['妈妈: what should you do with the second syllable?', ['Give it a full falling tone', 'Make it short and unstressed', 'Always keep it high and level'], 1, 'The second ma has neutral tone; its pitch depends on the preceding tone.', '妈妈']
    ],
    characterPractice: [
      ['晴 (qíng, sunny): which component supports the meaning?', ['青, because it proves the tone', '日, associated with sun', '氵, associated with water'], 1, '日 supports a sun/weather category. 青 is the sound clue; it does not guarantee the same tone.'],
      ['清 qīng, 晴 qíng, 请 qǐng: what can you infer?', ['All have the same tone', 'All refer to water', 'Similar sounds, different meaning categories'], 2, 'The shared 青 suggests related pronunciation. The left components help distinguish meaning categories.'],
      ['电脑: are we combining components into one character?', ['No: two characters form one word', 'Yes: two radicals form one character', 'No: every character is a separate word'], 0, '电 + 脑 builds a two-character word. This is vocabulary composition, different from building 清 out of components.']
    ],
    grammarPractice: [
      ['Say “I don’t drink tea” as a habit or preference.', ['我喝不茶。', '我不喝茶。', '我喝茶吗？'], 1, '不 precedes 喝: subject + negation + verb + object. Wǒ bù hē chá.', '我不喝茶'],
      ['Ask “Do you drink tea?”', ['你吗喝茶？', '你喝茶吗？', '吗你喝茶？'], 1, 'Keep the statement order and add neutral-tone 吗 at the end. Nǐ hē chá ma?', '你喝茶吗'],
      ['Choose “two books.”', ['两本书', '两杯书', '本两书'], 0, 'Number + classifier + noun: liǎng běn shū. 本 counts bound books; 杯 measures cups.', '两本书'],
      ['Which means “my book”?', ['我书的', '书的我', '我的书'], 2, 'Possessor + 的 + noun: wǒ de shū. 的 is neutral-toned.', '我的书'],
      ['Which sentence means “I did not drink tea”?', ['我没喝茶。', '我喝了茶。', '我喝茶吗？'], 0, '没 negates the event here. 了 is not a general past-tense ending. Wǒ méi hē chá.', '我没喝茶']
    ],
    readingPractice: [
      ['What does B prefer in the dialogue?', ['Tea', 'Water', 'Two books'], 1, 'B says 我不喝茶。我喝水: “I don’t drink tea. I drink water.” Point to the words supporting your answer.'],
      ['Which word turns A’s first question into a yes/no question?', ['杯', '不', '吗'], 2, '吗 ends 你喝茶吗？ 不 negates; 杯 measures cups.'],
      ['How would A offer two cups of water?', ['两杯水。', '两本水。', '杯两水。'], 0, 'Use 两 + 杯 + 水: liǎng bēi shuǐ. Explain why 本 does not fit this order.', '两杯水']
    ]
  };
  for (const [id, questions] of Object.entries(sets)) {
    const host = document.getElementById(id);
    let index = 0;
    let solved = false;
    const progress = document.createElement('p');
    const prompt = document.createElement('h3');
    prompt.id = `${id}-prompt`;
    const options = document.createElement('div');
    options.className = 'quiz-options';
    options.setAttribute('role', 'group');
    options.setAttribute('aria-labelledby', prompt.id);
    const feedback = document.createElement('p');
    feedback.className = 'feedback-msg info';
    feedback.setAttribute('aria-live', 'polite');
    const listen = document.createElement('button');
    listen.type = 'button'; listen.className = 'speak-btn'; listen.textContent = 'Listen to phrase';
    listen.addEventListener('click', () => speakChinese(questions[index][4]));
    const next = document.createElement('button');
    next.type = 'button'; next.className = 'speak-btn';
    next.addEventListener('click', () => {
      index = (index + 1) % questions.length;
      render(); options.querySelector('button').focus();
    });
    host.append(progress, prompt, options, feedback, listen, document.createTextNode(' '), next);
    function render() {
      solved = false;
      const [question, answers, correct, explanation, phrase] = questions[index];
      progress.textContent = `Practice ${index + 1} of ${questions.length}`;
      prompt.textContent = question;
      feedback.textContent = 'Choose an answer, then explain your reasoning before moving on.';
      feedback.className = 'feedback-msg info';
      listen.hidden = !phrase; next.disabled = true;
      next.textContent = index === questions.length - 1 ? 'Practice again' : 'Next challenge';
      options.replaceChildren();
      answers.forEach((answer, answerIndex) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'quiz-opt'; button.textContent = answer;
        button.addEventListener('click', () => {
          if (solved) return;
          options.querySelectorAll('button').forEach(b => b.classList.remove('incorrect'));
          const success = answerIndex === correct;
          button.classList.add(success ? 'correct' : 'incorrect');
          feedback.className = `feedback-msg ${success ? 'success' : 'error'}`;
          feedback.textContent = success ? `Correct. ${explanation}` : 'Try again. Compare the position, tone, or component in each option with the worked examples above.';
          if (success) { solved = true; next.disabled = false; }
        });
        options.append(button);
      });
    }
    render();
  }
  document.querySelectorAll('[data-speak]').forEach(button => {
    button.addEventListener('click', () => speakChinese(button.dataset.speak));
  });
})();
