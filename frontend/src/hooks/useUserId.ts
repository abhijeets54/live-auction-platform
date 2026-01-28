import { useState, useEffect } from 'react';

/**
 * Hook to generate and persist a unique user ID
 */
export const useUserId = () => {
  const [userId, setUserId] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Get or create user ID
    let id = localStorage.getItem('userId');
    if (!id) {
      id = `user_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('userId', id);
    }
    setUserId(id);

    // Get or create username
    let name = localStorage.getItem('username');
    if (!name) {
      name = `Bidder${Math.floor(Math.random() * 9000) + 1000}`;
      localStorage.setItem('username', name);
    }
    setUsername(name);
  }, []);

  return { userId, username };
};
