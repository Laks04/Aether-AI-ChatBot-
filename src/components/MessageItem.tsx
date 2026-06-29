import React, { useState, useEffect } from "react";
import { Copy, Check, RotateCcw, Bot, User, Sparkles, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { Message } from "../types";
import Markdown from "react-markdown";

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  onRegenerate?: () => void;
}

export default function MessageItem({ message, isLast, onRegenerate }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isAssistant = message.role === "assistant";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      
      // Clean up markdown formatting for cleaner speech narration
      const cleanText = message.content
        .replace(/```[\s\S]*?```/g, "Code block omitted.") // omit code blocks
        .replace(/[*#_`~-]/g, "") // remove markdown chars
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") // clean links
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => {
        setIsPlaying(false);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`group flex w-full gap-4 py-5 px-4 ${
        isAssistant 
          ? "bg-slate-900/30 border-y border-slate-900/20" 
          : "bg-transparent"
      }`}
      id={`message-container-${message.id}`}
    >
      {/* Avatar Column */}
      <div className="flex shrink-0 flex-col items-center">
        {isAssistant ? (
          <div className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-fuchsia-500 shadow-md shadow-pink-500/10">
            <Bot className="h-5 w-5 text-white" />
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 border border-slate-800">
              <Sparkles className="h-2.5 w-2.5 text-pink-400 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-slate-800 text-slate-300 shadow border border-slate-700">
            <User className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Body Column */}
      <div className="flex-1 space-y-1 overflow-hidden">
        {/* Header Metadata */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">
            {isAssistant ? "Aether AI" : "You"}
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Markdown Content */}
        <div 
          className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-300"
          id={`message-content-${message.id}`}
        >
          <div className="markdown-body">
            <Markdown
              components={{
                // Styling code blocks nicely
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "";
                  
                  if (!inline) {
                    return (
                      <div className="relative my-4 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs shadow-xl">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-slate-900/40 text-slate-400">
                          <span className="font-sans text-[10px] uppercase font-bold tracking-wider text-pink-400">
                            {language || "code"}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
                            }}
                            className="flex items-center gap-1.5 font-sans text-[10px] font-medium text-slate-400 hover:text-white transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                        <div className="p-4 overflow-x-auto leading-6 text-slate-200">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <code
                      className="rounded-md bg-slate-900 border border-slate-800/80 px-1.5 py-0.5 font-mono text-xs text-pink-300"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // Styled paragraphs
                p({ children }) {
                  return <p className="mb-3 last:mb-0 text-slate-300">{children}</p>;
                },
                // Styled headings
                h1({ children }) { return <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>; },
                h2({ children }) { return <h2 className="text-base font-bold text-white mt-4 mb-2">{children}</h2>; },
                h3({ children }) { return <h3 className="text-sm font-bold text-white mt-3 mb-1">{children}</h3>; },
                // Styled lists
                ul({ children }) { return <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-300">{children}</ul>; },
                ol({ children }) { return <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-300">{children}</ol>; },
                li({ children }) { return <li className="text-slate-300">{children}</li>; },
                // Styled blockquotes
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-2 border-pink-500 pl-4 py-1 my-3 bg-slate-900/50 rounded-r-lg italic text-slate-400">
                      {children}
                    </blockquote>
                  );
                },
                // Styled tables
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4 rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs border-collapse">{children}</table>
                    </div>
                  );
                },
                thead({ children }) {
                  return <thead className="bg-slate-900/60 text-slate-300 border-b border-slate-800 font-semibold">{children}</thead>;
                },
                tbody({ children }) { return <tbody className="divide-y divide-slate-900/40">{children}</tbody>; },
                tr({ children }) { return <tr className="hover:bg-slate-900/10 transition-colors">{children}</tr>; },
                th({ children }) { return <th className="px-4 py-3">{children}</th>; },
                td({ children }) { return <td className="px-4 py-3 text-slate-300">{children}</td>; }
              }}
            >
              {message.content}
            </Markdown>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-white transition-all shadow-sm"
            title="Copy Message"
            id={`copy-btn-${message.id}`}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-pink-400" />
                <span className="text-pink-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggleSpeech}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-all shadow-sm ${
              isPlaying
                ? "border-pink-500/40 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
            title={isPlaying ? "Mute Narration" : "Listen Aloud"}
            id={`speak-btn-${message.id}`}
          >
            {isPlaying ? (
              <>
                <VolumeX className="h-3 w-3 text-pink-400 animate-pulse" />
                <span className="text-pink-400 font-medium">Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3" />
                <span>Speak</span>
              </>
            )}
          </button>

          {isLast && isAssistant && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-white transition-all shadow-sm"
              title="Regenerate response"
              id={`regenerate-btn-${message.id}`}
            >
              <RotateCcw className="h-3 w-3" />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
