const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./database');
const vm = require('vm');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// Allow Vercel + local dev
app.use(cors({
  origin: ['https://unravel-weld.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to hash password' });
  }
  
  try {
    const result = db.prepare(
      "INSERT INTO users (username, password_hash, exp, rank, is_admin) VALUES (?, ?, 0, 'Novice', 0)"
    ).run(username, hashedPassword);
    
    const newUserId = result.lastInsertRowid;
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get();
    
    let isAdmin = false;
    if (row && row.count === 1) {
      isAdmin = true;
      db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(newUserId);
      console.log("First user registered! Promoted to Admin.");
    }
    
    const token = jwt.sign({ id: newUserId, username }, JWT_SECRET);
    res.json({ token, userId: newUserId, username, isAdmin });
    
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
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

app.get('/api/challenges', authenticateToken, (req, res) => {
  try {
    const challenges = db.prepare(
      `SELECT c.*, u.username as creator_name 
       FROM challenges c 
       LEFT JOIN users u ON c.created_by = u.id 
       ORDER BY c.exp_value DESC`
    ).all();
    res.json(challenges);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/stats', authenticateToken, (req, res) => {
  try {
    const user = db.prepare("SELECT exp, rank, is_admin FROM users WHERE id = ?").get(req.user.id);
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

app.post('/api/challenges/:id/submit', authenticateToken, (req, res) => {
  const challengeId = req.params.id;
  const { user_answer } = req.body;
  const userId = req.user.id;
  
  if (typeof user_answer !== 'string') {
    return res.status(400).json({ error: 'Answer must be a string' });
  }
  
  try {
    const challenge = db.prepare("SELECT * FROM challenges WHERE id = ?").get(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    const is_correct = user_answer.trim() === challenge.correct_output.trim() ? 1 : 0;
    
    const existingAttempt = db.prepare(
      "SELECT id FROM attempts WHERE user_id = ? AND challenge_id = ? AND is_correct = 1"
    ).get(userId, challengeId);
    
    if (existingAttempt && is_correct) {
      return res.json({ 
        is_correct: true, 
        exp_earned: 0,
        message: 'You already solved this challenge! No additional EXP awarded.',
        already_solved: true
      });
    }
    
    db.prepare(
      "INSERT INTO attempts (user_id, challenge_id, is_correct) VALUES (?, ?, ?)"
    ).run(userId, challengeId, is_correct);
    
    if (is_correct) {
      const user = db.prepare("SELECT exp FROM users WHERE id = ?").get(userId);
      const newExp = user.exp + challenge.exp_value;
      let newRank = 'Novice';
      if (newExp >= 1000) newRank = 'Master';
      else if (newExp >= 500) newRank = 'Expert';
      else if (newExp >= 200) newRank = 'Advanced';
      else if (newExp >= 100) newRank = 'Intermediate';
      else if (newExp >= 50) newRank = 'Learner';
      
      db.prepare("UPDATE users SET exp = ?, rank = ? WHERE id = ?").run(newExp, newRank, userId);
      
      res.json({ 
        is_correct: true, 
        exp_earned: challenge.exp_value,
        new_exp: newExp,
        new_rank: newRank 
      });
    } else {
      db.prepare("UPDATE challenges SET exp_value = exp_value + 5 WHERE id = ?").run(challengeId);
      res.json({ is_correct: false, message: 'Incorrect. Challenge value increased!' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/challenges', authenticateToken, (req, res) => {
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

  try {
    const script = new vm.Script(code);
    const context = vm.createContext({ 
      console: mockConsole,
      Math, Date, Array, Object, String, Number, Boolean, JSON, 
      parseInt, parseFloat, isNaN, isFinite, 
      encodeURI, decodeURI, encodeURIComponent, decodeURIComponent,
      undefined, Infinity, NaN,
      Set, Map, WeakSet, WeakMap, Promise, RegExp, Error, Symbol,
      BigInt, Intl, Buffer, ArrayBuffer, DataView, 
      Float32Array, Float64Array, Int8Array, Int16Array, Int32Array,
      Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray,
      SharedArrayBuffer, Atomics, Proxy, Reflect
    });
    
    script.runInContext(context, { timeout: 2000 }); 
  } catch (err) {
    return res.status(400).json({ error: 'Code execution failed or timed out: ' + err.message });
  }

  if (output.trim() !== correct_output.trim()) {
    return res.status(400).json({ 
      error: `Verification failed! Your code outputs:\n"${output.trim()}"\nbut you provided:\n"${correct_output}"` 
    });
  }
  
  const exp_value = difficulty * 10; 
  
  try {
    const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(createdBy);
    const officialFlag = (user && user.is_admin === 1 && is_official) ? 1 : 0;
    
    const result = db.prepare(
      `INSERT INTO challenges (title, code, correct_output, difficulty, exp_value, language, created_by, is_official) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(title, code, correct_output, difficulty, exp_value, language || 'javascript', createdBy, officialFlag);
    
    res.json({ 
      message: 'Challenge created and verified successfully!', 
      challengeId: result.lastInsertRowid 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/challenges/:id', authenticateToken, (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;
  
  try {
    const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(userId);
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: 'Only admins can delete challenges' });
    }
    
    const result = db.prepare("DELETE FROM challenges WHERE id = ?").run(challengeId);
    if (result.changes === 0) return res.status(404).json({ error: 'Challenge not found' });
    
    res.json({ message: 'Challenge deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const users = db.prepare(
      "SELECT username, exp, rank FROM users ORDER BY exp DESC LIMIT 10"
    ).all();
    res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  try {
    const user = db.prepare("SELECT username, exp, rank FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const createdRow = db.prepare("SELECT COUNT(*) as created FROM challenges WHERE created_by = ?").get(userId);
    const solvedRow = db.prepare("SELECT COUNT(DISTINCT challenge_id) as solved FROM attempts WHERE user_id = ? AND is_correct = 1").get(userId);
    const rankRow = db.prepare("SELECT COUNT(*) + 1 as leaderboardRank FROM users WHERE exp > ?").get(user.exp);
    
    res.json({
      username: user.username,
      exp: user.exp,
      rank: user.rank,
      leaderboardRank: rankRow.leaderboardRank,
      challengesCreated: createdRow.created,
      challengesSolved: solvedRow.solved
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// NO frontend serving — Vercel handles that now
app.listen(PORT, () => {
  console.log(`Unravel MVP server running on port ${PORT}`);
});