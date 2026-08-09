const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        exp INTEGER DEFAULT 0,
        rank TEXT DEFAULT 'Novice',
        is_admin INTEGER DEFAULT 0
      )
    `);

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS sprint_best_time INTEGER DEFAULT NULL
    `);
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS sprint_wrong_count INTEGER DEFAULT 0
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        code TEXT NOT NULL,
        correct_output TEXT NOT NULL,
        explanation TEXT DEFAULT NULL,
        difficulty INTEGER NOT NULL,
        exp_value INTEGER NOT NULL,
        language TEXT DEFAULT 'javascript',
        created_by INTEGER REFERENCES users(id),
        is_official INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_id INTEGER REFERENCES challenges(id),
        is_correct INTEGER,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS practiced (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
        practiced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, challenge_id)
      )
    `);

    console.log("Connected to PostgreSQL database.");

    const result = await pool.query('SELECT COUNT(*) as count FROM challenges');
    if (parseInt(result.rows[0].count) === 0) {
      const sampleChallenges = [
        {
          title: "Simple Loop",
          code: `let sum = 0;\nfor (let i = 1; i <= 5; i++) {\n  sum += i;\n}\nconsole.log(sum);`,
          correct_output: "15",
          explanation: "The loop runs from 1 to 5, adding each number to sum. 1+2+3+4+5 = 15.",
          difficulty: 1,
          exp_value: 10,
          language: "javascript",
          is_official: 1
        },
        {
          title: "Closure Trap",
          code: `const funcs = [];\nfor (var i = 0; i < 3; i++) {\n  funcs.push(function() {\n    console.log(i);\n  });\n}\nfuncs[0]();`,
          correct_output: "3",
          explanation: "`var` is function-scoped, not block-scoped. By the time funcs[0] runs, the loop has finished and i = 3. All closures share the same i.",
          difficulty: 2,
          exp_value: 25,
          language: "javascript",
          is_official: 1
        },
        {
          title: "Async Surprise",
          code: `console.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);`,
          correct_output: "1\n4\n3\n2",
          explanation: "Synchronous code runs first (1, 4). Microtasks (Promise.then) run before macrotasks (setTimeout), so 3 prints before 2.",
          difficulty: 3,
          exp_value: 50,
          language: "javascript",
          is_official: 1
        }
      ];

      for (const challenge of sampleChallenges) {
        await pool.query(
          `INSERT INTO challenges (title, code, correct_output, explanation, difficulty, exp_value, language, is_official) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [challenge.title, challenge.code, challenge.correct_output, challenge.explanation, challenge.difficulty, challenge.exp_value, challenge.language, challenge.is_official]
        );
      }

      console.log("Sample challenges inserted!");
    } else {
      console.log(`Database already has ${result.rows[0].count} challenges, skipping sample insert.`);
    }
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
};

module.exports = { pool, initDb };