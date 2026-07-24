import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { Menu, Bot } from 'lucide-react';
import { UserButton } from '@clerk/react';
import { useChat } from './hooks/useChat';
import { useMessages, normalizeMessages } from './hooks/useMessages';

function AuraApp({ onOpenMemory }) {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('openrouter-auto');

  const { history, fetchHistory, deleteChat } = useChat();
  const { messages, setInitialMessages, sendMessage, isGenerating, thinkingStatus } = useMessages();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleNewChat = () => {
    setInitialMessages([]);
    setCurrentChatId(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleSelectHistory = (session) => {
    // Normalize messages from DB format (content/role) to UI format (text/role)
    setInitialMessages(normalizeMessages(session.messages));
    setCurrentChatId(session.id);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleSendMessage = async (text, imageBase64Payload) => {
    const wasNewChat = !currentChatId;
    await sendMessage(text, currentChatId, selectedModel, imageBase64Payload, (newId) => {
      setCurrentChatId(newId);
      fetchHistory();
    });
    if (!wasNewChat) {
      fetchHistory();
    }
  };

  const handleDeleteChat = async (chatId) => {
    const success = await deleteChat(chatId);
    if (success && chatId === currentChatId) {
      // If the deleted chat was active, start fresh
      setInitialMessages([]);
      setCurrentChatId(null);
    }
    return success;
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-[#e3e3e3] overflow-hidden font-sans transition-colors duration-300">

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          onNewChat={handleNewChat}
          history={history}
          onSelectHistory={handleSelectHistory}
          onOpenMemory={onOpenMemory}
          currentChatId={currentChatId}
          onDeleteChat={handleDeleteChat}
        />
      </div>

      <div className="flex-1 flex flex-col relative transition-all duration-300 min-w-0">

        {/* Mobile header bar */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          {!isSidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a2b2f] text-slate-600 dark:text-[#c4c7c5] transition-colors shadow-sm lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
          )}
        </div>

        {/* Desktop top header */}
        <div className="hidden lg:flex justify-between items-center absolute top-4 left-6 right-6 z-10 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src="/logo.webp" alt="AI" className="w-full h-full object-cover" />
            </div>
            <div className="pointer-events-none">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#e3e3e3] drop-shadow-md">
                Zaheer's AI
              </h1>
              <span className="text-xs text-slate-500 dark:text-[#c4c7c5] tracking-widest uppercase pl-1 block -mt-1">
                Agentic AI Platform
              </span>
            </div>
          </div>
          <UserButton />
        </div>

        <ChatArea
          messages={messages}
          isGenerating={isGenerating}
          thinkingStatus={thinkingStatus}
          onSendMessage={handleSendMessage}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
        />
      </div>
    </div>
  );
}

import { useAuth } from '@clerk/react';
import LoginPage from './components/LoginPage';
import MemoryModal from './components/MemoryModal';

function InnerApp() {
  const { isLoaded, isSignedIn } = useAuth();
  const [isMemoryModalOpen, setMemoryModalOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <img src="/logo.webp" alt="AI" className="w-full h-full object-cover" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 dark:border-emerald-500" />
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <>
        <AuraApp onOpenMemory={() => setMemoryModalOpen(true)} />
        <MemoryModal isOpen={isMemoryModalOpen} onClose={() => setMemoryModalOpen(false)} />
      </>
    );
  }

  return <LoginPage />;
}

function App() {
  return <InnerApp />;
}

export default App;
