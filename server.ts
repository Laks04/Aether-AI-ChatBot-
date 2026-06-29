import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI server-side with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json());

// API route to check server status and API key config
app.get("/api/config", (req, res) => {
  res.json({
    hasApiKey: !!process.env.GEMINI_API_KEY,
    hasGroqApiKey: !!process.env.GROQ_API_KEY,
  });
});

// API route for chat streaming
app.post("/api/chat/stream", async (req, res) => {
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
