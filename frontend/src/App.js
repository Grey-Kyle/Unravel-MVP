import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';
import './App.css';

const API_URL = 'http://localhost:5000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
 const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  useEffect(() => {
    if (token) {
      fetchUserStats();
    }
  }, [token]);

  const fetchUserStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setIsAdmin(res.data.isAdmin); // Update admin status
      localStorage.setItem('isAdmin', res.data.isAdmin); // Save it!
    } catch (err) {
      console.error('Error fetching stats:', err);
      logout();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin'); // Add this line!
    setToken(null);
    setUser(null);
    setIsAdmin(false);
    setView('login');
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Unravel</h1>
        {token && (
          <div className="user-info">
            <span>EXP: {user?.exp} | Rank: {user?.rank}</span>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      <nav className="nav">
        {token && (
          <>
            <button onClick={() => setView('challenges')}>Challenges</button>
            <button onClick={() => setView('create')}>Create Challenge</button>
            <button onClick={() => setView('leaderboard')}>Leaderboard</button>
            {isAdmin && (
              <button onClick={() => setView('admin')} className="admin-btn">
                👑 Admin Dashboard
              </button>
            )}
          </>
        )}
      </nav>

      <main>
        {!token && view === 'login' && (
          <Login setToken={setToken} setIsAdmin={setIsAdmin} setView={setView} />
        )}
        {!token && view === 'register' && (
          <Register setToken={setToken} setIsAdmin={setIsAdmin} setView={setView} />
        )}
        {token && view === 'challenges' && <Challenges token={token} refreshStats={fetchUserStats} />}
        {token && view === 'create' && <CreateChallenge token={token} onBack={() => setView('challenges')} />}
        {token && view === 'leaderboard' && <Leaderboard />}
        {token && view === 'admin' && isAdmin && <AdminDashboard token={token} onBack={() => setView('challenges')} />}
      </main>
    </div>
  );
}

// Login Component
function Login({ setToken, setIsAdmin, setView }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/login`, {
        username,
        password
      });
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      setIsAdmin(response.data.isAdmin || false);
      localStorage.setItem('isAdmin', response.data.isAdmin);
      setView('challenges');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <button onClick={() => setView('register')}>Register</button></p>
    </div>
  );
}

// Register Component
function Register({ setToken, setIsAdmin, setView }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/register`, {
        username,
        password
      });
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      setIsAdmin(response.data.isAdmin || false);
      localStorage.setItem('isAdmin', response.data.isAdmin);
      setView('challenges');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      console.error('Register error:', err);
    }
  };

  return (
    <div className="auth-form">
      <h2>Register</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <button onClick={() => setView('login')}>Login</button></p>
    </div>
  );
}

// Challenges Component
function Challenges({ token, refreshStats }) {
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [userOutput, setUserOutput] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChallenges(res.data);
    } catch (err) {
      console.error('Error fetching challenges:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_URL}/api/challenges/${selectedChallenge.id}/submit`,
        { user_answer: userOutput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
      if (res.data.is_correct) {
        refreshStats();
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  if (selectedChallenge) {
    return (
      <div className="challenge-detail">
        <button onClick={() => { setSelectedChallenge(null); setResult(null); }}>← Back</button>
        <h2>{selectedChallenge.title}</h2>
        <p>Difficulty: {selectedChallenge.difficulty} | EXP: {selectedChallenge.exp_value}</p>
        <pre className="code-block">{selectedChallenge.code}</pre>
        <form onSubmit={handleSubmit}>
          <textarea
            value={userOutput}
            onChange={(e) => setUserOutput(e.target.value)}
            placeholder="Enter your output..."
            required
          />
          <button type="submit">Submit Answer</button>
        </form>
        {result && (
          <div className={`result ${result.is_correct ? 'success' : 'error'}`}>
            {result.is_correct ? `✓ Correct! +${result.exp_earned} EXP` : `✗ ${result.message}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="challenges-list">
      <h2>Challenges</h2>
      {challenges.map(challenge => (
        <div key={challenge.id} className="challenge-card" onClick={() => setSelectedChallenge(challenge)}>
          <h3>{challenge.title}</h3>
          <p>Difficulty: {challenge.difficulty} | EXP: {challenge.exp_value}</p>
          {challenge.is_official === 1 && <span className="official-badge"> Official</span>}
        </div>
      ))}
    </div>
  );
}

// Create Challenge Component
function CreateChallenge({ token, onBack }) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [correctOutput, setCorrectOutput] = useState('');
  const [difficulty, setDifficulty] = useState(1);
  const [isOfficial, setIsOfficial] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post(
  `${API_URL}/api/challenges`,
  { title, code, correct_output: correctOutput, difficulty, language: 'javascript', is_official: isOfficial },
  { headers: { Authorization: `Bearer ${token}` } }
);
      setSuccess('Challenge created and verified successfully!');
      setTimeout(() => onBack(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create challenge');
    }
  };

  return (
    <div className="create-challenge" style={{ maxWidth: '700px', margin: '0 auto', padding: '20px', color: '#fff' }}>
      <button onClick={onBack} style={{ background: 'none', border: '1px solid #00d9ff', color: '#00d9ff', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px' }}>
        ← Back to Challenges
      </button>
      
      <h2 style={{ color: '#00d9ff', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        Create New Challenge
      </h2>

      {error && <div className="error" style={{ background: '#ff4d4d', color: 'white', padding: '12px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #cc0000' }}>{error}</div>}
      {success && <div className="success" style={{ background: '#4caf50', color: 'white', padding: '12px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #2e7d32' }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="text"
          placeholder="Challenge Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: '16px' }}
        />
        
        <textarea
          placeholder="Paste your JavaScript code here..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          rows="8"
          style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#1a1a2e', color: '#00ff00', fontFamily: 'monospace', fontSize: '14px' }}
        />
        
        <textarea
          placeholder="Expected Output (what the code should print)"
          value={correctOutput}
          onChange={(e) => setCorrectOutput(e.target.value)}
          required
          rows="3"
          style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: '14px' }}
        />
        
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: '16px' }}
        >
          <option value={1}>Easy (10 EXP)</option>
          <option value={2}>Medium (20 EXP)</option>
          <option value={3}>Hard (30 EXP)</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#1a1a2e', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px' }}>
  <input
    type="checkbox"
    checked={isOfficial}
    onChange={(e) => setIsOfficial(e.target.checked)}
    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
  />
  <span style={{ color: '#00d9ff', fontWeight: 'bold' }}> Official Challenge</span>
</label>

        <button
          type="submit"
          style={{ padding: '14px', borderRadius: '5px', border: 'none', background: '#00d9ff', color: '#1a1a2e', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', transition: '0.2s' }}
        >
          Verify & Create Challenge
        </button>
      </form>
    </div>
  );
}

// Leaderboard Component
function Leaderboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/leaderboard`);
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>EXP</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id || index}>
              <td>#{index + 1}</td>
              <td>{user.username}</td>
              <td>{user.exp}</td>
              <td>{user.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;