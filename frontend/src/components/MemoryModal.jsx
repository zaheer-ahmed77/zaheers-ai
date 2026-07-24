import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { X, Trash2, Brain, Plus, AlertCircle, Check, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../utils/config';

const MemoryModal = ({ isOpen, onClose }) => {
  const { getToken } = useAuth();
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchMemories = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/memory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch memories');
      const data = await res.json();
      if (data.memories) setMemories(data.memories);
    } catch (err) {
      setError('Could not load memories. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
      setIsAdding(false);
      setNewKey('');
      setNewValue('');
      setShowClearConfirm(false);
    }
  }, [isOpen, fetchMemories]);

  const deleteMemory = async (id) => {
    setDeletingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/memory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      } else {
        setError('Failed to delete memory.');
      }
    } catch (err) {
      setError('Failed to delete memory.');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const addMemory = async () => {
    const key = newKey.trim();
    const value = newValue.trim();
    if (!key || !value) return;

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (res.ok && data.memory) {
        // Check if it's an update or new entry (upsert on backend)
        setMemories((prev) => {
          const existing = prev.findIndex((m) => m.key === key);
          if (existing !== -1) {
            const updated = [...prev];
            updated[existing] = data.memory;
            return updated;
          }
          return [...prev, data.memory];
        });
        setNewKey('');
        setNewValue('');
        setIsAdding(false);
      } else {
        setError(data.error || 'Failed to add memory.');
      }
    } catch (err) {
      setError('Failed to add memory.');
      console.error(err);
    }
  };

  const clearAllMemories = async () => {
    setIsClearingAll(true);
    try {
      const token = await getToken();
      // Delete one by one (no bulk endpoint)
      await Promise.all(
        memories.map((m) =>
          fetch(`${API_BASE_URL}/api/memory/${m.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setMemories([]);
      setShowClearConfirm(false);
    } catch (err) {
      setError('Failed to clear all memories.');
      console.error(err);
    } finally {
      setIsClearingAll(false);
    }
  };

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#1e1f20] rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <Brain size={22} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Agent Memory</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {memories.length} {memories.length === 1 ? 'item' : 'items'} stored
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {memories.length > 0 && !showClearConfirm && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Clear all
              </button>
            )}
            {showClearConfirm && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 mr-1">Sure?</span>
                <button
                  onClick={clearAllMemories}
                  disabled={isClearingAll}
                  className="text-xs text-red-500 font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                >
                  {isClearingAll ? <Loader2 size={12} className="animate-spin" /> : 'Yes, clear'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-xs text-slate-500 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
            </div>
          ) : memories.length === 0 && !isAdding ? (
            <div className="text-center py-14 px-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Brain size={32} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No memories yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
                Chat with Aura and tell it to remember things about you, or add one manually below.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-slate-50 dark:bg-[#131314] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-start group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">
                        {memory.key}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-1">
                      {memory.value}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    disabled={deletingId === memory.id}
                    className="p-2 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all ml-3 flex-shrink-0 disabled:opacity-50"
                    title="Delete this memory"
                  >
                    {deletingId === memory.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Memory Form */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800/60">
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 w-full justify-center py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all"
            >
              <Plus size={16} />
              Add memory manually
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Key (e.g. userName)"
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-[#131314] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-400 dark:focus:border-indigo-600 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                />
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Value (e.g. Alice)"
                  onKeyDown={(e) => { if (e.key === 'Enter') addMemory(); if (e.key === 'Escape') setIsAdding(false); }}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-[#131314] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-400 dark:focus:border-indigo-600 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setIsAdding(false); setNewKey(''); setNewValue(''); }}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addMemory}
                  disabled={!newKey.trim() || !newValue.trim()}
                  className="px-4 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryModal;
