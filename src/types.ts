export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string
}

export interface DocumentAttachment {
  id: string;
  name: string;
  text: string;
  size: number;
  pages?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemInstruction: string;
  temperature: number;
  modelName: string;
  createdAt: string;
  documents?: DocumentAttachment[];
}

export interface PersonaPreset {
  id: string;
  name: string;
  description: string;
  iconName: string; // references lucide icons
  systemInstruction: string;
  temperature: number;
}
