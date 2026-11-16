(() => {
  'use strict';

  // Common-typo autocorrections. Kept separate from the dictionary: these are
  // the quick fixes applied as you type (see renderer.applyAutocorrect).
  const AUTOCORRECT = {
    teh: 'the',
    hte: 'the',
    adn: 'and',
    nad: 'and',
    taht: 'that',
    thsi: 'this',
    siad: 'said',
    liek: 'like',
    jsut: 'just',
    becuase: 'because',
    alot: 'a lot',
    recieve: 'receive',
    seperate: 'separate',
    occured: 'occurred',
    definately: 'definitely',
    neccessary: 'necessary',
    accomodate: 'accommodate',
    acheive: 'achieve',
    beleive: 'believe',
    calender: 'calendar',
    comming: 'coming',
    existance: 'existence',
    familar: 'familiar',
    foward: 'forward',
    garantee: 'guarantee',
    happend: 'happened',
    immediatly: 'immediately',
    independant: 'independent',
    knowlege: 'knowledge',
    managment: 'management',
    occassion: 'occasion',
    percieve: 'perceive',
    priviledge: 'privilege',
    propogate: 'propagate',
    quanity: 'quantity',
    remeber: 'remember',
    recomend: 'recommend',
    sucess: 'success',
    tommorow: 'tomorrow',
    untill: 'until',
    wierd: 'weird',
    freind: 'friend',
    goverment: 'government',
    enviroment: 'environment',
    excersize: 'exercise',
    suprise: 'surprise',
    wich: 'which',
    thier: 'their',
    ther: 'their',
    reciet: 'receipt',
    relevent: 'relevant',
    sincerly: 'sincerely',
    truely: 'truly',
    vacum: 'vacuum',
    wether: 'whether',
    persistant: 'persistent',
    arguement: 'argument',
    pronounciation: 'pronunciation',
    embarass: 'embarrass',
    mispell: 'misspell',
    neice: 'niece',
    occurence: 'occurrence',
    posession: 'possession',
    publically: 'publicly',
    realy: 'really',
    refered: 'referred',
    resistence: 'resistance',
    sentance: 'sentence',
    similiar: 'similar',
    unecessary: 'unnecessary',
    writting: 'writing',
    aparment: 'apartment',
    begining: 'beginning',
    cant: "can't",
    dont: "don't",
    doesnt: "doesn't",
    isnt: "isn't",
    didnt: "didn't",
    wont: "won't",
    shouldnt: "shouldn't",
    couldnt: "couldn't",
    wouldnt: "wouldn't",
    havent: "haven't",
    hasnt: "hasn't",
    im: "I'm",
    ive: "I've",
    youre: "you're",
    theyre: "they're",
    theres: "there's",
    whats: "what's",
    wheres: "where's",
    whos: "who's",
    acommodate: 'accommodate',
    arguementative: 'argumentative',
    comitment: 'commitment',
    concious: 'conscious',
    curiculum: 'curriculum',
    disapear: 'disappear',
    excape: 'escape',
    exellent: 'excellent',
    famouse: 'famous',
    finaly: 'finally',
    foriegn: 'foreign',
    grammer: 'grammar',
    harrass: 'harass',
    libary: 'library',
    maintainance: 'maintenance',
    oppurtunity: 'opportunity',
    originaly: 'originally',
    parralel: 'parallel',
    permenant: 'permanent',
    persue: 'pursue',
    phisical: 'physical',
    prefered: 'preferred',
    proffesor: 'professor',
    rythm: 'rhythm',
    suceed: 'succeed',
    tendancy: 'tendency',
    thru: 'through',
    unfortuneately: 'unfortunately'
  };

  // The full English dictionary (~275k words) is injected by words.js as a
  // newline-separated string of lowercase alphabetic words.
  const dictionary = new Set(
    (window.__WORDS__ || '').split('\n').filter(Boolean)
  );

  // How common each word is (lower = more common), injected by freq.js. Used
  // to order suggestions so the most likely correction comes first.
  const freqRank = new Map();
  const freqWords = (window.__FREQ__ || '').split('\n').filter(Boolean);
  for (let i = 0; i < freqWords.length; i += 1) {
    freqRank.set(freqWords[i], i);
  }

  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

  // All words within one edit (deletion, transposition, replacement, or
  // insertion) of `word`. Returns a Set of lowercase strings.
  function edits1(word) {
    const result = new Set();
    for (let i = 0; i <= word.length; i += 1) {
      const left = word.slice(0, i);
      const right = word.slice(i);

      if (right) {
        result.add(left + right.slice(1));                       // deletion
      }
      if (right.length > 1) {
        result.add(left + right[1] + right[0] + right.slice(2)); // transposition
      }
      for (let j = 0; j < ALPHABET.length; j += 1) {
        const c = ALPHABET[j];
        result.add(left + c + right);                            // insertion
        if (right) {
          result.add(left + c + right.slice(1));                 // replacement
        }
      }
    }
    return result;
  }

  // Suggest up to `limit` correct spellings for a misspelled word, ranked so
  // the most likely correction comes first (fewer edits, then same first
  // letter, then alphabetically). Fast enough to run on every right-click.
  function suggest(word) {
    const lower = String(word || '').toLowerCase();
    if (lower.length < 2) {
      return [];
    }

    const found = [];
    const seen = new Set();

    const consider = (candidate, distance) => {
      if (!dictionary.has(candidate) || seen.has(candidate)) {
        return;
      }
      seen.add(candidate);
      found.push({ word: candidate, distance });
    };

    // Edit distance 1 catches the vast majority of typos.
    const oneAway = edits1(lower);
    for (const candidate of oneAway) {
      consider(candidate, 1);
    }

    // Only reach for edit distance 2 when there's nothing closer, and bound
    // the work so a long misspelling can never stall the UI.
    if (found.length === 0 && lower.length <= 12) {
      let checked = 0;
      outer: for (const c1 of oneAway) {
        for (const c2 of edits1(c1)) {
          checked += 1;
          if (checked > 50000) {
            break outer;
          }
          consider(c2, 2);
        }
      }
    }

    found.sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      const aRank = freqRank.has(a.word) ? freqRank.get(a.word) : Number.MAX_SAFE_INTEGER;
      const bRank = freqRank.has(b.word) ? freqRank.get(b.word) : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      const aHead = a.word[0] === lower[0] ? 0 : 1;
      const bHead = b.word[0] === lower[0] ? 0 : 1;
      if (aHead !== bHead) {
        return aHead - bHead;
      }
      const aLen = Math.abs(a.word.length - lower.length);
      const bLen = Math.abs(b.word.length - lower.length);
      if (aLen !== bLen) {
        return aLen - bLen;
      }
      return a.word.localeCompare(b.word);
    });

    return found.slice(0, 5).map((item) => item.word);
  }

  window.__SPELLCHECK__ = { dictionary, autocorrect: AUTOCORRECT, suggest };
})();
