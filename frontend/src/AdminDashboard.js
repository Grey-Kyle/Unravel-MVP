import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '';

function AdminDashboard({ token, onBack }) {
  const [stats, setStats] = useState({ users: 0, challenges: 0 });
  const [users, setUsers] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const usersRes = await axios.get(`${API_URL}/api/leaderboard`, { headers });
      setUsers(usersRes.data);
      
      const challengesRes = await axios.get(`${API_URL}/api/challenges`, { headers });
      setChallenges(challengesRes.data);
      
      // NOTE: Leaderboard is capped at 10. Add GET /api/admin/stats backend route for real totals.
      setStats({
        users: usersRes.data.length,
        challenges: challengesRes.data.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const deleteChallenge = async (id) => {
    if (!window.confirm('Delete this challenge? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/api/challenges/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchDashboardData();
      alert('Challenge deleted successfully!');
    } catch (error) {
      alert('Failed to delete challenge: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: 20 }}>Loading dashboard...</div>;
  if (error) return <div style={{ color: '#ef4444', padding: 20 }}>{error}</div>;

  return (
    <div className="admin-dashboard" style={{ padding: '20px', color: '#fff' }}>
      <h2 style={{ color: '#00d9ff' }}>👑 Admin Dashboard</h2>
      <button 
        onClick={onBack} 
        style={{ 
          marginBottom: '20px', 
          padding: '8px 16px', 
          background: '#333', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer' 
        }}
      >
        ← Back to Challenges
      </button>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px', flex: 1 }}>
          <h3>Users on Leaderboard</h3>
          <p style={{ fontSize: '2em', color: '#00d9ff' }}>{stats.users}</p>
          <small style={{ color: '#64748b' }}>Top 10 shown</small>
        </div>
        <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px', flex: 1 }}>
          <h3>Total Challenges</h3>
          <p style={{ fontSize: '2em', color: '#00d9ff' }}>{stats.challenges}</p>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#00d9ff' }}>Leaderboard Users</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a1a2e' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>EXP</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Rank</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={user.username || index} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px' }}>{user.username}</td>
                <td style={{ padding: '10px' }}>{user.exp}</td>
                <td style={{ padding: '10px' }}>{user.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 style={{ color: '#00d9ff' }}>All Challenges</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a1a2e' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Difficulty</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>EXP</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Official</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((challenge) => (
              <tr key={challenge.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px' }}>{challenge.title}</td>
                <td style={{ padding: '10px' }}>
                  {challenge.difficulty === 1 ? 'Easy' : challenge.difficulty === 2 ? 'Medium' : 'Hard'}
                </td>
                <td style={{ padding: '10px' }}>{challenge.exp_value}</td>
                <td style={{ padding: '10px' }}>{challenge.is_official === 1 ? '✅' : '—'}</td>
                <td style={{ padding: '10px' }}>
                  <button
                    onClick={() => deleteChallenge(challenge.id)}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;