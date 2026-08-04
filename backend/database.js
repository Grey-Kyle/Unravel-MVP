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
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        code TEXT NOT NULL,
        correct_output TEXT NOT NULL,
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

    console.log("Connected to PostgreSQL database.");

    const result = await pool.query('SELECT COUNT(*) as count FROM challenges');
    if (parseInt(result.rows[0].count) === 0) {
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

      for (const challenge of sampleChallenges) {
        await pool.query(
          `INSERT INTO challenges (title, code, correct_output, difficulty, exp_value, language, is_official) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [challenge.title, challenge.code, challenge.correct_output, challenge.difficulty, challenge.exp_value, challenge.language, challenge.is_official]
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