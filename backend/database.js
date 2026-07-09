const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'unravel.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error opening database:", err);
  else console.log("Connected to the SQLite database.");
});

db.serialize(() => {
  // Create Users Table (Added is_admin)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    exp INTEGER DEFAULT 0,
    rank TEXT DEFAULT 'Novice',
    is_admin INTEGER DEFAULT 0
  )`);

  // Create Challenges Table (Added is_official and created_by)
  db.run(`CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    correct_output TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    exp_value INTEGER NOT NULL,
    language TEXT DEFAULT 'javascript',
    created_by INTEGER,
    is_official INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // Create Attempts Table (Fixed foreign keys)
  db.run(`CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    challenge_id INTEGER,
    is_correct INTEGER,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
  )`);

  // Insert sample challenges (only if they don't exist)
  const sampleChallenges = [
    {
      title: "Simple Loop",
      code: `let sum = 0;\nfor (let i = 1; i <= 5; i++) {\n  sum += i;\n}\nconsole.log(sum);`,
      correct_output: "15",
      difficulty: 1,
      exp_value: 10,
      language: "javascript",
      is_official: 1
    },
    {
      title: "Closure Trap",
      code: `const funcs = [];\nfor (var i = 0; i < 3; i++) {\n  funcs.push(function() {\n    console.log(i);\n  });\n}\nfuncs[0]();`,
      correct_output: "3",
      difficulty: 2,
      exp_value: 25,
      language: "javascript",
      is_official: 1
    },
    {
      title: "Async Surprise",
      code: `console.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);`,
      correct_output: "1\n4\n3\n2",
      difficulty: 3,
      exp_value: 50,
      language: "javascript",
      is_official: 1
    }
  ];

  db.get("SELECT COUNT(*) as count FROM challenges", (err, row) => {
    if (err) return console.error("Error checking challenges:", err);
    
    if (row.count === 0) {
      sampleChallenges.forEach(challenge => {
        db.run(
          `INSERT INTO challenges (title, code, correct_output, difficulty, exp_value, language, is_official) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [challenge.title, challenge.code, challenge.correct_output, 
           challenge.difficulty, challenge.exp_value, challenge.language, challenge.is_official],
          (err) => {
            if (err) console.error("Error inserting challenge:", err);
          }
        );
      });
      console.log("Sample challenges inserted!");
    } else {
      console.log(`Database already has ${row.count} challenges, skipping sample insert.`);
    }
  });
});

module.exports = db;