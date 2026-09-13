const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'questions.json');
const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const newQuestions = [
  {
    id: 331,
    exam: 'SBI Clerk',
    section: 'Reasoning',
    topic: 'Syllogism',
    question: 'Statements: All chairs are tables. All tables are desks. Conclusions: I. All chairs are desks. II. Some desks are chairs.',
    options: {
      A: 'Only I follows',
      B: 'Only II follows',
      C: 'Both I and II follow',
      D: 'Neither follows'
    },
    answer: 'C',
    explanation: 'Since all chairs are tables and all tables are desks, all chairs are desks. Also, some desks are chairs follows by conversion.'
  },
  {
    id: 332,
    exam: 'SBI Clerk',
    section: 'Reasoning',
    topic: 'Inequality',
    question: 'Statements: A ≥ B > C = D ≤ E. Conclusions: I. A > D. II. B ≤ E.',
    options: {
      A: 'Only I follows',
      B: 'Only II follows',
      C: 'Both follow',
      D: 'Neither follows'
    },
    answer: 'A',
    explanation: 'From A ≥ B > C = D, we have A > D definitely. Between B and E, relation cannot be determined since B > D and D ≤ E.'
  },
  {
    id: 333,
    exam: 'SBI Clerk',
    section: 'Reasoning',
    topic: 'Coding-Decoding',
    question: "In a certain code language, 'SMART' is coded as 'UOC TV'. How is 'CLEVER' coded in that language?",
    options: {
      A: 'ENGXGT',
      B: 'ENGZGT',
      C: 'EMGZHT',
      D: 'DNGXGT'
    },
    answer: 'A',
    explanation: 'Each letter is shifted by +2 positions in the English alphabet: C→E, L→N, E→G, V→X, E→G, R→T.'
  },
  {
    id: 334,
    exam: 'SBI Clerk',
    section: 'Reasoning',
    topic: 'Direction Sense',
    question: 'Rohan walks 15 km south from his office, turns left and walks 20 km, then turns left again and walks 15 km. How far and in which direction is he from his office?',
    options: {
      A: '20 km West',
      B: '20 km East',
      C: '15 km North',
      D: '35 km East'
    },
    answer: 'B',
    explanation: 'South and north movements (15 km each) cancel out. He is 20 km to the East of his starting point.'
  },
  {
    id: 335,
    exam: 'SBI Clerk',
    section: 'Reasoning',
    topic: 'Blood Relation',
    question: "Pointing to a man, a woman said, 'His mother is the only daughter of my mother.' How is the woman related to the man?",
    options: {
      A: 'Sister',
      B: 'Mother',
      C: 'Grandmother',
      D: 'Aunt'
    },
    answer: 'B',
    explanation: "'Only daughter of my mother' is the woman herself. Thus, she is the mother of the man."
  },
  {
    id: 336,
    exam: 'SBI Clerk',
    section: 'Quantitative Aptitude',
    topic: 'Simplification',
    question: 'Find the value of: 45% of 600 + 25% of 480 - 15 × 8.',
    options: {
      A: '260',
      B: '270',
      C: '280',
      D: '290'
    },
    answer: 'B',
    explanation: '45% of 600 = 270. 25% of 480 = 120. 15 × 8 = 120. Total = 270 + 120 - 120 = 270.'
  },
  {
    id: 337,
    exam: 'SBI Clerk',
    section: 'Quantitative Aptitude',
    topic: 'Quadratic Equation',
    question: 'Solve for x and y: I. x² - 9x + 20 = 0. II. y² - 11y + 30 = 0. Compare x and y.',
    options: {
      A: 'x > y',
      B: 'x < y',
      C: 'x ≤ y',
      D: 'x ≥ y'
    },
    answer: 'C',
    explanation: 'x² - 9x + 20 = 0 gives x = 4, 5. y² - 11y + 30 = 0 gives y = 5, 6. Since x is either less than or equal to y, x ≤ y.'
  },
  {
    id: 338,
    exam: 'SBI Clerk',
    section: 'Quantitative Aptitude',
    topic: 'Number Series',
    question: 'Find the missing number in the series: 6, 13, 28, 59, 122, ?',
    options: {
      A: '245',
      B: '247',
      C: '249',
      D: '251'
    },
    answer: 'C',
    explanation: 'Pattern: ×2 + 1, ×2 + 2, ×2 + 3, ×2 + 4, ×2 + 5. 122 × 2 + 5 = 244 + 5 = 249.'
  },
  {
    id: 339,
    exam: 'SBI Clerk',
    section: 'Quantitative Aptitude',
    topic: 'Profit and Loss',
    question: 'A shopkeeper marks an item 30% above the cost price and allows a discount of 10%. Find the profit percentage.',
    options: {
      A: '15%',
      B: '17%',
      C: '18%',
      D: '20%'
    },
    answer: 'B',
    explanation: 'Let CP = 100. MP = 130. SP = 130 - 10% of 130 = 130 - 13 = 117. Profit = 17%.'
  },
  {
    id: 340,
    exam: 'SBI Clerk',
    section: 'Quantitative Aptitude',
    topic: 'Time and Work',
    question: 'P can do a piece of work in 12 days and Q can do it in 24 days. If they work on alternate days starting with P, in how many days will the work be finished?',
    options: {
      A: '15 days',
      B: '16 days',
      C: '18 days',
      D: '20 days'
    },
    answer: 'B',
    explanation: 'Let total work = 24 units. P does 2 units/day, Q does 1 unit/day. In 2 days, they do 3 units. 24 units / 3 units = 8 pairs of 2 days = 16 days.'
  }
];

const existingIds = new Set(existing.map(q => q.id));
let added = 0;
for (const q of newQuestions) {
  if (!existingIds.has(q.id)) {
    existing.push(q);
    added++;
  }
}

fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
console.log(`Added ${added} new questions. Total questions: ${existing.length}`);
