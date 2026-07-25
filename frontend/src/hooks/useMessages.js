import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { API_BASE_URL } from '../utils/config';

/**
 * Normalize messages from the DB (content→text, ensure role is 'user'|'ai')
 */
export const normalizeMessages = (dbMessages) => {
  if (!Array.isArray(dbMessages)) return [];
  return dbMessages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'ai',
    text: msg.text ?? msg.content ?? '',
    id: msg.id,
  }));
};

export const useMessages = (isGuest) => {
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState(''); // e.g. "Searching the web..."
  const { getToken } = useAuth();

  const setInitialMessages = useCallback((msgs) => {
    setMessages(normalizeMessages(msgs));
  }, []);

  const sendMessage = async (text, currentChatId, model, imageBase64, onChatCreated) => {
    if (!text?.trim() && !imageBase64) return;

    const userMsg = { role: 'user', text: text.trim(), image: imageBase64, id: `user-${Date.now()}` };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setThinkingStatus('');

    let token;
    if (!isGuest) {
      try {
        token = await getToken();
      } catch {
        setMessages((prev) => [...prev, { role: 'ai', text: 'Authentication failed. Please sign in again.', id: `ai-err-${Date.now()}` }]);
        setIsGenerating(false);
        return;
      }
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (isGuest) headers['X-Guest-Mode'] = 'true';

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          text: text.trim() || 'Please process the attached image.', 
          chatId: currentChatId, 
          model,
          ...(imageBase64 && { imageBase64 }),
          ...(isGuest && { chatHistory: messages })
        }),
      });
    } catch (networkErr) {
      setMessages((prev) => [...prev, {
        role: 'ai',
        text: '⚠️ Unable to reach the server. Please check your connection.',
        id: `ai-err-${Date.now()}`,
      }]);
      setIsGenerating(false);
      return;
    }

    if (!response.ok) {
      let errText = 'Failed to send message.';
      try {
        const errData = await response.json();
        errText = errData.error || errText;
      } catch { /* ignore */ }
      setMessages((prev) => [...prev, { role: 'ai', text: `⚠️ ${errText}`, id: `ai-err-${Date.now()}` }]);
      setIsGenerating(false);
      return;
    }

    // Add empty AI message placeholder that we'll stream into
    const aiMsgId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, { role: 'ai', text: '', id: aiMsgId }]);

    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process all complete SSE lines in the buffer
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ') && !line.startsWith('event: ')) continue;

          if (line.startsWith('event: thinking')) {
            // Next line will have the data — peek at buffer
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            // System: chat ID notification
            if (data.startsWith('[System: ChatId=')) {
              const match = data.match(/\[System: ChatId=([^\]]+)\]/);
              if (match && onChatCreated) {
                onChatCreated(match[1]);
              }
              continue;
            }

            // Tool-use thinking indicator
            if (data.startsWith('[THINKING:')) {
              const thinkingMatch = data.match(/\[THINKING: (.+)\]/);
              if (thinkingMatch) {
                const raw = thinkingMatch[1];
                // Format nicely
                const toolLabels = {
                  'internet_search': '🔍 Searching the web',
                  'get_weather': '🌤️ Checking weather',
                  'get_current_time': '🕒 Getting current time',
                  'document_rag_search': '📄 Searching your documents',
                  'save_memory': '💾 Saving to memory',
                };
                const toolNameMatch = raw.match(/Using (\w+)/);
                const toolName = toolNameMatch ? toolNameMatch[1] : 'tool';
                const queryMatch = raw.match(/for "(.+)"/);
                const label = toolLabels[toolName] || `🔧 Using ${toolName}`;
                const statusMsg = queryMatch ? `${label}: "${queryMatch[1]}"...` : `${label}...`;
                setThinkingStatus(statusMsg);
              }
              continue;
            }

            // Regular text token — decode escaped newlines and append
            const decoded = data.replace(/\\n/g, '\n');
            setMessages((prev) => {
              const newMsgs = [...prev];
              const idx = newMsgs.findIndex((m) => m.id === aiMsgId);
              if (idx === -1) return newMsgs;
              newMsgs[idx] = { ...newMsgs[idx], text: newMsgs[idx].text + decoded };
              return newMsgs;
            });
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6);
        if (data && !data.startsWith('[System:') && !data.startsWith('[THINKING:')) {
          const decoded = data.replace(/\\n/g, '\n');
          setMessages((prev) => {
            const newMsgs = [...prev];
            const idx = newMsgs.findIndex((m) => m.id === aiMsgId);
            if (idx === -1) return newMsgs;
            newMsgs[idx] = { ...newMsgs[idx], text: newMsgs[idx].text + decoded };
            return newMsgs;
          });
        }
      }

    } catch (streamErr) {
      console.error('Stream error:', streamErr);
      setMessages((prev) => {
        const newMsgs = [...prev];
        const idx = newMsgs.findIndex((m) => m.id === aiMsgId);
        if (idx !== -1 && !newMsgs[idx].text) {
          newMsgs[idx] = { ...newMsgs[idx], text: '⚠️ Connection interrupted. Please try again.' };
        }
        return newMsgs;
      });
    } finally {
      setIsGenerating(false);
      setThinkingStatus('');
    }
  };

  return { messages, setInitialMessages, sendMessage, isGenerating, thinkingStatus };
};
