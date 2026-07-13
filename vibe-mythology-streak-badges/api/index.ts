import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// 1. Real Vibe curriculum data structures
const REAL_COURSES = [
  {
    id: "vibe-github-tutorial",
    name: "GitHub Version Control",
    instructor: "ViBe Core Architect",
    category: "Github Tutorial",
    description: "Master the base protocols of modern version control. Establish secure SSH keys, manage branching systems, and collaborate with team members seamlessly.",
    lessons: [
      "Github Tutorial 1.md",
      "Github Tutorial 2.md",
      "Github Tutorial 3.md",
      "Github Tutorial 4.md",
      "Github Tutorial 5.md"
    ]
  },
  {
    id: "vibe-typescript",
    name: "TypeScript Core Foundations",
    instructor: "ViBe Core Architect",
    category: "Typescript",
    description: "Deep dive into static typing, user-defined types, decorators, advanced classes, IoC dependency injection containers, and modern software design patterns.",
    lessons: [
      "1. Introduction to TypeScript/1.1 Introduction to Typescript.md",
      "2. Basic Syntax/2.1 Basic Syntax in Typescript.md",
      "3. Variables in TypeScript/3.1 Variables in Typescript.md",
      "4. let & const/4.1 let & const.md",
      "5. Any type in TypeScript/5.1 Any type in Typescript.md",
      "6. Built-in Types/6.1 Built in Types in Typescript.md",
      "7. User Defined Types/7.1 User defined Types in Typescript.md",
      "8. Null vs Undefined/8.1 Null vs Undefined.md",
      "9. Classes & Access Modifiers.md",
      "9. Type Aliases/Type Aliases.md",
      "10. Conditional Logics/Conditional Logic in TypeScript.md",
      "10. Generics.md",
      "11. Advanced Types.md",
      "11. Mastering Loops/Mastering Loops in TypeScript.md",
      "12. Decorators.md",
      "12. Mastering Functions/Mastering Functions in TypeScript.md",
      "13. Design Patterns.md",
      "13. Optional and Default Parameters/Optional and Default Parameters in TypeScript.md",
      "14. Dependency Injection.md",
      "15. IoC Containers & Advanced Dependency Management.md"
    ]
  },
  {
    id: "vibe-react",
    name: "React & TSX Development",
    instructor: "ViBe Core Architect",
    category: "React",
    description: "Build performant client-side single page applications. Master advanced state management with Zustand, lazy loading, React memoization, and bundle optimization.",
    lessons: [
      "State Management in React.md",
      "Advanced State Management with Zustand.md",
      "Zustand Slices and Modular State Architecture.md",
      "TSX & Typed Components_.md",
      "TSX & Typed Components_Type  Safety.md",
      "Routing.md",
      "Lazy Loading.md",
      "Memoization.md",
      "Bundle Analysis.md",
      "Testing & Debugging React Apps with TypeScript.md"
    ]
  },
  {
    id: "vibe-express",
    name: "Express Scalable API Backends",
    instructor: "ViBe Core Architect",
    category: "Express",
    description: "Build highly scalable RESTful API backends. Master MVC project architectures, middleware pipeline filters, body validations, and clean repository design patterns.",
    lessons: [
      "1. Getting Started with Express.md",
      "2. Organizing Your Express Project for scalability.md",
      "3. HTTP Methods & Status Codes.md",
      "4. Request_Response.md",
      "5. Routing Controllers.md",
      "6. Middleware.md",
      "7. Request Validation.md",
      "8. MVC Pattern.md",
      "9. Repository Pattern.md",
      "10. Dependency Injection.md"
    ]
  },
  {
    id: "vibe-mongo-db",
    name: "MongoDB & Schema Modeling",
    instructor: "ViBe Core Architect",
    category: "Mongo DB",
    description: "Master document database modeling. Structure CRUD operation queries, harness the powerful Aggregation framework pipeline, and write multi-document ACID transactions.",
    lessons: [
      "CRUD Operations.md",
      "Aggregation Framework.md",
      "Transactions.md"
    ]
  }
];

// 2. Mock Fallback Contributors for robust operation
const FALLBACK_CONTRIBUTORS = [
  {
    name: "vicharanashala",
    title: "ViBe High Chancellery",
    streak: 99,
    karma: 2450,
    avatarSeed: "👑",
    status: "active" as const
  },
  {
    name: "Discipline Master",
    title: "ViBe Core Architect",
    streak: 84,
    karma: 1980,
    avatarSeed: "🔮",
    status: "active" as const
  },
  {
    name: "yashasvigoel",
    title: "Scribe of the Scroll",
    streak: 52,
    karma: 1200,
    avatarSeed: "📜",
    status: "active" as const
  },
  {
    name: "vishal-chaurasia",
    title: "Keeper of the Route Gates",
    streak: 35,
    karma: 820,
    avatarSeed: "🛡️",
    status: "active" as const
  },
  {
    name: "ashutosh-pandey",
    title: "Database Sentinel",
    streak: 22,
    karma: 490,
    avatarSeed: "⚔️",
    status: "active" as const
  }
];

// API: Get Vibe Courses
app.get("/api/courses", (req, res) => {
  res.json(REAL_COURSES);
});

const REAL_ANNOUNCEMENTS = [
  {
    id: "ann-summership-welcome",
    title: "Welcome to Summership - Onboarding! 👋",
    content: "Greetings seeker! Your first quest is to complete the **Summership - Onboarding** track. Configure your Git, setup SSH keys, explore the terminal essentials, and join our active community Discord server. Remember, consistency is the ultimate vow of a developer. Your daily study streak is monitored by the Vikram-Betaal Vow Safeguard!",
    date: "2026-07-10",
    author: "ViBe Core Architect",
    tag: "Summership",
    isPinned: true
  },
  {
    id: "ann-ai-launch",
    title: "AI Fundamentals Course is Live! 🤖",
    content: "Step into the realm of Generative AI. The **Fundamentals of AI** course has been integrated into the student portal! Deep dive into the Transformer architecture, advanced Prompt Engineering, and RAG architectures. Challenge Betaal's riddles based on AI lessons to unlock exclusive badges.",
    date: "2026-07-09",
    author: "Master of Generative Cognition",
    tag: "AI",
    isPinned: false
  },
  {
    id: "ann-weekly-sync",
    title: "Weekly Sync Call: Git, OS & Terminal 🗓️",
    content: "Our upcoming weekly collaborative sync is scheduled for this Sunday at 11:00 AM IST. We will review repository synchronization, PouchDB offline syncing, and answer any hurdles in MEAN Stack component architecture. Be there on time, King Vikram!",
    date: "2026-07-08",
    author: "Vicharana Shala Scribe",
    tag: "General",
    isPinned: false
  }
];

// API: Get Vibe Announcements
app.get("/api/announcements", (req, res) => {
  res.json(REAL_ANNOUNCEMENTS);
});

function getFallbackLessonContent(category: string, lesson: string): string {
  const cleanCategory = category.replace(/%20/g, ' ');
  const cleanLessonName = lesson.substring(lesson.lastIndexOf('/') + 1)
    .replace('.md', '')
    .replace(/^\d+(\.\d+)?\s*/, '')
    .trim();

  return `# ${cleanLessonName}
  
Welcome to the **${cleanCategory}** curriculum at Vicharana Shala. This guide explores the core conceptual systems and implementation boundaries of **${cleanLessonName}** in modern high-fidelity application architectures.

## 1. Problem Statement
When engineering high-throughput distributed systems or reactive user interfaces, managing **${cleanLessonName}** correctly is essential to guarantee type safety, visual responsiveness, and backend scalability. Without robust, automated conventions, codebase complexity quickly spirals out of control.

## 2. Theoretical Breakdown
- **Unified Logic boundaries**: Keeping your logic and data boundaries clean and modular.
- **Strict Compliance protocols**: Running automated linters, compilers, and strict type settings to identify potential software bugs prior to production execution.
- **Resource Protection & Flow**: Leveraging clean software patterns (such as Repository structures, clean caching, and pipeline-based middleware validation) to minimize system strain.

## 3. Reference Implementation
Here is a sample production-grade software pattern demonstrating **${cleanLessonName}** using modern, standard TypeScript syntax:

\`\`\`typescript
// Vicharana Shala Authentic Reference Pattern
export interface SystemHandshake {
  status: "active" | "offline";
  timestamp: number;
  payload: any;
}

export class ${cleanLessonName.replace(/[^a-zA-Z0-9]/g, '') || "VibeCore"}Service {
  private static instance: ${cleanLessonName.replace(/[^a-zA-Z0-9]/g, '') || "VibeCore"}Service;
  
  public static getInstance(): ${cleanLessonName.replace(/[^a-zA-Z0-9]/g, '') || "VibeCore"}Service {
    if (!this.instance) {
      this.instance = new ${cleanLessonName.replace(/[^a-zA-Z0-9]/g, '') || "VibeCore"}Service();
    }
    return this.instance;
  }

  public async synchronize(data: Partial<SystemHandshake>): Promise<SystemHandshake> {
    console.log("[Vibe Engine] Synchronizing segment for ${cleanLessonName}...");
    return {
      status: "active",
      timestamp: Date.now(),
      payload: data
    };
  }
}
\`\`\`

## 4. Exercises & Practice
1. Configure your local workspace to compile and export the above service module safely.
2. Formulate a strong study vow to master these structural bounds, then challenge Betaal to a mythological riddle match to lock in your learnings!`;
}

// API: Get raw lesson content from local filesystem (originally fetched from GitHub)
app.get("/api/lesson-content", async (req, res) => {
  const { category, lesson } = req.query;
  if (!category || !lesson) {
    return res.status(400).json({ error: "Missing category or lesson parameter" });
  }

  // Read local file from the copied lessons directory
  const filePath = path.join(process.cwd(), "public", "lessons", category as string, lesson as string);

  try {
    const markdown = await fs.promises.readFile(filePath, "utf-8");
    res.json({ content: markdown });
  } catch (error: any) {
    console.error("Failed to read local markdown file, trying fallback:", error.message);
    const localContent = getFallbackLessonContent(category as string, lesson as string);
    res.json({ content: localContent });
  }
});

// API: Real Gemini-powered ViBe Learning Chat (online mode)
app.post("/api/chat", async (req, res) => {
  const { message, conversationHistory } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are Betaal, the wise and witty supernatural entity from Indian mythology (Vikram & Betaal tales), who has mastered modern software engineering through centuries of observation.

You serve as the official learning assistant for the ViBe Platform (Vicharanshala Lab, IIT Ropar).

The ViBe curriculum covers:
- **Git & GitHub**: SSH keys, branching, pull requests, merge conflicts, git workflows
- **TypeScript**: Static typing, interfaces, generics, decorators, design patterns, dependency injection, IoC containers
- **React (TSX)**: Components, hooks (useState, useEffect, useMemo, useCallback), Zustand state management, lazy loading, memoization, routing, testing
- **Express.js**: REST APIs, middleware, MVC pattern, repository pattern, request validation, HTTP methods, routing controllers
- **MongoDB**: CRUD operations, aggregation framework, schema design, transactions, indexing

IMPORTANT RULES:
1. Give REAL, ACCURATE, TECHNICALLY CORRECT answers — never vague or hallucinated content
2. Keep your Betaal character voice — wise, slightly dramatic, occasionally humorous, but ALWAYS educational
3. Include code examples in TypeScript/JavaScript when relevant (use markdown code blocks)
4. Keep answers concise but complete (3-8 sentences + code if needed)
5. If asked something outside the curriculum, gracefully redirect to the ViBe topics
6. Do NOT make up facts — admit uncertainty if needed

Speak as: "Betaal speaks..." or use first person with occasional mythology metaphors, but keep answers technically precise.`;

    // Build conversation history for context
    const contents: any[] = [];
    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-6).forEach((msg: { role: string; text: string }) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 500,
        temperature: 0.7,
      }
    });

    const reply = result.text || "The forest winds carry no answer today. Please rephrase your query, Vikram!";
    res.json({ reply, mode: 'online' });
  } catch (error: any) {
    console.error("Gemini chat error:", error.message);
    res.status(500).json({ 
      error: "Chat unavailable", 
      fallback: "Betaal retreats into the storm! The celestial connection is severed. Please try again shortly, brave Vikram." 
    });
  }
});

// API: Generate thematic Riddle using Gemini API based on lesson text
app.post("/api/generate-riddle", async (req, res) => {
  const { lessonTitle, category, content } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Missing lesson content" });
  }

  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are the legendary creature Betaal from Indian folklore (from the Vikram & Betaal tales).
Your job is to challenge King Vikramaditya (the student) with a complex technical riddle based on the provided software engineering lesson.

The output MUST be a valid JSON object matching the requested schema. You must weave a short mythical parable that transitions into a metaphorical multiple-choice question where the choices represent software concepts discussed in the lesson.
Provide highly educational justifications for each option, and set the correct option ID correctly. Always return a valid JSON format. Do not include markdown code block formatting in the output, just the raw JSON.`;

    const userPrompt = `Here is the academic lesson from our curriculum:
Course Category: ${category || "General Engineering"}
Lesson Title: ${lessonTitle || "Ancient Architecture"}
Lesson Content:
${content.substring(0, 4500)}

Please formulate a highly engaging, thematic Betaal Riddle that tests the key technical ideas in this lesson. Keep options and justifications clean and extremely clear.`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING, description: "A grand, high-sounding mythological title (e.g., 'The Riddle of the Fleeting Reference')" },
            tale: { type: Type.STRING, description: "A short, beautiful mythological story context featuring King Vikram and Betaal. The tale must weave a metaphor matching the lesson's software concept." },
            question: { type: Type.STRING, description: "Betaal's riddle question challenging King Vikram to choose the right concept or solve the dilemma." },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Use opt-1, opt-2, opt-3, etc." },
                  text: { type: Type.STRING, description: "The answer choice text (representing a clear technical option from the lesson, styled with classic/literary phrasing)." },
                  justification: { type: Type.STRING, description: "Detailed, helpful educational explanation of why this choice is right or wrong in terms of the lesson." }
                },
                required: ["id", "text", "justification"]
              }
            },
            correctOptionId: { type: Type.STRING, description: "The ID of the correct option (e.g., 'opt-2')" },
            explanation: { type: Type.STRING, description: "Betaal's final voice/pronouncement upon King Vikram solving the riddle correctly." },
            karmaReward: { type: Type.NUMBER, description: "Must be 30" }
          },
          required: ["id", "title", "tale", "question", "options", "correctOptionId", "explanation", "karmaReward"]
        }
      }
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const riddleData = JSON.parse(responseText.trim());
    res.json(riddleData);
  } catch (error: any) {
    console.error("Failed to generate riddle with Gemini:", error);
    // Return a beautiful mythological-themed fallback riddle if API fails or key is missing
    res.status(200).json({
      id: "fallback-gemini-riddle",
      title: `The Riddle of the Sovereign ${category || "Scroll"}`,
      tale: `Betaal laughs as he clings to Vikram's back: 'Vikram, you carry me through the dark forest, but your mind clings to the lessons of ${lessonTitle || "the Scroll"}. Let me tell you of a king who wanted to manage his royal files but forgot to coordinate his gateways.'`,
      question: `In modern development matching ${category || "this lesson"}, what is the most noble and proper action to ensure security and prevent chaos?`,
      options: [
        {
          id: "opt-1",
          text: "Expose your secret API keys to the browser, relying on the purity of the seekers.",
          justification: "Wrong! This would invite thieves and corrupt your royal ledger. Secrets must stay server-side."
        },
        {
          id: "opt-2",
          text: "Isolate secret API keys securely on the server side and proxy requests safely.",
          justification: "Correct! The sovereign server maintains custody of secrets, protecting the domain from exposure and malicious actors."
        },
        {
          id: "opt-3",
          text: "Refuse to use any keys or databases, keeping Ujjain entirely in the dark ages.",
          justification: "Wrong! Inactive avoidance is not active wisdom; we must use tools safely, not avoid them."
        }
      ],
      correctOptionId: "opt-2",
      explanation: `King Vikram replies: 'Secrets must be guarded in the inner sanctuary of the server, exposing only secure portals (APIs) to the public.' Betaal cackles: 'Your wisdom is indeed worthy of a sovereign!' and flies back.`,
      karmaReward: 30
    });
  }
});

// Helper for sync API date comparisons
function getDaysDiff(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + "T12:00:00");
  const d2 = new Date(dateStr2 + "T12:00:00");
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// API: Sync Offline Data using PouchDB and IndexedDB structures
app.post("/api/pouch-sync", (req, res) => {
  const { currentStreak, lastActiveDate, pouchDocs, indexedMetrics } = req.body;

  console.log("[PouchSync] Synchronizing incoming client logs:", {
    currentStreak,
    lastActiveDate,
    pouchDocsCount: pouchDocs?.length,
    indexedMetricsCount: indexedMetrics?.length
  });

  // Extract and merge all active dates from both sync engines
  const offlineDatesSet = new Set<string>();
  
  if (Array.isArray(pouchDocs)) {
    pouchDocs.forEach((doc: any) => {
      if (doc.localActiveDate) offlineDatesSet.add(doc.localActiveDate);
    });
  }

  if (Array.isArray(indexedMetrics)) {
    indexedMetrics.forEach((m: any) => {
      if (m.local_active_date) offlineDatesSet.add(m.local_active_date);
    });
  }

  const sortedOfflineDates = Array.from(offlineDatesSet).sort();
  
  let newStreak = currentStreak || 0;
  let runningLastActive = lastActiveDate || null;
  let karmaGained = 0;

  // Each unique completed study activity earns 20 KP
  karmaGained += (sortedOfflineDates.length * 20);

  // Evaluate the consecutive streak progression for the merged dates
  for (const date of sortedOfflineDates) {
    if (runningLastActive === null) {
      newStreak = 1;
      runningLastActive = date;
    } else {
      const diff = getDaysDiff(runningLastActive, date);
      if (diff === 1) {
        // Consecutive study day!
        newStreak += 1;
        runningLastActive = date;
      } else if (diff === 0) {
        // Same day activity, streak stays unchanged but records logged
        runningLastActive = date;
      } else {
        // Gapped study day: streak broken offline! Start a fresh consecutive line
        newStreak = 1;
        runningLastActive = date;
      }
    }
  }

  // Determine newly unlocked milestone badges
  const BADGE_CONFIGS = [
    { id: "spark", days: 3 },
    { id: "lantern", days: 7 },
    { id: "riddle", days: 14 },
    { id: "oath", days: 30 },
    { id: "unbroken", days: 60 },
    { id: "resolve", days: 100 }
  ];

  const newBadgesUnlocked: string[] = [];
  BADGE_CONFIGS.forEach((badge) => {
    // If the student has reached or exceeded this milestone, return it as unlocked
    if (newStreak >= badge.days && currentStreak < badge.days) {
      newBadgesUnlocked.push(badge.id);
      karmaGained += 50; // Bonus +50 KP for unlocking a milestone badge!
    }
  });

  console.log(`[PouchSync] Sync complete. Resolved streak: ${newStreak}, New Badges:`, newBadgesUnlocked);

  res.json({
    success: true,
    currentStreakCount: newStreak,
    lastActiveDate: runningLastActive,
    newBadgesUnlocked,
    karmaGained
  });
});

// In-memory store for real-time multi-user syncing without a DB (resets on server restart)
const IN_MEMORY_LEADERBOARD: any[] = [];

// API: Post updated score to global leaderboard
app.post("/api/leaderboard", (req, res) => {
  const { name, title, streak, karma, avatarSeed, status } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });

  const existingIndex = IN_MEMORY_LEADERBOARD.findIndex(u => u.name.toLowerCase() === name.toLowerCase());
  const entry = { name, title, streak, karma, avatarSeed, status };

  if (existingIndex >= 0) {
    IN_MEMORY_LEADERBOARD[existingIndex] = entry;
  } else {
    IN_MEMORY_LEADERBOARD.push(entry);
  }

  res.json({ success: true, entry });
});

// API: Get Vibe GitHub Contributors + Live Students
app.get("/api/leaderboard", async (req, res) => {
  try {
    const response = await fetch("https://api.github.com/repos/vicharanashala/vibe/contributors?per_page=15", {
      headers: {
        "User-Agent": "aistudio-build"
      }
    });

    if (!response.ok) {
      throw new Error("GitHub API rate limit or error");
    }

    const contributors: any[] = await response.json();
    
    // Roles map to make names look super cool and mythological
    const titles = [
      "Prime ViBe Architect",
      "Vanguard Scribe of code",
      "Sovereign Portal Guardian",
      "Grand High Compiler",
      "Chronicle Repository Scribe",
      "Mystical Quality Assurer",
      "Karmic Logic Weaver",
      "Siddha Interface Mason",
      "Scribe of the Core Routes"
    ];

    const mapped = contributors.map((c, index) => {
      const title = titles[index % titles.length];
      // Map contribution counts to active streak & karma points
      const contributions = c.contributions || 1;
      const streak = Math.min(108, Math.max(3, contributions * 2));
      const karma = Math.min(5000, contributions * 100 + 150);
      
      return {
        name: c.login,
        title: title,
        streak: streak,
        karma: karma,
        avatarSeed: c.avatar_url, // Raw avatar url
        status: "active" as const
      };
    });

    // Merge live students with GitHub contributors
    const liveNames = IN_MEMORY_LEADERBOARD.map(u => u.name.toLowerCase());
    const filteredMapped = mapped.filter(c => !liveNames.includes(c.name.toLowerCase()));

    res.json([...IN_MEMORY_LEADERBOARD, ...filteredMapped]);
  } catch (error: any) {
    console.warn("GitHub fetch failed, serving mock fallback contributors:", error.message);
    const liveNames = IN_MEMORY_LEADERBOARD.map(u => u.name.toLowerCase());
    const filteredFallback = FALLBACK_CONTRIBUTORS.filter(c => !liveNames.includes(c.name.toLowerCase()));
    
    res.json([...IN_MEMORY_LEADERBOARD, ...filteredFallback]);
  }
});

export default app;
