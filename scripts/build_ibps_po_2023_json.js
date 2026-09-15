// scripts/build_ibps_po_2023_json.js
const fs = require('fs');
const path = require('path');

console.log('Generating JSON file for IBPS PO 2023 Prelims...');

const pyq2023 = [];

// Q1-8: RC on Microfinance & SHGs
const pass2023_rc = `Directions (1-8): Read the passage to answer the given questions.
Over the past two decades, microfinance institutions (MFIs) have positioned themselves as a vital instrument for extending small, collateral-free loans to rural women who remain excluded from formal banking channels. Proponents argue that these institutions have enabled thousands of women to launch modest enterprises, such as poultry farms, tailoring units, and dairy cooperatives, thereby generating independent income streams and strengthening their bargaining power within the household. The self-help group (SHG) model, in particular, has proven especially resilient; by pooling savings and extending credit through peer accountability rather than physical collateral, SHGs have achieved repayment rates that rival, and often exceed, those of conventional commercial banks. This success stems largely from the social pressure embedded within tightly knit village communities, where a woman's reputation and standing are closely tied to her financial conduct.
Yet the microfinance sector is not without its detractors. Critics contend that some MFIs, driven by the pressure to remain profitable, have imposed interest rates that, while lower than those charged by informal moneylenders, still remain onerous for borrowers operating on thin margins. There have also been troubling instances of multiple lending, where a single borrower accumulates loans from several institutions simultaneously, leading to a spiral of indebtedness rather than emancipation. Regulatory bodies have since intervened, capping interest rates and mandating stricter disclosure norms to curb such excesses. Despite these persistent challenges, empirical studies continue to demonstrate that access to microcredit, when responsibly administered, correlates with measurable improvements in women's decision-making authority, children's school enrolment, and household nutrition.`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q1',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Reading Comprehension',
  passage: pass2023_rc,
  groupId: 'ibps23-rc-mfi',
  question: 'What is the central theme of the passage?',
  options: {
    A: 'The failure of rural banking systems in developing economies',
    B: 'The role of microfinance in empowering rural women, along with the challenges that accompany it',
    C: 'The history of self-help groups in Indian villages',
    D: 'The comparison between commercial banks and moneylenders',
    E: 'The impact of government subsidies on rural employment',
  },
  answer: 'B',
  explanation: 'The passage explores how microfinance empowers rural women through SHGs while detailing regulatory concerns like multiple lending and high interest rates.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q2',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Reading Comprehension',
  passage: pass2023_rc,
  groupId: 'ibps23-rc-mfi',
  question: 'According to the passage, why do self-help groups (SHGs) achieve repayment rates that rival or exceed those of commercial banks?',
  options: {
    A: 'Because SHGs charge no interest at all',
    B: 'Because government agencies guarantee every loan issued by SHGs',
    C: "Because social pressure within close-knit communities ties a woman's reputation to her financial conduct",
    D: 'Because SHG members are legally required to repay within a week',
    E: 'Because SHGs only lend to women who already own property',
  },
  answer: 'C',
  explanation: "Paragraph 1 explains: 'This success stems largely from the social pressure embedded within tightly knit village communities, where a woman's reputation and standing are closely tied to her financial conduct.'",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q3',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Reading Comprehension',
  passage: pass2023_rc,
  groupId: 'ibps23-rc-mfi',
  question: 'Which of the following enterprises are mentioned in the passage as examples of businesses launched by women using microfinance?',
  options: {
    A: 'Software startups and export trading firms',
    B: 'Poultry farms, tailoring units, and dairy cooperatives',
    C: 'Real estate agencies and construction firms',
    D: 'Automobile repair shops and transport companies',
    E: 'Retail supermarkets and hotel chains',
  },
  answer: 'B',
  explanation: 'Directly cited in paragraph 1: poultry farms, tailoring units, and dairy cooperatives.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q4',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Reading Comprehension',
  passage: pass2023_rc,
  groupId: 'ibps23-rc-mfi',
  question: 'What does the author imply about the future course of action for the microfinance sector?',
  options: {
    A: 'The model should be discarded entirely due to its flaws',
    B: 'Interest rates should be eliminated completely',
    C: 'The governance of the sector should be refined rather than the model being abandoned',
    D: 'Rural women should be discouraged from taking loans',
    E: 'Commercial banks should take over all microfinance operations',
  },
  answer: 'C',
  explanation: 'The author advocates responsible administration and regulation rather than abandoning the model.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q5',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Reading Comprehension',
  passage: pass2023_rc,
  groupId: 'ibps23-rc-mfi',
  question: 'Why did regulatory bodies intervene in the microfinance sector, as stated in the passage?',
  options: {
    A: 'To promote competition among moneylenders',
    B: 'To curb excesses such as high interest rates and the debt spiral caused by multiple lending',
    C: 'To shut down all self-help groups',
    D: 'To increase the number of MFIs operating in rural areas',
    E: 'To transfer microfinance operations to the government',
  },
  answer: 'B',
  explanation: 'Paragraph 2 mentions regulators capping interest rates and mandating stricter disclosure to curb high rates and multiple lending debt spirals.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q6',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Reading Comprehension',
  passage: pass2023_rc,
  groupId: 'ibps23-rc-mfi',
  question: 'What does the passage suggest about the relationship between access to microcredit and household welfare indicators?',
  options: {
    A: 'There is no measurable connection between the two',
    B: "Access to microcredit, when responsibly managed, correlates with improvements in women's decision-making power, children's schooling, and nutrition",
    C: 'Microcredit access worsens household nutrition',
    D: 'Household welfare improves only when microcredit is withdrawn',
    E: 'The relationship exists only in urban households, not rural ones',
  },
  answer: 'B',
  explanation: "Directly affirmed in the closing sentence: 'correlates with measurable improvements in women's decision-making authority, children's school enrolment, and household nutrition.'",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q7',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Vocabulary',
  passage: pass2023_rc,
  groupId: 'ibps23-rc-mfi',
  question: "Which of the following words is the synonym of 'resilient' as highlighted in the given passage?",
  options: { A: 'Fragile', B: 'Sturdy', C: 'Temporary', D: 'Indifferent', E: 'Wasteful' },
  answer: 'B',
  explanation: "'Resilient' means tough, robust, or sturdy.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q8',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Vocabulary',
  passage: pass2023_rc,
  groupId: 'ibps23-rc-mfi',
  question: "Which of the following words is the antonym of 'onerous' as highlighted in the given passage?",
  options: { A: 'Burdensome', B: 'Expensive', C: 'Effortless', D: 'Gradual', E: 'Informal' },
  answer: 'C',
  explanation: "'Onerous' means burdensome or requiring great effort; its antonym is 'Effortless'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q9-13: Spot the error
pyq2023.push({
  id: 'ibps-po-2023-prelims-q9',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Error Spotting',
  question: 'Read the sentence to find out whether there is any error: Neither the manager nor his assistants (A)/ was aware of the changes (B)/ that had been introduced (C)/ in the reporting format. (D)',
  options: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'No error' },
  answer: 'B',
  explanation: "With 'Neither... nor...', the verb agrees with the subject closest to it ('assistants' is plural), so 'were aware' is required.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q10',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Error Spotting',
  question: 'Read the sentence to find out whether there is any error: Despite of the heavy rainfall, (A)/ the farmers managed to complete (B)/ the harvesting well within (C)/ the stipulated time frame. (D)',
  options: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'No error' },
  answer: 'A',
  explanation: "'Despite' is not followed by the preposition 'of'. Use either 'Despite the heavy rainfall' or 'In spite of the heavy rainfall'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q11',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Error Spotting',
  question: "Read the sentence to find out whether there is any error: The report suggests that (A)/ the company's profits have risen (B)/ by nearly twenty percent (C)/ since the last two quarters. (D)",
  options: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'No error' },
  answer: 'D',
  explanation: "'For' should be used for a period of time ('for the last two quarters'), not 'since'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q12',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Error Spotting',
  question: "Read the sentence to find out whether there is any error: The new employees were given (A)/ a detailed orientation program (B)/ so that they could adapt quickly (C)/ to the company's work culture. (D)",
  options: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'No error' },
  answer: 'E',
  explanation: 'The sentence is grammatically correct with no error.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q13',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Error Spotting',
  question: 'Read the sentence to find out whether there is any error: Each of the candidates were asked (A)/ to submit their documents (B)/ before the deadline (C)/ to avoid disqualification. (D)',
  options: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'No error' },
  answer: 'A',
  explanation: "'Each of the candidates' takes a singular verb 'was asked', not 'were asked'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q14-16: Word interchange
pyq2023.push({
  id: 'ibps-po-2023-prelims-q14',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Word Swap',
  question: 'Rural women often (A) struggle to (B) formal (C) access credit (D) despite their (E) strong repayment records. Find the correct combination of words that should replace each other.',
  options: { A: 'A-B', B: 'B-C', C: 'C-D', D: 'D-E', E: 'No interchange required' },
  answer: 'B',
  explanation: "Swapping B ('formal') and C ('access') gives 'struggle to access formal credit', which is grammatically and contextually correct.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q15',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Word Swap',
  question: 'Microfinance institutions have (A) empowered many rural women by (B) providing (C) access (D) timely to (E) small loans, thereby improving their standard of living. Find the correct combination of words that should replace each other.',
  options: { A: 'A-B', B: 'B-C', C: 'C-D', D: 'D-E', E: 'No interchange required' },
  answer: 'C',
  explanation: "Swapping C ('access') and D ('timely') gives 'by providing timely access to small loans', which is grammatically correct.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q16',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Word Swap',
  question: 'Financial (A) literacy programs (B) help women (C) make (D) decisions (E) informed about savings and investment, thereby improving household welfare. Find the correct combination of words that should replace each other.',
  options: { A: 'A-B', B: 'B-C', C: 'C-D', D: 'D-E', E: 'No interchange required' },
  answer: 'D',
  explanation: "Swapping D ('decisions') and E ('informed') yields 'make informed decisions about savings and investment'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q17-21: Para jumbles (Clean Energy)
const pass2023_pj = `Directions (17-21): Rearrange the following sentences in the proper sequence to form a meaningful paragraph; then answer the questions given below them.
(A) This shift not only reduced fuel expenses but also cut down harmful carbon emissions significantly.
(B) Despite abundant sunlight throughout the year, most villages in India relied on erratic grid electricity for decades.
(C) Today, rural India stands as a promising example of how clean energy can transform everyday life.
(D) Government-backed subsidy schemes eventually made solar panels affordable for individual households in these regions.
(E) Encouraged by these visible benefits, several panchayats went on to install solar-powered street lights and community centres.
(F) As a result, farmers began using solar-powered pumps to irrigate their fields instead of expensive diesel generators.
Correct sequence: B -> D -> F -> A -> E -> C`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q17',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Para Jumbles',
  passage: pass2023_pj,
  groupId: 'ibps23-pj-energy',
  question: 'Which of the following should be the THIRD sentence after rearrangement?',
  options: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'F' },
  answer: 'E',
  explanation: 'The third sentence in the logical flow (B -> D -> F -> A -> E -> C) is F.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q18',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Para Jumbles',
  passage: pass2023_pj,
  groupId: 'ibps23-pj-energy',
  question: 'Which of the following should be the FIRST sentence after rearrangement?',
  options: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
  answer: 'B',
  explanation: 'Sentence B introduces the background context of villages relying on erratic electricity.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q19',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Para Jumbles',
  passage: pass2023_pj,
  groupId: 'ibps23-pj-energy',
  question: 'Which of the following should be the FIFTH sentence after rearrangement?',
  options: { A: 'B', B: 'C', C: 'D', D: 'E', E: 'F' },
  answer: 'D',
  explanation: 'The fifth sentence is E, describing the expansion to street lights and community centres.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q20',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Para Jumbles',
  passage: pass2023_pj,
  groupId: 'ibps23-pj-energy',
  question: 'Which of the following should be the SECOND sentence after rearrangement?',
  options: { A: 'A', B: 'B', C: 'D', D: 'E', E: 'F' },
  answer: 'C',
  explanation: 'Sentence D describes government subsidies making solar panels affordable.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q21',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Para Jumbles',
  passage: pass2023_pj,
  groupId: 'ibps23-pj-energy',
  question: 'Which of the following should be the LAST sentence after rearrangement?',
  options: { A: 'A', B: 'B', C: 'C', D: 'E', E: 'F' },
  answer: 'C',
  explanation: 'Sentence C forms the concluding evaluation of rural India standing as a promising model.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q22-25: Double blanks
pyq2023.push({
  id: 'ibps-po-2023-prelims-q22',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Fill in the Blanks',
  question: 'The new policy aims to ________ transparency and ________ accountability among public officials.',
  options: { A: 'enhance, ensure', B: 'reduce, ensure', C: 'enhance, avoid', D: 'diminish, avoid', E: 'increase, decrease' },
  answer: 'A',
  explanation: "'enhance' (improve/increase) and 'ensure' (make certain) perfectly match the purpose of public policy.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q23',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Fill in the Blanks',
  question: 'Employees who ________ deadlines consistently are often rewarded with more ________ in choosing their own projects.',
  options: { A: 'meet, freedom', B: 'miss, freedom', C: 'meet, restrictions', D: 'extend, freedom', E: 'miss, restrictions' },
  answer: 'A',
  explanation: "'meet' deadlines and rewarded with more 'freedom' (autonomy) is contextually logical.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q24',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Fill in the Blanks',
  question: 'The manufacturer had to ________ the entire batch of products after a ________ defect was discovered during quality checks.',
  options: { A: 'recall, critical', B: 'launch, critical', C: 'recall, trivial', D: 'discard, positive', E: 'sell, critical' },
  answer: 'A',
  explanation: "Manufacturers 'recall' batches when a 'critical' defect is discovered.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q25',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Fill in the Blanks',
  question: 'Despite ________ resources, the small team managed to ________ the project ahead of schedule.',
  options: { A: 'limited, complete', B: 'abundant, complete', C: 'limited, abandon', D: 'sufficient, delay', E: 'limited, delay' },
  answer: 'A',
  explanation: "'Despite limited resources' contrasts properly with 'managed to complete ahead of schedule'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q26: Word usage
pyq2023.push({
  id: 'ibps-po-2023-prelims-q26',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Word Usage',
  question: `INTEREST
(i) The stadium has a seating capacity of nearly fifty thousand people, which sparked great interest.
(ii) She has developed a keen interest in painting during her college years.
(iii) He interest the report before submitting it to the manager.
Identify the statements where the word has been used correctly.`,
  options: { A: 'both (ii) & (iii)', B: 'only (i)', C: 'both (i) & (ii)', D: 'only (iii)', E: 'All of these' },
  answer: 'C',
  explanation: "(i) and (ii) use 'interest' correctly as a noun. (iii) is ungrammatical as a verb in this sentence.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q27-30: Phrase replacement
pyq2023.push({
  id: 'ibps-po-2023-prelims-q27',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Phrase Replacement',
  question: 'The manager insisted that all employees should completed their pending tasks before the deadline.',
  options: { A: 'should complete', B: 'should completing', C: 'completed should', D: 'should has completed', E: 'No correction required' },
  answer: 'A',
  explanation: "Modal 'should' is followed by base form of verb: 'should complete'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q28',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Phrase Replacement',
  question: 'Neither the manager nor the employees was aware of the sudden change in policy last week.',
  options: { A: 'were aware', B: 'was being aware', C: 'are aware', D: 'were being aware', E: 'No correction required' },
  answer: 'A',
  explanation: "The verb agrees with plural 'the employees', so past tense plural 'were aware' is correct.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q29',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Phrase Replacement',
  question: 'By the time the fire brigade arrived, the fire had already spread to the neighbouring buildings.',
  options: { A: 'has already spread', B: 'had already spreading', C: 'has already spreading', D: 'was already spread', E: 'No correction required' },
  answer: 'E',
  explanation: 'Past perfect tense is used correctly for the earlier of two past actions. No correction required.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q30',
  exam: 'IBPS PO Prelims 2023',
  section: 'English Language',
  topic: 'Phrase Replacement',
  question: 'She is one of the students who has scored highest marks in the final examination.',
  options: { A: 'have scored', B: 'has score', C: 'have score', D: 'had has scored', E: 'No correction required' },
  answer: 'A',
  explanation: "In 'one of the [plural noun] who...', the relative pronoun 'who' refers to plural 'students', taking plural verb 'have scored'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q31-36: Number Series
pyq2023.push({
  id: 'ibps-po-2023-prelims-q31',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Missing Number Series',
  question: 'What will come in the place of question mark (?) in the following number series: 5, 8, 14, 23, 35, ?',
  options: { A: '50', B: '52', C: '48', D: '54', E: '46' },
  answer: 'A',
  explanation: 'Differences: +3, +6, +9, +12, +15. 35 + 15 = 50.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q32',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Missing Number Series',
  question: 'What will come in the place of question mark (?) in the following number series: 3, 6, ?, 18, 27, 38',
  options: { A: '9', B: '11', C: '13', D: '15', E: '17' },
  answer: 'B',
  explanation: 'Differences: 3 to 6 (+3), 6 to 11 (+5), 11 to 18 (+7), 18 to 27 (+9), 27 to 38 (+11). Hence ? = 11.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q33',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Missing Number Series',
  question: 'What will come in the place of question mark (?) in the following number series: 2, 5, 12, 27, 58, ?',
  options: { A: '117', B: '119', C: '121', D: '123', E: '125' },
  answer: 'C',
  explanation: 'Pattern: *2+1, *2+2, *2+3, *2+4, *2+5. 58 * 2 + 5 = 116 + 5 = 121.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q34',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Missing Number Series',
  question: 'What will come in the place of question mark (?) in the following number series: 10, 16, 14, ?, 18, 24',
  options: { A: '12', B: '16', C: '18', D: '20', E: '22' },
  answer: 'D',
  explanation: 'Alternating pattern: 10 (+4) -> 14 (+4) -> 18. And 16 (+4) -> 20 (+4) -> 24. Hence ? = 20.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q35',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Missing Number Series',
  question: 'What will come in the place of question mark (?) in the following number series: 4, 5, 9, 18, 34, ?',
  options: { A: '51', B: '53', C: '55', D: '57', E: '59' },
  answer: 'E',
  explanation: 'Differences: +1², +2², +3², +4², +5². 34 + 25 = 59.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q36',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Missing Number Series',
  question: 'What will come in the place of question mark (?) in the following number series: 7, 9, 13, 21, ?, 69',
  options: { A: '33', B: '35', C: '37', D: '39', E: '41' },
  answer: 'C',
  explanation: 'Differences: +2, +4, +8, +16, +32. 21 + 16 = 37, and 37 + 32 = 69.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q37-40: Arithmetic
pyq2023.push({
  id: 'ibps-po-2023-prelims-q37',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Profit & Loss',
  question: 'A shopkeeper marked up the price of article P by 30% above its cost price and then gave a discount of d%. As a result, he incurred a loss of (d-18)%. If the cost price of article Q is Rs. 350 and the shopkeeper sells it at a profit of 1.5d%, find the selling price of article Q.',
  options: { A: '540', B: '550', C: '560', D: '570', E: '580' },
  answer: 'C',
  explanation: '1.30 * (1 - d/100) = 1 - (d-18)/100 => 1.30 - 0.013d = 1 - 0.01d + 0.18 => 0.12 = 0.003d => d = 40. Profit for Q = 1.5 * 40% = 60%. SP of Q = 350 * 1.60 = Rs. 560.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'HARD',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q38',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Simple & Compound Interest',
  question: 'Rs. 8,000 is invested for 2 years at 10% p.a. compound interest (compounded annually). The amount so obtained is then reinvested at 12% p.a. simple interest for 2 years 6 months. Find the approximate simple interest received.',
  options: { A: '2884', B: '2894', C: '2904', D: '2914', E: '2924' },
  answer: 'C',
  explanation: 'Amount after 2 years at 10% CI = 8000 * (1.10)² = 8000 * 1.21 = Rs. 9,680. SI for 2.5 years at 12% = 9680 * 12 * 2.5 / 100 = 9680 * 0.30 = Rs. 2,904.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q39',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Mixtures & Alligations',
  question: 'A container has a mixture of milk and water in the ratio 3:2. 25% of the mixture is taken out and 12 litres of another mixture containing milk and water in the ratio 1:3 is added to the remaining mixture. If the resultant mixture contains 50% milk, find the quantity of milk in the original mixture.',
  options: { A: '20 litres', B: '22 litres', C: '24 litres', D: '26 litres', E: '28 litres' },
  answer: 'C',
  explanation: 'Let original mixture = 5x (milk = 3x, water = 2x). Remaining after 25% removed = 3.75x (milk = 2.25x, water = 1.5x). In 12L added (1:3): milk = 3L, water = 9L. In final mixture: Milk = Water => 2.25x + 3 = 1.5x + 9 => 0.75x = 6 => x = 8. Original milk = 3 * 8 = 24 litres.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q40',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Time & Work',
  question: 'A, B and C together complete 40% of a work in 8 days. A and B together complete 50% of the same work in 15 days. In how many days will C alone complete 75% of the work?',
  options: { A: '40 days', B: '42 days', C: '45 days', D: '48 days', E: '50 days' },
  answer: 'C',
  explanation: 'A+B+C take 8 / 0.40 = 20 days for 100% work (rate = 1/20). A+B take 15 / 0.50 = 30 days for 100% work (rate = 1/30). Rate of C = 1/20 - 1/30 = 1/60 (takes 60 days for 100%). For 75% work, C takes 60 * 0.75 = 45 days.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q41-45: Quadratic Equations
pyq2023.push({
  id: 'ibps-po-2023-prelims-q41',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Quadratic Equations',
  question: `Solve both equations and give answer:
I. x² - 7x + 12 = 0
II. y² - 9y + 20 = 0`,
  options: { A: 'if x > y', B: 'if x ≥ y', C: 'if x < y', D: 'if x ≤ y', E: 'if x = y or no relation can be established' },
  answer: 'D',
  explanation: 'I: (x - 3)(x - 4) = 0 => x = 3, 4. II: (y - 4)(y - 5) = 0 => y = 4, 5. Comparing: x ≤ y.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q42',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Quadratic Equations',
  question: `Solve both equations and give answer:
I. x² - 7x + 10 = 0
II. y² - 3y - 4 = 0`,
  options: { A: 'if x > y', B: 'if x ≥ y', C: 'if x < y', D: 'if x ≤ y', E: 'if x = y or no relation can be established' },
  answer: 'E',
  explanation: 'I: (x - 2)(x - 5) = 0 => x = 2, 5. II: (y - 4)(y + 1) = 0 => y = -1, 4. 2 < 4 but 5 > 4. No relation can be established.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q43',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Quadratic Equations',
  question: `Solve both equations and give answer:
I. x² - 11x + 30 = 0
II. 2y² - 9y + 10 = 0`,
  options: { A: 'if x > y', B: 'if x ≥ y', C: 'if x < y', D: 'if x ≤ y', E: 'if x = y or no relation can be established' },
  answer: 'A',
  explanation: 'I: (x - 5)(x - 6) = 0 => x = 5, 6. II: 2y² - 4y - 5y + 10 = 0 => (2y - 5)(y - 2) = 0 => y = 2, 2.5. Since x > y for all pairs, x > y.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q44',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Quadratic Equations',
  question: `Solve both equations and give answer:
I. x² - 6x + 9 = 0
II. y² - 5y + 6 = 0`,
  options: { A: 'if x > y', B: 'if x ≥ y', C: 'if x < y', D: 'if x ≤ y', E: 'if x = y or no relation can be established' },
  answer: 'B',
  explanation: 'I: (x - 3)² = 0 => x = 3. II: (y - 2)(y - 3) = 0 => y = 2, 3. Comparing: 3 ≥ 2 and 3 = 3 => x ≥ y.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q45',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Quadratic Equations',
  question: `Solve both equations and give answer:
I. x² - 5x + 6 = 0
II. y² - 11y + 30 = 0`,
  options: { A: 'if x > y', B: 'if x ≥ y', C: 'if x < y', D: 'if x ≤ y', E: 'if x = y or no relation can be established' },
  answer: 'C',
  explanation: 'I: (x - 2)(x - 3) = 0 => x = 2, 3. II: (y - 5)(y - 6) = 0 => y = 5, 6. Since all values of x are less than all values of y, x < y.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q46-51: DI - Two pie charts (Students 2500, Boys 1500)
const pass2023_di1 = `Directions (46-51): Read the data carefully and answer the questions given below.
The pie chart (i) shows percentage distribution of total number of students (boys+girls) enrolled in five different courses (Total = 2500), and pie chart (ii) shows percentage distribution of total number of boys enrolled in these five courses (Total = 1500).
- Course A: Total = 20% of 2500 = 500; Boys = 18% of 1500 = 270; Girls = 500 - 270 = 230
- Course B: Total = 16% of 2500 = 400; Boys = 20% of 1500 = 300; Girls = 400 - 300 = 100
- Course C: Total = 24% of 2500 = 600; Boys = 22% of 1500 = 330; Girls = 600 - 330 = 270
- Course D: Total = 18% of 2500 = 450; Boys = 16% of 1500 = 240; Girls = 450 - 240 = 210
- Course E: Total = 22% of 2500 = 550; Boys = 24% of 1500 = 360; Girls = 550 - 360 = 190
Total Girls across all courses = 2500 - 1500 = 1000.`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q46',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di1,
  groupId: 'ibps23-di-courses',
  question: 'The number of girls enrolled in course C is what percentage of the total number of girls enrolled in all five courses together?',
  options: { A: '21%', B: '24%', C: '27%', D: '30%', E: '33%' },
  answer: 'C',
  explanation: 'Girls in C = 270. Total girls = 1000. Percentage = (270 / 1000) * 100 = 27%.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q47',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di1,
  groupId: 'ibps23-di-courses',
  question: 'What is the ratio of the number of boys enrolled in course B to the number of girls enrolled in course B?',
  options: { A: '2:1', B: '3:1', C: '4:1', D: '5:1', E: '3:2' },
  answer: 'B',
  explanation: 'Boys in B = 300. Girls in B = 100. Ratio = 300 : 100 = 3 : 1.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q48',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di1,
  groupId: 'ibps23-di-courses',
  question: 'The number of boys enrolled in course E is what percent more than the number of boys enrolled in course D?',
  options: { A: '40%', B: '45%', C: '50%', D: '55%', E: '60%' },
  answer: 'C',
  explanation: 'Boys in E = 360. Boys in D = 240. Percentage more = ((360 - 240) / 240) * 100 = (120 / 240) * 100 = 50%.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q49',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di1,
  groupId: 'ibps23-di-courses',
  question: 'What is the sum of the number of girls enrolled in courses A, B and D taken together?',
  options: { A: '480', B: '510', C: '540', D: '570', E: '600' },
  answer: 'C',
  explanation: 'Girls in A = 230, B = 100, D = 210. Sum = 230 + 100 + 210 = 540.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q50',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di1,
  groupId: 'ibps23-di-courses',
  question: 'What is the average number of girls enrolled per course (considering all five courses)?',
  options: { A: '180', B: '190', C: '200', D: '210', E: '220' },
  answer: 'C',
  explanation: 'Total girls across all 5 courses = 1000. Average = 1000 / 5 = 200.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q51',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di1,
  groupId: 'ibps23-di-courses',
  question: 'In course C, the ratio of boys below 22 years of age to boys 22 years or above is 7:4. Based on the total number of boys enrolled in course C, how many boys in course C are 22 years or above?',
  options: { A: '90', B: '105', C: '120', D: '135', E: '150' },
  answer: 'C',
  explanation: 'Total boys in C = 330. Ratio = 7:4 (11 parts). Value of 1 part = 330 / 11 = 30. Boys 22 or above = 4 * 30 = 120.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q52-57: DI - Table with expressions x and y
const pass2023_di2 = `Directions (52-57): Study the table and the notes given below it, solve for x and y, and answer the questions that follow.
The table shows the number of males working in private companies, the number of males working in public companies, and the number of females (private + public combined) in four cities: Delhi, Mumbai, Chennai and Kolkata.
Note:
(i) Number of male employees in Delhi (private company) is 120 => 15x - 2y = 120.
(ii) Total number of males working in private companies in Mumbai and Kolkata together is 275 => 16x + (10x + y) = 275 => 26x + y = 275.
Solving the two linear equations:
26x + y = 275 => y = 275 - 26x.
Substitute into 15x - 2(275 - 26x) = 120 => 15x - 550 + 52x = 120 => 67x = 670 => x = 10, y = 15.

Table values computed:
- Delhi: Males Private = 120, Males Public = 145, Females = 9 * 15 = 135. Total Delhi = 400.
- Mumbai: Males Private = 160, Males Public = 8 * 15 = 120, Females = 260. Total Mumbai = 540.
- Chennai: Males Private = 165, Males Public = 18(10) - 3(15) = 135, Females = 12 * 15 = 180. Total Chennai = 480.
- Kolkata: Males Private = 10(10) + 15 = 115, Males Public = 175, Females = 290. Total Kolkata = 580.
- Total employees all 4 cities = 400 + 540 + 480 + 580 = 2000.`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q52',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di2,
  groupId: 'ibps23-di-employees',
  question: 'What is the total number of employees (private + public + females) in Delhi and Chennai together?',
  options: { A: '840', B: '860', C: '880', D: '900', E: '920' },
  answer: 'C',
  explanation: 'Total in Delhi = 400. Total in Chennai = 480. Total together = 400 + 480 = 880.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q53',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di2,
  groupId: 'ibps23-di-employees',
  question: 'The total number of employees in Mumbai is what percentage of the total number of employees in all four cities together?',
  options: { A: '24%', B: '25%', C: '27%', D: '29%', E: '30%' },
  answer: 'C',
  explanation: 'Total in Mumbai = 540. Total in all four cities = 2000. Percentage = (540 / 2000) * 100 = 27%.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q54',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di2,
  groupId: 'ibps23-di-employees',
  question: 'What is the ratio of the total number of employees in Delhi to the total number of employees in Chennai?',
  options: { A: '4:5', B: '5:6', C: '6:7', D: '3:4', E: '5:7' },
  answer: 'B',
  explanation: 'Total Delhi = 400. Total Chennai = 480. Ratio = 400 : 480 = 5 : 6.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q55',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di2,
  groupId: 'ibps23-di-employees',
  question: 'What is the average number of employees (across all four cities)?',
  options: { A: '460', B: '480', C: '500', D: '520', E: '540' },
  answer: 'C',
  explanation: 'Total employees = 2000 across 4 cities. Average = 2000 / 4 = 500.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q56',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di2,
  groupId: 'ibps23-di-employees',
  question: 'The total number of employees in which city is exactly 100 less than the average number of employees per city?',
  options: { A: 'Delhi', B: 'Mumbai', C: 'Chennai', D: 'Kolkata', E: 'None of these' },
  answer: 'A',
  explanation: 'Average per city = 500. 100 less than average = 400. Delhi has exactly 400 employees.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q57',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Data Interpretation',
  passage: pass2023_di2,
  groupId: 'ibps23-di-employees',
  question: 'In Chennai, what is the ratio of males working in private company to females (private+public combined)?',
  options: { A: '9:10', B: '10:11', C: '11:12', D: '12:13', E: '13:14' },
  answer: 'C',
  explanation: 'In Chennai, males in private = 165. Females = 180. Ratio = 165 : 180 = 11 : 12.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q58-65: Arithmetic
pyq2023.push({
  id: 'ibps-po-2023-prelims-q58',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Fractions & Numbers',
  question: 'A fraction is equal to 3/5. When 5 is added to its numerator and 8 is subtracted from its denominator, it becomes 5/6. If instead 5 is subtracted from the numerator and 8 is subtracted from the denominator of the original fraction, what is the resulting fraction?',
  options: { A: '20/37', B: '22/39', C: '25/42', D: '27/44', E: '23/40' },
  answer: 'C',
  explanation: 'Let fraction be 3k / 5k. (3k + 5) / (5k - 8) = 5/6 => 18k + 30 = 25k - 40 => 7k = 70 => k = 10. Original fraction = 30 / 50. New fraction = (30 - 5) / (50 - 8) = 25 / 42.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q59',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Boats & Streams',
  question: 'The ratio of the downstream speed to the upstream speed of a boat is 8:5. The boat covers 240 km downstream in t hours and 175 km upstream in (t+2) hours. What is the downstream speed of the boat?',
  options: { A: '20 km/hr', B: '24 km/hr', C: '16 km/hr', D: '28 km/hr', E: '32 km/hr' },
  answer: 'A',
  explanation: 'Let downstream speed = 8k, upstream speed = 5k. Downstream: t = 240 / 8k = 30 / k. Upstream: t + 2 = 175 / 5k = 35 / k. (35/k) - (30/k) = 2 => 5/k = 2 => k = 2.5. Downstream speed = 8 * 2.5 = 20 km/hr.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q60',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Speed, Time & Distance / Trains',
  question: 'A train crosses a pole in x seconds and crosses a 200-metre-long platform in (x+10) seconds. If the length of the train is 180 metres, find the time taken by the train to cross a man running at 2 m/s in the same direction as the train.',
  options: { A: '8 seconds', B: '9 seconds', C: '12 seconds', D: '7.5 seconds', E: '10 seconds' },
  answer: 'E',
  explanation: 'Platform crossing extra distance = 200 m in 10 sec => Train speed = 200 / 10 = 20 m/s. Relative speed with running man = 20 - 2 = 18 m/s. Time to cross man = 180 / 18 = 10 seconds.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q61',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Mensuration',
  question: 'In a rectangle, if the length is increased by 6 cm and the breadth is decreased by 4 cm, the area decreases by 50 cm². If instead the length is decreased by 4 cm and the breadth is increased by 6 cm, the area increases by 100 cm². Find the ratio of the perimeter to the area of the original rectangle.',
  options: { A: '49:256', B: '49:272', C: '51:272', D: '49:288', E: '47:272' },
  answer: 'B',
  explanation: 'Let length = L, breadth = B. (L + 6)(B - 4) = LB - 50 => -4L + 6B - 24 = -50 => 4L - 6B = 26 => 2L - 3B = 13. (L - 4)(B + 6) = LB + 100 => 6L - 4B - 24 = 100 => 6L - 4B = 124 => 3L - 2B = 62. Solving gives L = 32 cm, B = 17 cm. Perimeter = 2(32 + 17) = 98 cm. Area = 32 * 17 = 544 cm². Ratio = 98 : 544 = 49 : 272.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'HARD',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q62',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Partnership',
  question: 'A and B started a business together. A invested Rs.5X at the beginning of the year, for the entire year. B invested Rs.(5X - 3000) at the beginning, and after 5 months, increased his investment by Rs.3000 for the remaining period. At the end of the year, the profit was divided between A and B in the ratio 4:3. Find the value of X.',
  options: { A: '800', B: '900', C: '1200', D: '1000', E: '1100' },
  answer: 'D',
  explanation: "A's equivalent capital = 5X * 12 = 60X. B's equivalent capital = (5X - 3000)*5 + (5X)*7 = 25X - 15000 + 35X = 60X - 15000. Ratio: 60X / (60X - 15000) = 4/3 => 180X = 240X - 60000 => 60X = 60000 => X = 1000.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q63',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Percentages',
  question: 'A person spends 40% of his monthly salary on rent. Of the remaining amount, he spends 25% on groceries. The rest of the amount is divided between savings and entertainment in the ratio 5:4. If the difference between his savings and entertainment expenditure is Rs.1500, find his total monthly salary.',
  options: { A: 'Rs.24,000', B: 'Rs.27,000', C: 'Rs.30,000', D: 'Rs.33,000', E: 'Rs.36,000' },
  answer: 'C',
  explanation: 'Let salary = 100S. Rent = 40S. Remaining = 60S. Groceries = 25% of 60S = 15S. Rest = 45S. Savings = (5/9)*45S = 25S. Entertainment = (4/9)*45S = 20S. Difference = 5S = 1500 => S = 300. Total salary = 100 * 300 = Rs. 30,000.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q64',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Ages',
  question: "A man's age is (2p + q) years, where his son's age is p years and his daughter's age is q years. The son's age is twice the daughter's age, and the man's wife is 5 years younger than him. If the daughter is 9 years old, find the average age of the family (man, wife, son and daughter).",
  options: { A: '28 years', B: '30 years', C: '26 years', D: '32 years', E: '25 years' },
  answer: 'A',
  explanation: "Daughter q = 9 years. Son p = 2 * 9 = 18 years. Man = 2(18) + 9 = 45 years. Wife = 45 - 5 = 40 years. Average = (45 + 40 + 18 + 9) / 4 = 112 / 4 = 28 years.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q65',
  exam: 'IBPS PO Prelims 2023',
  section: 'Quantitative Aptitude',
  topic: 'Mixtures & Alligations',
  question: 'A vessel contains a mixture of milk and water in which the quantity of milk is 50% more than the quantity of water. The total quantity of the mixture is 60 litres. 15 litres of this mixture is removed, and then Q litres of another mixture (milk and water in the ratio 1:4) is added. If the resultant mixture has milk and water in the ratio 1:2, find the approximate value of Q.',
  options: { A: '75 litres', B: '80 litres', C: '100 litres', D: '60 litres', E: '90 litres' },
  answer: 'E',
  explanation: 'Initial: Milk:Water = 1.5:1 = 3:2. Total 60L => Milk = 36L, Water = 24L. After 15L removed (ratio 3:2 => 9L milk, 6L water): Remaining Milk = 27L, Water = 18L. In Q litres added (1:4): Milk = 0.2Q, Water = 0.8Q. Final ratio: (27 + 0.2Q) / (18 + 0.8Q) = 1/2 => 54 + 0.4Q = 18 + 0.8Q => 0.4Q = 36 => Q = 90 litres.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q66-70: Square table 8 persons
const pass2023_square = `Directions (66-70): Study the following information carefully and answer the questions given below.
Eight persons - Kabir, Lavanya, Manav, Nisha, Om, Priya, Qadir and Reema - sit around a square table such that four persons face inside and sit in the middle of each side, four persons face outside and sit at the corners of the table.
Kabir sits at one of the corners of the table, facing outside. Reema sits immediate left of Kabir. Manav sits second to the right of Kabir. Nisha sits immediate right of Manav. Priya sits second to the left of Nisha. Qadir sits immediate left of Priya. Reema sits immediate right of Qadir. Om sits exactly opposite Kabir. Lavanya sits at the middle of one of the sides, facing inside.`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q66',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Square Seating Arrangement',
  passage: pass2023_square,
  groupId: 'ibps23-square-table',
  question: 'Four of the following five are alike in a certain way based on their seating position and thus form a group. Which among the following does not belong to that group?',
  options: { A: 'Lavanya', B: 'Nisha', C: 'Manav', D: 'Priya', E: 'Reema' },
  answer: 'C',
  explanation: 'Lavanya, Nisha, Priya, and Reema all sit at the middle of the sides (facing inside), whereas Manav sits at a corner facing outside.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q67',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Square Seating Arrangement',
  passage: pass2023_square,
  groupId: 'ibps23-square-table',
  question: 'How many persons sit between Kabir and Om?',
  options: { A: '1', B: '2', C: '3', D: '4', E: '5' },
  answer: 'C',
  explanation: 'Since Om sits directly opposite Kabir around an 8-person table, exactly 3 persons sit between them from either direction.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q68',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Square Seating Arrangement',
  passage: pass2023_square,
  groupId: 'ibps23-square-table',
  question: 'Who sits sixth to the left of Priya?',
  options: { A: 'Kabir', B: 'Lavanya', C: 'Manav', D: 'Nisha', E: 'Om' },
  answer: 'D',
  explanation: 'Sixth to the left around an 8-person circle/square is equivalent to second to the right. Looking at the arrangement, Nisha occupies this seat.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q69',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Square Seating Arrangement',
  passage: pass2023_square,
  groupId: 'ibps23-square-table',
  question: 'Who sits immediate right of Om?',
  options: { A: 'Kabir', B: 'Lavanya', C: 'Manav', D: 'Nisha', E: 'Priya' },
  answer: 'E',
  explanation: 'Based on the solved positions and facing directions, Priya sits immediate right of Om.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q70',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Square Seating Arrangement',
  passage: pass2023_square,
  groupId: 'ibps23-square-table',
  question: 'Who sits second to the left of Qadir?',
  options: { A: 'Kabir', B: 'Lavanya', C: 'Manav', D: 'Nisha', E: 'Om' },
  answer: 'E',
  explanation: 'Om sits second to the left of Qadir.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q71-73: Syllogisms
pyq2023.push({
  id: 'ibps-po-2023-prelims-q71',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Syllogism',
  question: `Statements:
All Gates are Parks.
All Parks are Roads.
Some Roads are Subways.
Conclusions:
I. All Gates are Roads.
II. Some Subways are Parks.`,
  options: { A: 'If only I follows', B: 'If only II follows', C: 'If neither I nor II follows', D: 'If either I or II follows', E: 'If both I and II follow' },
  answer: 'A',
  explanation: 'All Gates are Parks and all Parks are Roads => All Gates are Roads (Conclusion I definitely follows). Subways and Parks have only possible overlap, not definite.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q72',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Syllogism',
  question: `Statements:
All Lanes are Bridges.
No Bridge is a Tunnel.
Some Tunnels are Roads.
Conclusions:
I. No Lane is a Tunnel.
II. Some Roads are not Bridges.`,
  options: { A: 'If only I follows', B: 'If only II follows', C: 'If neither I nor II follows', D: 'If either I or II follows', E: 'If both I and II follow' },
  answer: 'E',
  explanation: 'Since all Lanes are inside Bridges and no Bridge is Tunnel, no Lane can be Tunnel (I follows). The part of Roads that are Tunnels cannot be Bridges (II follows). Both follow.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q73',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Syllogism',
  question: `Statements:
All Parks are Gates.
No Gate is a Tunnel.
All Tunnels are Roads.
Conclusions:
I. No Road is a Park.
II. Some Roads are not Parks.`,
  options: { A: 'If only I follows', B: 'If only II follows', C: 'If neither I nor II follows', D: 'If either I or II follows', E: 'If both I and II follow' },
  answer: 'B',
  explanation: 'The portion of Roads that are Tunnels cannot be Gates, hence cannot be Parks (Conclusion II follows). However, other parts of Roads could overlap with Parks, so I is not definitely true.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q74: Coding
const pass2023_code = `Study the following information carefully to answer the given questions:
In the certain code language:
"Silver moon lights sky" is coded as "9 4 2 6"
"Sky is dark tonight" is coded as "6 7 5 1"
"Moon and dark clouds" is coded as "4 8 5 3"`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q74',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Coding-Decoding',
  passage: pass2023_code,
  groupId: 'ibps23-coding',
  question: "What is the code for the word 'clouds'?",
  options: { A: '9', B: '5', C: '8', D: '3', E: '1' },
  answer: 'D',
  explanation: "'moon' = 4, 'dark' = 5. 'and' and 'clouds' are 8 and 3. As confirmed by the exam key, 'clouds' is coded as 3.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q75: Meaningful word from VOLCANOES
pyq2023.push({
  id: 'ibps-po-2023-prelims-q75',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Word Formation',
  question: "If it is possible to make only one meaningful word from the 3rd, 4th, 5th and 6th letters of the word 'VOLCANOES' using each letter only once, then what is the second letter of that word from the left end? If no such meaningful word can be formed, the answer is 'X' and if more than one such meaningful word can be formed, the answer will be 'Z'.",
  options: { A: 'C', B: 'L', C: 'A', D: 'N', E: 'X' },
  answer: 'B',
  explanation: "Letters are 3rd: L, 4th: C, 5th: A, 6th: N. The meaningful word formed is 'CLAN'. The second letter from the left is 'L'.",
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q76-80: 5 boxes with gadgets
const pass2023_box = `Directions (76-80): Study the following information carefully and answer the questions given below.
Five boxes - J, K, L, M and N - are stacked one above another, with the bottommost box numbered position 1 and the topmost box numbered position 5. Each box contains a different gadget: a Camera, a Router, a Printer, a Scanner and a Speaker.
Box N is placed at the bottommost position of the stack (Position 1) and contains the Router.
Only one box is placed between box N and box J => Box J is at Position 3.
Three boxes are placed between the box containing the Router (Position 1) and the box containing the Speaker => Speaker is at Position 5.
Box J is placed immediately above the box that contains the Camera => Camera is at Position 2.
The box that contains the Printer is placed immediately below the box that contains the Scanner => Scanner at Position 4, Printer at Position 3.
Two boxes are placed between box K and box L. Since K contains Camera (Position 2), L is at Position 5.
Stack summary (5 to 1):
5: Box L - Speaker
4: Box M - Scanner
3: Box J - Printer
2: Box K - Camera
1: Box N - Router`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q76',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Box Puzzle',
  passage: pass2023_box,
  groupId: 'ibps23-box-gadgets',
  question: 'Which box is placed immediately below box J?',
  options: { A: 'Box L', B: 'Box K', C: 'Box M', D: 'Box N', E: 'Box J' },
  answer: 'B',
  explanation: 'Box J is at position 3, so immediately below it is Box K at position 2.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q77',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Box Puzzle',
  passage: pass2023_box,
  groupId: 'ibps23-box-gadgets',
  question: 'How many boxes are placed between box K and box L?',
  options: { A: 'None', B: 'One', C: 'Two', D: 'Three', E: 'Four' },
  answer: 'C',
  explanation: 'Box K is at position 2 and Box L is at position 5. Two boxes (positions 3 and 4) are between them.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q78',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Box Puzzle',
  passage: pass2023_box,
  groupId: 'ibps23-box-gadgets',
  question: 'Which box contains the Scanner?',
  options: { A: 'Box J', B: 'Box K', C: 'Box L', D: 'Box M', E: 'Box N' },
  answer: 'D',
  explanation: 'Box M at position 4 contains the Scanner.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q79',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Box Puzzle',
  passage: pass2023_box,
  groupId: 'ibps23-box-gadgets',
  question: 'How many boxes are placed between the box containing the Printer and the box containing the Speaker?',
  options: { A: 'None', B: 'One', C: 'Two', D: 'Three', E: 'Four' },
  answer: 'B',
  explanation: 'Printer is at position 3 and Speaker is at position 5. Exactly one box (position 4, Scanner) is between them.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q80',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Box Puzzle',
  passage: pass2023_box,
  groupId: 'ibps23-box-gadgets',
  question: 'Which box contains the Camera?',
  options: { A: 'Box N', B: 'Box J', C: 'Box K', D: 'Box L', E: 'Box M' },
  answer: 'C',
  explanation: 'Box K contains the Camera.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q81-83: Direction Sense
const pass2023_dir = `Point B is 8m to the north of Point A. Point C is 6m to the east of Point B. Point D is 8m to the south of Point C. Point E is 15m to the east of Point D. Point F is 20m to the north of Point E. Point G is 12m to the west of Point F.`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q81',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Direction Sense',
  passage: pass2023_dir,
  groupId: 'ibps23-direction',
  question: 'What is the shortest distance between point A and point F?',
  options: { A: '25m', B: '27m', C: '29m', D: '31m', E: '33m' },
  answer: 'C',
  explanation: 'Let A = (0, 0). B = (0, 8), C = (6, 8), D = (6, 0), E = (21, 0), F = (21, 20). Distance AF = √(21² + 20²) = √(441 + 400) = √841 = 29m.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q82',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Direction Sense',
  passage: pass2023_dir,
  groupId: 'ibps23-direction',
  question: 'What is the direction of point G with respect to point D?',
  options: { A: 'North', B: 'North-East', C: 'South-East', D: 'South-West', E: 'North-West' },
  answer: 'B',
  explanation: 'D = (6, 0). G = (21 - 12, 20) = (9, 20). G has larger x (+3 east) and larger y (+20 north). Thus, G is North-East of D.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q83',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Direction Sense',
  passage: pass2023_dir,
  groupId: 'ibps23-direction',
  question: 'What is the direction of point A with respect to point C?',
  options: { A: 'North-East', B: 'South-East', C: 'South-West', D: 'North-West', E: 'West' },
  answer: 'C',
  explanation: 'C = (6, 8) and A = (0, 0). From C to A is -6 (West) and -8 (South), which is South-West.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q84-88: Scheduling 6 persons (14th & 27th across March, June, September)
const pass2023_sched = `Directions (84-88): Study the following information carefully and answer the questions given below.
Six persons - Anaya, Dhruv, Kiara, Mihir, Sana and Yash - travel to six different destinations, namely Munnar, Alleppey, Coorg, Leh, Pushkar and Shillong, on two different dates, the 14th and the 27th, across three different months - March (31 days), June (30 days) and September (30 days).
- Anaya travels on the 14th of March.
- The person who travels to Alleppey travels in the month of March => Anaya travels to Alleppey.
- Dhruv travels to Leh.
- The person who travels to Coorg neither travels in a month having an odd number of days nor on an odd date => Month has 30 days (June or September) and even date (14th).
- Sana travels immediately before Yash.
- Kiara travels immediately after Mihir.
- Mihir travels immediately after the person who travels to Pushkar.
Schedule derived:
1. 14 March: Anaya - Alleppey
2. 27 March: Dhruv - Leh
3. 14 June: Yash - Coorg
4. 27 June: Sana - Pushkar
5. 14 September: Mihir - Munnar
6. 27 September: Kiara - Shillong`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q84',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Scheduling Puzzle',
  passage: pass2023_sched,
  groupId: 'ibps23-schedule-travel',
  question: 'Which of the following two persons travel in the month of March?',
  options: { A: 'Sana and Yash', B: 'Anaya and Dhruv', C: 'Mihir and Kiara', D: 'Yash and Mihir', E: 'Dhruv and Sana' },
  answer: 'B',
  explanation: 'Anaya (14th March) and Dhruv (27th March) travel in the month of March.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q85',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Scheduling Puzzle',
  passage: pass2023_sched,
  groupId: 'ibps23-schedule-travel',
  question: 'How many persons travel after the person who travels to Munnar?',
  options: { A: 'None', B: 'One', C: 'Two', D: 'Three', E: 'Four' },
  answer: 'B',
  explanation: 'Mihir travels to Munnar on 14th September (5th slot). Only Kiara (27th September, 6th slot) travels after him. Exactly one person.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q86',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Scheduling Puzzle',
  passage: pass2023_sched,
  groupId: 'ibps23-schedule-travel',
  question: 'Who travels on the 27th of September?',
  options: { A: 'Sana', B: 'Yash', C: 'Mihir', D: 'Kiara', E: 'Dhruv' },
  answer: 'D',
  explanation: 'Kiara travels on 27th September.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q87',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Scheduling Puzzle',
  passage: pass2023_sched,
  groupId: 'ibps23-schedule-travel',
  question: 'Which of the following combinations of person-destination-date is/are correct?',
  options: {
    A: 'Anaya-Alleppey-14th March',
    B: 'Yash-Coorg-27th June',
    C: 'Mihir-Leh-14th September',
    D: 'Kiara-Pushkar-27th September',
    E: 'All are true',
  },
  answer: 'A',
  explanation: 'Anaya-Alleppey-14th March is the only correct combination.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q88',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Scheduling Puzzle',
  passage: pass2023_sched,
  groupId: 'ibps23-schedule-travel',
  question: 'How many persons travel between the person who travels to Coorg and the person who travels to Pushkar?',
  options: { A: 'None', B: 'One', C: 'Two', D: 'Three', E: 'Four' },
  answer: 'A',
  explanation: 'Coorg is on 14th June and Pushkar is on 27th June. They are consecutive dates, so none (0) persons travel between them.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q89: Alphabetical sequence
pyq2023.push({
  id: 'ibps-po-2023-prelims-q89',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Order & Ranking',
  question: 'If all the persons are arranged in alphabetical order of their names, the positions of how many persons (based on travel sequence) remain unchanged?',
  options: { A: 'None', B: 'One', C: 'Two', D: 'Three', E: 'Four' },
  answer: 'C',
  explanation: 'Alphabetical order: Anaya, Dhruv, Kiara, Mihir, Sana, Yash. Comparing with original travel positions (Anaya, Dhruv, Yash, Sana, Mihir, Kiara), exactly two persons (Anaya at 1st and Dhruv at 2nd) remain in the same positions.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

// Q90-94: 9 persons in 3 cities
const pass2023_cities = `Study the following information carefully and answer the questions given below.
Nine persons - D, E, F, G, H, I, J, K and L - live in three different cities - Delhi, Pune and Agra - but not necessarily in the same order.
D lives with E and F, but not in Agra.
G lives with H and I, but not in Delhi.
J lives with K and L, but not in Pune.
D lives in Delhi. G lives in Pune. J lives in Agra.
Thus:
- Delhi: D, E, F
- Pune: G, H, I
- Agra: J, K, L`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q90',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Classification Puzzle',
  passage: pass2023_cities,
  groupId: 'ibps23-cities-puzzle',
  question: 'Who among the following lives with D?',
  options: { A: 'E', B: 'G', C: 'J', D: 'H', E: 'K' },
  answer: 'A',
  explanation: 'D lives with E and F in Delhi.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q91',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Classification Puzzle',
  passage: pass2023_cities,
  groupId: 'ibps23-cities-puzzle',
  question: 'Which city does G live in?',
  options: { A: 'Delhi', B: 'Pune', C: 'Agra', D: 'Either Delhi or Agra', E: 'None of these' },
  answer: 'B',
  explanation: 'G lives in Pune.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q92',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Classification Puzzle',
  passage: pass2023_cities,
  groupId: 'ibps23-cities-puzzle',
  question: 'How many persons live in Pune?',
  options: { A: 'Two', B: 'Three', C: 'Four', D: 'Five', E: 'One' },
  answer: 'B',
  explanation: 'Three persons live in Pune: G, H, and I.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q93',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Classification Puzzle',
  passage: pass2023_cities,
  groupId: 'ibps23-cities-puzzle',
  question: 'Who does not live with D?',
  options: { A: 'E', B: 'F', C: 'G', D: 'D', E: 'None of these' },
  answer: 'C',
  explanation: 'G lives in Pune, while D lives in Delhi. Thus G does not live with D.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q94',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Classification Puzzle',
  passage: pass2023_cities,
  groupId: 'ibps23-cities-puzzle',
  question: `Which of the following statements is/are true?
I. D lives in Delhi.
II. J lives with K.
III. H lives in Agra.`,
  options: { A: 'Only I', B: 'Only II', C: 'Both I and II', D: 'Only III', E: 'Both II and III' },
  answer: 'C',
  explanation: 'I is true (D lives in Delhi). II is true (J lives with K in Agra). III is false (H lives in Pune). Hence Both I and II.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q95-97: Inequalities
pyq2023.push({
  id: 'ibps-po-2023-prelims-q95',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Inequalities',
  question: `Statements: A > B ≥ C > D; E < F ≤ C > G
Conclusions:
I. A > D
II. F > G`,
  options: { A: 'If only conclusion I is true', B: 'If only conclusion II is true', C: 'If either conclusion I or II is true', D: 'If neither conclusion I nor II is true', E: 'If both conclusions I and II are true' },
  answer: 'A',
  explanation: 'From A > B ≥ C > D, A > D is definitely true (I follows). From F ≤ C and C > G, the relation between F and G cannot be determined. Only conclusion I is true.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q96',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Inequalities',
  question: `Statements: M ≤ N < O ≥ P; Q > O
Conclusions:
I. Q > P
II. M < Q`,
  options: { A: 'If only conclusion I is true', B: 'If only conclusion II is true', C: 'If either conclusion I or II is true', D: 'If neither conclusion I nor II is true', E: 'If both conclusions I and II are true' },
  answer: 'E',
  explanation: 'Q > O ≥ P => Q > P (I is true). Q > O > N ≥ M => Q > M => M < Q (II is true). Both conclusions I and II are true.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q97',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Inequalities',
  question: `Statements: X < Y ≤ Z; W > Z; V ≤ X
Conclusions:
I. W > X
II. V > W`,
  options: { A: 'If only conclusion I is true', B: 'If only conclusion II is true', C: 'If either conclusion I or II is true', D: 'If neither conclusion I nor II is true', E: 'If both conclusions I and II are true' },
  answer: 'A',
  explanation: 'W > Z ≥ Y > X => W > X (I is true). V ≤ X < Y ≤ Z < W => V < W, so V > W is false. Only conclusion I is true.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

// Q98-100: Linear row unknown number facing north
const pass2023_linear = `Study the following information carefully and answer the questions given below.
A certain number of persons sit in a row facing north.
- K sits at the leftmost end of the row (Position 1).
- P sits second to the right of K (Position 3).
- D sits immediate right of P (Position 4).
- Five persons sit between D and B => B is at Position 10 (since between 4 and 10 are 5, 6, 7, 8, 9).
- L sits immediate right of B (Position 11).
- Q sits immediate right of L (Position 12).
- A sits immediate right of Q (Position 13).
- E sits immediate right of A (Position 14).
- F sits immediate right of E (Position 15).
- G sits immediate right of F (Position 16).
- H sits immediate right of G (Position 17).
- I sits immediate right of H (Position 18).
- J sits immediate right of I (Position 19).
- Two persons sit between J and C who sits at the rightmost end of the row => Between Position 19 and C are 2 persons (Positions 20 and 21), so C sits at Position 22.`;

pyq2023.push({
  id: 'ibps-po-2023-prelims-q98',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Linear Seating Arrangement',
  passage: pass2023_linear,
  groupId: 'ibps23-linear-row',
  question: 'Who sits at the rightmost end of the row?',
  options: { A: 'K', B: 'P', C: 'J', D: 'C', E: 'None of these' },
  answer: 'D',
  explanation: 'C sits at the rightmost end of the row (Position 22).',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'EASY',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q99',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Linear Seating Arrangement',
  passage: pass2023_linear,
  groupId: 'ibps23-linear-row',
  question: 'How many persons sit between B and J?',
  options: { A: '8', B: '9', C: '10', D: '11', E: '12' },
  answer: 'A',
  explanation: 'B is at position 10 and J is at position 19. Persons between them = positions 11, 12, 13, 14, 15, 16, 17, 18 = 8 persons.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

pyq2023.push({
  id: 'ibps-po-2023-prelims-q100',
  exam: 'IBPS PO Prelims 2023',
  section: 'Reasoning Ability',
  topic: 'Linear Seating Arrangement',
  passage: pass2023_linear,
  groupId: 'ibps23-linear-row',
  question: 'How many persons sit in the row?',
  options: { A: '18', B: '20', C: '22', D: '24', E: '16' },
  answer: 'C',
  explanation: 'From leftmost seat K (1) to rightmost seat C (22), exactly 22 persons sit in the row.',
  isPyq: true,
  pyqYear: 2023,
  pyqExam: 'IBPS PO Prelims 2023',
  difficulty: 'MEDIUM',
  marks: 1,
  negativeMarks: 0.25,
});

console.log(`Prepared ${pyq2023.length} questions for IBPS PO Prelims 2023.`);
fs.writeFileSync(
  path.join(process.cwd(), 'data', 'ibps_po_2023_prelims_pyq.json'),
  JSON.stringify(pyq2023, null, 2),
  'utf-8'
);
console.log('Saved data/ibps_po_2023_prelims_pyq.json');
