import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { PDFParse } from "pdf-parse";

dotenv.config();

const app = express();
const PORT = 3000;

// ==========================================
// CUSTOM DATABASE STORAGE & SESSION MIDDLEWARE
// ==========================================

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

// Safe file reader helper
function readJSONFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

// Safe file writer helper
function writeJSONFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Password cryptography
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function createUser(username: string, password: string, securityQuestion?: string, securityAnswer?: string) {
  const users = readJSONFile<any[]>(USERS_FILE, []);
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { error: "Username already exists. Please choose a different name." };
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  
  const newUser: any = { username, passwordHash, salt };
  if (securityQuestion) {
    newUser.securityQuestion = securityQuestion;
  }
  if (securityAnswer) {
    newUser.securityAnswer = crypto.pbkdf2Sync(securityAnswer.trim().toLowerCase(), salt, 1000, 64, "sha512").toString("hex");
  }
  
  users.push(newUser);
  writeJSONFile(USERS_FILE, users);
  return { success: true };
}

function verifyUser(username: string, password: string) {
  const users = readJSONFile<any[]>(USERS_FILE, []);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return false;
  
  const hash = hashPassword(password, user.salt);
  return hash === user.passwordHash;
}

function verifySecurityAnswer(username: string, answer: string): boolean {
  const users = readJSONFile<any[]>(USERS_FILE, []);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return false;
  
  // Legacy bypass support if user created their account before security questions existed
  if (!user.securityAnswer) {
    return answer.trim().toLowerCase() === "aetherspace";
  }
  
  const hash = crypto.pbkdf2Sync(answer.trim().toLowerCase(), user.salt, 1000, 64, "sha512").toString("hex");
  return hash === user.securityAnswer;
}

function resetUserPassword(username: string, newPassword: string): boolean {
  const users = readJSONFile<any[]>(USERS_FILE, []);
  const index = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  if (index === -1) return false;
  
  let salt = users[index].salt;
  if (!salt) {
    salt = crypto.randomBytes(16).toString("hex");
    users[index].salt = salt;
  }
  
  users[index].passwordHash = hashPassword(newPassword, salt);
  writeJSONFile(USERS_FILE, users);
  return true;
}

// Active Sessions persistence
function createSession(username: string): string {
  const sessions = readJSONFile<any[]>(SESSIONS_FILE, []);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 day lifespan
  
  sessions.push({ token, username, expiresAt });
  writeJSONFile(SESSIONS_FILE, sessions);
  return token;
}

function getSessionUser(token: string): string | null {
  const sessions = readJSONFile<any[]>(SESSIONS_FILE, []);
  const session = sessions.find(s => s.token === token);
  if (!session) return null;
  
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    // Session has expired, garbage collect it
    const updated = sessions.filter(s => s.token !== token);
    writeJSONFile(SESSIONS_FILE, updated);
    return null;
  }
  return session.username;
}

function deleteSession(token: string): void {
  const sessions = readJSONFile<any[]>(SESSIONS_FILE, []);
  const updated = sessions.filter(s => s.token !== token);
  writeJSONFile(SESSIONS_FILE, updated);
}

// Session boundary check middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }
  
  const username = getSessionUser(token);
  if (!username) {
    return res.status(403).json({ error: "Your session has expired. Please log in again." });
  }
  
  req.username = username;
  next();
};

// Initialize GoogleGenAI server-side with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API route to check server status and API key config
app.get("/api/config", (req, res) => {
  const users = readJSONFile<any[]>(USERS_FILE, []);
  res.json({
    hasApiKey: !!process.env.GEMINI_API_KEY,
    hasGroqApiKey: !!process.env.GROQ_API_KEY,
    noUsersExist: users.length === 0,
  });
});

// API route for chat streaming
app.post("/api/chat/stream", authenticateToken, async (req, res) => {
  try {
    const { messages, systemInstruction, temperature, modelName } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const isGroqModel = modelName && modelName.startsWith("groq:");

    if (isGroqModel) {
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return res.status(400).json({ error: "GROQ_API_KEY environment variable is not configured. Please add it to your Secrets." });
      }

      const groqModelId = modelName.replace("groq:", "");
      
      const openaiMessages = [];
      if (systemInstruction) {
        openaiMessages.push({ role: "system", content: systemInstruction });
      }
      openaiMessages.push(...messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      })));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: groqModelId,
          messages: openaiMessages,
          temperature: temperature !== undefined ? Number(temperature) : 0.7,
          stream: true
        })
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        throw new Error(`Groq API returned status ${groqResponse.status}: ${errorText}`);
      }

      const reader = groqResponse.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamBuffer = "";

      if (!reader) {
        throw new Error("Groq stream is not readable.");
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine === "data: [DONE]") {
            continue;
          }

          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.substring(6);
            try {
              const parsed = JSON.parse(dataStr);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunk lines
            }
          }
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // Map messages history to Gemini SDK format
    const contents = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));


    // Choose model. We default to 'gemini-3.5-flash'.
    const selectedModel = modelName || "gemini-3.5-flash";

    // Setup fallback model chain
    const modelsToTry = [selectedModel];
    const fallbackOptions = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const option of fallbackOptions) {
      if (!modelsToTry.includes(option)) {
        modelsToTry.push(option);
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let responseStream = null;
    let finalModelUsed = selectedModel;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: model,
          contents: contents,
          config: {
            systemInstruction: systemInstruction || "You are a helpful assistant.",
            temperature: temperature !== undefined ? Number(temperature) : 0.7,
          },
        });
        finalModelUsed = model;
        break; // Success, exit loop
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed or is at capacity. Error:`, err?.message || err);
        // Continue to next fallback model
      }
    }

    if (!responseStream) {
      throw lastError || new Error("All fallback models were unavailable.");
    }

    // Send fallback notification chunk if a fallback model was used
    if (finalModelUsed !== selectedModel) {
      const fallbackNotice = `*(System note: ${selectedModel} is currently experiencing high demand. Automatically fell back to ${finalModelUsed} to keep your conversation going.)*\n\n`;
      res.write(`data: ${JSON.stringify({ text: fallbackNotice })}\n\n`);
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Gemini API Error in stream endpoint:", error);
    const errorMessage = error?.message || String(error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
});

// --- AUTH API ROUTES ---

app.post("/api/auth/register", (req, res) => {
  const { username, password, securityQuestion, securityAnswer } = req.body;
  if (!username || !password || username.trim().length < 2 || password.trim().length < 4) {
    return res.status(400).json({ error: "Username must be at least 2 characters and password at least 4 characters." });
  }
  
  const result = createUser(username.trim(), password, securityQuestion, securityAnswer);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  
  const token = createSession(username.trim());
  res.json({ success: true, token, username: username.trim() });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  
  const isValid = verifyUser(username.trim(), password);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid username or password credentials." });
  }
  
  const token = createSession(username.trim());
  res.json({ success: true, token, username: username.trim() });
});

app.get("/api/auth/forgot-password/get-question", (req, res) => {
  const username = req.query.username as string;
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }
  
  const users = readJSONFile<any[]>(USERS_FILE, []);
  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  
  res.json({
    username: user.username,
    securityQuestion: user.securityQuestion || null
  });
});

app.post("/api/auth/forgot-password/reset", (req, res) => {
  const { username, securityAnswer, newPassword } = req.body;
  if (!username || !securityAnswer || !newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: "Username, correct recovery answer, and new password (min 4 characters) are required." });
  }
  
  const users = readJSONFile<any[]>(USERS_FILE, []);
  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  
  const isAnswerValid = verifySecurityAnswer(user.username, securityAnswer);
  if (!isAnswerValid) {
    return res.status(401).json({ error: "Incorrect recovery answer." });
  }
  
  const success = resetUserPassword(user.username, newPassword);
  if (!success) {
    return res.status(500).json({ error: "Failed to reset password." });
  }
  
  res.json({ success: true, message: "Passkey successfully reset. You can now Sign In." });
});

app.post("/api/auth/delete-account", authenticateToken, (req: any, res) => {
  const username = req.username;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  // 1. Remove user from users.json
  const users = readJSONFile<any[]>(USERS_FILE, []);
  const updatedUsers = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  writeJSONFile(USERS_FILE, updatedUsers);
  
  // 2. Remove user sessions from sessions.json
  const sessions = readJSONFile<any[]>(SESSIONS_FILE, []);
  const updatedSessions = sessions.filter(s => s.username.toLowerCase() !== username.toLowerCase());
  writeJSONFile(SESSIONS_FILE, updatedSessions);
  
  // 3. Remove user conversations (which also houses the embedded documents) from conversations.json
  const conversations = readJSONFile<any[]>(CONVERSATIONS_FILE, []);
  const updatedConvs = conversations.filter(c => c.username.toLowerCase() !== username.toLowerCase());
  writeJSONFile(CONVERSATIONS_FILE, updatedConvs);
  
  res.json({ success: true, message: "Account and all associated sandbox records have been permanently purged." });
});

app.post("/api/auth/reset-sandbox", (req, res) => {
  try {
    writeJSONFile(USERS_FILE, []);
    writeJSONFile(SESSIONS_FILE, []);
    writeJSONFile(CONVERSATIONS_FILE, []);
    res.json({ success: true, message: "Workspace sandbox database has been successfully reset. You can now register a new account." });
  } catch (err: any) {
    console.error("Failed to reset sandbox:", err);
    res.status(500).json({ error: "Failed to reset sandbox data: " + (err.message || "") });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    deleteSession(token);
  }
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }
  
  const username = getSessionUser(token);
  if (!username) {
    return res.status(401).json({ authenticated: false });
  }
  
  res.json({ authenticated: true, username });
});

// --- PERSISTENT CONVERSATION API ROUTES ---

app.get("/api/conversations", authenticateToken, (req: any, res) => {
  const conversations = readJSONFile<any[]>(CONVERSATIONS_FILE, []);
  const userConvs = conversations
    .filter(c => c.username === req.username)
    .map(({ username, ...c }) => c); // Omit username field for client
  res.json(userConvs);
});

app.post("/api/conversations", authenticateToken, (req: any, res) => {
  const { conversation } = req.body;
  if (!conversation || !conversation.id) {
    return res.status(400).json({ error: "Valid conversation payload is required" });
  }
  
  const conversations = readJSONFile<any[]>(CONVERSATIONS_FILE, []);
  const index = conversations.findIndex(c => c.id === conversation.id);
  
  const newConv = {
    ...conversation,
    username: req.username
  };
  
  if (index !== -1) {
    if (conversations[index].username !== req.username) {
      return res.status(403).json({ error: "You are not authorized to update this conversation" });
    }
    conversations[index] = newConv;
  } else {
    conversations.push(newConv);
  }
  
  writeJSONFile(CONVERSATIONS_FILE, conversations);
  res.json({ success: true });
});

app.delete("/api/conversations/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const conversations = readJSONFile<any[]>(CONVERSATIONS_FILE, []);
  const index = conversations.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Conversation not found" });
  }
  
  if (conversations[index].username !== req.username) {
    return res.status(403).json({ error: "You are not authorized to delete this conversation" });
  }
  
  const updated = conversations.filter(c => c.id !== id);
  writeJSONFile(CONVERSATIONS_FILE, updated);
  res.json({ success: true });
});

app.post("/api/parse-pdf", authenticateToken, async (req: any, res) => {
  try {
    const { base64, filename } = req.body;
    if (!base64) {
      return res.status(400).json({ error: "Base64 encoded PDF file data is required" });
    }
    
    // Remove data:application/pdf;base64, header if present
    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    
    // Parse PDF
    const parser = new PDFParse({ data: buffer });
    const parsedText = await parser.getText();
    const parsedInfo = await parser.getInfo();
    
    res.json({
      success: true,
      text: parsedText.text || "",
      pages: parsedText.total || parsedInfo.total || 1,
      info: parsedInfo.info || {},
      metadata: parsedInfo.metadata || {}
    });
  } catch (err: any) {
    console.error("PDF Parsing Error:", err);
    res.status(500).json({ error: "Failed to parse the PDF document. " + (err.message || "") });
  }
});

// Setup Vite development middleware or static production serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static build serving active.");
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to setup Vite:", err);
});
