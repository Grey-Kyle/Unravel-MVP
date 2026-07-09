import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ token, onBack }) {
  const [stats, setStats] = useState({ users: 0, challenges: 0 });
  const [users, setUsers] = useState([]);
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const usersRes = await axios.get('http://localhost:5000/api/leaderboard', { headers });
      setUsers(usersRes.data);
      
      const challengesRes = await axios.get('http://localhost:5000/api/challenges', { headers });
      setChallenges(challengesRes.data);
      
      setStats({
        users: usersRes.data.length,
        challenges: challengesRes.data.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const deleteChallenge = async (id) => {
    if (!window.confirm('Delete this challenge? This cannot be undone.')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/challenges/${id}`, {
  headers: { Authorization: `Bearer ${token}` }
});
      fetchDashboardData();
      alert('Challenge deleted successfully!');
    } catch (error) {
      alert('Failed to delete challenge: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="admin-dashboard" style={{ padding: '20px', color: '#fff' }}>
      <h2 style={{ color: '#00d9ff' }}>👑 Admin Dashboard</h2>
      
      <button onClick={onBack} style={{ marginBottom: '20px', padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        ← Back to Challenges
      </button>
      
      {/* Stats */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px', flex: 1 }}>
          <h3>Total Users</h3>
          <p style={{ fontSize: '2em', color: '#00d9ff' }}>{stats.users}</p>
        </div>
        <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px', flex: 1 }}>
          <h3>Total Challenges</h3>
          <p style={{ fontSize: '2em', color: '#00d9ff' }}>{stats.challenges}</p>
        </div>
      </div>
      
      {/* Users List */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#00d9ff' }}>All Users</h3>
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
              <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px' }}>{user.username}</td>
                <td style={{ padding: '10px' }}>{user.exp}</td>
                <td style={{ padding: '10px' }}>{user.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Challenges List with Delete Buttons */}
      <div>
        <h3 style={{ color: '#00d9ff' }}>All Challenges</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a1a2e' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Difficulty</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>EXP Value</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Official</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((challenge) => (
              <tr key={challenge.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px' }}>{challenge.title}</td>
                <td style={{ padding: '10px' }}>{challenge.difficulty}</td>
                <td style={{ padding: '10px' }}>{challenge.exp_value}</td>
                <td style={{ padding: '10px' }}>{challenge.is_official === 1 ? '👑 Yes' : 'No'}</td>
                <td style={{ padding: '10px' }}>
                  <button 
                    onClick={() => deleteChallenge(challenge.id)} 
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}
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