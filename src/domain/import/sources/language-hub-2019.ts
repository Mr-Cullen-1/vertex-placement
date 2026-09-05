import type { NormalizedQuestion } from "../types";

/**
 * Language Hub Beginner to Advanced — Placement Test.
 * Published by Macmillan Education, a division of Springer Nature Limited,
 * © Springer Nature Limited, 2019.
 *
 * Transcribed verbatim from the source PDF (`Language_Hub_Placement_Test_
 * with_key.pdf`) — see /docs/PHASE_2D.md "Source integrity" for how this
 * transcription was produced and independently cross-checked.
 *
 * NOT a general-purpose PDF parser: a PDF's text layer does not preserve
 * the inline blank ("___") as an extractable character (it renders as a
 * ruled line, not text), so no automated text/layout extraction can
 * recover blank position from raw PDF content — this is a structural
 * limitation of the source format, not a shortcut. This module instead
 * holds a manually-transcribed, verified dataset for this ONE specific,
 * known source document — `import.service.ts` wraps it in an
 * `ImportedTestDraft` (see /domain/import/types.ts) so it goes through
 * the exact same validate -> preview -> confirm pipeline a different
 * source format (e.g. the generic JSON importer) would.
 *
 * Example item 0 (the worked example in the source) is intentionally
 * excluded — it is instructional, not a real test item.
 */
export const LANGUAGE_HUB_SOURCE_ATTRIBUTION =
  "Language Hub Placement Test, Macmillan Education, 2019";

export const LANGUAGE_HUB_QUESTIONS: readonly NormalizedQuestion[] = [
  {
    order: 1,
    prompt:
      "Manager: Where’s Mr Davidson?\nAssistant: Oh, he’s ___ London today.",
    options: [
      { text: "in", isCorrect: true },
      { text: "on", isCorrect: false },
      { text: "to", isCorrect: false },
      { text: "at", isCorrect: false },
    ],
    difficultyBand: "Beginner",
    sourceRef: "Language Hub Placement Test 2019 — Q1",
  },
  {
    order: 2,
    prompt:
      "Amirah: Do you like cats?\nChris: No, but there ___ lots of other animals I like.",
    options: [
      { text: "is", isCorrect: false },
      { text: "be", isCorrect: false },
      { text: "are", isCorrect: true },
      { text: "was", isCorrect: false },
    ],
    difficultyBand: "Beginner",
    sourceRef: "Language Hub Placement Test 2019 — Q2",
  },
  {
    order: 3,
    prompt:
      "Andrew: Where ___ Alicia come from?\nMartin: I think she’s from the United States.",
    options: [
      { text: "is", isCorrect: false },
      { text: "do", isCorrect: false },
      { text: "are", isCorrect: false },
      { text: "does", isCorrect: true },
    ],
    difficultyBand: "Beginner",
    sourceRef: "Language Hub Placement Test 2019 — Q3",
  },
  {
    order: 4,
    prompt:
      "Teacher: Tell me something about your parents, Lucas.\nStudent: My mother and father ___ both very tall.",
    options: [
      { text: "is", isCorrect: false },
      { text: "isn’t", isCorrect: false },
      { text: "are", isCorrect: true },
      { text: "aren’t", isCorrect: false },
    ],
    difficultyBand: "Beginner",
    sourceRef: "Language Hub Placement Test 2019 — Q4",
  },
  {
    order: 5,
    prompt:
      "Ayla: That’s a nice table, Sophie! Is it new?\nSophie: Oh no, it’s my ___ old dining table.",
    options: [
      { text: "mother", isCorrect: false },
      { text: "mothers", isCorrect: false },
      { text: "mother’s", isCorrect: true },
      { text: "mothers’", isCorrect: false },
    ],
    difficultyBand: "Beginner",
    sourceRef: "Language Hub Placement Test 2019 — Q5",
  },
  {
    order: 6,
    prompt:
      "Emma: What do you do after school?\nChloe: I see my friends. Do you visit people, too?\nEmma: No, I ___ go out.",
    options: [
      { text: "often", isCorrect: false },
      { text: "never", isCorrect: true },
      { text: "always", isCorrect: false },
      { text: "sometimes", isCorrect: false },
    ],
    difficultyBand: "Beginner",
    sourceRef: "Language Hub Placement Test 2019 — Q6",
  },
  {
    order: 7,
    prompt: "Katie: Is Charlotte at school today?\nLaura: No, she ___. She’s not well today.",
    options: [
      { text: "isn’t", isCorrect: true },
      { text: "aren’t", isCorrect: false },
      { text: "doesn’t", isCorrect: false },
      { text: "hasn’t", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q7",
  },
  {
    order: 8,
    prompt:
      "Alex: I’d like to make a cake. ___ eggs have we got?\nAndrea: Three, I think. Let me check.",
    options: [
      { text: "How big", isCorrect: false },
      { text: "How much", isCorrect: false },
      { text: "How many", isCorrect: true },
      { text: "How long", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q8",
  },
  {
    order: 9,
    prompt:
      "Ifrah: Which bus goes to the hospital?\nAntonia: ___ the 236. It stops outside.",
    options: [
      { text: "Get", isCorrect: true },
      { text: "Got", isCorrect: false },
      { text: "Gets", isCorrect: false },
      { text: "Getting", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q9",
  },
  {
    order: 10,
    prompt:
      "Father: Are we ready to go?\nDaughter: No, Mum can’t find ___ hat.",
    options: [
      { text: "its", isCorrect: false },
      { text: "his", isCorrect: false },
      { text: "her", isCorrect: true },
      { text: "their", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q10",
  },
  {
    order: 11,
    prompt: "Shop Assistant: Can I help you?\nCustomer: Yes, I’d like to buy ___ trousers.",
    options: [
      { text: "a", isCorrect: false },
      { text: "an", isCorrect: false },
      { text: "this", isCorrect: false },
      { text: "these", isCorrect: true },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q11",
  },
  {
    order: 12,
    prompt:
      "Mother: Where’s that fish I bought? It was on the table.\nDaughter: Oh no! The cat ___ it.",
    options: [
      { text: "eat", isCorrect: false },
      { text: "eats", isCorrect: false },
      { text: "is eating", isCorrect: true },
      { text: "are eating", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q12",
  },
  {
    order: 13,
    prompt:
      "Amanda: I like your new sofa.\nFahima: Thanks. It’s ___ comfortable than the other one we had.",
    options: [
      { text: "too", isCorrect: false },
      { text: "very", isCorrect: false },
      { text: "much", isCorrect: false },
      { text: "more", isCorrect: true },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q13",
  },
  {
    order: 14,
    prompt:
      "Alicia: I’m going to the supermarket. Do you want anything?\nPeter: Could you get ___ milk, please?",
    options: [
      { text: "a", isCorrect: false },
      { text: "any", isCorrect: false },
      { text: "some", isCorrect: true },
      { text: "every", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q14",
  },
  {
    order: 15,
    prompt:
      "Karina: When do you want to play football?\nAniqa: I ___ to play tomorrow, because I don’t need to go to work.",
    options: [
      { text: "like", isCorrect: false },
      { text: "likes", isCorrect: false },
      { text: "liked", isCorrect: false },
      { text: "’d like", isCorrect: true },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q15",
  },
  {
    order: 16,
    prompt: "Manisha: What did you do at the weekend?\nNicola: I ___ tennis with my friend on Saturday.",
    options: [
      { text: "play", isCorrect: false },
      { text: "played", isCorrect: true },
      { text: "plays", isCorrect: false },
      { text: "playing", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q16",
  },
  {
    order: 17,
    prompt:
      "Wife: Have we got any cheese in the fridge?\nHusband: No, we haven’t. I’m ___ buy some this afternoon.",
    options: [
      { text: "go", isCorrect: false },
      { text: "go to", isCorrect: false },
      { text: "going", isCorrect: false },
      { text: "going to", isCorrect: true },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q17",
  },
  {
    order: 18,
    prompt:
      "Laura: Where ___ you last Tuesday? I tried to phone you.\nBeatriz: Oh, I was visiting my grandmother. I didn’t have my phone with me.",
    options: [
      { text: "were", isCorrect: true },
      { text: "was", isCorrect: false },
      { text: "are", isCorrect: false },
      { text: "is", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q18",
  },
  {
    order: 19,
    prompt:
      "Miriam: Are you coming to my party on Tuesday?\nBrian: I’m really sorry, but I ___ to take my daughter to the airport.",
    options: [
      { text: "has", isCorrect: false },
      { text: "had", isCorrect: false },
      { text: "have", isCorrect: true },
      { text: "having", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q19",
  },
  {
    order: 20,
    prompt: "Saif: Why do you like running?\nIsabella: Because it’s ___ way to keep fit.",
    options: [
      { text: "best", isCorrect: false },
      { text: "better", isCorrect: false },
      { text: "the best", isCorrect: true },
      { text: "the better", isCorrect: false },
    ],
    difficultyBand: "Elementary",
    sourceRef: "Language Hub Placement Test 2019 — Q20",
  },
  {
    order: 21,
    prompt:
      "Anna: Have you lived here a long time?\nStefan: Yes, over 40 years. I know ___ of people in this town.",
    options: [
      { text: "any", isCorrect: false },
      { text: "lots", isCorrect: true },
      { text: "more", isCorrect: false },
      { text: "most", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q21",
  },
  {
    order: 22,
    prompt:
      "Josef: Why didn’t you come to the cinema last week?\nChloe: I wanted to but I couldn’t. I ___ studying for that test we had on Monday.",
    options: [
      { text: "was", isCorrect: true },
      { text: "were", isCorrect: false },
      { text: "am", isCorrect: false },
      { text: "been", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q22",
  },
  {
    order: 23,
    prompt:
      "Anna: That bird’s on the garden table again. I think it’s hungry.\nJuliana: Yes, look! It ___ eat the bread we put there.",
    options: [
      { text: "is", isCorrect: false },
      { text: "will", isCorrect: false },
      { text: "goes to", isCorrect: false },
      { text: "is going to", isCorrect: true },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q23",
  },
  {
    order: 24,
    prompt:
      "Sophie: How long ___ married?\nYing Yue: Two years. I met my husband when I was working in New York.",
    options: [
      { text: "had you got", isCorrect: false },
      { text: "did you get", isCorrect: false },
      { text: "have you been", isCorrect: true },
      { text: "are you being", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q24",
  },
  {
    order: 25,
    prompt:
      "David: Have you ___ that new film yet?\nSusanna: No, I haven’t. We could go on Thursday if you like?",
    options: [
      { text: "see", isCorrect: false },
      { text: "saw", isCorrect: false },
      { text: "seen", isCorrect: true },
      { text: "seeing", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q25",
  },
  {
    order: 26,
    prompt:
      "Shop Assistant: Excuse me, please. Could I get past?\nCustomer: Oh, I’m sorry. I’m getting in the way, ___ I?",
    options: [
      { text: "don’t", isCorrect: false },
      { text: "aren’t", isCorrect: true },
      { text: "can’t", isCorrect: false },
      { text: "haven’t", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q26",
  },
  {
    order: 27,
    prompt:
      "Wife: Advertising is a big business for musicians.\nHusband: Yes, musicians ___ a lot of money for writing short pieces of music.",
    options: [
      { text: "pay", isCorrect: false },
      { text: "paid", isCorrect: false },
      { text: "are paid", isCorrect: true },
      { text: "are paying", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q27",
  },
  {
    order: 28,
    prompt:
      "Son: Mum, I’d really like a guitar. Can I have one?\nMother: OK, but if we buy one you ___ have to practise playing it.",
    options: [
      { text: "will", isCorrect: true },
      { text: "can", isCorrect: false },
      { text: "could", isCorrect: false },
      { text: "must", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q28",
  },
  {
    order: 29,
    prompt: "Juliana: Do you like Brazilian coffee?\nMiriodere: No I don’t, because it’s ___ strong.",
    options: [
      { text: "too", isCorrect: true },
      { text: "such", isCorrect: false },
      { text: "much", isCorrect: false },
      { text: "enough", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q29",
  },
  {
    order: 30,
    prompt:
      "Matthew: Would you like anything from the shop?\nAlicia: Yes, I’d like one of ___ celebrity magazines, please.",
    options: [
      { text: "most recent", isCorrect: false },
      { text: "more recent", isCorrect: false },
      { text: "the most recent", isCorrect: true },
      { text: "the more recent", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q30",
  },
  {
    order: 31,
    prompt:
      "Daughter: Mum, my computer is broken again. I really need a new one.\nMother: I ___ buy one if we had the money, but it’s not possible right now.",
    options: [
      { text: "will", isCorrect: false },
      { text: "may", isCorrect: false },
      { text: "should", isCorrect: false },
      { text: "would", isCorrect: true },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q31",
  },
  {
    order: 32,
    prompt:
      "Mother: ___ you packed your suitcase yet? We’re leaving early tomorrow morning.\nSon: I’ll do it later. It won’t take long.",
    options: [
      { text: "Did", isCorrect: false },
      { text: "Have", isCorrect: true },
      { text: "Will", isCorrect: false },
      { text: "Are", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q32",
  },
  {
    order: 33,
    prompt:
      "Lucas: Do you play the piano, Natasha?\nNatasha: Well, I ___ play when I was younger, but I’m not sure I remember now.",
    options: [
      { text: "can", isCorrect: false },
      { text: "can’t", isCorrect: false },
      { text: "could", isCorrect: true },
      { text: "couldn’t", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q33",
  },
  {
    order: 34,
    prompt:
      "Martina: What did the doctor say about your stomach pains?\nPadma: He asked me what I ___ for the last two days.",
    options: [
      { text: "eat", isCorrect: false },
      { text: "had eaten", isCorrect: true },
      { text: "was eating", isCorrect: false },
      { text: "would eat", isCorrect: false },
    ],
    difficultyBand: "Pre-Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q34",
  },
  {
    order: 35,
    prompt:
      "Daughter: Everyone has arrived apart from Pamela.\nMother: Don’t worry, she phoned me this morning and said she ___ be a bit late.",
    options: [
      { text: "can", isCorrect: false },
      { text: "must", isCorrect: false },
      { text: "should", isCorrect: false },
      { text: "would", isCorrect: true },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q35",
  },
  {
    order: 36,
    prompt:
      "Vincent: Did you see the weather forecast? It’s going to be extremely hot this weekend.\nPauline: I know, I can’t believe it! It ___ since Monday.",
    options: [
      { text: "rains", isCorrect: false },
      { text: "has been raining", isCorrect: true },
      { text: "is raining", isCorrect: false },
      { text: "was raining", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q36",
  },
  {
    order: 37,
    prompt:
      "Ameena: What colour are you going to paint the living room?\nCharlotte: I ___ probably choose something bright, like yellow.",
    options: [
      { text: "will", isCorrect: true },
      { text: "may", isCorrect: false },
      { text: "can", isCorrect: false },
      { text: "might", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q37",
  },
  {
    order: 38,
    prompt:
      "Victor: I’d love to go back in history to see how people lived hundreds of years ago.\nSimon: Me too! If I ___ choose, I’d probably travel to ancient Rome.",
    options: [
      { text: "can", isCorrect: false },
      { text: "will", isCorrect: false },
      { text: "could", isCorrect: true },
      { text: "would", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q38",
  },
  {
    order: 39,
    prompt:
      "Stephen: The concert was fantastic yesterday. You ___ have come.\nYuuto: I know. I wanted to, but I had to work late.",
    options: [
      { text: "must", isCorrect: false },
      { text: "could", isCorrect: false },
      { text: "ought", isCorrect: false },
      { text: "should", isCorrect: true },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q39",
  },
  {
    order: 40,
    prompt:
      "Katie: Would you like to go sightseeing or to the beach this afternoon?\nMatthew: I don’t mind, I’ll let you decide.\nKatie: OK, let’s go sightseeing, ___ we?",
    options: [
      { text: "should", isCorrect: false },
      { text: "shall", isCorrect: true },
      { text: "might", isCorrect: false },
      { text: "would", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q40",
  },
  {
    order: 41,
    prompt:
      "Amanda: It said on the news that the president also owns all the national newspapers.\nAndrew: That ___ be right! I don’t think that’s true.",
    options: [
      { text: "must", isCorrect: false },
      { text: "can’t", isCorrect: true },
      { text: "won’t", isCorrect: false },
      { text: "would", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q41",
  },
  {
    order: 42,
    prompt:
      "Assistant: That meeting was really difficult. What would you have done if you ___ in my position?\nManager: Oh, I think you managed it very well.",
    options: [
      { text: "are", isCorrect: false },
      { text: "were", isCorrect: false },
      { text: "had been", isCorrect: true },
      { text: "would be", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q42",
  },
  {
    order: 43,
    prompt:
      "Natalia: My new smartphone doesn’t seem to work.\nKatie: Oh dear! Perhaps you should take it ___ and ask for a refund.",
    options: [
      { text: "up", isCorrect: false },
      { text: "out", isCorrect: false },
      { text: "away", isCorrect: false },
      { text: "back", isCorrect: true },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q43",
  },
  {
    order: 44,
    prompt:
      "Chris: I wish I could be with our cousins …\nAlison: Me too! By this time tomorrow they ___ on a Greek beach while we’re revising for our history test.",
    options: [
      { text: "sunbathe", isCorrect: false },
      { text: "will sunbathe", isCorrect: false },
      { text: "will be sunbathing", isCorrect: true },
      { text: "will have sunbathed", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q44",
  },
  {
    order: 45,
    prompt:
      "Son: Are you OK, Mum? You don’t seem very relaxed.\nMother: I just wish I ___ an aisle seat so that I could get up and walk around more easily.",
    options: [
      { text: "had chosen", isCorrect: true },
      { text: "have chosen", isCorrect: false },
      { text: "would choose", isCorrect: false },
      { text: "should choose", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q45",
  },
  {
    order: 46,
    prompt:
      "Nicola: I love this picture, but won’t it cost a fortune?\nVictor: No, it’s just a copy. The original, ___ is a portrait of the artist’s friend, sold for €4 million!",
    options: [
      { text: "whose", isCorrect: false },
      { text: "which", isCorrect: true },
      { text: "whom", isCorrect: false },
      { text: "that", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q46",
  },
  {
    order: 47,
    prompt:
      "Laura: I can’t believe how talented this artist was.\nEmily: I know, it’s amazing. ___ he was almost 90 when he did them, his paintings are beautiful.",
    options: [
      { text: "Since", isCorrect: false },
      { text: "Besides", isCorrect: false },
      { text: "Although", isCorrect: true },
      { text: "Therefore", isCorrect: false },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q47",
  },
  {
    order: 48,
    prompt:
      "Andrea: I want to buy some new shoes for the winter.\nShan: Well, I ___ looking for a new pair of boots for weeks, but I can’t find anything I like.",
    options: [
      { text: "am", isCorrect: false },
      { text: "was", isCorrect: false },
      { text: "had been", isCorrect: false },
      { text: "have been", isCorrect: true },
    ],
    difficultyBand: "Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q48",
  },
  {
    order: 49,
    prompt:
      "Client: I don’t have much money – just enough to ___.\nAccountant: Well, let me suggest a way of helping you save more.",
    options: [
      { text: "get by", isCorrect: true },
      { text: "pay off", isCorrect: false },
      { text: "do with", isCorrect: false },
      { text: "make up", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q49",
  },
  {
    order: 50,
    prompt:
      "Pablo: In April next year I ___ here for ten years exactly.\nAlison: Wow! It really doesn’t seem that long.",
    options: [
      { text: "will live", isCorrect: false },
      { text: "will be living", isCorrect: false },
      { text: "am going to live", isCorrect: false },
      { text: "will have been living", isCorrect: true },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q50",
  },
  {
    order: 51,
    prompt:
      "Student: Is it true that it took Bell and Watson ages to invent the telephone?\nTeacher: Yes. When they finally succeeded, they ___ on it for about 30 years.",
    options: [
      { text: "must work", isCorrect: false },
      { text: "had been working", isCorrect: true },
      { text: "have worked", isCorrect: false },
      { text: "would be working", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q51",
  },
  {
    order: 52,
    prompt:
      "Rachel: This would be a lovely place to sit on a dry day.\nNatasha: Yes, I know. I just wish the rain ___.",
    options: [
      { text: "would stop", isCorrect: true },
      { text: "has stopped", isCorrect: false },
      { text: "will have stopped", isCorrect: false },
      { text: "would be stopping", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q52",
  },
  {
    order: 53,
    prompt:
      "Student: What’s today’s lesson going to be about?\nTeacher: Today we’re going to learn about a tribe ___ descendants live in Lima, the capital of Peru.",
    options: [
      { text: "who", isCorrect: false },
      { text: "which", isCorrect: false },
      { text: "whose", isCorrect: true },
      { text: "whom", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q53",
  },
  {
    order: 54,
    prompt:
      "Andrea: Did your town have a good market?\nKatie: Yes. When I was young we ___ there every Saturday looking for bargains.",
    options: [
      { text: "had gone", isCorrect: false },
      { text: "would go", isCorrect: true },
      { text: "were going", isCorrect: false },
      { text: "had been going", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q54",
  },
  {
    order: 55,
    prompt:
      "Daughter: Joanna has been really supportive. I’m so lucky to have her as a friend.\nMother: Yes. Just think – if you hadn’t sat next to her in class at school, you ___ so close now.",
    options: [
      { text: "won’t be", isCorrect: false },
      { text: "wouldn’t be", isCorrect: true },
      { text: "wouldn’t have been", isCorrect: false },
      { text: "aren’t", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q55",
  },
  {
    order: 56,
    prompt: "David: Did you see the headline this evening?\nNicola: Yes – the Prime Minister was ___ to resign today.",
    options: [
      { text: "charged", isCorrect: false },
      { text: "argued", isCorrect: false },
      { text: "struggled", isCorrect: false },
      { text: "forced", isCorrect: true },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q56",
  },
  {
    order: 57,
    prompt:
      "Student: I’m concerned about the chemical test results I’ve just had from the river.\nProfessor: It ___ be a good idea to check the acid levels as well then.",
    options: [
      { text: "must", isCorrect: false },
      { text: "should", isCorrect: false },
      { text: "might", isCorrect: true },
      { text: "ought", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q57",
  },
  {
    order: 58,
    prompt:
      "Aamir: They’ve just announced that our train has been delayed.\nLaura: That’s annoying. We ___ have rushed to get here after all.",
    options: [
      { text: "needn’t", isCorrect: true },
      { text: "could", isCorrect: false },
      { text: "should", isCorrect: false },
      { text: "mustn’t", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q58",
  },
  {
    order: 59,
    prompt:
      "Liam: So, your Dad’s got a laptop!\nCian: Yes, I bought it for him last year – until then he ___ a typewriter!",
    options: [
      { text: "used", isCorrect: false },
      { text: "has used", isCorrect: false },
      { text: "has been using", isCorrect: false },
      { text: "had been using", isCorrect: true },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q59",
  },
  {
    order: 60,
    prompt:
      "Isabella: The flight is fully booked, so I won’t be able to go to Barbados next week.\nSafia: If you ___ the ticket sooner, you’d have found a seat.",
    options: [
      { text: "had booked", isCorrect: true },
      { text: "were booking", isCorrect: false },
      { text: "booked", isCorrect: false },
      { text: "would have booked", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q60",
  },
  {
    order: 61,
    prompt:
      "Receptionist: You ___ taken a taxi to the hotel since you arrived so late.\nCustomer: It was OK, actually. There was a direct bus service from the airport.",
    options: [
      { text: "will have", isCorrect: false },
      { text: "should have", isCorrect: true },
      { text: "might have", isCorrect: false },
      { text: "would have", isCorrect: false },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q61",
  },
  {
    order: 62,
    prompt:
      "Sophie: Have they finished interviewing for the manager’s position yet?\nRafi: No, but they ___ all the candidates by next Friday.",
    options: [
      { text: "won’t see", isCorrect: false },
      { text: "would see", isCorrect: false },
      { text: "haven’t seen", isCorrect: false },
      { text: "will have seen", isCorrect: true },
    ],
    difficultyBand: "Upper Intermediate",
    sourceRef: "Language Hub Placement Test 2019 — Q62",
  },
  {
    order: 63,
    prompt: "Athlete: ___ hard I try, I can’t run any faster.\nCoach: You’ve improved a lot. I wouldn’t worry about it.",
    options: [
      { text: "Though", isCorrect: false },
      { text: "Whereas", isCorrect: false },
      { text: "However", isCorrect: true },
      { text: "Considering", isCorrect: false },
    ],
    difficultyBand: "Advanced",
    sourceRef: "Language Hub Placement Test 2019 — Q63",
  },
  {
    order: 64,
    prompt:
      "Laura: That’s a really beautiful painting. The colours are so vivid.\nJeremy: Yes, it’s amazing to think it was lost for years and ___.",
    options: [
      { text: "must be restored", isCorrect: false },
      { text: "had to be restored", isCorrect: true },
      { text: "has been restoring", isCorrect: false },
      { text: "would be restoring", isCorrect: false },
    ],
    difficultyBand: "Advanced",
    sourceRef: "Language Hub Placement Test 2019 — Q64",
  },
  {
    order: 65,
    prompt:
      "Charlotte: I saw the photos from the film festival. Was that you with the actor from The Hobbit?\nNiall: Yes, it was! ___ did I imagine I would ever actually meet him.",
    options: [
      { text: "Not", isCorrect: false },
      { text: "Much", isCorrect: false },
      { text: "Hardly", isCorrect: false },
      { text: "Little", isCorrect: true },
    ],
    difficultyBand: "Advanced",
    sourceRef: "Language Hub Placement Test 2019 — Q65",
  },
  {
    order: 66,
    prompt:
      "Pauline: I hear you got soaked on the golf course this morning.\nChris: Yes. I wish I ___ listened to the weather forecast.",
    options: [
      { text: "had", isCorrect: true },
      { text: "have", isCorrect: false },
      { text: "would have", isCorrect: false },
      { text: "should have", isCorrect: false },
    ],
    difficultyBand: "Advanced",
    sourceRef: "Language Hub Placement Test 2019 — Q66",
  },
  {
    order: 67,
    prompt:
      "Laura: How was the meeting?\nRicardo: It finished late because Victor didn’t arrive until 5 pm. He told me he ___ been given the wrong directions.",
    options: [
      { text: "has", isCorrect: false },
      { text: "had", isCorrect: true },
      { text: "should have", isCorrect: false },
      { text: "would have", isCorrect: false },
    ],
    difficultyBand: "Advanced",
    sourceRef: "Language Hub Placement Test 2019 — Q67",
  },
  {
    order: 68,
    prompt:
      "Andrew: I picked up some of that cat food you wanted.\nPedro: Oh good. Once ___ to these new cat biscuits, they won’t want to go back to the other stuff.",
    options: [
      { text: "we’ve switched", isCorrect: true },
      { text: "we’ll be switching", isCorrect: false },
      { text: "we’ll have switched", isCorrect: false },
      { text: "we’ve been switched", isCorrect: false },
    ],
    difficultyBand: "Advanced",
    sourceRef: "Language Hub Placement Test 2019 — Q68",
  },
  {
    order: 69,
    prompt:
      "Antonia: Has your son done well in his exams?\nPhillip: Yes. Only once ___ he wasn’t sufficiently prepared, but he can take that one again.",
    options: [
      { text: "he found", isCorrect: false },
      { text: "he has found", isCorrect: false },
      { text: "did he find", isCorrect: true },
      { text: "could he find", isCorrect: false },
    ],
    difficultyBand: "Advanced",
    sourceRef: "Language Hub Placement Test 2019 — Q69",
  },
  {
    order: 70,
    prompt:
      "Son: I had a bit of a stomach ache this morning.\nMother: Oh dear! Well, I did say you ___ eaten that chicken last night.",
    options: [
      { text: "wouldn’t have", isCorrect: false },
      { text: "couldn’t have", isCorrect: false },
      { text: "mustn’t have", isCorrect: false },
      { text: "shouldn’t have", isCorrect: true },
    ],
    difficultyBand: "Advanced",
    sourceRef: "Language Hub Placement Test 2019 — Q70",
  },
];
