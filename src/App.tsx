import React, { useState, useEffect, useRef } from "react";
import { 
  Menu, 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Plus, 
  Settings2, 
  Sparkles, 
  Info,
  Sliders,
  ChevronRight,
  MessageSquare,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  Search,
  Terminal,
  PenTool,
  Compass,
  BookOpen,
  ArrowUpRight,
  Code2,
  Globe
} from "lucide-react";
import { Conversation, Message, PersonaPreset } from "./types";
import { PERSONA_PRESETS } from "./presets";
import Sidebar from "./components/Sidebar";
import MessageItem from "./components/MessageItem";
import { motion, AnimatePresence } from "motion/react";
import Auth from "./components/Auth";

const LOCAL_STORAGE_KEY = "gemini_chatbot_conversations";
const ACTIVE_CONV_KEY = "gemini_chatbot_active_id";

const PROMPT_CATEGORIES = [
  {
    id: "coding",
    label: "Coding & Dev",
    iconName: "Terminal",
    templates: [
      {
        title: "Debug State Loop",
        description: "Diagnose infinite React re-renders",
        prompt: "Help me identify why my React component triggers an infinite loop of re-renders. Here is the code snippet:\n\n```tsx\n// Paste your component here\n```"
      },
      {
        title: "Custom Hook",
        description: "Build robust, safe React hooks",
        prompt: "Write a complete, high-performance custom React hook called 'useLocalStorage' with full TypeScript support, state synchronization across browser tabs, and clean-up listeners."
      },
      {
        title: "Grid vs Flexbox",
        description: "Compare layout use-cases in detail",
        prompt: "Create an elegant, highly detailed visual markdown table contrasting CSS Grid and CSS Flexbox. List practical, real-world examples of when to choose one over the other."
      }
    ]
  },
  {
    id: "writing",
    label: "Business & Copy",
    iconName: "PenTool",
    templates: [
      {
        title: "SaaS Onboarding Email",
        description: "Draft engaging subscriber content",
        prompt: "Draft a warm, persuasive, and high-converting onboarding welcome email sequence for subscribers of our premium workspace tool called 'Aether'. Include an engaging subject line and 3 clear value pillars."
      },
      {
        title: "Creative Rewrite",
        description: "Polishing and refining prose",
        prompt: "Rewrite the following block of text to make it sound incredibly compelling, vivid, professional, and elegant:\n\n\"[Paste your draft text here]\""
      }
    ]
  },
  {
    id: "creative",
    label: "Creative Narrative",
    iconName: "Sparkles",
    templates: [
      {
        title: "Cyberpunk Fiction",
        description: "Immersive narrative brainstorming",
        prompt: "Compose a captivating 250-word cyberpunk flash fiction piece focusing on a digital consciousness merchant in Neo-Shibuya. Use rich sensory descriptions and moody, evocative sci-fi vocabulary."
      },
      {
        title: "AI Poetic Metaphors",
        description: "Explore imagery and themes",
        prompt: "Write a brief, evocative set of three free-verse poems exploring the relationship between human thought and algorithmic artificial neural networks."
      }
    ]
  },
  {
    id: "learning",
    label: "Coaching & Tutor",
    iconName: "BookOpen",
    templates: [
      {
        title: "Explain Quantum Physics",
        description: "Friendly high-school analogy",
        prompt: "Explain the core concepts of quantum computing (superposition and entanglement) to a high schooler. Use friendly, highly intuitive analogies and avoid dense academic jargon."
      },
      {
        title: "Grammar breakdown",
        description: "Learn idioms and structure",
        prompt: "Translate the expression 'The early bird catches the worm' into colloquial French. Break down the grammatical roles, provide context for usage, and list two common alternatives."
      }
    ]
  }
];

const renderPromptCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case "Terminal": return <Terminal className="h-4 w-4" />;
    case "PenTool": return <PenTool className="h-4 w-4" />;
    case "Sparkles": return <Sparkles className="h-4 w-4" />;
    case "BookOpen": return <BookOpen className="h-4 w-4" />;
    default: return <Compass className="h-4 w-4" />;
  }
};

export default function App() {
  // Authentication & Session States
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Navigation & UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  // New visual/functional features states
  const [searchQuery, setSearchQuery] = useState("");
  const [activePromptCategory, setActivePromptCategory] = useState("coding");
  
  // Active settings state (will sync with selected conversation)
  const [modelName, setModelName] = useState("groq:llama-3.3-70b-versatile");
  const [temperature, setTemperature] = useState(0.7);
  const [systemInstruction, setSystemInstruction] = useState(
    "You are a helpful, respectful, and honest assistant. Provide clear, accurate, and structured answers."
  );

  // Input states
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [hasGroqApiKey, setHasGroqApiKey] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch all conversations for the authenticated user from backend
  const fetchConversations = async (token: string) => {
    try {
      const res = await fetch("/api/conversations", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        
        const storedActiveId = localStorage.getItem(ACTIVE_CONV_KEY);
        if (storedActiveId && data.some((c: any) => c.id === storedActiveId)) {
          setActiveConversationId(storedActiveId);
        } else if (data.length > 0) {
          setActiveConversationId(data[0].id);
        } else {
          // Initialize first default conversation
          const initialConv: Conversation = {
            id: "default-chat",
            title: "Aether Assistant",
            messages: [
              {
                id: "welcome-1",
                role: "assistant",
                content: "Hi! I am Aether, your AI assistant. How can I help you today? Feel free to ask me anything about programming, writing, language learning, or brainstorming!",
                timestamp: new Date().toISOString(),
              }
            ],
            systemInstruction: "You are a helpful assistant.",
            temperature: 0.7,
            modelName: "groq:llama-3.3-70b-versatile",
            createdAt: new Date().toISOString(),
          };
          setConversations([initialConv]);
          setActiveConversationId(initialConv.id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user conversations:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Sync a single conversation payload to the backend
  const syncConversationToServer = async (conv: Conversation) => {
    if (!authToken) return;
    try {
      await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ conversation: conv })
      });
    } catch (err) {
      console.error("Failed to sync conversation:", err);
    }
  };

  // Logout session
  const handleLogout = async () => {
    const token = localStorage.getItem("aether_auth_token") || authToken;
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }).catch(() => {});
    }
    localStorage.removeItem("aether_auth_token");
    localStorage.removeItem("aether_auth_username");
    localStorage.removeItem(ACTIVE_CONV_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setConversations([]);
    setActiveConversationId(null);
    setIsAuthLoading(false);
  };

  // Verify auth session on mount
  useEffect(() => {
    const token = localStorage.getItem("aether_auth_token");
    const storedUser = localStorage.getItem("aether_auth_username");

    // Check configuration
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(data.hasApiKey);
        setHasGroqApiKey(data.hasGroqApiKey);
      })
      .catch((err) => {
        console.error("Failed to fetch config:", err);
      });

    if (token && storedUser) {
      fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            setAuthToken(token);
            setCurrentUser(data.username);
            fetchConversations(token);
          } else {
            handleLogout();
          }
        })
        .catch((err) => {
          console.error("Auto-auth verification error:", err);
          setIsAuthLoading(false);
        });
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const prevConversationsRef = useRef<Conversation[]>([]);

  // Automatically save conversation state modifications to server
  useEffect(() => {
    if (!authToken || isAuthLoading) return;

    const prev = prevConversationsRef.current;
    
    for (const conv of conversations) {
      const prevConv = prev.find(p => p.id === conv.id);
      if (!prevConv || JSON.stringify(prevConv) !== JSON.stringify(conv)) {
        syncConversationToServer(conv);
      }
    }

    prevConversationsRef.current = conversations;
  }, [conversations, authToken, isAuthLoading]);

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(ACTIVE_CONV_KEY, activeConversationId);
      // Sync active settings state with the selected conversation parameters
      const activeConv = conversations.find(c => c.id === activeConversationId);
      if (activeConv) {
        setModelName(activeConv.modelName || "groq:llama-3.3-70b-versatile");
        setTemperature(activeConv.temperature !== undefined ? activeConv.temperature : 0.7);
        setSystemInstruction(activeConv.systemInstruction || "");
      }
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
    }
  }, [activeConversationId, conversations]);

  // Clear search query on conversation switch
  useEffect(() => {
    setSearchQuery("");
  }, [activeConversationId]);

  // Pre-fill prompt templates into draft textarea
  const handleDraftPrompt = (prompt: string) => {
    setInputMessage(prompt);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Adjust height for text length if needed
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }, 60);
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, activeConversationId, isGenerating]);

  // Sync settings back to current conversation
  const updateActiveConvSettings = (updates: Partial<Conversation>) => {
    if (!activeConversationId) return;
    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return { ...c, ...updates };
      }
      return c;
    }));
  };

  // Handle setting updates
  const handleModelChange = (model: string) => {
    setModelName(model);
    updateActiveConvSettings({ modelName: model });
  };

  const handleTemperatureChange = (temp: number) => {
    setTemperature(temp);
    updateActiveConvSettings({ temperature: temp });
  };

  const handleSystemInstructionChange = (instr: string) => {
    setSystemInstruction(instr);
    updateActiveConvSettings({ systemInstruction: instr });
  };

  const handleNewConversation = (preset?: PersonaPreset) => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: preset ? preset.name : "New Chat",
      messages: [],
      systemInstruction: preset ? preset.systemInstruction : systemInstruction,
      temperature: preset ? preset.temperature : temperature,
      modelName: modelName,
      createdAt: new Date().toISOString(),
    };

    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newId);
    
    // Auto-focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleDeleteConversation = async (id: string) => {
    const remaining = conversations.filter(c => c.id !== id);
    setConversations(remaining);
    
    if (activeConversationId === id) {
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        setActiveConversationId(null);
      }
    }

    if (authToken) {
      try {
        await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        });
      } catch (err) {
        console.error("Failed to delete conversation from server:", err);
      }
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const filteredMessages = activeConversation?.messages.filter(msg => 
    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Send message stream logic
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = textToSend || inputMessage.trim();
    if (!messageContent || isGenerating || !activeConversationId) return;

    if (!textToSend) {
      setInputMessage("");
    }

    const userMsgId = `msg-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      role: "user",
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    // Update conversation with user message immediately
    let updatedMessages = [...(activeConversation?.messages || []), userMessage];
    
    // Auto generate title if it was default or empty
    let titleUpdate = {};
    if (!activeConversation?.title || activeConversation.title === "New Chat" || activeConversation.title === "React Design Patterns") {
      const words = messageContent.split(" ");
      const newTitle = words.slice(0, 4).join(" ") + (words.length > 4 ? "..." : "");
      titleUpdate = { title: newTitle };
    }

    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return { 
          ...c, 
          messages: updatedMessages,
          ...titleUpdate
        };
      }
      return c;
    }));

    setIsGenerating(true);

    const assistantMsgId = `msg-${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    // Append empty assistant message for streaming build up
    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return { 
          ...c, 
          messages: [...c.messages, assistantMessage] 
        };
      }
      return c;
    }));

    try {
      const payloadMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          messages: payloadMessages,
          systemInstruction: activeConversation?.systemInstruction || systemInstruction,
          temperature: activeConversation?.temperature !== undefined ? activeConversation.temperature : temperature,
          modelName: activeConversation?.modelName || modelName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamBuffer = "";
      let accumulatedContent = "";

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        // Keep the last partial line in the buffer
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith("data: ")) continue;

          const dataStr = cleanLine.substring(6);
          if (dataStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedContent += parsed.text;
              
              // Incrementally update assistant message content
              setConversations(prev => prev.map(c => {
                if (c.id === activeConversationId) {
                  return {
                    ...c,
                    messages: c.messages.map(m => {
                      if (m.id === assistantMsgId) {
                        return { ...m, content: accumulatedContent };
                      }
                      return m;
                    })
                  };
                }
                return c;
              }));
            }
          } catch (e) {
            console.error("Error parsing streaming chunk:", e);
          }
        }
      }

    } catch (err: any) {
      console.error("Streaming error:", err);
      // Append error information to the message or show warning toast
      const errorMessage = `\n\n*(Error: ${err.message || "Could not complete stream request."} Please check your Aether API Key configuration in secrets.)*`;
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: c.messages.map(m => {
              if (m.id === assistantMsgId) {
                return { ...m, content: m.content + errorMessage };
              }
              return m;
            })
          };
        }
        return c;
      }));
    } finally {
      setIsGenerating(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = async () => {
    if (!activeConversation || isGenerating) return;
    const msgs = activeConversation.messages;
    if (msgs.length < 2) return;

    // Find the last assistant message and remove it, then retrieve the previous user message
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role !== "assistant") return;

    const previousUserMsg = msgs[msgs.length - 2];
    if (previousUserMsg.role !== "user") return;

    // Slice off the last assistant message
    const poppedMessages = msgs.slice(0, -1);
    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return { ...c, messages: poppedMessages };
      }
      return c;
    }));

    // Re-trigger send message using the same user query
    setTimeout(() => {
      handleSendMessage(previousUserMsg.content);
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#050507] text-slate-400 gap-4">
        <RefreshCw className="h-8 w-8 text-pink-500 animate-spin" />
        <span className="text-xs font-semibold uppercase tracking-wider font-mono text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text">Initializing Aether Space...</span>
      </div>
    );
  }

  if (!authToken) {
    return (
      <Auth 
        onSuccess={(token, user) => {
          setAuthToken(token);
          setCurrentUser(user);
          setIsAuthLoading(true);
          fetchConversations(token);
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-slate-200 font-sans overflow-hidden">
      
      {/* Sidebar - fully configured Elegant Dark look */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        modelName={modelName}
        setModelName={handleModelChange}
        temperature={temperature}
        setTemperature={handleTemperatureChange}
        systemInstruction={systemInstruction}
        setSystemInstruction={handleSystemInstructionChange}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Chat Panel */}
      <main className="flex-1 flex flex-col relative h-full bg-[#09090b] overflow-hidden">
        
        {/* Header - Transparent backdrop blur Elegant Dark banner */}
        <header className="h-16 border-b border-purple-950/20 flex items-center justify-between px-6 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-pink-400 hover:bg-slate-900 transition-all md:hidden"
              title="Toggle Menu"
              id="menu-toggle-btn"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100 font-mono tracking-tight bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">Aether</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {(hasApiKey === false && hasGroqApiKey === false) && (
              <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-400 animate-pulse-slow">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>API Configuration Needed</span>
              </div>
            )}
            <button
              onClick={() => handleNewConversation()}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg hover:border-pink-500/30 transition-colors"
              id="header-new-chat"
            >
              <Plus className="h-3.5 w-3.5 text-pink-400" />
              New Chat
            </button>
          </div>
        </header>

        {/* Messages Body Scroll Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-4">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* Real-time search bar inside active conversation */}
            {activeConversation && activeConversation.messages.length > 1 && (
              <div className="relative w-full max-w-md mx-auto mb-3 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Filter messages in this conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/40 border border-slate-850/85 hover:border-slate-800 focus:border-pink-500/50 rounded-xl pl-9.5 pr-14 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/20 placeholder-slate-600 text-slate-300 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wider uppercase text-slate-500 hover:text-pink-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {activeConversation?.messages && activeConversation.messages.length > 0 ? (
              searchQuery && filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Search className="h-8 w-8 text-slate-800 mb-2.5" />
                  <p className="text-xs text-slate-400 font-medium">No messages match "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[11px] font-bold text-pink-400 mt-2 hover:underline animate-pulse"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                (searchQuery ? filteredMessages : activeConversation.messages).map((message, idx) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isLast={idx === activeConversation.messages.length - 1}
                    onRegenerate={handleRegenerate}
                  />
                ))
              )
            ) : (
              // Onboarding State for fresh chats
              <div className="flex flex-col items-center justify-center text-center py-10 px-4 max-w-2xl mx-auto space-y-6">
                <div className="h-16 w-16 rounded-2xl bg-slate-900/50 border border-pink-950/30 flex items-center justify-center shadow-inner relative">
                  <Bot className="h-8 w-8 text-pink-400" />
                  <div className="absolute -top-1 -right-1 h-5 w-5 bg-pink-500/10 text-pink-400 rounded-full border border-pink-500/30 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">How can I help you today?</h2>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                    This is a sleek, purple & pink-tuned conversational workspace powered by Aether. Switch models or configurations from the parameters panel.
                  </p>
                </div>

                {/* Custom Interactive Prompt Cards Explorer */}
                <div className="w-full space-y-4 pt-2">
                  {/* Category Selection Tabs */}
                  <div className="flex flex-wrap gap-1.5 justify-center border-b border-slate-900 pb-3">
                    {PROMPT_CATEGORIES.map((cat) => {
                      const isActive = activePromptCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActivePromptCategory(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            isActive
                              ? "bg-pink-500/10 border-pink-500/30 text-pink-400 shadow-sm shadow-pink-500/5"
                              : "bg-slate-900/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                          }`}
                        >
                          {renderPromptCategoryIcon(cat.iconName)}
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Template Card Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                    {PROMPT_CATEGORIES.find(cat => cat.id === activePromptCategory)?.templates.map((tpl, i) => (
                      <div
                        key={i}
                        className="text-left bg-slate-900/40 border border-slate-850/85 hover:border-pink-500/20 rounded-xl p-4 transition-all group flex flex-col justify-between space-y-3 relative"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-white tracking-tight group-hover:text-pink-300 transition-colors">
                            {tpl.title}
                          </h4>
                          <p className="text-[11px] leading-relaxed text-slate-500 mt-1">
                            {tpl.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-1.5">
                          <button
                            onClick={() => handleDraftPrompt(tpl.prompt)}
                            className="flex-1 text-center py-1.5 rounded-lg bg-slate-950/60 border border-slate-850/80 hover:border-pink-500/30 text-[10px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-wider"
                          >
                            Draft
                          </button>
                          <button
                            onClick={() => handleSendMessage(tpl.prompt)}
                            className="flex-1 text-center py-1.5 rounded-lg bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/20 hover:from-purple-600 hover:to-pink-600 text-[10px] font-bold text-slate-300 hover:text-white transition-all uppercase tracking-wider flex items-center justify-center gap-1"
                          >
                            Send <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Simulated Live Stream Loader Bubble */}
            {isGenerating && (
              <div className="flex gap-4 py-5 px-4 bg-slate-900/30 border-y border-purple-950/10 rounded-xl">
                <div className="flex shrink-0">
                  <div className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-fuchsia-500 shadow-md shadow-pink-500/10">
                    <Bot className="h-5 w-5 text-white animate-bounce" />
                  </div>
                </div>
                <div className="flex-1 space-y-2.5">
                  <div className="text-sm font-semibold text-pink-400">
                    Aether is thinking...
                  </div>
                  <div className="flex space-x-1.5 items-center pt-1.5">
                    <div className="h-2 w-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="h-2 w-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="h-2 w-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar Section with full Elegant Dark styling */}
        <div className="p-6 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent sticky bottom-0 z-10 border-t border-purple-950/10">
          <div className="max-w-4xl mx-auto relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Aether anything... (Shift + Enter for new line)"
              disabled={isGenerating}
              className="w-full bg-slate-900/50 border border-slate-800/80 hover:border-pink-500/20 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 placeholder-slate-500 text-slate-200 resize-none min-h-[56px] transition-all"
              style={{ height: "auto" }}
              id="message-textarea"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isGenerating || !inputMessage.trim()}
              className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all shadow-lg ${
                inputMessage.trim() && !isGenerating
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-900/20 cursor-pointer hover:opacity-90"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
              }`}
              title="Send message"
              id="send-message-btn"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-600 mt-3 uppercase tracking-widest font-semibold">
            Aether AI can provide inaccurate info. Verify your code.
          </p>
        </div>
      </main>
    </div>
  );
}
