import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { API_BASE_URL } from '../utils/config';

export const useChat = (isGuest) => {
  const [history, setHistory] = useState([]);
  const { getToken } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (isGuest) {
      setHistory([]);
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/chat/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  }, [getToken]);

  const deleteChat = useCallback(async (chatId) => {
    if (isGuest) return false;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((c) => c.id !== chatId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete chat', err);
      return false;
    }
  }, [getToken]);

  return { history, fetchHistory, deleteChat };
};
