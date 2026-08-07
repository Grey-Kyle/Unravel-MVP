import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';
import Profile from './Profile';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [challengesKey, setChallengesKey] = useState(0);

  useEffect(() => {
    if (token) {
      fetchUserStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUserStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      const adminStatus = res.data.isAdmin === true;
      setIsAdmin(adminStatus);
      localStorage.setItem('isAdmin', String(adminStatus));
    } catch (err) {
      console.error('Error fetching stats:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        logout();
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
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
            <span>
              EXP: {user?.exp ?? '...'} | Rank: {user?.rank ?? '...'}
            </span>
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
            <button onClick={() => setView('profile')}>Profile</button>
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
        {token && view === 'challenges' && <Challenges key={challengesKey} token={token} refreshStats={fetchUserStats} />}
        {token && view === 'create' && <CreateChallenge token={token} isAdmin={isAdmin} onBack={() => setView('challenges')} onCreated={() => setChallengesKey(k => k + 1)} />}
        {token && view === 'leaderboard' && <Leaderboard />}
        {token && view === 'profile' && <Profile token={token} />}
        {token && view === 'admin' && isAdmin && <AdminDashboard token={token} onBack={() => setView('challenges')} />}
        {token && view === 'admin' && !isAdmin && (
          <div className="error">Unauthorized: Admin access only.</div>
        )}
      </main>
    </div>
  );
}

function Login({ setToken, setIsAdmin, setView }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/login`, { username, password });
      const adminStatus = response.data.isAdmin === true;
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isAdmin', String(adminStatus));
      setToken(response.data.token);
      setIsAdmin(adminStatus);
      setView('challenges');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <button onClick={() => setView('register')}>Register</button></p>
    </div>
  );
}

function Register({ setToken, setIsAdmin, setView }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/register`, { username, password });
      const adminStatus = response.data.isAdmin === true;
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isAdmin', String(adminStatus));
      setToken(response.data.token);
      setIsAdmin(adminStatus);
      setView('challenges');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-form">
      <h2>Register</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <button onClick={() => setView('login')}>Login</button></p>
    </div>
  );
}

function Challenges({ token, refreshStats }) {
  const [challenges, setChallenges] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [userOutput, setUserOutput] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSelectChallenge = (index) => {
    setCurrentIndex(index);
    setUserOutput('');
    setResult(null);
  };

  const handleBack = () => {
    setCurrentIndex(-1);
    setUserOutput('');
    setResult(null);
  };

  const handleNext = () => {
    if (currentIndex + 1 < challenges.length) {
      setCurrentIndex(currentIndex + 1);
      setUserOutput('');
      setResult(null);
    } else {
      handleBack();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentIndex === -1) return;
    const challenge = challenges[currentIndex];
    setSubmitting(true);
    setResult(null);
    try {
      const res = await axios.post(
        `${API_URL}/api/challenges/${challenge.id}/submit`,
        { user_answer: userOutput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
      if (res.data.is_correct) refreshStats();
    } catch (err) {
      setResult({ is_correct: false, message: err.response?.data?.error || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  if (currentIndex !== -1 && challenges[currentIndex]) {
    const challenge = challenges[currentIndex];
    const isLast = currentIndex === challenges.length - 1;

    return (
      <div className="challenge-detail">
        <button onClick={handleBack}>← Back</button>
        <h2>{challenge.title}</h2>
        <p>Difficulty: {challenge.difficulty} | EXP: {challenge.exp_value}</p>
        <pre className="code-block">{challenge.code}</pre>
        <form onSubmit={handleSubmit}>
          <textarea
            className="answer-textarea"
            value={userOutput}
            onChange={(e) => setUserOutput(e.target.value)}
            placeholder="Enter your output..."
            required
          />
          <button type="submit" disabled={submitting} className="answer-submit-btn">
            {submitting ? 'Verifying...' : 'Submit Answer →'}
          </button>
        </form>

        {result && (
          <>
            <div className={`result ${result.is_correct ? 'correct' : 'incorrect'}`}>
              {result.is_correct ? `✓ Correct! +${result.exp_earned} EXP` : `✗ ${result.message}`}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleNext}
                className="answer-submit-btn"
                style={{ flex: 1, minWidth: '150px' }}
              >
                {isLast ? 'Back to List →' : 'Next Challenge →'}
              </button>
              <button 
                onClick={handleBack}
                style={{ 
                  flex: 1, 
                  minWidth: '150px',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #64748b',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ← Back to List
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="challenges-list">
      <h2>Challenges</h2>
      {challenges.map((challenge, index) => (
        <div key={challenge.id} className="challenge-card" onClick={() => handleSelectChallenge(index)}>
          <h3>{challenge.title}</h3>
          <p>Difficulty: {challenge.difficulty} | EXP: {challenge.exp_value}</p>
          {challenge.is_official === 1 ? (
            <span className="official-badge"> Official</span>
          ) : (
            <span style={{ color: '#64748b', fontSize: '0.85em' }}> by {challenge.creator_name || 'Unknown'}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function CreateChallenge({ token, isAdmin, onBack, onCreated }) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [correctOutput, setCorrectOutput] = useState('');
  const [difficulty, setDifficulty] = useState(1);
  const [isOfficial, setIsOfficial] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let timeoutId;
    if (success) {
      timeoutId = setTimeout(() => onBack(), 2000);
    }
    return () => clearTimeout(timeoutId);
  }, [success, onBack]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDetails('');
    setSuccess('');
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/challenges`,
        { 
          title, 
          code, 
          correct_output: correctOutput, 
          difficulty: Number(difficulty), 
          language: 'javascript', 
          is_official: isOfficial ? 1 : 0 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Challenge created and verified successfully!');
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create challenge');
      setDetails(err.response?.data?.details || '');
    } finally {
      setSubmitting(false);
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

      {error && (
        <div className="message error">
          <strong>{error}</strong>
          {details && <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '13px', color: '#f87171', background: '#1a1a2e', padding: '10px', borderRadius: '5px' }}>{details}</pre>}
        </div>
      )}
      {success && <div className="message success">{success}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" placeholder="Challenge Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: '16px' }} />
        <textarea placeholder="Paste your JavaScript code here..." value={code} onChange={(e) => setCode(e.target.value)} required rows="8" style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#1a1a2e', color: '#00ff00', fontFamily: 'monospace', fontSize: '14px' }} />
        <textarea placeholder="Expected Output (what the code should print)" value={correctOutput} onChange={(e) => setCorrectOutput(e.target.value)} required rows="3" style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: '14px' }} />
        <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: '16px' }}>
          <option value={1}>Easy (10 EXP)</option>
          <option value={2}>Medium (20 EXP)</option>
          <option value={3}>Hard (30 EXP)</option>
        </select>
        {isAdmin && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#1a1a2e', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px' }}>
            <input type="checkbox" checked={isOfficial} onChange={(e) => setIsOfficial(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
            <span style={{ color: '#00d9ff', fontWeight: 'bold' }}> Official Challenge</span>
          </label>
        )}
        <button type="submit" disabled={submitting} className="create-submit-btn">
          {submitting ? 'Verifying...' : 'Verify & Create Challenge'}
        </button>
      </form>
    </div>
  );
}

function Leaderboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <tr key={index}>
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