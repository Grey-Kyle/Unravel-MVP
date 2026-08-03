import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://Unravel.onrender.com';

function Profile({ token }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

    useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: 20 }}>Loading profile...</div>;
  if (error) return <div style={{ color: '#ef4444', padding: 20 }}>{error}</div>;
  if (!profile) return null;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', color: '#fff' }}>
      <h2 style={{ color: '#00d9ff', marginBottom: '10px' }}>👤 {profile.username}</h2>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>Rank: {profile.rank}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>EXP</h3>
          <p style={{ fontSize: '2em', color: '#00d9ff', fontWeight: 'bold' }}>{profile.exp}</p>
        </div>
        <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Leaderboard</h3>
          <p style={{ fontSize: '2em', color: '#00d9ff', fontWeight: 'bold' }}>#{profile.leaderboardRank}</p>
        </div>
        <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Created</h3>
          <p style={{ fontSize: '2em', color: '#00d9ff', fontWeight: 'bold' }}>{profile.challengesCreated}</p>
        </div>
        <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Solved</h3>
          <p style={{ fontSize: '2em', color: '#00d9ff', fontWeight: 'bold' }}>{profile.challengesSolved}</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;