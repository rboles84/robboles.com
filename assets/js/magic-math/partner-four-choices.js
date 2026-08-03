(() => {
  'use strict';

  const CARD_ROOT = '../../assets/images/cards/magic-math/partner-four-choices/';
  const cardPath = (source) => source.startsWith('cards/') ? `${CARD_ROOT}${source.slice(6)}` : source;

  const CARD_DATA = {
    malcolm: {
      name: 'Malcolm, Keen-Eyed Navigator', image: 'cards/malcolm-keen-eyed-navigator.jpg', colors: ['U'], rarity: 'uncommon',
      job: 'Pirate damage becomes Treasure.',
      oracle: 'Whenever one or more Pirates you control deal damage to your opponents, you create a Treasure token for each opponent dealt damage.',
      href: 'https://gatherer.wizards.com/LCC/en-us/161/malcolm-keen-eyed-navigator'
    },
    breeches: {
      name: 'Breeches, Brazen Plunderer', image: 'cards/breeches-brazen-plunderer.jpg', colors: ['R'], rarity: 'uncommon',
      job: 'Pirate damage becomes cards you may play.',
      oracle: 'Pirate damage exiles the top card of each opponent’s library and lets you play those cards that turn.',
      href: 'https://gatherer.wizards.com/LCC/en-us/217/breeches-brazen-plunderer'
    },
    'fugitive-doctor': {
      name: 'The Fugitive Doctor', image: 'cards/the-fugitive-doctor.jpg', colors: ['R', 'G'], rarity: 'rare',
      job: 'Clues turn graveyard spells into another cast.',
      oracle: 'The Doctor investigates on entry, then can sacrifice a Clue while attacking to give an instant or sorcery in your graveyard flashback for the turn.',
      href: 'https://gatherer.wizards.com/WHO/en-us/130/the-fugitive-doctor'
    },
    martha: {
      name: 'Martha Jones', image: 'cards/martha-jones.jpg', colors: ['U'], rarity: 'rare',
      job: 'Clues help two creatures get through combat.',
      oracle: 'Martha investigates on entry. Sacrificing a Clue can make her and another target creature unblockable for the turn.',
      href: 'https://gatherer.wizards.com/WHO/en-us/48/martha-jones'
    },
    pir: {
      name: 'Pir, Imaginative Rascal', image: 'cards/pir-imaginative-rascal.jpg', colors: ['G'], rarity: 'rare',
      job: 'Counters placed on your team’s permanents get one more.',
      oracle: 'If counters would be put on a permanent your team controls, Pir adds one more of each kind.',
      href: 'https://gatherer.wizards.com/BBD/en-us/11/pir-imaginative-rascal'
    },
    toothy: {
      name: 'Toothy, Imaginary Friend', image: 'cards/toothy-imaginary-friend.jpg', colors: ['U'], rarity: 'rare',
      job: 'Card draw becomes counters, then counters become cards.',
      oracle: 'Drawing puts a +1/+1 counter on Toothy. When Toothy leaves, you draw a card for each +1/+1 counter on it.',
      href: 'https://gatherer.wizards.com/BBD/en-us/12/toothy-imaginary-friend'
    },
    'prismatic-piper': {
      name: 'The Prismatic Piper', image: 'cards/the-prismatic-piper.jpg', colors: ['V'], rarity: 'special',
      job: 'Its color is chosen before the game.',
      oracle: 'If The Prismatic Piper is your commander, choose a color before the game begins.',
      href: 'https://gatherer.wizards.com/CMM/en-us/1/the-prismatic-piper'
    },
    clara: {
      name: 'Clara Oswald', image: 'cards/clara-oswald.jpg', colors: ['V'], rarity: 'rare',
      job: 'She brings a chosen color and amplifies Doctor triggers.',
      oracle: 'Choose Clara’s additional color before the game. She has Doctor’s companion and makes a Doctor’s triggered ability trigger an additional time.',
      href: 'https://gatherer.wizards.com/WHO/en-us/9/clara-oswald'
    },
    'fourth-doctor': {
      name: 'The Fourth Doctor', image: 'cards/the-fourth-doctor.jpg', colors: ['U', 'G'], rarity: 'mythic',
      job: 'Historic cards from the top become Food.',
      oracle: 'Once each turn, you may play a historic land or cast a historic spell from the top of your library. When you do, create a Food token.',
      href: 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=634405&printed=false'
    },
    'sarah-jane': {
      name: 'Sarah Jane Smith', image: 'cards/sarah-jane-smith.jpg', colors: ['W'], rarity: 'rare',
      job: 'Historic spells become Clues.',
      oracle: 'Whenever you cast a historic spell, investigate. This triggers only once each turn. Sarah Jane Smith has Doctor’s companion.',
      href: 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=634421&printed=false'
    },
    bjorna: {
      name: 'Bjorna, Nightfall Alchemist', image: 'cards/bjorna-nightfall-alchemist.jpg', colors: ['U', 'R'], rarity: 'rare',
      job: 'Artifacts become damage and goad.',
      oracle: 'Tap and sacrifice an artifact: Bjorna deals 1 damage to target creature, then goads that creature.',
      href: 'https://scryfall.com/card/83b0b716-bcb0-4044-b64a-354e3cbbd563'
    },
    elmar: {
      name: 'Elmar, Ulvenwald Informant', image: 'cards/elmar-ulvenwald-informant.jpg', colors: ['R', 'G'], rarity: 'rare',
      job: 'Your second spell can make a Clue.',
      oracle: 'Whenever you cast your second spell each turn, untap target creature, then investigate.',
      href: 'https://scryfall.com/card/95d197b3-fc56-43a2-981f-b5b905222b5c'
    },
    atreus: {
      name: 'Atreus, Impulsive Son', image: 'cards/atreus-impulsive-son.jpg', colors: ['U', 'R'], rarity: 'mythic',
      job: 'Experience becomes cards and damage.',
      oracle: 'Pay three and tap Atreus to draw for each experience counter you have, discard a card, then deal 2 damage to each opponent.',
      href: 'https://scryfall.com/card/2e53b0b2-dba1-4a95-80c4-622ab1a547a4'
    },
    kratos: {
      name: 'Kratos, Stoic Father', image: 'cards/kratos-stoic-father.jpg', colors: ['W', 'R'], rarity: 'mythic',
      job: 'God attacks and deaths build experience.',
      oracle: 'God attacks and deaths give you experience counters. At your end step, that total becomes +1/+1 counters on a target creature.',
      href: 'https://scryfall.com/card/77dcd29e-d0d5-474f-a05b-768ccf6b6293'
    },
    amy: {
      name: 'Amy Pond', image: 'cards/amy-pond.jpg', colors: ['R'], rarity: 'rare',
      job: 'Combat damage removes time counters.',
      oracle: 'When Amy deals combat damage to a player, choose a suspended card you own and remove that many time counters from it. She has partner with Rory Williams.',
      href: 'https://scryfall.com/card/e50a2faa-91e3-4e89-ba8d-2cbf7ac005c0'
    },
    rory: {
      name: 'Rory Williams', image: 'cards/rory-williams.jpg', colors: ['W', 'U'], rarity: 'rare',
      job: 'He suspends himself and investigates.',
      oracle: 'When cast from anywhere other than exile, Rory is exiled with three time counters, gains suspend, then investigates. He has partner with Amy Pond.',
      href: 'https://scryfall.com/card/f51a010d-641c-413f-8f91-0c8ff3b2085c'
    },
    april: {
      name: 'April O’Neil, Live on the Scene', image: 'cards/april-oneil-live-on-the-scene.jpg', colors: ['U'], rarity: 'mythic',
      job: 'Creature entries become Clues.',
      oracle: 'Whenever a Mutant, Ninja, or Turtle you control enters, investigate.',
      href: 'https://scryfall.com/card/7265ab42-5434-4127-acd6-8905ab63d62d'
    },
    donatello: {
      name: 'Donatello, the Brains', image: 'cards/donatello-the-brains.jpg', colors: ['U'], rarity: 'mythic',
      job: 'Every token event adds a Mutagen.',
      oracle: 'If one or more tokens would be created under your control, those tokens plus a Mutagen token are created instead.',
      href: 'https://scryfall.com/card/774716f4-d211-497a-be91-69cd700edbf2'
    },
    akiri: {
      name: 'Akiri, Line-Slinger', image: 'cards/akiri-line-slinger.jpg', colors: ['W', 'R'], rarity: 'rare',
      job: 'Artifacts increase her power.',
      oracle: 'Akiri gets +1/+0 for each artifact you control. She has Partner.',
      href: 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=420643&printed=false'
    },
    kydele: {
      name: 'Kydele, Chosen of Kruphix', image: 'cards/kydele-chosen-of-kruphix.jpg', colors: ['U', 'G'], rarity: 'mythic',
      job: 'Cards drawn become colorless mana.',
      oracle: 'Tap Kydele to add one colorless mana for each card you’ve drawn this turn. She has Partner.',
      href: 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=420652&printed=false'
    }
  };

  const COLOR = { W: '#eadfae', U: '#4f9bce', B: '#746c81', R: '#c45c4e', G: '#64a77f', V: '#d8b85f' };
  const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

  function colorGradient(colors) {
    if (colors.length === 1 && colors[0] !== 'V') return COLOR[colors[0]];
    const palette = colors[0] === 'V' ? [COLOR.W, COLOR.U, COLOR.B, COLOR.R, COLOR.G] : colors.map((color) => COLOR[color]);
    return `linear-gradient(90deg, ${palette.map((color, index) => `${color} ${index * 100 / palette.length}% ${(index + 1) * 100 / palette.length}%`).join(',')})`;
  }

  function manaSymbols(colors, label) {
    const shown = colors[0] === 'V' ? ['W', 'U', 'B', 'R', 'G'] : colors;
    return `<span class="ms-cluster" aria-label="${escapeHtml(label || shown.join(', '))}">${shown.map((color) => `<i class="ms ms-${color.toLowerCase()} ms-cost" aria-hidden="true"></i>`).join('')}</span>`;
  }

  function cardArtButton(id, context, showName = true) {
    const data = CARD_DATA[id];
    if (!data) return '';
    const contextLabel = context ? ` for ${escapeHtml(context)}` : '';
    return `<button type="button" class="card-ref card-ref--art" data-card-ref="${id}" aria-expanded="false" aria-label="Open ${escapeHtml(data.name)} card preview${contextLabel}" style="--card-accent:${colorGradient(data.colors)}"><img src="${cardPath(data.image)}" width="170" height="237" alt="">${showName ? `<span>${escapeHtml(data.name)}</span>` : ''}</button>`;
  }

  document.querySelectorAll('[data-card-ref]').forEach((raw) => {
    const id = raw.getAttribute('data-card-ref');
    const data = CARD_DATA[id];
    if (!data) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card-ref';
    button.setAttribute('data-card-ref', id);
    button.setAttribute('aria-expanded', 'false');
    button.style.setProperty('--card-accent', colorGradient(data.colors));
    button.innerHTML = `${manaSymbols(data.colors, `${data.name} color identity`)}<span>${escapeHtml(data.name)}</span>`;
    raw.replaceWith(button);
  });

  let cardPop = null;
  let activeCard = null;
  let activeTrigger = null;
  let hoverTimer = null;
  let hideTimer = null;
  let ignoreScrollUntil = 0;

  function ensureCardPop() {
    if (cardPop) return cardPop;
    cardPop = document.createElement('aside');
    cardPop.id = 'cardpop';
    cardPop.setAttribute('role', 'dialog');
    cardPop.setAttribute('aria-modal', 'false');
    cardPop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cardPop);
    cardPop.addEventListener('mouseenter', cancelHide);
    cardPop.addEventListener('mouseleave', scheduleHide);
    cardPop.addEventListener('focusin', cancelHide);
    cardPop.addEventListener('focusout', (event) => {
      if (!event.relatedTarget || !event.relatedTarget.closest?.('.card-ref')) scheduleHide();
    });
    return cardPop;
  }

  function placeCardPop(trigger) {
    const pop = ensureCardPop();
    const triggerRect = trigger.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const gap = 14;
    const margin = 6;
    let left = triggerRect.right + gap;
    if (left + popRect.width > window.innerWidth - margin) left = triggerRect.left - popRect.width - gap;
    left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));
    let top = triggerRect.top + triggerRect.height / 2 - popRect.height / 2;
    top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function showCard(trigger) {
    const id = trigger.getAttribute('data-card-ref');
    const data = CARD_DATA[id];
    if (!data) return;
    cancelHide();
    const pop = ensureCardPop();
    if (activeTrigger && activeTrigger !== trigger) activeTrigger.setAttribute('aria-expanded', 'false');
    activeCard = id;
    activeTrigger = trigger;
    ignoreScrollUntil = Date.now() + 280;
    trigger.setAttribute('aria-expanded', 'true');
    pop.style.setProperty('--card-accent', colorGradient(data.colors));
    pop.style.setProperty('--rarity', data.rarity === 'mythic' ? '#a94d38' : data.rarity === 'rare' ? '#9b874b' : '#66717b');
    pop.innerHTML = `
      <img src="${cardPath(data.image)}" width="220" height="307" alt="${escapeHtml(data.name)}">
      <div class="cardpop-copy">
        ${manaSymbols(data.colors, `${data.name} color identity`)}
        <strong>${escapeHtml(data.name)}</strong>
        <span class="cardpop-label">What it adds here</span>
        <p class="cardpop-job">${escapeHtml(data.job)}</p>
        <p class="cardpop-oracle">${escapeHtml(data.oracle)}</p>
        <a href="${data.href}" target="_blank" rel="noopener noreferrer">Open card record <span aria-hidden="true">↗</span></a>
      </div>`;
    pop.setAttribute('aria-hidden', 'false');
    pop.classList.add('on');
    placeCardPop(trigger);
  }

  function hideCard() {
    if (!cardPop || !activeCard) return;
    cardPop.classList.remove('on');
    cardPop.setAttribute('aria-hidden', 'true');
    activeTrigger?.setAttribute('aria-expanded', 'false');
    activeCard = null;
    activeTrigger = null;
  }

  function cancelHide() { clearTimeout(hideTimer); }
  function scheduleHide() { clearTimeout(hideTimer); hideTimer = setTimeout(hideCard, 190); }

  document.addEventListener('mouseover', (event) => {
    const trigger = event.target.closest?.('.card-ref');
    if (!trigger) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => showCard(trigger), 170);
  });
  document.addEventListener('mouseout', (event) => {
    if (!event.target.closest?.('.card-ref')) return;
    clearTimeout(hoverTimer);
    scheduleHide();
  });
  document.addEventListener('focusin', (event) => {
    const trigger = event.target.closest?.('.card-ref');
    if (trigger) showCard(trigger);
  });
  document.addEventListener('focusout', (event) => {
    const trigger = event.target.closest?.('.card-ref');
    if (trigger && !event.relatedTarget?.closest?.('#cardpop')) scheduleHide();
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('#cardpop')) return;
    const trigger = event.target.closest?.('.card-ref');
    trigger ? showCard(trigger) : hideCard();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeCard) {
      const restore = activeTrigger;
      hideCard();
      restore?.focus();
    }
  });
  window.addEventListener('scroll', () => { if (Date.now() > ignoreScrollUntil) hideCard(); }, { passive: true });
  window.addEventListener('resize', hideCard);

  document.querySelectorAll('.pair-card img').forEach((img) => {
    img.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'pair-card-fallback';
      fallback.textContent = 'Card image unavailable';
      img.replaceWith(fallback);
    }, { once: true });
  });

  const shareCopy = {
    open: ['Open Partner asks: which other legend?', 'Choose one of 63, then any of the other 62 can fill the second slot.'],
    doctor: ['Doctor’s companion asks you to fill two roles.', 'Choose from 17 Doctors on one side and 27 companions on the other.'],
    other: ['The remaining rules narrow the room.', 'Closed casts keep the choice inside a group; Named Partner points to one specific relationship.']
  };

  function setAnswer(root, copy) {
    const answer = root.querySelector('.viz-answer');
    answer.querySelector('strong').textContent = copy[0];
    answer.querySelector('span').textContent = copy[1];
  }

  document.querySelectorAll('[data-share-key]').forEach((segment) => {
    segment.tabIndex = 0;
    segment.setAttribute('role', 'button');
    segment.setAttribute('aria-pressed', segment.getAttribute('data-share-key') === 'open' ? 'true' : 'false');
    const activate = () => {
      const root = segment.closest('[data-viz="pair-share"]');
      root.querySelectorAll('[data-share-key]').forEach((item) => item.setAttribute('aria-pressed', String(item === segment)));
      setAnswer(root, shareCopy[segment.getAttribute('data-share-key')]);
    };
    segment.addEventListener('click', activate);
    segment.addEventListener('focus', activate);
    segment.addEventListener('mouseenter', activate);
    segment.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
    });
  });

  const ARCHITECTURES = {
    open: {
      first: 'malcolm', second: 'breeches',
      connector: 'or', count: '61 more Open Partners', heading: 'Anyone with anyone',
      copy: 'Malcolm can sit beside Breeches—or any of the other 61 Open Partner commanders.'
    },
    doctor: {
      first: 'fourth-doctor', second: 'sarah-jane',
      connector: '+', count: '26 more companions', heading: 'Fill the other role',
      copy: 'Once The Fourth Doctor is chosen, Sarah Jane is one of 27 companions who may fill the second slot.'
    },
    group: {
      first: 'atreus', second: 'kratos',
      connector: '+', count: 'the other Father & Son card', heading: 'Stay with the cast',
      copy: 'Atreus and Kratos make up the two-card Father & Son cast. Choosing one points to the other.'
    },
    named: {
      first: 'amy', second: 'rory',
      connector: '→', count: 'no other named choice', heading: 'One named relationship',
      copy: 'Amy names Rory. Rory names Amy. This rule offers one specific co-commander.'
    }
  };

  const architectureRoot = document.querySelector('[data-viz="architectures"]');
  function drawArchitecture(key) {
    if (!architectureRoot) return;
    const data = ARCHITECTURES[key];
    architectureRoot.querySelector('.architecture-stage').innerHTML = `
      <div class="rule-table">
        <div class="rule-seat"><small>First slot</small><div class="rule-card-stack">${cardArtButton(data.first, 'the first slot', false)}</div><strong>${escapeHtml(CARD_DATA[data.first].name)}</strong></div>
        <div class="rule-connector"><span></span><strong>${data.connector}</strong><span></span></div>
        <div class="rule-seat"><small>Second slot</small><div class="rule-card-stack">${cardArtButton(data.second, 'the second slot', false)}</div><strong>${escapeHtml(CARD_DATA[data.second].name)}</strong><span class="choice-count">${escapeHtml(data.count)}</span></div>
      </div>`;
    const copy = architectureRoot.querySelector('.architecture-copy');
    copy.querySelector('strong').textContent = data.heading;
    copy.querySelector('span').textContent = data.copy;
  }
  architectureRoot?.querySelectorAll('[data-architecture]').forEach((button) => {
    button.addEventListener('click', () => {
      architectureRoot.querySelectorAll('[data-architecture]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      drawArchitecture(button.getAttribute('data-architecture'));
    });
  });
  drawArchitecture('open');

  const COLOR_JOBS = {
    zero: { first: 'april', second: 'donatello', result: 'U', label: '0 colors', answer: ['799 pairs add no new colors.', 'April and Donatello stay mono-blue. Their card text still gives the second commander another job.'] },
    one: { first: 'malcolm', second: 'breeches', result: 'UR', label: '+1 color', answer: ['One extra color is the usual result.', 'Breeches adds red to Malcolm’s blue command zone—and adds a different reward for Pirate damage.'] },
    two: { first: 'akiri', second: 'kydele', result: 'WURG', label: '+2 colors', answer: ['Only 40 pairs add two colors.', 'Akiri and Kydele join two disjoint two-color identities. The four-color result still does not prove their plans fit.'] }
  };
  const colorRoot = document.querySelector('[data-viz="color-jobs"]');
  function drawColorJob(key) {
    if (!colorRoot) return;
    const data = COLOR_JOBS[key];
    const first = CARD_DATA[data.first];
    const second = CARD_DATA[data.second];
    colorRoot.querySelector('.color-job-stage').innerHTML = `
      <div class="color-slot"><span>First commander</span>${cardArtButton(data.first, 'the color example')}${manaSymbols(first.colors, `${first.name} color identity`)}</div>
      <span class="zone-plus" aria-hidden="true">+</span>
      <div class="color-slot color-slot--second"><span>Second commander</span>${cardArtButton(data.second, 'the color example')}${manaSymbols(second.colors, `${second.name} color identity`)}</div>
      <span class="zone-equals" aria-hidden="true">=</span>
      <div class="color-result"><span>Command zone</span>${manaSymbols(data.result.split(''), `${data.result} color identity`)}<strong>${data.label}</strong></div>`;
    setAnswer(colorRoot, data.answer);
  }
  colorRoot?.querySelectorAll('[data-color-job]').forEach((button) => {
    button.addEventListener('click', () => {
      colorRoot.querySelectorAll('[data-color-job]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      drawColorJob(button.getAttribute('data-color-job'));
    });
  });
  drawColorJob('one');

  const FOUR_COLOR = {
    WBRG: { count: 8, missing: 'blue', copy: 'Eight legal pairs reach this identity.' },
    UBRG: { count: 8, missing: 'white', copy: 'Eight legal pairs reach this identity.' },
    WUBG: { count: 7, missing: 'red', copy: 'This is the narrowest four-color route.' },
    WUBR: { count: 11, missing: 'green', copy: 'Eleven legal pairs reach this identity.' },
    WURG: { count: 35, missing: 'black', copy: 'Just over half of the four-color routes land here.' }
  };
  const doorRoot = document.querySelector('[data-viz="color-doors"]');
  function drawFourColor(identity) {
    if (!doorRoot) return;
    const data = FOUR_COLOR[identity];
    doorRoot.querySelector('.identity-stage').innerHTML = `
      <div class="identity-stage-symbols">${manaSymbols(identity.split(''), `${identity} color identity`)}</div>
      <div><span>without ${data.missing}</span><strong>${data.count} <small>of 69 pairs</small></strong><p>${data.copy}</p></div>
      <div class="route-meter" aria-hidden="true"><span style="--route-share:${(data.count / 69 * 100).toFixed(2)}%"></span></div>`;
  }
  doorRoot?.querySelectorAll('[data-door]').forEach((button) => {
    button.addEventListener('click', () => {
      doorRoot.querySelectorAll('[data-door]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      drawFourColor(button.getAttribute('data-door'));
    });
  });
  drawFourColor('WURG');

  const FAMILY_PAIRS = {
    friends: {
      family: 'Friends forever', title: 'Bjorna + Elmar', summary: 'Elmar’s second-spell trigger makes a Clue. Bjorna can spend that artifact to damage and goad a creature.',
      cards: [
        { name: 'Bjorna, Nightfall Alchemist', image: 'cards/bjorna-nightfall-alchemist.jpg', colors: ['U','R'], job: 'Clues become interaction.', text: 'Tap and sacrifice an artifact to deal 1 damage to target creature, then goad that creature.', href: 'https://scryfall.com/card/83b0b716-bcb0-4044-b64a-354e3cbbd563' },
        { name: 'Elmar, Ulvenwald Informant', image: 'cards/elmar-ulvenwald-informant.jpg', colors: ['R','G'], job: 'The second spell can make a Clue.', text: 'Whenever you cast your second spell each turn, untap target creature, then investigate.', href: 'https://scryfall.com/card/95d197b3-fc56-43a2-981f-b5b905222b5c' }
      ],
      lesson: ['Elmar supplies an artifact Bjorna can spend.', 'You can still crack the Clue to draw, or Bjorna can turn it into damage and force a creature to attack elsewhere.']
    },
    character: {
      family: 'Character Select', title: 'April + Donatello', summary: 'Investigating creates a second token along the way.',
      cards: [
        { name: 'April O’Neil, Live on the Scene', image: 'cards/april-oneil-live-on-the-scene.jpg', colors: ['U'], job: 'Creature entries make Clues.', text: 'Whenever a Mutant, Ninja, or Turtle you control enters, investigate.', href: 'https://scryfall.com/card/7265ab42-5434-4127-acd6-8905ab63d62d' },
        { name: 'Donatello, the Brains', image: 'cards/donatello-the-brains.jpg', colors: ['U'], job: 'Every token event adds a Mutagen.', text: 'If one or more tokens would be created under your control, those tokens plus a Mutagen token are created instead.', href: 'https://scryfall.com/card/774716f4-d211-497a-be91-69cd700edbf2' }
      ],
      lesson: ['One token event can arrive with an extra piece.', 'April’s investigate creates a Clue. Donatello’s replacement effect adds a Mutagen token to that event.']
    },
    survivors: {
      family: 'Survivors', title: 'Abby + Joel', summary: 'Creature tokens enter from one commander and matter when they die to the other.',
      cards: [
        { name: 'Abby, Merciless Soldier', image: 'cards/abby-merciless-soldier.jpg', colors: ['R','G'], job: 'Casting her creates creature tokens.', text: 'When cast, Abby creates Cordyceps Infected creature tokens equal to the mana spent to cast her.', href: 'https://scryfall.com/card/28e11b59-c677-4235-a377-18921c5131f0' },
        { name: 'Joel, Resolute Survivor', image: 'cards/joel-resolute-survivor.jpg', colors: ['B','G'], job: 'A dying creature token becomes a counter and a card.', text: 'When a creature token dies, put a +1/+1 counter on Joel and draw a card. This triggers only once each turn.', href: 'https://scryfall.com/card/713ab02f-cd48-420d-a2fe-ef460e6ce2d2' }
      ],
      lesson: ['The same token can have an entrance and an exit job.', 'Abby supplies creature tokens. Joel notices when a creature token dies.']
    },
    'father-son': {
      family: 'Father & Son', title: 'Atreus + Kratos', summary: 'One creates experience. The other counts it.',
      cards: [
        { name: 'Atreus, Impulsive Son', image: 'cards/atreus-impulsive-son.jpg', colors: ['U','R'], job: 'Experience becomes cards and damage.', text: 'Pay three and tap Atreus to draw for each experience counter you have, discard a card, then deal 2 damage to each opponent.', href: 'https://scryfall.com/card/2e53b0b2-dba1-4a95-80c4-622ab1a547a4' },
        { name: 'Kratos, Stoic Father', image: 'cards/kratos-stoic-father.jpg', colors: ['W','R'], job: 'God attacks and deaths build experience.', text: 'Kratos creates experience counters, then turns that total into +1/+1 counters at your end step.', href: 'https://scryfall.com/card/77dcd29e-d0d5-474f-a05b-768ccf6b6293' }
      ],
      lesson: ['Experience becomes a shared command-zone resource.', 'Kratos can create the experience counters. Atreus uses the number you have when his ability resolves.']
    },
    named: {
      family: 'Named Partner', title: 'Amy + Rory', summary: 'The cards name one another—and their suspend text gives that named relationship something to do.',
      cards: [
        { name: 'Amy Pond', image: 'cards/amy-pond.jpg', colors: ['R'], job: 'Combat damage removes time counters.', text: 'When Amy hits a player, choose a suspended card you own and remove that many time counters from it. She has partner with Rory.', href: 'https://scryfall.com/card/e50a2faa-91e3-4e89-ba8d-2cbf7ac005c0' },
        { name: 'Rory Williams', image: 'cards/rory-williams.jpg', colors: ['W','U'], job: 'He suspends himself and investigates.', text: 'When cast from anywhere other than exile, Rory is exiled with three time counters, gains suspend, then investigates. He has partner with Amy.', href: 'https://scryfall.com/card/f51a010d-641c-413f-8f91-0c8ff3b2085c' }
      ],
      lesson: ['This choice starts with a name, then the text continues the conversation.', 'Rory can suspend himself. Amy can remove time counters from a suspended card you own after she deals combat damage.']
    }
  };

  const familyRoot = document.querySelector('.partner-explorer');
  const familyPairButton = familyRoot?.querySelector('.family-pair');
  const pairDialog = document.querySelector('#pair-dialog');
  const dialogContent = pairDialog?.querySelector('.pair-dialog-content');
  let selectedFamily = 'friends';
  let dialogRestore = null;

  function drawFamily(key) {
    if (!familyPairButton) return;
    selectedFamily = key;
    const data = FAMILY_PAIRS[key];
    familyPairButton.setAttribute('data-open-family-pair', key);
    familyPairButton.innerHTML = `
      <span class="family-pair-art" aria-hidden="true"><img src="${cardPath(data.cards[0].image)}" alt=""><img src="${cardPath(data.cards[1].image)}" alt=""></span>
      <span class="family-pair-copy"><small>${data.family}</small><strong>${data.title}</strong><span>${data.summary}</span><b>Open this command zone <span aria-hidden="true">→</span></b></span>`;
  }

  function openFamilyDialog() {
    if (!pairDialog || !dialogContent) return;
    const data = FAMILY_PAIRS[selectedFamily];
    dialogContent.innerHTML = `
      <div class="pair-dialog-heading"><small>${data.family}</small><h3 id="pair-dialog-title">${data.title}</h3><p>${data.summary}</p></div>
      <div class="pair-dialog-cards">${data.cards.map((card) => `
        <article class="pair-dialog-card">
          <img src="${cardPath(card.image)}" width="190" height="265" alt="${escapeHtml(card.name)}">
          <div class="pair-dialog-card-copy">${manaSymbols(card.colors, `${card.name} color identity`)}<strong>${card.name}</strong><small>What it adds here</small><span class="pair-card-job">${card.job}</span><p>${card.text}</p><a href="${card.href}" target="_blank" rel="noopener noreferrer">Open card record <span aria-hidden="true">↗</span></a></div>
        </article>`).join('')}</div>
      <div class="pair-dialog-lesson"><strong>${data.lesson[0]}</strong><span>${data.lesson[1]}</span></div>`;
    dialogRestore = familyPairButton;
    pairDialog.showModal();
    pairDialog.querySelector('.pair-dialog-close')?.focus();
  }

  familyRoot?.querySelectorAll('[data-family]').forEach((button) => {
    button.addEventListener('click', () => {
      familyRoot.querySelectorAll('[data-family]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      drawFamily(button.getAttribute('data-family'));
    });
  });
  familyPairButton?.addEventListener('click', openFamilyDialog);
  pairDialog?.querySelector('.pair-dialog-close')?.addEventListener('click', () => pairDialog.close());
  pairDialog?.addEventListener('click', (event) => { if (event.target === pairDialog) pairDialog.close(); });
  pairDialog?.addEventListener('close', () => dialogRestore?.focus());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pairDialog?.open) {
      event.preventDefault();
      pairDialog.close();
    }
  });
  drawFamily('friends');
})();
