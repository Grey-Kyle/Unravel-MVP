const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDb } = require('./database');
const vm = require('vm');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// SECURITY: Enforce JWT_SECRET from env — no hardcoded fallback
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' }
});

app.use(generalLimiter);

// CORS — locked to exact domains only
const allowedOrigins = [
  'https://unravel-weld.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Reduce body limit — 10MB was excessive
app.use(express.json({ limit: '1mb' }));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

app.post('/api/register', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Username must be 3-30 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to hash password' });
  }
  
  try {
    const insertResult = await pool.query(
      "INSERT INTO users (username, password_hash, exp, rank, is_admin) VALUES ($1, $2, 0, 'Novice', 0) RETURNING id",
      [username, hashedPassword]
    );
    
    const newUserId = insertResult.rows[0].id;
    const countResult = await pool.query("SELECT COUNT(*) as count FROM users");
    const count = parseInt(countResult.rows[0].count);
    
    let isAdmin = false;
    if (count === 1) {
      isAdmin = true;
      await pool.query("UPDATE users SET is_admin = 1 WHERE id = $1", [newUserId]);
      console.log("First user registered! Promoted to Admin.");
    }
    
    // SECURITY: Token expires in 7 days
    const token = jwt.sign({ id: newUserId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: newUserId, username, isAdmin });
    
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
    
    // SECURITY: Token expires in 7 days
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      userId: user.id, 
      username: user.username, 
      exp: user.exp, 
      rank: user.rank,
      isAdmin: user.is_admin === 1
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/challenges', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.username as creator_name 
       FROM challenges c 
       LEFT JOIN users u ON c.created_by = u.id 
       ORDER BY c.exp_value DESC`
    );
    res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT exp, rank, is_admin FROM users WHERE id = $1", [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      exp: user.exp,
      rank: user.rank,
      isAdmin: user.is_admin === 1
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/challenges/:id/submit', authenticateToken, async (req, res) => {
  const challengeId = req.params.id;
  const { user_answer } = req.body;
  const userId = req.user.id;
  
  if (typeof user_answer !== 'string') {
    return res.status(400).json({ error: 'Answer must be a string' });
  }
  
  try {
    const challengeResult = await pool.query("SELECT * FROM challenges WHERE id = $1", [challengeId]);
    const challenge = challengeResult.rows[0];
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    const is_correct = user_answer.trim() === challenge.correct_output.trim() ? 1 : 0;
    
    const existingResult = await pool.query(
      "SELECT id FROM attempts WHERE user_id = $1 AND challenge_id = $2 AND is_correct = 1",
      [userId, challengeId]
    );
    
    if (existingResult.rows.length > 0 && is_correct) {
      return res.json({ 
        is_correct: true, 
        exp_earned: 0,
        message: 'You already solved this challenge! No additional EXP awarded.',
        already_solved: true
      });
    }
    
    await pool.query(
      "INSERT INTO attempts (user_id, challenge_id, is_correct) VALUES ($1, $2, $3)",
      [userId, challengeId, is_correct]
    );
    
    if (is_correct) {
      const userResult = await pool.query("SELECT exp FROM users WHERE id = $1", [userId]);
      const user = userResult.rows[0];
      const newExp = user.exp + challenge.exp_value;
      let newRank = 'Novice';
      if (newExp >= 1000) newRank = 'Master';
      else if (newExp >= 500) newRank = 'Expert';
      else if (newExp >= 200) newRank = 'Advanced';
      else if (newExp >= 100) newRank = 'Intermediate';
      else if (newExp >= 50) newRank = 'Learner';
      
      await pool.query("UPDATE users SET exp = $1, rank = $2 WHERE id = $3", [newExp, newRank, userId]);
      
      res.json({ 
        is_correct: true, 
        exp_earned: challenge.exp_value,
        new_exp: newExp,
        new_rank: newRank 
      });
    } else {
      await pool.query("UPDATE challenges SET exp_value = exp_value + 5 WHERE id = $1", [challengeId]);
      res.json({ is_correct: false, message: 'Incorrect. Challenge value increased!' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/challenges', authenticateToken, async (req, res) => {
  const { title, code, correct_output, difficulty, language, is_official } = req.body;
  const createdBy = req.user.id;
  
  if (!title || !code || !correct_output) {
    return res.status(400).json({ error: 'Title, code, and correct output are required' });
  }
  
  if (typeof difficulty !== 'number' || !Number.isFinite(difficulty) || difficulty < 1) {
    return res.status(400).json({ error: 'Difficulty must be a positive number' });
  }
  
  let output = '';
  const makeConsoleMethod = () => (...args) => {
    output += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n';
  };
  
  const mockConsole = { 
    log: makeConsoleMethod(),
    error: makeConsoleMethod(),
    warn: makeConsoleMethod(),
    info: makeConsoleMethod()
  };

  const timeouts = new Set();
  const intervals = new Set();

  // Stage 1: Compile — catches syntax errors
  let script;
  try {
    script = new vm.Script(code);
  } catch (err) {
    return res.status(400).json({ 
      error: 'Syntax Error',
      details: err.message,
      type: 'syntax'
    });
  }

  // Stage 2: Execute — catches runtime errors
  try {
    const context = vm.createContext({ 
      console: mockConsole,
      Math, Date, Array, Object, String, Number, Boolean, JSON, 
      parseInt, parseFloat, isNaN, isFinite, 
      encodeURI, decodeURI, encodeURIComponent, decodeURIComponent,
      undefined, Infinity, NaN,
      Set, Map, WeakSet, WeakMap, Promise, RegExp, Error, Symbol,
      BigInt, Intl,
      Float32Array, Float64Array, Int8Array, Int16Array, Int32Array,
      Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray,
      DataView,
      // SECURITY: Removed escape vectors: Buffer, ArrayBuffer, SharedArrayBuffer, Atomics, Proxy, Reflect
      setTimeout: (fn, ms = 0, ...args) => {
        const t = setTimeout(() => {
          timeouts.delete(t);
          fn(...args);
        }, ms);
        timeouts.add(t);
        return t;
      },
      clearTimeout: (t) => {
        timeouts.delete(t);
        clearTimeout(t);
      },
      setInterval: (fn, ms = 0, ...args) => {
        const t = setInterval(fn, ms, ...args);
        intervals.add(t);
        return t;
      },
      clearInterval: (t) => {
        intervals.delete(t);
        clearInterval(t);
      }
    });
    
    script.runInContext(context, { timeout: 2000 });
    
    // Flush microtasks and 0ms timers so async code completes
    await new Promise(r => setTimeout(r, 100));
    
    // Clean up any lingering intervals
    intervals.forEach(clearInterval);
    timeouts.forEach(clearTimeout);
    
  } catch (err) {
    return res.status(400).json({ 
      error: 'Runtime Error',
      details: err.message,
      type: 'runtime'
    });
  }

  // Stage 3: Verify output
  if (output.trim() !== correct_output.trim()) {
    return res.status(400).json({ 
      error: 'Output Mismatch',
      details: `Your code produced:\n"${output.trim()}"\n\nBut expected:\n"${correct_output}"`,
      type: 'mismatch'
    });
  }
  
  const exp_value = difficulty * 10; 
  
  try {
    const adminResult = await pool.query("SELECT is_admin FROM users WHERE id = $1", [createdBy]);
    const user = adminResult.rows[0];
    const officialFlag = (user && user.is_admin === 1 && is_official) ? 1 : 0;
    
    const result = await pool.query(
      `INSERT INTO challenges (title, code, correct_output, difficulty, exp_value, language, created_by, is_official) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [title, code, correct_output, difficulty, exp_value, language || 'javascript', createdBy, officialFlag]
    );
    
    res.json({ 
      message: 'Challenge created and verified successfully!', 
      challengeId: result.rows[0].id 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/challenges/:id', authenticateToken, async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;
  
  try {
    const adminResult = await pool.query("SELECT is_admin FROM users WHERE id = $1", [userId]);
    const user = adminResult.rows[0];
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: 'Only admins can delete challenges' });
    }
    
    await pool.query("DELETE FROM attempts WHERE challenge_id = $1", [challengeId]);
    
    const result = await pool.query("DELETE FROM challenges WHERE id = $1", [challengeId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Challenge not found' });
    
    res.json({ message: 'Challenge deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, exp, rank FROM users ORDER BY exp DESC LIMIT 10"
    );
    res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// FIXED: Profile endpoint now returns isAdmin + sprint stats
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const userResult = await pool.query(
      "SELECT username, exp, rank, is_admin, sprint_best_time, sprint_wrong_count FROM users WHERE id = $1", 
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const createdResult = await pool.query("SELECT COUNT(*) as created FROM challenges WHERE created_by = $1", [userId]);
    const solvedResult = await pool.query("SELECT COUNT(DISTINCT challenge_id) as solved FROM attempts WHERE user_id = $1 AND is_correct = 1", [userId]);
    const rankResult = await pool.query("SELECT COUNT(*) + 1 as leaderboardRank FROM users WHERE exp > $1", [user.exp]);
    
    res.json({
      username: user.username,
      exp: user.exp,
      rank: user.rank,
      isAdmin: user.is_admin === 1,
      leaderboardRank: parseInt(rankResult.rows[0].leaderboardrank),
      challengesCreated: parseInt(createdResult.rows[0].created),
      challengesSolved: parseInt(solvedResult.rows[0].solved),
      sprintBestTime: user.sprint_best_time,
      sprintWrongs: user.sprint_wrong_count
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── SPRINT MODE ───
const SPRINT_POOL = [
  { id: 1, code: 'console.log("hello");', runs: true },
  { id: 2, code: 'console.log(x);', runs: false },
  { id: 3, code: 'let a = 5;\nconsole.log(a);', runs: true },
  { id: 4, code: 'for (let i = 0; i < 3; i++\n  console.log(i);', runs: false },
  { id: 5, code: 'console.log(10 / 0);', runs: true },
  { id: 6, code: 'function foo() {\n  console.log(bar);\n}\nfoo();', runs: false },
  { id: 7, code: 'const arr = [1, 2, 3];\nconsole.log(arr[1]);', runs: true },
  { id: 8, code: 'console.log("missing quote);', runs: false },
  { id: 9, code: 'let x = 1;\nlet y = 2;\nconsole.log(x + y);', runs: true },
  { id: 10, code: 'const obj = {a: 1;\nconsole.log(obj);', runs: false },
  { id: 11, code: 'console.log(typeof "hi");', runs: true },
  { id: 12, code: 'let a = [1,2,3);\nconsole.log(a);', runs: false },
  { id: 13, code: 'console.log(2 ** 3);', runs: true },
  { id: 14, code: 'if (true {\n  console.log("yes");\n}', runs: false },
  { id: 15, code: 'console.log(Math.max(5, 10));', runs: true }
];

const TARGET_CORRECT = 10;
const PENALTY_MS = 2000;

app.get('/api/sprint', authenticateToken, (req, res) => {
  const shuffled = [...SPRINT_POOL].sort(() => 0.5 - Math.random());
  res.json({ 
    challenges: shuffled.map(c => ({ id: c.id, code: c.code, runs: c.runs })),
    target: TARGET_CORRECT,
    penaltyMs: PENALTY_MS
  });
});

app.post('/api/sprint/submit', authenticateToken, async (req, res) => {
  const { answers, rawTimeMs } = req.body;
  
  let correctCount = 0;
  let wrongCount = 0;
  
  for (const a of answers) {
    const challenge = SPRINT_POOL.find(c => c.id === a.id);
    if (!challenge) continue;
    
    if (challenge.runs === a.guess) {
      correctCount++;
    } else {
      wrongCount++;
    }
    
    if (correctCount >= TARGET_CORRECT) break;
  }
  
  if (correctCount < TARGET_CORRECT) {
    return res.status(400).json({ error: 'Sprint incomplete — 10 correct required' });
  }
  
  const penalizedTime = rawTimeMs + (wrongCount * PENALTY_MS);
  
  const userResult = await pool.query(
    "SELECT sprint_best_time, sprint_wrong_count FROM users WHERE id = $1", 
    [req.user.id]
  );
  const currentBest = userResult.rows[0]?.sprint_best_time;
  const currentWrongs = userResult.rows[0]?.sprint_wrong_count || 0;
  
  let newBest = false;
  if (!currentBest || 
      penalizedTime < currentBest || 
      (penalizedTime === currentBest && wrongCount < currentWrongs)) {
    
    await pool.query(
      "UPDATE users SET sprint_best_time = $1, sprint_wrong_count = $2 WHERE id = $3",
      [penalizedTime, wrongCount, req.user.id]
    );
    newBest = true;
  }
  
  res.json({
    correctCount,
    wrongCount,
    rawTimeMs,
    penaltyTotal: wrongCount * PENALTY_MS,
    penalizedTime,
    newBest
  });
});

app.get('/api/sprint/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username, sprint_best_time as final_time_ms, sprint_wrong_count as wrongs
       FROM users 
       WHERE sprint_best_time IS NOT NULL 
       ORDER BY sprint_best_time ASC, sprint_wrong_count ASC
       LIMIT 10`
    );
    
    const formatted = result.rows.map(r => ({
      username: r.username,
      finalTime: (r.final_time_ms / 1000).toFixed(2) + 's',
      wrongs: r.wrongs
    }));
    
    res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const startServer = async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Unravel MVP server running on port ${PORT}`);
  });
};

startServer();