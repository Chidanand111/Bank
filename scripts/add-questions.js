const fs = require('fs');
const path = require('path');

const questionsFilePath = path.join(__dirname, '..', 'data', 'questions.json');
const existingQuestions = JSON.parse(fs.readFileSync(questionsFilePath, 'utf-8'));

const newQuestions = [
  {
    "id": 281,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Syllogism",
    "question": "Statements: All banks are institutions. Some institutions are government bodies. Conclusions: I. Some banks are government bodies. II. All banks are institutions.",
    "options": {
      "A": "Only I follows",
      "B": "Only II follows",
      "C": "Both follow",
      "D": "Neither follows"
    },
    "answer": "B",
    "explanation": "Conclusion II directly follows. There is no definite overlap between banks and government bodies.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 282,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Inequality",
    "question": "If P < Q ≤ R = S > T, which conclusion is definitely true?",
    "options": {
      "A": "P > S",
      "B": "Q > P",
      "C": "T > R",
      "D": "P > T"
    },
    "answer": "B",
    "explanation": "Since P < Q, Q is definitely greater than P.",
    "difficulty": "EASY"
  },
  {
    "id": 283,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Coding-Decoding",
    "question": "If CREDIT is coded as DSFEJU, how is BANK coded?",
    "options": {
      "A": "CBOL",
      "B": "CANK",
      "C": "DBOL",
      "D": "CBNK"
    },
    "answer": "A",
    "explanation": "Each letter is shifted one position forward: B→C, A→B, N→O, K→L.",
    "difficulty": "EASY"
  },
  {
    "id": 284,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Blood Relation",
    "question": "P is the sister of Q. Q is the father of R. How is P related to R?",
    "options": {
      "A": "Mother",
      "B": "Aunt",
      "C": "Sister",
      "D": "Cousin"
    },
    "answer": "B",
    "explanation": "P is the sister of R's father, so P is R's aunt.",
    "difficulty": "EASY"
  },
  {
    "id": 285,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Direction",
    "question": "A person walks 10 m east, then 10 m north, then 10 m west. How far is the person from the starting point?",
    "options": {
      "A": "5 m",
      "B": "10 m",
      "C": "20 m",
      "D": "30 m"
    },
    "answer": "B",
    "explanation": "East and west movements cancel. The person is 10 m north of the starting point.",
    "difficulty": "EASY"
  },
  {
    "id": 286,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Number Series",
    "question": "Find the missing number: 4, 9, 19, 39, 79, ?",
    "options": {
      "A": "158",
      "B": "159",
      "C": "160",
      "D": "161"
    },
    "answer": "B",
    "explanation": "Each term = previous term × 2 + 1. Therefore 79 × 2 + 1 = 159.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 287,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Alphabet",
    "question": "Which letter is 7th to the right of the 10th letter from the left in the English alphabet?",
    "options": {
      "A": "P",
      "B": "Q",
      "C": "R",
      "D": "S"
    },
    "answer": "B",
    "explanation": "10th letter is J. Seven places to the right gives Q.",
    "difficulty": "EASY"
  },
  {
    "id": 288,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Ranking",
    "question": "In a class of 45 students, Amit ranks 12th from the top. What is his rank from the bottom?",
    "options": {
      "A": "33rd",
      "B": "34th",
      "C": "35th",
      "D": "36th"
    },
    "answer": "B",
    "explanation": "Rank from bottom = 45 - 12 + 1 = 34.",
    "difficulty": "EASY"
  },
  {
    "id": 289,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Analogy",
    "question": "Doctor : Hospital :: Teacher : ?",
    "options": {
      "A": "School",
      "B": "Book",
      "C": "Student",
      "D": "Class"
    },
    "answer": "A",
    "explanation": "A doctor generally works in a hospital; a teacher generally works in a school.",
    "difficulty": "EASY"
  },
  {
    "id": 290,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Odd One Out",
    "question": "Find the odd one out: 27, 64, 125, 216, 300.",
    "options": {
      "A": "64",
      "B": "125",
      "C": "216",
      "D": "300"
    },
    "answer": "D",
    "explanation": "27, 64, 125 and 216 are cubes: 3³, 4³, 5³ and 6³. 300 is not a perfect cube.",
    "difficulty": "EASY"
  },
  {
    "id": 291,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Seating Arrangement",
    "question": "Five persons A, B, C, D and E sit in a row facing north. A sits at the extreme left. B sits immediately right of A. E sits at the extreme right. C sits immediately left of D. Who sits in the middle?",
    "options": {
      "A": "A",
      "B": "B",
      "C": "C",
      "D": "D"
    },
    "answer": "C",
    "explanation": "The arrangement is A-B-C-D-E. Therefore C sits in the middle.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 292,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Data Sufficiency",
    "question": "What is the value of y? I. 3y = 21. II. y is a positive integer.",
    "options": {
      "A": "Statement I alone is sufficient",
      "B": "Statement II alone is sufficient",
      "C": "Both together are required",
      "D": "Both are insufficient"
    },
    "answer": "A",
    "explanation": "Statement I directly gives y = 7.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 293,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Syllogism",
    "question": "Statements: No mobile is a laptop. Some laptops are computers. Conclusions: I. Some computers are laptops. II. No laptop is a mobile.",
    "options": {
      "A": "Only I",
      "B": "Only II",
      "C": "Both I and II",
      "D": "Neither"
    },
    "answer": "C",
    "explanation": "Some laptops are computers implies some computers are laptops. The second conclusion directly restates the first statement.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 294,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Logical Reasoning",
    "question": "If all successful candidates are hardworking and Rahul is a successful candidate, what follows?",
    "options": {
      "A": "Rahul is hardworking",
      "B": "Rahul is unsuccessful",
      "C": "All hardworking people are successful",
      "D": "Nothing follows"
    },
    "answer": "A",
    "explanation": "Rahul belongs to the group of successful candidates, all of whom are hardworking.",
    "difficulty": "EASY"
  },
  {
    "id": 295,
    "exam": "IBPS PO",
    "section": "Reasoning",
    "topic": "Number Series",
    "question": "Find the missing number: 7, 14, 28, 56, ?",
    "options": {
      "A": "84",
      "B": "98",
      "C": "112",
      "D": "120"
    },
    "answer": "C",
    "explanation": "Each term is multiplied by 2. 56 × 2 = 112.",
    "difficulty": "EASY"
  },
  {
    "id": 296,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Percentage",
    "question": "A number is decreased by 20% and becomes 240. What was the original number?",
    "options": {
      "A": "280",
      "B": "300",
      "C": "320",
      "D": "340"
    },
    "answer": "B",
    "explanation": "80% of the original number is 240. Original = 240/0.8 = 300.",
    "difficulty": "EASY"
  },
  {
    "id": 297,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Profit and Loss",
    "question": "An article is bought for Rs. 1500 and sold for Rs. 1800. Find the profit percentage.",
    "options": {
      "A": "15%",
      "B": "18%",
      "C": "20%",
      "D": "25%"
    },
    "answer": "C",
    "explanation": "Profit = 300. Profit percentage = 300/1500 × 100 = 20%.",
    "difficulty": "EASY"
  },
  {
    "id": 298,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Simple Interest",
    "question": "Find the simple interest on Rs. 8000 at 7.5% per annum for 2 years.",
    "options": {
      "A": "Rs. 1000",
      "B": "Rs. 1100",
      "C": "Rs. 1200",
      "D": "Rs. 1300"
    },
    "answer": "C",
    "explanation": "SI = 8000 × 7.5 × 2 / 100 = Rs. 1200.",
    "difficulty": "EASY"
  },
  {
    "id": 299,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Ratio",
    "question": "Two numbers are in the ratio 5:7. If their sum is 96, find the larger number.",
    "options": {
      "A": "40",
      "B": "48",
      "C": "56",
      "D": "64"
    },
    "answer": "C",
    "explanation": "Total parts = 12. One part = 96/12 = 8. Larger number = 7×8 = 56.",
    "difficulty": "EASY"
  },
  {
    "id": 300,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Average",
    "question": "The average of 6 numbers is 25. If one number is removed, the average becomes 24. Find the removed number.",
    "options": {
      "A": "24",
      "B": "25",
      "C": "30",
      "D": "35"
    },
    "answer": "C",
    "explanation": "Original total = 150. New total = 5×24 = 120. Removed number = 150 - 120 = 30.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 301,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Time and Work",
    "question": "A can complete a work in 15 days and B can complete it in 30 days. How long will they take together?",
    "options": {
      "A": "8 days",
      "B": "10 days",
      "C": "12 days",
      "D": "15 days"
    },
    "answer": "B",
    "explanation": "Combined work rate = 1/15 + 1/30 = 1/10. Hence 10 days.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 302,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Time Speed Distance",
    "question": "A bus travels 240 km in 4 hours. What is its average speed?",
    "options": {
      "A": "50 km/h",
      "B": "55 km/h",
      "C": "60 km/h",
      "D": "65 km/h"
    },
    "answer": "C",
    "explanation": "Speed = 240/4 = 60 km/h.",
    "difficulty": "EASY"
  },
  {
    "id": 303,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Mixture",
    "question": "Milk and water are mixed in the ratio 7:3. If the mixture contains 50 litres, how much water is present?",
    "options": {
      "A": "10 L",
      "B": "15 L",
      "C": "20 L",
      "D": "25 L"
    },
    "answer": "B",
    "explanation": "Water = 3/10 × 50 = 15 litres.",
    "difficulty": "EASY"
  },
  {
    "id": 304,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Quadratic Equation",
    "question": "Solve x² - 13x + 40 = 0.",
    "options": {
      "A": "4, 10",
      "B": "5, 8",
      "C": "6, 7",
      "D": "3, 10"
    },
    "answer": "B",
    "explanation": "x² - 13x + 40 = (x - 5)(x - 8) = 0 => x = 5, 8.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 305,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "LCM HCF",
    "question": "Find the LCM of 18, 24 and 30.",
    "options": {
      "A": "180",
      "B": "240",
      "C": "360",
      "D": "720"
    },
    "answer": "C",
    "explanation": "LCM = 2³ × 3² × 5 = 360.",
    "difficulty": "EASY"
  },
  {
    "id": 306,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Mensuration",
    "question": "Find the area of a rectangle whose length is 25 cm and breadth is 16 cm.",
    "options": {
      "A": "350 cm²",
      "B": "375 cm²",
      "C": "400 cm²",
      "D": "425 cm²"
    },
    "answer": "C",
    "explanation": "Area = 25 × 16 = 400 cm².",
    "difficulty": "EASY"
  },
  {
    "id": 307,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Ages",
    "question": "The present ages of A and B are 24 and 36 years respectively. What is the ratio of their ages after 6 years?",
    "options": {
      "A": "2:3",
      "B": "3:4",
      "C": "4:5",
      "D": "5:7"
    },
    "answer": "D",
    "explanation": "After 6 years, ages are 30 and 42. Ratio = 30 : 42 = 5 : 7.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 308,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Partnership",
    "question": "A and B invest Rs. 6000 and Rs. 9000 respectively for the same period. If total profit is Rs. 4500, what is A's share?",
    "options": {
      "A": "Rs. 1500",
      "B": "Rs. 1800",
      "C": "Rs. 2000",
      "D": "Rs. 2250"
    },
    "answer": "B",
    "explanation": "Profit ratio = 6:9 = 2:3. A's share = 2/5 × 4500 = Rs. 1800.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 309,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Probability",
    "question": "A die is thrown once. What is the probability of getting an even number?",
    "options": {
      "A": "1/6",
      "B": "1/3",
      "C": "1/2",
      "D": "2/3"
    },
    "answer": "C",
    "explanation": "Even outcomes are 2, 4 and 6: 3 favourable outcomes out of 6.",
    "difficulty": "EASY"
  },
  {
    "id": 310,
    "exam": "IBPS PO",
    "section": "Quantitative Aptitude",
    "topic": "Compound Interest",
    "question": "Find the amount on Rs. 5000 at 10% per annum compound interest for 2 years.",
    "options": {
      "A": "Rs. 6000",
      "B": "Rs. 6050",
      "C": "Rs. 6100",
      "D": "Rs. 6200"
    },
    "answer": "B",
    "explanation": "Amount = 5000 × (1.10)² = Rs. 6050.",
    "difficulty": "EASY"
  },
  {
    "id": 311,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Error Detection",
    "question": "Identify the error: 'The manager along with his assistants are attending the meeting.'",
    "options": {
      "A": "The manager",
      "B": "along with his assistants",
      "C": "are attending",
      "D": "the meeting"
    },
    "answer": "C",
    "explanation": "The main subject is singular: 'The manager ... is attending.'",
    "difficulty": "MEDIUM"
  },
  {
    "id": 312,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Error Detection",
    "question": "Identify the error: 'She is senior than me in the organisation.'",
    "options": {
      "A": "She is",
      "B": "senior than",
      "C": "me",
      "D": "in the organisation"
    },
    "answer": "B",
    "explanation": "The correct construction is 'senior to me', not 'senior than me'.",
    "difficulty": "EASY"
  },
  {
    "id": 313,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Synonym",
    "question": "Choose the synonym of 'Mandatory'.",
    "options": {
      "A": "Optional",
      "B": "Compulsory",
      "C": "Unnecessary",
      "D": "Flexible"
    },
    "answer": "B",
    "explanation": "Mandatory means compulsory or required.",
    "difficulty": "EASY"
  },
  {
    "id": 314,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Antonym",
    "question": "Choose the antonym of 'Rigid'.",
    "options": {
      "A": "Strict",
      "B": "Firm",
      "C": "Flexible",
      "D": "Hard"
    },
    "answer": "C",
    "explanation": "Flexible is opposite in meaning to rigid.",
    "difficulty": "EASY"
  },
  {
    "id": 315,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Fill in the Blank",
    "question": "The bank has taken several steps to ______ customer complaints quickly.",
    "options": {
      "A": "resolve",
      "B": "resolved",
      "C": "resolving",
      "D": "resolution"
    },
    "answer": "A",
    "explanation": "After 'to', the base form 'resolve' is required.",
    "difficulty": "EASY"
  },
  {
    "id": 316,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Grammar",
    "question": "Choose the correct sentence.",
    "options": {
      "A": "He does not knows the answer.",
      "B": "He does not know the answer.",
      "C": "He do not know the answer.",
      "D": "He does not knew the answer."
    },
    "answer": "B",
    "explanation": "After 'does not', the main verb remains in its base form.",
    "difficulty": "EASY"
  },
  {
    "id": 317,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Active Passive",
    "question": "Change into passive voice: 'The bank issued the notice yesterday.'",
    "options": {
      "A": "The notice is issued by the bank yesterday.",
      "B": "The notice was issued by the bank yesterday.",
      "C": "The notice has issued by the bank yesterday.",
      "D": "The notice had issue by the bank yesterday."
    },
    "answer": "B",
    "explanation": "Simple past passive uses 'was/were + past participle'.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 318,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Direct Indirect Speech",
    "question": "He said, 'I have completed the work.' Choose the correct indirect speech.",
    "options": {
      "A": "He said that he had completed the work.",
      "B": "He said that he has completed the work.",
      "C": "He says that he had completed the work.",
      "D": "He said that I had completed the work."
    },
    "answer": "A",
    "explanation": "Present perfect generally changes to past perfect after a past reporting verb.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 319,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Idioms",
    "question": "What does 'A blessing in disguise' mean?",
    "options": {
      "A": "Something that appears bad but turns out beneficial",
      "B": "A religious ceremony",
      "C": "A serious problem",
      "D": "A hidden enemy"
    },
    "answer": "A",
    "explanation": "It refers to something that initially seems negative but produces a good result.",
    "difficulty": "EASY"
  },
  {
    "id": 320,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "One Word Substitution",
    "question": "A person who knows many languages is called a:",
    "options": {
      "A": "Linguist",
      "B": "Polyglot",
      "C": "Translator",
      "D": "Orator"
    },
    "answer": "B",
    "explanation": "A polyglot is a person who knows or uses several languages.",
    "difficulty": "EASY"
  },
  {
    "id": 321,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Para Jumble",
    "question": "Arrange the sentences: P: This has made digital banking more accessible. Q: Smartphones have changed the way people manage money. R: Customers can now transfer funds within seconds. S: However, security remains important.",
    "options": {
      "A": "QPRS",
      "B": "PQRS",
      "C": "QRPS",
      "D": "RQPS"
    },
    "answer": "A",
    "explanation": "Q introduces smartphones and banking, P gives the broad impact, R gives an example, and S adds the caution.",
    "difficulty": "MEDIUM"
  },
  {
    "id": 322,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Vocabulary",
    "question": "Choose the synonym of 'Enhance'.",
    "options": {
      "A": "Reduce",
      "B": "Improve",
      "C": "Destroy",
      "D": "Ignore"
    },
    "answer": "B",
    "explanation": "Enhance means to improve or increase the quality or value of something.",
    "difficulty": "EASY"
  },
  {
    "id": 323,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Vocabulary",
    "question": "Choose the antonym of 'Scarce'.",
    "options": {
      "A": "Rare",
      "B": "Limited",
      "C": "Abundant",
      "D": "Insufficient"
    },
    "answer": "C",
    "explanation": "Abundant means available in large quantities and is opposite to scarce.",
    "difficulty": "EASY"
  },
  {
    "id": 324,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Preposition",
    "question": "The customer is eligible ______ a special interest rate.",
    "options": {
      "A": "for",
      "B": "at",
      "C": "with",
      "D": "by"
    },
    "answer": "A",
    "explanation": "The correct expression is 'eligible for'.",
    "difficulty": "EASY"
  },
  {
    "id": 325,
    "exam": "IBPS PO",
    "section": "English",
    "topic": "Cloze Test",
    "question": "Financial literacy helps individuals make better decisions about saving, borrowing and investing. It can also reduce the risk of falling ______ financial scams.",
    "options": {
      "A": "to",
      "B": "for",
      "C": "by",
      "D": "with"
    },
    "answer": "B",
    "explanation": "The correct expression is 'falling for a scam'.",
    "difficulty": "EASY"
  },
  {
    "id": 326,
    "exam": "IBPS PO",
    "section": "Banking Awareness",
    "topic": "RBI",
    "question": "What does SLR stand for?",
    "options": {
      "A": "Statutory Liquidity Ratio",
      "B": "Standard Lending Rate",
      "C": "Statutory Lending Reserve",
      "D": "Savings Liquidity Ratio"
    },
    "answer": "A",
    "explanation": "SLR stands for Statutory Liquidity Ratio.",
    "difficulty": "EASY"
  },
  {
    "id": 327,
    "exam": "IBPS PO",
    "section": "Banking Awareness",
    "topic": "Banking",
    "question": "What does RTGS stand for?",
    "options": {
      "A": "Real Time Gross Settlement",
      "B": "Rapid Transfer Government System",
      "C": "Real Transfer General Service",
      "D": "Reserve Transfer Gross Settlement"
    },
    "answer": "A",
    "explanation": "RTGS stands for Real Time Gross Settlement.",
    "difficulty": "EASY"
  },
  {
    "id": 328,
    "exam": "IBPS PO",
    "section": "Banking Awareness",
    "topic": "Financial Institutions",
    "question": "Which institution is primarily associated with agricultural and rural development finance in India?",
    "options": {
      "A": "NABARD",
      "B": "SEBI",
      "C": "IRDAI",
      "D": "PFRDA"
    },
    "answer": "A",
    "explanation": "NABARD is the National Bank for Agriculture and Rural Development.",
    "difficulty": "EASY"
  },
  {
    "id": 329,
    "exam": "IBPS PO",
    "section": "Banking Awareness",
    "topic": "Financial Markets",
    "question": "What does IPO stand for?",
    "options": {
      "A": "Initial Public Offering",
      "B": "Indian Public Operation",
      "C": "Initial Private Offering",
      "D": "Investment Public Option"
    },
    "answer": "A",
    "explanation": "IPO stands for Initial Public Offering.",
    "difficulty": "EASY"
  },
  {
    "id": 330,
    "exam": "IBPS PO",
    "section": "Banking Awareness",
    "topic": "Banking",
    "question": "Which of the following is a monetary policy tool used by the Reserve Bank of India?",
    "options": {
      "A": "CRR",
      "B": "GST",
      "C": "Corporate tax",
      "D": "Income tax"
    },
    "answer": "A",
    "explanation": "CRR is one of the monetary policy instruments used by the RBI.",
    "difficulty": "EASY"
  }
];

// Deduplicate by ID
const existingIds = new Set(existingQuestions.map(q => q.id));
const filteredNew = newQuestions.filter(q => !existingIds.has(q.id));

const merged = [...existingQuestions, ...filteredNew];
fs.writeFileSync(questionsFilePath, JSON.stringify(merged, null, 2), 'utf-8');
console.log(`Successfully merged ${filteredNew.length} new questions. Total questions in data/questions.json: ${merged.length}`);
