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

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ✅ FIXED AUTHENTICATION MIDDLEWARE
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run(
    'INSERT INTO users (username, password_hash, exp, rank, is_admin) VALUES (?, ?, 0, "Novice", 0)',
    [username, hashedPassword],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      // Check if this is the first user, if so, make them admin
      db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (row.count === 1) {
          db.run("UPDATE users SET is_admin = 1 WHERE id = ?", [this.lastID]);
          console.log("First user registered! Promoted to Admin.");
        }
      });
      
      const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
      res.json({ 
        token, 
        userId: this.lastID, 
        username,
        isAdmin: false // First user check happens async, but we'll handle it on login
      });
    }
  );
});

// Login - ✅ SENDS isAdmin STATUS
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
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
      isAdmin: user.is_admin === 1  // ✅ This is crucial!
    });
  });
});

// Get challenges
app.get('/api/challenges', authenticateToken, (req, res) => {
  db.all(
    `SELECT c.*, u.username as creator_name 
     FROM challenges c 
     LEFT JOIN users u ON c.created_by = u.id 
     ORDER BY c.exp_value DESC`,
    [],
    (err, challenges) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(challenges);
    }
  );
});

// Get user stats
app.get('/api/user/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // Added is_admin to the SELECT query
  db.get("SELECT exp, rank, is_admin FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      exp: user.exp,
      rank: user.rank,
      isAdmin: user.is_admin === 1 // Send admin status to frontend
    });
  });
});

// Submit challenge answer
app.post('/api/challenges/:id/submit', authenticateToken, (req, res) => {
  const challengeId = req.params.id;
  const { user_answer } = req.body;
  const userId = req.user.id;
  
  db.get("SELECT * FROM challenges WHERE id = ?", [challengeId], (err, challenge) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    const is_correct = user_answer.trim() === challenge.correct_output.trim() ? 1 : 0;
    
    // Check if user already solved this challenge
    db.get(
      "SELECT id FROM attempts WHERE user_id = ? AND challenge_id = ? AND is_correct = 1",
      [userId, challengeId],
      (err, existingAttempt) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (existingAttempt && is_correct) {
          // User already solved it correctly - don't give EXP
          return res.json({ 
            is_correct: true, 
            exp_earned: 0,
            message: 'You already solved this challenge! No additional EXP awarded.',
            already_solved: true
          });
        }
        
        // Insert the attempt
        db.run(
          "INSERT INTO attempts (user_id, challenge_id, is_correct) VALUES (?, ?, ?)",
          [userId, challengeId, is_correct],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (is_correct) {
              // Give EXP
              db.get("SELECT exp FROM users WHERE id = ?", [userId], (err, user) => {
                if (err) return res.status(500).json({ error: err.message });
                
                const newExp = user.exp + challenge.exp_value;
                let newRank = 'Novice';
                if (newExp >= 1000) newRank = 'Master';
                else if (newExp >= 500) newRank = 'Expert';
                else if (newExp >= 200) newRank = 'Advanced';
                else if (newExp >= 100) newRank = 'Intermediate';
                else if (newExp >= 50) newRank = 'Learner';
                
                db.run("UPDATE users SET exp = ?, rank = ? WHERE id = ?", [newExp, newRank, userId]);
                
                res.json({ 
                  is_correct: true, 
                  exp_earned: challenge.exp_value,
                  new_exp: newExp,
                  new_rank: newRank 
                });
              });
            } else {
              // Wrong answer - increase challenge value
              db.run("UPDATE challenges SET exp_value = exp_value + 5 WHERE id = ?", [challengeId]);
              res.json({ is_correct: false, message: 'Incorrect. Challenge value increased!' });
            }
          }
        );
      }
    );
  });
});
// Create a new challenge (with verification)
app.post('/api/challenges', authenticateToken, (req, res) => {
  const { title, code, correct_output, difficulty, language, is_official } = req.body;
  const createdBy = req.user.id;
  
  if (!title || !code || !correct_output) {
    return res.status(400).json({ error: 'Title, code, and correct output are required' });
  }
  
  // ... your code verification logic ...
let output = '';
  const mockConsole = { 
    log: (...args) => { 
      output += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n'; 
    } 
  };

  try {
    const script = new vm.Script(code);
    const context = vm.createContext({ console: mockConsole });
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
  
  db.run(
    `INSERT INTO challenges (title, code, correct_output, difficulty, exp_value, language, created_by, is_official) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, code, correct_output, difficulty, exp_value, language || 'javascript', createdBy, is_official ? 1 : 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({ 
        message: 'Challenge created and verified successfully!', 
        challengeId: this.lastID 
      });
    }
  );
});
 
// Delete a challenge (admin only)
app.delete('/api/challenges/:id', authenticateToken, (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;
  
  // Check if user is admin
  db.get("SELECT is_admin FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: 'Only admins can delete challenges' });
    }
    
    // Delete the challenge
    db.run("DELETE FROM challenges WHERE id = ?", [challengeId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Challenge not found' });
      
      res.json({ message: 'Challenge deleted successfully' });
    });
  });
});
// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  db.all(
    "SELECT username, exp, rank FROM users ORDER BY exp DESC LIMIT 10",
    [],
    (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(users);
    }
  );
});

// Keep server running!
app.listen(PORT, () => {
  console.log(`Unravel MVP server running on port ${PORT}`);
});