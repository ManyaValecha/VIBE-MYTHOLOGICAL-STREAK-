import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, RefreshCw, Wifi, WifiOff, Send, HelpCircle, CheckCircle, Sparkles, Volume2, VolumeX, Ghost } from 'lucide-react';
import { logOfflineActiveDate, getOfflineActiveMetrics, OfflineMetric } from '../utils/indexedDB';
import { queueActivityInPouch, syncOfflineDataToServer, getPendingPouchDocs } from '../utils/pouchSync';

interface OfflineAccessibilityLayerProps {
  currentStreak: number;
  lastActiveDate: string | null;
  systemDate: string;
  activitiesLoggedToday: string[];
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (val: boolean) => void;
  onSyncComplete: (syncResults: {
    updatedStreak: number;
    updatedLastActiveDate: string;
    newBadgesUnlocked: string[];
    karmaGained: number;
  }) => void;
  onLogActivity: (id: string, name: string, type: 'spaced-rep' | 'quiz' | 'video' | 'confusion' | 'question', points: number) => void;
  courses: any[];
}

// Custom hook to handle Web Audio API synthesized forest soundscape and sound effects
const useForestSounds = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cricketIntervalRef = useRef<any>(null);
  const windNodeRef = useRef<BiquadFilterNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const startSoundscape = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Synthesize ambient wind (white noise bandpass sweep)
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 10;
    filter.frequency.value = 350;

    const gain = ctx.createGain();
    gain.gain.value = 0.04; // Gentle wind volume

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start();

    windNodeRef.current = filter;

    // Periodically modulate wind frequency to simulate gusts
    const windModulation = setInterval(() => {
      if (filter && ctx.state === 'running') {
        const baseFreq = 300 + Math.random() * 200;
        filter.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 3);
      }
    }, 4000);

    // Synthesize cricket chirps
    cricketIntervalRef.current = setInterval(() => {
      if (ctx.state !== 'running') return;
      // Emit a burst of chirps
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const startTime = now + i * 0.18;
        const osc = ctx.createOscillator();
        const chirpGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(4500 + Math.random() * 200, startTime);
        osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.08);

        chirpGain.gain.setValueAtTime(0, startTime);
        chirpGain.gain.linearRampToValueAtTime(0.015, startTime + 0.01);
        chirpGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.07);

        osc.connect(chirpGain);
        chirpGain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.08);
      }
    }, 2400);

    setIsPlaying(true);
  };

  const stopSoundscape = () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.suspend();
    }
    if (cricketIntervalRef.current) {
      clearInterval(cricketIntervalRef.current);
    }
    setIsPlaying(false);
  };

  // Synthesize a cute ghost giggle sound effect
  const playGhostGiggle = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);

    // Wobble frequency for ghostly vibe
    const wobble = ctx.createOscillator();
    const wobbleGain = ctx.createGain();
    wobble.frequency.value = 25; // 25Hz wobble
    wobbleGain.gain.value = 150;

    wobble.connect(wobbleGain);
    wobbleGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    wobble.start(now);
    osc.start(now);

    wobble.stop(now + 0.4);
    osc.stop(now + 0.4);
  };

  // Synthesize chime sound when offline activity is saved
  const playChime = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((f, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + index * 0.06);

      gain.gain.setValueAtTime(0, now + index * 0.06);
      gain.gain.linearRampToValueAtTime(0.04, now + index * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.06 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.06);
      osc.stop(now + index * 0.06 + 0.5);
    });
  };

  // Synthesize magical sync chime
  const playSyncSuccessSound = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const freq = 400 + i * 150;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.05, now + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.3);
    }
  };

  return { isPlaying, startSoundscape, stopSoundscape, playGhostGiggle, playChime, playSyncSuccessSound };
};

export const OfflineAccessibilityLayer: React.FC<OfflineAccessibilityLayerProps> = ({
  currentStreak,
  lastActiveDate,
  systemDate,
  activitiesLoggedToday,
  isSimulatedOffline,
  setIsSimulatedOffline,
  onSyncComplete,
  onLogActivity,
  courses
}) => {
  const { isPlaying, startSoundscape, stopSoundscape, playGhostGiggle, playChime, playSyncSuccessSound } = useForestSounds();

  // Mode toggles
  const [pouchCount, setPouchCount] = useState(0);
  const [syncedLogs, setSyncedLogs] = useState<OfflineMetric[]>([]);

  // Pre-caching status state
  const [preCacheStatus, setPreCacheStatus] = useState<{
    active: boolean;
    current: number;
    total: number;
    completed: boolean;
  }>({
    active: false,
    current: 0,
    total: 0,
    completed: false
  });

  const handlePreCacheAll = async () => {
    if (preCacheStatus.active) return;
    
    // Collect all lesson objects
    const allLessonsToCache: Array<{ category: string; lesson: string }> = [];
    courses.forEach(course => {
      if (course && course.lessons) {
        course.lessons.forEach((lesson: string) => {
          allLessonsToCache.push({ category: course.category, lesson });
        });
      }
    });

    if (allLessonsToCache.length === 0) {
      alert("No lessons found to pre-cache.");
      return;
    }

    setPreCacheStatus({
      active: true,
      current: 0,
      total: allLessonsToCache.length,
      completed: false
    });

    const cache = await caches.open('vibe-offline-cache-v2');

    // Fetch and cache each lesson sequentially for reliability
    for (let i = 0; i < allLessonsToCache.length; i++) {
      const item = allLessonsToCache[i];
      const url = `/api/lesson-content?category=${encodeURIComponent(item.category)}&lesson=${encodeURIComponent(item.lesson)}`;
      
      try {
        const response = await fetch(url);
        if (response.status === 200) {
          await cache.put(url, response.clone());
        }
      } catch (err) {
        console.error(`Failed to pre-cache lesson ${item.lesson}`, err);
      }

      setPreCacheStatus(prev => ({
        ...prev,
        current: i + 1
      }));
    }

    setPreCacheStatus(prev => ({
      ...prev,
      completed: true,
      active: false
    }));
    
    playSyncSuccessSound();
  };

  // Flashcards state
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcardScores, setFlashcardScores] = useState<boolean[]>([false, false, false]);

  // Local Chatbot QA State
  const [botChatLogs, setBotChatLogs] = useState<{ sender: 'user' | 'betaal', text: string }[]>([
    { sender: 'betaal', text: "Hahaha! Vikram, though your device loses its connection to the skies, I am bound to your mind. Ask me any software engineering riddle offline!" }
  ]);
  const [botQuery, setBotQuery] = useState('');
  const [tfjsStatus, setTfjsStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const [tfjsProgress, setTfjsProgress] = useState(0);

  const FLASHCARDS = [
    {
      id: "fc-1",
      question: "How does the Service Worker act in an offline-first architecture?",
      answer: "It intercepts network requests as a proxy, serving cached resources immediately when the network is absent, and caching new GET API results.",
      hint: "Acts as an on-device local proxy gate."
    },
    {
      id: "fc-2",
      question: "What is PouchDB's relationship to CouchDB for syncing?",
      answer: "PouchDB runs directly in browser storage (IndexedDB) and replicates conflict-free changes bidirectionally to remote CouchDB-compatible databases when online.",
      hint: "Bidirectional master-to-master replication engine."
    },
    {
      id: "fc-3",
      question: "Why use IndexedDB instead of standard LocalStorage for offline tracking?",
      answer: "IndexedDB provides structured, transactional, asynchronous storage suitable for binary content or deep logs, preventing blocking of the main rendering thread.",
      hint: "Transactional key-value structured database."
    }
  ];

  // Refresh local queues counter
  const updatePendingCount = async () => {
    try {
      const pouchDocs = await getPendingPouchDocs();
      const indexedMetrics = await getOfflineActiveMetrics();
      setPouchCount(pouchDocs.length);
      setSyncedLogs(indexedMetrics);
    } catch (err) {
      console.warn("Failed to check pending counts", err);
    }
  };

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle local offline flashcard session completed
  const handleCompleteFlashcardOffline = async () => {
    const activityId = "offline-flashcards";
    const activityName = "Completed 5-Min Offline Concept Flashcard Deck";

    playChime();

    if (isSimulatedOffline) {
      // 1. Log to IndexedDB
      await logOfflineActiveDate(
        activityId,
        activityName,
        'spaced-rep',
        'vibe-pwa-review',
        currentStreak,
        lastActiveDate,
        systemDate
      );

      // 2. Queue in PouchDB
      await queueActivityInPouch({
        activityId,
        activityName,
        activityType: 'spaced-rep',
        courseId: 'vibe-pwa-review',
        systemDate
      });

      await updatePendingCount();
      onLogActivity(activityId, `${activityName} (Queued Offline)`, 'spaced-rep', 25);
    } else {
      // Direct Online Logging
      onLogActivity(activityId, activityName, 'spaced-rep', 25);
    }

    setFlashcardScores([false, false, false]);
    setActiveCardIndex(0);
    setShowAnswer(false);
  };

  // Perform Synchronization to the Remote Sovereign Database
  const handlePerformSync = async () => {
    if (isSimulatedOffline) {
      alert("⚠️ You are currently in Simulated Offline mode! Please toggle back to 'Online' to synchronize databases.");
      return;
    }

    const results = await syncOfflineDataToServer(currentStreak, lastActiveDate);
    if (results && results.success) {
      playSyncSuccessSound();
      onSyncComplete({
        updatedStreak: results.updatedStreak,
        updatedLastActiveDate: results.updatedLastActiveDate,
        newBadgesUnlocked: results.newBadgesUnlocked,
        karmaGained: results.karmaGained
      });
      await updatePendingCount();
    }
  };

  // Simulate loading TensorFlow.js + MobileBERT model locally in browser
  const handleQueryLocalBot = () => {
    if (!botQuery.trim()) return;

    const userText = botQuery;
    setBotChatLogs(prev => [...prev, { sender: 'user', text: userText }]);
    setBotQuery('');

    if (tfjsStatus === 'idle') {
      setTfjsStatus('loading');
      setTfjsProgress(10);
      
      const interval = setInterval(() => {
        setTfjsProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTfjsStatus('ready');
            triggerBotResponse(userText);
            return 100;
          }
          return prev + 15;
        });
      }, 300);
    } else {
      triggerBotResponse(userText);
    }
  };

  const triggerBotResponse = (query: string) => {
    setTimeout(() => {
      const q = query.toLowerCase();
      let reply = "Your technical query echoes in the silence of the forest, Vikram. Let us ponder: as MobileBERT parses this content, remember that local on-device models do not rely on server calls, granting complete privacy and speed!";

      if (q.includes('service') || q.includes('sw') || q.includes('cache')) {
        reply = "Betaal sits closer to you: 'A Service Worker is indeed like the loyal spirits that protect Ujjain's borders. It intercepts every request. If the internet drops, it serves from its secret vault (Cache Storage), preserving the continuity of your quest!'";
      } else if (q.includes('pouch') || q.includes('couch') || q.includes('sync')) {
        reply = "Betaal cackles: 'PouchDB and CouchDB act like the magical mirror of King Vikram! Whatever is carved in the on-device PouchDB stone is instantly reflected on the central server (CouchDB) when the divine connection is restored!'";
      } else if (q.includes('indexed') || q.includes('idb') || q.includes('db')) {
        reply = "Betaal whispers: 'LocalStorage is small and rigid, but IndexedDB is a vast cavern where entire ledgers of transactions and historical dates can be stored asynchronously without freezing the King's chariot!'";
      } else if (q.includes('streak') || q.includes('time')) {
        reply = "Betaal mocks lovingly: 'Ah! You worry about your daily learning streak! With our offline accessibility layer, as soon as you finish flashcards offline, IndexedDB seals the timestamp. You will never decay!'";
      }

      setBotChatLogs(prev => [...prev, { sender: 'betaal', text: reply }]);
      playGhostGiggle();
    }, 800);
  };

  return (
    <div id="offline-accessibility-layer-root" className="w-full bg-slate-950/85 border border-emerald-500/25 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md shadow-[0_0_40px_rgba(16,185,129,0.05)] mt-6">
      
      {/* Stars Backdrop Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
      
      {/* Decorative Star Constellations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-8 left-[10%] w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping duration-[3000ms]" />
        <div className="absolute top-16 left-[45%] w-1 h-1 bg-amber-100 rounded-full animate-pulse duration-1000" />
        <div className="absolute top-24 left-[80%] w-2 h-2 bg-indigo-300 rounded-full animate-ping duration-[4000ms]" />
        <div className="absolute top-4 left-[90%] w-1 h-1 bg-white rounded-full animate-pulse duration-700" />
      </div>

      {/* Floating Ghosts & Interactive Minions */}
      <div className="absolute top-6 right-8 flex items-center gap-3">
        {/* Playful Ambient sound master control */}
        <button
          onClick={isPlaying ? stopSoundscape : startSoundscape}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${
            isPlaying 
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Synthesizes relaxing background forest audio & crickets chirp natively!"
        >
          {isPlaying ? <Volume2 className="w-3.5 h-3.5 animate-bounce" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{isPlaying ? "FOREST AMBIENT: ON" : "SOUNDSCAPE MUTE"}</span>
        </button>

        {/* Cute Floating Interactive Ghost */}
        <button
          onClick={() => {
            playGhostGiggle();
            alert("👻 Betaal's forest helper giggle synthesized!");
          }}
          className="p-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20 transition-all hover:scale-110 active:scale-90 relative group"
          title="Click to summon Betaal's helpful spirit!"
        >
          <Ghost className="w-4 h-4 animate-bounce" />
          <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-slate-800 text-[9px] font-mono text-slate-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300">
            Hi! Play Chime
          </span>
        </button>
      </div>

      {/* Header and Sync Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase rounded tracking-wider">
              Offline Accessibility Layer
            </span>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-mono">PWA Cache Ready</span>
            </div>
          </div>
          <h2 className="text-sm font-serif font-bold text-slate-100 tracking-wider uppercase mt-1 flex items-center gap-2">
            🌳 Starry Forest PWA Sanctuary
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Spend 5 minutes offline solving the concept flashcards or querying Betaal to maintain your streak without any internet connection.
          </p>

          {/* Real pre-caching feature for Vibe github repository */}
          <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center gap-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3 max-w-xl">
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wide">Synchronize Real Vibe Curriculum</span>
              </div>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                {preCacheStatus.completed 
                  ? "✓ Entire real curriculum is successfully downloaded and fully available offline!"
                  : "Download all 35+ lessons of the real repository into your browser's persistent cache for genuine offline study."}
              </p>
            </div>
            
            {preCacheStatus.active ? (
              <div className="flex flex-col items-end gap-1 min-w-[120px]">
                <span className="text-[9px] font-mono text-indigo-400 font-bold">
                  Caching: {preCacheStatus.current} / {preCacheStatus.total}
                </span>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${(preCacheStatus.current / preCacheStatus.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : preCacheStatus.completed ? (
              <span className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold rounded-lg whitespace-nowrap">
                ✓ ALL CACHED
              </span>
            ) : (
              <button
                onClick={handlePreCacheAll}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-md"
              >
                PRE-CACHE ALL LESSONS
              </button>
            )}
          </div>
        </div>

        {/* Online / Offline simulated toggle switch */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl flex items-center gap-1">
            <button
              onClick={() => {
                setIsSimulatedOffline(false);
                playChime();
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${
                !isSimulatedOffline 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>ONLINE</span>
            </button>
            <button
              onClick={() => {
                setIsSimulatedOffline(true);
                playGhostGiggle();
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${
                isSimulatedOffline 
                  ? 'bg-amber-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>OFFLINE</span>
            </button>
          </div>

          <button
            onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  for (const reg of regs) {
                    await reg.unregister();
                  }
                }
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                  await caches.delete(name);
                }
                window.location.reload();
              } catch (e) {
                console.error('Failed to purge caches', e);
                window.location.reload();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Wipes Service Worker cache databases and triggers a hard reload to display newest code edits immediately."
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            <span>FORCE BUST CACHE & UPDATE</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMN 1: PouchDB & IndexedDB Queue (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-900/80 rounded-xl p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 font-mono tracking-widest uppercase mb-1.5 flex items-center gap-1.5 border-b border-slate-950 pb-1.5">
                💾 Sync & Database Monitor
              </h3>
              
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Local PouchDB Database:</span>
                  <span className="text-indigo-400 font-bold">{pouchCount} docs pending</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">IndexedDB Timestamp:</span>
                  <span className="text-amber-400 font-bold">
                    {syncedLogs.length > 0 ? syncedLogs[syncedLogs.length - 1].local_active_date : 'No offline logs'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Simulated Network Status:</span>
                  <span className={`font-bold flex items-center gap-1 ${isSimulatedOffline ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {isSimulatedOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                    {isSimulatedOffline ? "Offline Sim" : "Online"}
                  </span>
                </div>
              </div>

              {/* Offline metrics list */}
              {syncedLogs.length > 0 && (
                <div className="mt-4 bg-slate-950/60 border border-slate-900 rounded-lg p-2 max-h-[110px] overflow-y-auto">
                  <p className="text-[9px] font-mono uppercase text-slate-500 tracking-wider mb-1">IndexedDB Log Record</p>
                  {syncedLogs.map((log, i) => (
                    <div key={i} className="text-[10px] font-mono text-slate-300 flex justify-between py-0.5 border-b border-slate-900 last:border-0">
                      <span className="truncate max-w-[120px]">📝 {log.activityName}</span>
                      <span className="text-indigo-400">{log.local_active_date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-950">
              <button
                onClick={handlePerformSync}
                disabled={pouchCount === 0 || isSimulatedOffline}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-900 disabled:to-slate-900 border border-emerald-500/30 disabled:border-slate-800 text-slate-950 disabled:text-slate-500 font-serif font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>Synchronize to Sovereign Vault</span>
              </button>
              <p className="text-[9px] font-mono text-slate-500 text-center mt-2 leading-tight">
                Pushes PouchDB and IndexedDB local metrics to remote CouchDB & main platform server variables, checking for milestone badges!
              </p>
            </div>
          </div>
        </div>

        {/* COLUMN 2: 5-Minute Concept Review & Flashcards (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-900/80 rounded-xl p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 font-mono tracking-widest uppercase mb-1.5 flex items-center gap-1.5 border-b border-slate-950 pb-1.5">
                ⚡ 5-Min Concept flashcard deck
              </h3>

              <div className="mt-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4 relative min-h-[140px] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                    <span>FLASHCARD {activeCardIndex + 1} OF 3</span>
                    <span className="text-indigo-400">Habit Saver</span>
                  </div>
                  
                  <p className="text-xs font-semibold text-slate-100 mt-2.5">
                    {FLASHCARDS[activeCardIndex].question}
                  </p>

                  {showAnswer && (
                    <p className="text-[11px] text-emerald-400 mt-2.5 bg-emerald-950/20 border border-emerald-500/10 p-2 rounded-lg leading-relaxed font-mono">
                      💡 {FLASHCARDS[activeCardIndex].answer}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  {!showAnswer ? (
                    <button
                      onClick={() => {
                        setShowAnswer(true);
                        playChime();
                      }}
                      className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono py-1 rounded cursor-pointer transition-all"
                    >
                      Show Secret Answer
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => {
                          const updated = [...flashcardScores];
                          updated[activeCardIndex] = true;
                          setFlashcardScores(updated);
                          playChime();
                          
                          if (activeCardIndex < 2) {
                            setActiveCardIndex(activeCardIndex + 1);
                            setShowAnswer(false);
                          } else {
                            handleCompleteFlashcardOffline();
                          }
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-slate-950 text-[10px] font-mono py-1 rounded cursor-pointer font-bold transition-all"
                      >
                        Got It! {activeCardIndex === 2 ? 'Finish' : 'Next'}
                      </button>
                      <button
                        onClick={() => {
                          if (activeCardIndex < 2) {
                            setActiveCardIndex(activeCardIndex + 1);
                            setShowAnswer(false);
                          } else {
                            handleCompleteFlashcardOffline();
                          }
                        }}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-mono py-1 rounded cursor-pointer transition-all"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-950">
              <div className="flex gap-1 justify-center">
                {FLASHCARDS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeCardIndex 
                        ? 'w-6 bg-indigo-500' 
                        : i < activeCardIndex 
                          ? 'w-2 bg-emerald-500' 
                          : 'w-2 bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: TensorFlow.js Local chatbot running MobileBERT (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-900/80 rounded-xl p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 font-mono tracking-widest uppercase mb-1.5 flex items-center gap-1.5 border-b border-slate-950 pb-1.5">
                🤖 On-Device Local AI (MobileBERT)
              </h3>

              {/* Chat log box */}
              <div className="mt-3 bg-slate-950/60 border border-slate-900 rounded-xl p-3 h-[140px] overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-900 scrollbar-track-transparent">
                {botChatLogs.map((log, index) => (
                  <div key={index} className={`flex flex-col ${log.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[8px] font-mono text-slate-600 uppercase mb-0.5">
                      {log.sender === 'user' ? 'Vikram' : 'Betaal'}
                    </span>
                    <div className={`text-[10px] px-2.5 py-1.5 rounded-xl max-w-[90%] leading-relaxed ${
                      log.sender === 'user' 
                        ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-300' 
                        : 'bg-slate-900 border border-slate-850 text-slate-300'
                    }`}>
                      {log.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* TFJS Loader status info bar */}
              {tfjsStatus === 'loading' && (
                <div className="mt-2 bg-slate-950 border border-slate-900 rounded-lg p-2">
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-1">
                    <span>Loading tfjs-core & mobilebert...</span>
                    <span>{tfjsProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${tfjsProgress}%` }} />
                  </div>
                </div>
              )}

              {tfjsStatus === 'ready' && (
                <div className="mt-2 text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>TensorFlow.js engine compiled & active locally in memory!</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-950 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask Betaal about service workers, sync..."
                value={botQuery}
                onChange={(e) => setBotQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQueryLocalBot();
                }}
                className="flex-1 bg-slate-950 border border-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 font-mono"
              />
              <button
                onClick={handleQueryLocalBot}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
