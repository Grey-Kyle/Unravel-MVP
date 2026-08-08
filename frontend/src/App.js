import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';
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
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      const adminStatus = res.data.isAdmin === true || res.data.is_admin === 1;
      setIsAdmin(adminStatus);
      localStorage.setItem('isAdmin', String(adminStatus));
    } catch (err) {
      console.error('Error fetching profile:', err);
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
          <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span>
              EXP: {user?.exp ?? '...'} | Rank: {user?.rank ?? '...'}
            </span>
            <button
              onClick={() => setView('profile')}
              title="Profile"
              style={{
                background: 'none',
                border: '1px solid #00d9ff',
                color: '#00d9ff',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              👤
            </button>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      <nav className="nav">
        {token && (
          <>
            <button onClick={() => setView('sprint')}>Sprint</button>
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
        {token && view === 'sprint' && <Sprint token={token} />}
        {token && view === 'challenges' && <Challenges key={challengesKey} token={token} refreshStats={fetchUserProfile} />}
        {token && view === 'create' && <CreateChallenge token={token} isAdmin={isAdmin} onBack={() => setView('challenges')} onCreated={() => setChallengesKey(k => k + 1)} />}
        {token && view === 'leaderboard' && <Leaderboard />}
        {token && view === 'profile' && <ProfileView user={user} onBack={() => setView('challenges')} />}
        {token && view === 'admin' && isAdmin && <AdminDashboard token={token} onBack={() => setView('challenges')} />}
        {token && view === 'admin' && !isAdmin && (
          <div className="error">Unauthorized: Admin access only.</div>
        )}
      </main>
    </div>
  );
}

function ProfileView({ user, onBack }) {
  if (!user) return <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>Loading...</div>;

  const formatSprintTime = (ms) => {
    if (!ms) return '—';
    return (ms / 1000).toFixed(2) + 's';
  };

  return (
    <div style={{ maxWidth: '450px', margin: '30px auto', padding: '0 20px', color: '#fff' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px' }}
      >
        ← Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>👤</div>
        <h2 style={{ color: '#00d9ff', margin: '0' }}>{user.username}</h2>
        <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>{user.rank}</p>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <StatCard label="EXP" value={user.exp} />
        <StatCard label="Leaderboard Rank" value={`#${user.leaderboardRank}`} />
        <StatCard label="Challenges Solved" value={user.challengesSolved} />
        <StatCard label="Challenges Created" value={user.challengesCreated} />
        
        <div style={{ background: '#1a1a2e', border: '1px solid #334155', borderRadius: '10px', padding: '16px', marginTop: '8px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Sprint Best</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00d9ff' }}>
                {formatSprintTime(user.sprintBestTime)}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                {user.sprintBestTime ? `${user.sprintWrongs || 0} wrong when set` : 'No sprint completed yet'}
              </div>
            </div>
            <div style={{ fontSize: '32px' }}>🏃</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #334155', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#94a3b8', fontSize: '14px' }}>{label}</span>
      <span style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{value ?? 0}</span>
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

function Sprint({ token }) {
  const [phase, setPhase] = useState('start');
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState([]);

  useEffect(() => {
    let interval;
    if (phase === 'playing') {
      interval = setInterval(() => setElapsed(Date.now() - startTime), 100);
    }
    return () => clearInterval(interval);
  }, [phase, startTime]);

  const start = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sprint`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPool(res.data.challenges);
      setIndex(0);
      setCorrect(0);
      setWrong(0);
      setAnswers([]);
      setElapsed(0);
      setStartTime(Date.now());
      setPhase('playing');
    } catch (err) {
      alert('Failed to load sprint');
    }
  };

  const guess = (runs) => {
    const current = pool[index];
    const isCorrect = current.runs === runs;
    const nextAnswers = [...answers, { id: current.id, guess: runs }];

    let nextCorrect = correct;
    let nextWrong = wrong;
    let nextIndex = index + 1;

    if (isCorrect) {
      nextCorrect = correct + 1;
    } else {
      nextWrong = wrong + 1;
    }

    if (nextCorrect >= 10) {
      finish(nextAnswers, nextWrong);
      return;
    }

    if (nextIndex >= pool.length) {
      finish(nextAnswers, nextWrong);
      return;
    }

    setAnswers(nextAnswers);
    setCorrect(nextCorrect);
    setWrong(nextWrong);
    setIndex(nextIndex);
  };

  const finish = async (finalAnswers, finalWrong) => {
    const raw = Date.now() - startTime;
    setPhase('results');

    try {
      const res = await axios.post(
        `${API_URL}/api/sprint/submit`,
        { answers: finalAnswers, rawTimeMs: raw },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      setResult({
        correctCount: 10,
        wrongCount: finalWrong,
        rawTimeMs: raw,
        penaltyTotal: finalWrong * 2000,
        penalizedTime: raw + (finalWrong * 2000),
        newBest: false
      });
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sprint/leaderboard`);
      setBoard(res.data);
      setPhase('leaderboard');
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (ms) => (ms / 1000).toFixed(1) + 's';

  if (phase === 'start') {
    return (
      <div style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center', color: '#fff', padding: '0 20px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>🏃</h1>
        <h2 style={{ color: '#00d9ff', marginBottom: '10px' }}>Sprint Mode</h2>
        <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
          Spot broken code as fast as you can.<br/>
          10 correct to finish.<br/>
          Wrong guesses add +2s penalty.
        </p>
        <button
          onClick={start}
          style={{
            width: '100%',
            padding: '18px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            background: '#00d9ff',
            color: '#0f172a',
            cursor: 'pointer'
          }}
        >
          Start Sprint
        </button>
        <button
          onClick={loadLeaderboard}
          style={{
            marginTop: '15px',
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            borderRadius: '12px',
            border: '1px solid #334155',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          View Leaderboard
        </button>
      </div>
    );
  }

  if (phase === 'playing' && pool[index]) {
    const current = pool[index];
    const progressDots = Array.from({ length: 10 }, (_, i) => (
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          margin: '0 3px',
          background: i < correct ? '#00d9ff' : '#334155'
        }}
      />
    ));

    return (
      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 20px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ color: '#00d9ff', fontSize: '24px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(elapsed)}
          </span>
          <span style={{ color: '#64748b', fontSize: '14px' }}>
            {correct}/10
          </span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          {progressDots}
        </div>

        <div
          style={{
            background: '#1a1a2e',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '30px',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <pre style={{ margin: 0, color: '#00ff00', fontFamily: 'monospace', fontSize: '15px', lineHeight: '1.5', textAlign: 'left', width: '100%' }}>
            {current.code}
          </pre>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => guess(true)}
            style={{
              flex: 1,
              padding: '20px',
              fontSize: '18px',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: '2px solid #22c55e',
              background: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              cursor: 'pointer'
            }}
          >
            ✅ Runs
          </button>
          <button
            onClick={() => guess(false)}
            style={{
              flex: 1,
              padding: '20px',
              fontSize: '18px',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: '2px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              cursor: 'pointer'
            }}
          >
            ❌ Crashes
          </button>
        </div>

        {wrong > 0 && (
          <p style={{ textAlign: 'center', color: '#ef4444', marginTop: '15px', fontSize: '14px' }}>
            {wrong} wrong → +{(wrong * 2).toFixed(0)}s penalty
          </p>
        )}
      </div>
    );
  }

  if (phase === 'results' && result) {
    return (
      <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', color: '#fff', padding: '0 20px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '5px' }}>🏁</h1>
        <h2 style={{ marginBottom: '25px' }}>Sprint Complete</h2>

        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '24px', marginBottom: '25px' }}>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '5px' }}>FINAL TIME</div>
          <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#00d9ff', fontVariantNumeric: 'tabular-nums' }}>
            {(result.penalizedTime / 1000).toFixed(2)}s
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>RAW</div>
              <div style={{ fontSize: '18px', color: '#94a3b8' }}>{(result.rawTimeMs / 1000).toFixed(2)}s</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>WRONG</div>
              <div style={{ fontSize: '18px', color: '#ef4444' }}>{result.wrongCount}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>PENALTY</div>
              <div style={{ fontSize: '18px', color: '#ef4444' }}>+{(result.penaltyTotal / 1000).toFixed(0)}s</div>
            </div>
          </div>
        </div>

        {result.newBest && (
          <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '20px', fontSize: '18px' }}>
            🎉 New Personal Best!
          </div>
        )}

        <button
          onClick={start}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            background: '#00d9ff',
            color: '#0f172a',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          Try Again
        </button>
        <button
          onClick={loadLeaderboard}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            borderRadius: '12px',
            border: '1px solid #334155',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          Leaderboard
        </button>
      </div>
    );
  }

  if (phase === 'leaderboard') {
    return (
      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 20px', color: '#fff' }}>
        <button
          onClick={() => setPhase('start')}
          style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px' }}
        >
          ← Back
        </button>
        <h2 style={{ color: '#00d9ff', marginBottom: '20px', textAlign: 'center' }}>🏆 Sprint Leaders</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <span>Rank</span>
          <span>Player</span>
          <span>Time</span>
        </div>

        {board.map((entry, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 15px',
              background: i === 0 ? 'rgba(0, 217, 255, 0.08)' : '#1a1a2e',
              border: i === 0 ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid #334155',
              borderRadius: '10px',
              marginBottom: '8px'
            }}
          >
            <span style={{ width: '40px', color: i === 0 ? '#00d9ff' : '#64748b', fontWeight: 'bold' }}>
              #{i + 1}
            </span>
            <span style={{ flex: 1, textAlign: 'left', paddingLeft: '10px', color: '#e2e8f0' }}>
              {entry.username}
            </span>
            <span style={{ color: '#fff', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
              {entry.finalTime}
            </span>
          </div>
        ))}

        {board.length === 0 && (
          <p style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>No sprints completed yet. Be the first!</p>
        )}
      </div>
    );
  }

  return null;
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

  const goToChallenge = (index) => {
    setCurrentIndex(index);
    setUserOutput('');
    setResult(null);
  };

  const goBack = () => {
    setCurrentIndex(-1);
    setUserOutput('');
    setResult(null);
  };

  const goNext = () => {
    const next = currentIndex + 1;
    if (next < challenges.length) {
      goToChallenge(next);
    } else {
      goBack();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentIndex === -1 || !challenges[currentIndex]) return;
    
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
    const hasNext = currentIndex + 1 < challenges.length;

    return (
      <div className="challenge-detail">
        <button onClick={goBack}>← Back</button>
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
                onClick={goNext}
                style={{ 
                  flex: 1, 
                  minWidth: '150px',
                  padding: '14px',
                  borderRadius: '8px',
                  background: '#1a1a2e',
                  color: '#00d9ff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: '1px solid #00d9ff'
                }}
              >
                {hasNext ? 'Next Challenge →' : 'Back to List →'}
              </button>
              
              <button 
                onClick={goBack}
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
        <div key={challenge.id} className="challenge-card" onClick={() => goToChallenge(index)}>
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