import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  Settings, 
  X, 
  Check, 
  Sliders, 
  Cpu, 
  ChevronDown, 
  Bot,
  Sparkles,
  BarChart3,
  Download,
  FileJson,
  FileText,
  Clock,
  TrendingUp,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Conversation, PersonaPreset } from "../types";
import { PERSONA_PRESETS } from "../presets";
import * as Icons from "lucide-react";

const DynamicIcon = ({ name, className = "w-4 h-4" }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Sparkles className={className} />;
  return <IconComponent className={className} />;
};

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation?: Conversation;
  onSelectConversation: (id: string) => void;
  onNewConversation: (preset?: PersonaPreset) => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  setModelName: (model: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  systemInstruction: string;
  setSystemInstruction: (instr: string) => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  activeConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  modelName,
  setModelName,
  temperature,
  setTemperature,
  systemInstruction,
  setSystemInstruction,
}: SidebarProps) {
  const [sidebarTab, setSidebarTab] = useState<"chats" | "settings" | "analytics">("chats");

  const handlePresetSelect = (preset: PersonaPreset) => {
    setSystemInstruction(preset.systemInstruction);
    setTemperature(preset.temperature);
    onNewConversation(preset);
  };

  // Compute analytics stats
  const messages = activeConversation?.messages || [];
  const totalMessages = messages.length;
  const userMessages = messages.filter(m => m.role === "user");
  const assistantMessages = messages.filter(m => m.role === "assistant");
  
  // Word count & char count calculations
  const wordCount = messages.reduce((acc, m) => {
    const words = m.content.split(/\s+/).filter(Boolean).length;
    return acc + words;
  }, 0);
  
  const charCount = messages.reduce((acc, m) => acc + m.content.length, 0);
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const avgAssistantWordCount = assistantMessages.length > 0
    ? Math.round(
        assistantMessages.reduce((acc, m) => acc + m.content.split(/\s+/).filter(Boolean).length, 0) / 
        assistantMessages.length
      )
    : 0;

  // Export actions
  const handleExportMarkdown = () => {
    if (!activeConversation) return;
    const dateStr = new Date(activeConversation.createdAt).toLocaleDateString();
    let mdContent = `# Chat Session: ${activeConversation.title}\n`;
    mdContent += `*Created on: ${dateStr}*\n`;
    mdContent += `*Model: ${activeConversation.modelName}*\n\n`;
    mdContent += `---\n\n`;
    
    activeConversation.messages.forEach(msg => {
      const roleName = msg.role === "user" ? "User" : "Aether AI";
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      mdContent += `### **${roleName}** (${timeStr}):\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${activeConversation.title.toLowerCase().replace(/\s+/g, "_")}_export.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!activeConversation) return;
    const jsonContent = JSON.stringify(activeConversation, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${activeConversation.title.toLowerCase().replace(/\s+/g, "_")}_export.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            id="sidebar-overlay"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -320,
          width: isOpen ? 320 : 0
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-pink-950/40 bg-[#0c0c0e] text-slate-200 md:static md:translate-x-0"
        id="sidebar-container"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-purple-950/20 px-4 bg-[#09090b]/80 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 shadow-md shadow-purple-600/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-sans text-sm font-semibold text-white tracking-tight bg-gradient-to-r from-purple-300 via-pink-300 to-white bg-clip-text text-transparent">Aether</h1>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-900 hover:text-pink-400 transition-colors md:hidden"
            id="close-sidebar-btn"
          >
            <X className="h-4 h-4" />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="p-4">
          <button
            onClick={() => onNewConversation()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-purple-600/25 transition-all duration-200 active:scale-[0.98]"
            id="new-chat-btn"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex border-b border-slate-900 px-4">
          <button
            onClick={() => setSidebarTab("chats")}
            className={`flex-1 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 text-center ${
              sidebarTab === "chats" 
                ? "border-pink-500 text-pink-400 font-semibold" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
            id="chats-tab"
          >
            Chats
          </button>
          <button
            onClick={() => setSidebarTab("settings")}
            className={`flex-1 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 text-center ${
              sidebarTab === "settings" 
                ? "border-pink-500 text-pink-400 font-semibold" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
            id="settings-tab"
          >
            Params
          </button>
          <button
            onClick={() => setSidebarTab("analytics")}
            className={`flex-1 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 text-center ${
              sidebarTab === "analytics" 
                ? "border-pink-500 text-pink-400 font-semibold" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
            id="analytics-tab"
          >
            Insights
          </button>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-3">
          <AnimatePresence mode="wait">
            {sidebarTab === "chats" ? (
              <motion.div
                key="conversations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1"
                id="conversations-list"
              >
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-8 w-8 text-slate-800 mb-2" />
                    <p className="text-xs text-slate-500">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    return (
                      <div
                        key={conv.id}
                        className={`group relative flex items-center justify-between rounded-xl px-3.5 py-3 transition-all ${
                          isActive 
                            ? "bg-gradient-to-r from-purple-950/30 to-pink-950/20 border border-purple-500/20 text-pink-200" 
                            : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent"
                        }`}
                        id={`chat-item-${conv.id}`}
                      >
                        <button
                          onClick={() => {
                            onSelectConversation(conv.id);
                            onClose();
                          }}
                          className="flex flex-1 items-center gap-3 text-left overflow-hidden"
                        >
                          <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? "text-pink-400" : "text-slate-600"}`} />
                          <span className="truncate text-sm font-medium">
                            {conv.title || "Untitled Chat"}
                          </span>
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-pink-400 rounded-lg hover:bg-slate-850 transition-all shrink-0"
                          title="Delete Chat"
                          id={`delete-chat-btn-${conv.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </motion.div>
            ) : sidebarTab === "settings" ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 px-1.5 py-2"
                id="settings-panel"
              >
                {/* Model Selector */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Cpu className="h-3.5 w-3.5 text-pink-400" />
                    Core AI Model
                  </label>
                  <div className="relative">
                    <select
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                      id="model-select"
                    >
                      <optgroup label="Aether Core (Fast / Reliable)" className="text-pink-400 bg-slate-950 font-bold">
                        <option value="groq:llama-3.3-70b-versatile">Aether Large (Recommended)</option>
                        <option value="groq:mixtral-8x7b-32768">Aether MoE</option>
                        <option value="groq:gemma2-9b-it">Aether Lite</option>
                      </optgroup>
                      <optgroup label="Aether Alternate" className="text-purple-400 bg-slate-950 font-bold">
                        <option value="gemini-3.5-flash">Aether Legacy Standard</option>
                        <option value="gemini-3.1-flash-lite">Aether Legacy Lite</option>
                      </optgroup>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Persona Presets */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Bot className="h-3.5 w-3.5 text-purple-400" />
                    Role Presets
                  </label>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Instantly load preset styles for your chats:
                  </p>
                  <div className="space-y-2">
                    {PERSONA_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className="flex w-full items-start gap-3 rounded-xl border border-slate-900 bg-slate-900/40 p-3 text-left hover:border-pink-500/40 hover:bg-slate-900/80 transition-all group"
                        id={`preset-btn-${preset.id}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 group-hover:bg-pink-950 group-hover:text-pink-400 transition-all">
                          <DynamicIcon name={preset.iconName} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-white tracking-tight group-hover:text-pink-300 transition-colors">
                            {preset.name}
                          </h4>
                          <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500 mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom System Instruction */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Sliders className="h-3.5 w-3.5 text-pink-400" />
                    System Directives
                  </label>
                  <textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    rows={4}
                    placeholder="E.g., You are a strict mathematics teacher who explains concepts with simple steps..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                    id="system-instruction-textarea"
                  />
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-purple-400" />
                      Temperature
                    </span>
                    <span className="font-mono text-pink-400">{temperature.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-850 accent-pink-500"
                    id="temperature-slider"
                  />
                  <div className="flex items-center justify-between font-mono text-[9px] text-slate-600">
                    <span>Deterministic</span>
                    <span>Creative</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 px-1.5 py-2"
                id="analytics-panel"
              >
                {!activeConversation ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="h-8 w-8 text-slate-800 mb-2" />
                    <p className="text-xs text-slate-500">No active conversation loaded.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversation Stats</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Metrics for <span className="text-pink-300 font-semibold">{activeConversation.title}</span>
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Messages</div>
                        <div className="text-lg font-bold font-mono text-white mt-0.5">{totalMessages}</div>
                        <div className="text-[9px] text-slate-600 mt-1 flex items-center gap-1">
                          <span>{userMessages.length} U</span>
                          <span>•</span>
                          <span>{assistantMessages.length} A</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Words</div>
                        <div className="text-lg font-bold font-mono text-white mt-0.5">{wordCount}</div>
                        <div className="text-[9px] text-slate-600 mt-1">Chars: {charCount}</div>
                      </div>

                      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3 text-pink-400" />
                          Read Time
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-0.5">{readingTimeMinutes} min</div>
                        <div className="text-[9px] text-slate-600 mt-1">At 200 WPM</div>
                      </div>

                      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-purple-400" />
                          Avg Reply
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-0.5">{avgAssistantWordCount}</div>
                        <div className="text-[9px] text-slate-600 mt-1">Words / Answer</div>
                      </div>
                    </div>

                    {/* Meta info card */}
                    <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-3 space-y-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Created</span>
                        <span className="text-slate-300 font-mono">{new Date(activeConversation.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 flex items-center gap-1"><Cpu className="h-3 w-3" /> Model</span>
                        <span className="text-slate-300 font-mono truncate max-w-[120px]" title={activeConversation.modelName}>
                          {activeConversation.modelName.replace("groq:", "")}
                        </span>
                      </div>
                    </div>

                    {/* Export Section */}
                    <div className="space-y-2.5 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Export Tools</h4>
                      
                      <button
                        onClick={handleExportMarkdown}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-left hover:border-pink-500/40 hover:bg-slate-900 transition-all group text-xs text-slate-200"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-pink-400 group-hover:scale-110 transition-transform" />
                          <span>Export Markdown (.md)</span>
                        </span>
                        <Download className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" />
                      </button>

                      <button
                        onClick={handleExportJSON}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-left hover:border-purple-500/40 hover:bg-slate-900 transition-all group text-xs text-slate-200"
                      >
                        <span className="flex items-center gap-2">
                          <FileJson className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                          <span>Export Raw JSON (.json)</span>
                        </span>
                        <Download className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="border-t border-purple-950/20 p-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-900/40 p-3">
            <span className="text-[11px] font-medium text-slate-500">API Gateway</span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
              </span>
              <span className="font-mono text-[10px] font-bold text-pink-400">ONLINE</span>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
