import React, { useState } from 'react';
import { Menu, Plus, MessageSquare, Settings, Trash2, Bot } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { SignOutButton, UserButton } from '@clerk/react';
import { LogOut } from 'lucide-react';

/**
 * Group chat history items by relative date for a cleaner sidebar UX.
 */
function groupByDate(history) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] };

  for (const item of history) {
    const d = new Date(item.updatedAt || item.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) {
      groups['Today'].push(item);
    } else if (day >= yesterday) {
      groups['Yesterday'].push(item);
    } else if (day >= lastWeek) {
      groups['Last 7 Days'].push(item);
    } else {
      groups['Older'].push(item);
    }
  }

  return groups;
}

const Sidebar = ({ isOpen, toggleSidebar, onNewChat, history, onSelectHistory, onOpenMemory, currentChatId, onDeleteChat }) => {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, chatId) => {
    e.stopPropagation();
    setDeletingId(chatId);
    try {
      await onDeleteChat(chatId);
    } finally {
      setDeletingId(null);
    }
  };

  const groups = groupByDate(history);
  const hasHistory = history.length > 0;

  return (
    <div
      className={`${isOpen ? 'w-72' : 'w-16'} flex-shrink-0 bg-slate-100 dark:bg-[#151e2e] border-r border-slate-200 dark:border-slate-800 h-full transition-all duration-300 ease-in-out flex flex-col`}
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a2b2f] text-slate-600 dark:text-[#c4c7c5] transition-colors duration-200"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Branding (collapsed state) */}
      {!isOpen && (
        <div className="flex justify-center mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shadow overflow-hidden border border-slate-200 dark:border-slate-800">
            <img src="/logo.webp" alt="AI" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* New Chat Button */}
      <div className="px-3 mt-2">
        <button
          onClick={onNewChat}
          className={`flex items-center gap-3 w-full bg-white dark:bg-[#0b0f19] hover:bg-slate-50 dark:hover:bg-[#2a2b2f] border border-slate-200 dark:border-transparent p-3 rounded-full shadow-sm transition-colors duration-200 ${!isOpen ? 'justify-center' : ''}`}
          title="New Chat"
        >
          <Plus size={20} className="text-slate-600 dark:text-[#c4c7c5] flex-shrink-0" />
          {isOpen && <span className="text-sm font-medium text-slate-800 dark:text-[#e3e3e3]">New Chat</span>}
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto mt-4 px-2 custom-scrollbar">
        {isOpen ? (
          hasHistory ? (
            Object.entries(groups).map(([group, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={group} className="mb-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-1 px-2">
                    {group}
                  </div>
                  {items.map((item) => {
                    const isActive = item.id === currentChatId;
                    const isDeleting = deletingId === item.id;
                    return (
                      <div key={item.id} className="group relative mb-0.5">
                        <button
                          onClick={() => onSelectHistory(item)}
                          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                            isActive
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                              : 'hover:bg-slate-200 dark:hover:bg-[#2a2b2f] text-slate-700 dark:text-[#e3e3e3]'
                          }`}
                          title={item.title}
                        >
                          <MessageSquare
                            size={14}
                            className={`flex-shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400 dark:text-[#c4c7c5]'}`}
                          />
                          <span className="text-sm truncate flex-1">{item.title}</span>
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          disabled={isDeleting}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 ${isDeleting ? 'opacity-50 cursor-wait' : ''}`}
                          title="Delete chat"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 px-4">
              <MessageSquare size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-600">No conversations yet</p>
            </div>
          )
        ) : (
          // Collapsed: show icon-only history
          history.slice(0, 8).map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectHistory(item)}
              className={`flex justify-center w-full p-2.5 rounded-xl mb-0.5 transition-colors duration-150 ${
                item.id === currentChatId
                  ? 'bg-indigo-100 dark:bg-indigo-900/30'
                  : 'hover:bg-slate-200 dark:hover:bg-[#2a2b2f]'
              }`}
              title={item.title}
            >
              <MessageSquare size={16} className={item.id === currentChatId ? 'text-indigo-500' : 'text-slate-500 dark:text-[#c4c7c5]'} />
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 mb-2 flex flex-col gap-1 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-2 py-2 mb-1">
          {isOpen && <ThemeToggle />}
          {!isOpen && (
            <div className="flex w-full justify-center">
              <ThemeToggle />
            </div>
          )}
        </div>
        
        {isOpen && (
          <div className="px-3 py-2 flex items-center gap-3 mb-1">
             <UserButton />
             <span className="text-sm font-medium text-slate-700 dark:text-[#e3e3e3]">My Account</span>
          </div>
        )}
        {!isOpen && (
          <div className="flex w-full justify-center py-2 mb-1">
             <UserButton />
          </div>
        )}

        <button
          onClick={onOpenMemory}
          className={`flex items-center gap-3 w-full p-3 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a2b2f] text-slate-700 dark:text-[#e3e3e3] transition-colors duration-200 ${!isOpen ? 'justify-center' : ''}`}
          title="Memory & Preferences"
        >
          <Settings size={18} className="text-slate-500 dark:text-[#c4c7c5] flex-shrink-0" />
          {isOpen && <span className="text-sm">Memory & Preferences</span>}
        </button>

        <SignOutButton>
          <button
            className={`flex items-center gap-3 w-full p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors duration-200 ${!isOpen ? 'justify-center' : ''}`}
            title="Sign Out"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {isOpen && <span className="text-sm">Sign Out</span>}
          </button>
        </SignOutButton>
      </div>
    </div>
  );
};

export default Sidebar;
