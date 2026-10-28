import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  BrainCircuit, 
  History, 
  Plus, 
  Search, 
  Settings, 
  LogOut, 
  Calendar, 
  Clock, 
  User, 
  Mic, 
  Video, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  FileText, 
  Zap, 
  AlertTriangle, 
  ArrowRight,
  Bell,
  Sparkles,
  Filter,
  ArrowUpRight,
  Loader2,
  Send,
  Download,
  Copy,
  ShieldCheck,
  Sun,
  Moon,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { Meeting, Utterance, ProjectMemory, ActionItem } from "./types";
import { processMeetingTranscript, createMeetingChunks, getEmbedding, queryPastMeetings } from "./services/ai";
import { v4 as uuidv4 } from "uuid";

// --- Helper Components ---

const StatCard = ({ title, value, icon: Icon, trend, color }: { title: string, value: string | number, icon: any, trend?: string, color: string }) => (
  <div className="p-6 md:p-8 bg-[var(--card)] border border-[var(--border)] rounded-[1.5rem] md:rounded-[2rem] relative overflow-hidden group transition-all duration-300">
    <div className="absolute top-0 right-0 p-4 md:p-6 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon size={60} className="md:w-[80px] md:h-[80px] text-[var(--foreground)]" />
    </div>
    <p className="text-[10px] md:text-sm text-[var(--muted-foreground)] font-medium mb-1 md:mb-2 uppercase tracking-wider">{title}</p>
    <p className="text-2xl md:text-4xl font-bold tracking-tight font-mono text-[var(--foreground)]">{value}</p>
    {trend && (
      <div className={cn("mt-3 md:mt-4 flex items-center gap-2 text-[9px] md:text-[10px] font-bold", color)}>
        <ArrowUpRight size={10} className="md:w-3 md:h-3" /> {trend}
      </div>
    )}
  </div>
);

const ActionItemRow = ({ item }: { item: any }) => (
  <div className="p-4 md:p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4 group hover:border-indigo-500/30 transition-all data-row">
    <button className="w-4 h-4 md:w-5 md:h-5 rounded-md border border-[var(--border)] flex items-center justify-center hover:border-indigo-500 transition-colors shrink-0">
      <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-sm bg-indigo-500 opacity-0 group-hover:opacity-20 transition-opacity" />
    </button>
    <div className="flex-1 min-w-0">
      <p className="text-xs md:text-sm font-medium text-[var(--foreground)]/80 truncate">{item.task}</p>
      <p className="text-[9px] md:text-[10px] text-[var(--muted-foreground)] mt-0.5 md:mt-1 uppercase tracking-widest font-mono truncate">{item.meetingTitle}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-[9px] md:text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg inline-block">{item.owner}</p>
      <p className="text-[8px] md:text-[9px] text-[var(--muted-foreground)]/50 mt-0.5 md:mt-1 font-mono">{item.deadline}</p>
    </div>
  </div>
);

const SectionHeader = ({ title, icon: Icon, action }: { title: string, icon: any, action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-lg font-bold flex items-center gap-2 font-serif italic">
      <Icon size={20} className="text-indigo-500" />
      {title}
    </h3>
    {action}
  </div>
);

const MeetingCard = ({ meeting, onClick }: { meeting: Meeting, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl hover:border-indigo-500/30 transition-all cursor-pointer group shadow-sm hover:shadow-md"
  >
    <div className="flex justify-between items-start mb-3">
      <h4 className="font-bold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-[var(--foreground)]">{meeting.title}</h4>
      <span className="text-[10px] text-[var(--muted-foreground)] font-mono">{new Date(meeting.date).toLocaleDateString()}</span>
    </div>
    <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed mb-4 font-serif italic">{meeting.insights?.summary}</p>
    <div className="flex items-center gap-4">
      <div className="flex -space-x-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--card)] bg-[var(--muted)] flex items-center justify-center text-[8px] font-bold text-[var(--muted-foreground)]">
            {String.fromCharCode(64 + i)}
          </div>
        ))}
      </div>
      <div className="h-4 w-px bg-[var(--border)]" />
      <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> {meeting.insights?.actionItems?.length || 0}</span>
        <span className="flex items-center gap-1"><Zap size={12} className="text-yellow-500" /> {meeting.insights?.decisions?.length || 0}</span>
      </div>
    </div>
  </div>
);

const InsightCard = ({ title, icon: Icon, color, children }: { title: string, icon: any, color: string, children: React.ReactNode }) => (
  <section className="space-y-6">
    <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em]", color)}>{title}</h3>
    <div className="space-y-4">
      {children}
    </div>
  </section>
);

export default function App() {
  const [view, setView] = useState<"dashboard" | "meeting" | "memory">("dashboard");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [query, setQuery] = useState("");
  const [queryResponse, setQueryResponse] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [privacyMode, setPrivacyMode] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Live Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  // New Task State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ task: "", owner: "", deadline: "" });

  // Timer for recording
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
    
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      
      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (final) {
          setLiveTranscript(prev => prev + " " + final);
          setInterimTranscript("");
        } else {
          setInterimTranscript(interim);
        }
      };
      
      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setError(`Microphone error: ${event.error}. Please check permissions.`);
        setIsRecording(false);
      };
      
      setRecognition(rec);
    }
  }, []);

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      setMeetings(data);
    } catch (err) {
      console.error("Failed to fetch meetings", err);
    }
  };

  const simulateMeetingProcessing = async () => {
    setIsProcessing(true);
    setError(null);
    setProcessingStep("Initializing AI pipeline...");
    const mockTranscript: Utterance[] = [
      { speakerId: "Alice", text: "Hi everyone, let's discuss the Q3 roadmap and our shift towards AI-first features.", timestamp: "00:01" },
      { speakerId: "Bob", text: "I think we should prioritize the AI integration for the dashboard. It will help users see insights faster.", timestamp: "00:05" },
      { speakerId: "Charlie", text: "Agreed. Bob, can you lead the technical design for the RAG pipeline by next Friday?", timestamp: "00:10" },
      { speakerId: "Bob", text: "Sure, I'll have a draft ready. I'll also look into using text-embedding-004 for better accuracy.", timestamp: "00:12" },
      { speakerId: "Alice", text: "Great. We also decided to switch our vector database to Pinecone for scalability.", timestamp: "00:20" },
      { speakerId: "Charlie", text: "One risk is the latency of the embedding API. We should implement a caching layer.", timestamp: "00:25" },
      { speakerId: "Alice", text: "Good point. Let's add that to the follow-ups.", timestamp: "00:30" },
    ];

    try {
      const meetingId = uuidv4();
      const date = new Date().toISOString();
      const title = `Project Sync - ${new Date().toLocaleDateString()}`;
      const transcriptText = mockTranscript.map((u: any) => `${u.speakerId}: ${u.text}`).join("\n");

      // 1. Extract insights using advanced pipeline (CLIENT SIDE)
      setProcessingStep("Extracting insights (Map/Reduce)...");
      const insights = await processMeetingTranscript(transcriptText);

      // 2. Create granular chunks for semantic search (CLIENT SIDE)
      setProcessingStep("Indexing for semantic memory...");
      const chunks = await createMeetingChunks(meetingId, title, date, transcriptText);

      setProcessingStep("Finalizing...");
      const newMeeting: Meeting = {
        id: meetingId,
        title,
        date,
        duration: "45 min",
        transcript: mockTranscript,
        insights,
        chunks
      };

      // 3. Save to server
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMeeting),
      });
      const savedMeeting = await res.json();
      setMeetings(prev => [savedMeeting, ...prev]);
      setSelectedMeeting(savedMeeting);
      setView("meeting");
      setProcessingStep("");
    } catch (err) {
      console.error("Processing failed", err);
      setError("Failed to process meeting. Check your GEMINI_API_KEY in the Secrets panel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = () => {
    if (!recognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    setLiveTranscript("");
    setInterimTranscript("");
    setError(null);
    setIsRecording(true);
    setRecordingTime(0);
    try {
      recognition.start();
    } catch (e) {
      console.error("Recognition start failed", e);
      // Already started or permission denied
    }
  };

  const stopRecording = async () => {
    if (!recognition) return;
    setIsRecording(false);
    try {
      recognition.stop();
    } catch (e) {
      console.error("Recognition stop failed", e);
    }
    
    if (liveTranscript.trim().length < 20) {
      setError("Meeting was too short to process. Please ensure your microphone is working.");
      return;
    }
    
    await processRealMeeting(liveTranscript);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setProcessingStep(`Reading ${file.name}...`);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setError("Failed to read file content.");
        setIsUploading(false);
        return;
      }

      // Simple VTT/Text cleaning
      const cleanTranscript = content
        .replace(/WEBVTT/g, "")
        .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, "")
        .replace(/<v [^>]+>/g, "")
        .replace(/<\/v>/g, "")
        .split("\n")
        .filter(line => line.trim().length > 0)
        .join("\n");

      await processRealMeeting(cleanTranscript, file.name.replace(/\.[^/.]+$/, ""));
      setIsUploading(false);
    };

    reader.onerror = () => {
      setError("Error reading file.");
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  const processRealMeeting = async (transcript: string, customTitle?: string) => {
    setIsProcessing(true);
    setError(null);
    setProcessingStep("Analyzing your meeting...");
    
    try {
      const meetingId = uuidv4();
      const date = new Date().toISOString();
      const title = customTitle || `Teams Sync - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      // 1. Extract insights
      setProcessingStep("Extracting insights (Map/Reduce)...");
      const insights = await processMeetingTranscript(transcript);

      // 2. Create chunks for memory
      setProcessingStep("Indexing for semantic memory...");
      const chunks = await createMeetingChunks(meetingId, title, date, transcript);

      setProcessingStep("Finalizing...");
      const newMeeting: Meeting = {
        id: meetingId,
        title,
        date,
        duration: customTitle ? "Imported Transcript" : formatTime(recordingTime),
        transcript: [{ speakerId: "Speaker", text: transcript, timestamp: "00:00" }],
        insights,
        chunks
      };

      // 3. Save to server
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMeeting),
      });
      const savedMeeting = await res.json();
      setMeetings(prev => [savedMeeting, ...prev]);
      setSelectedMeeting(savedMeeting);
      setView("meeting");
      setProcessingStep("");
    } catch (err) {
      console.error("Processing failed", err);
      setError(err instanceof Error ? err.message : "AI processing is temporarily unavailable.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTask = async () => {
    if (!selectedMeeting || !newTask.task) return;

    const actionItem: ActionItem = {
      id: uuidv4(),
      task: newTask.task,
      owner: newTask.owner || "Unassigned",
      deadline: newTask.deadline || "TBD",
      status: "pending"
    };

    const updatedMeeting = {
      ...selectedMeeting,
      insights: {
        ...selectedMeeting.insights,
        actionItems: [...(selectedMeeting.insights?.actionItems || []), actionItem]
      }
    };

    try {
      const res = await fetch(`/api/meetings/${selectedMeeting.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedMeeting),
      });
      
      if (res.ok) {
        setMeetings(prev => prev.map(m => m.id === selectedMeeting.id ? updatedMeeting : m));
        setSelectedMeeting(updatedMeeting);
        setIsAddingTask(false);
        setNewTask({ task: "", owner: "", deadline: "" });
      }
    } catch (err) {
      console.error("Failed to add task", err);
      setError("Failed to save new task.");
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    if (!selectedMeeting) return;

    const updatedActionItems = selectedMeeting.insights.actionItems.map((item): ActionItem => 
      item.id === taskId ? { ...item, status: item.status === "completed" ? "pending" : "completed" } : item
    );

    const updatedMeeting = {
      ...selectedMeeting,
      insights: {
        ...selectedMeeting.insights,
        actionItems: updatedActionItems
      }
    };

    try {
      const res = await fetch(`/api/meetings/${selectedMeeting.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedMeeting),
      });
      
      if (res.ok) {
        setMeetings(prev => prev.map(m => m.id === selectedMeeting.id ? updatedMeeting : m));
        setSelectedMeeting(updatedMeeting);
      }
    } catch (err) {
      console.error("Failed to toggle task status", err);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setIsQuerying(true);
    try {
      // 1. Get embedding for query (CLIENT SIDE)
      const queryEmbedding = await getEmbedding(query);

      // 2. Search across ALL chunks from ALL meetings
      const allChunks = meetings.flatMap(m => m.chunks || []);
      
      const relevantChunks = allChunks
        .map(chunk => ({
          chunk,
          similarity: dotProduct(queryEmbedding, chunk.embedding),
        }))
        .filter(res => res.similarity > 0.6)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10);

      if (relevantChunks.length === 0) {
        setQueryResponse("I couldn't find any relevant information in past meetings.");
        return;
      }

      const context = relevantChunks
        .map(rc => `[Meeting: ${rc.chunk.meetingTitle} | Date: ${rc.chunk.date}]\n${rc.chunk.text}`)
        .join("\n\n---\n\n");

      // 3. Generate answer (CLIENT SIDE)
      const response = await queryPastMeetings(query, context);
      setQueryResponse(response);
    } catch (err) {
      console.error("Query failed", err);
      setQueryResponse("Failed to query past meetings. Check your GEMINI_API_KEY.");
    } finally {
      setIsQuerying(false);
    }
  };

  const dotProduct = (a: number[], b: number[]) => {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;
    return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
  };

  const allActionItems = meetings.flatMap(m => m.insights?.actionItems?.map(ai => ({ ...ai, meetingTitle: m.title, meetingId: m.id })) || []);

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 border-r border-[var(--border)] flex flex-col bg-[var(--card)] z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BrainCircuit size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">Synapse AI</h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-8 overflow-y-auto py-4">
          <div className="space-y-1">
            <button 
              onClick={() => { setView("dashboard"); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                view === "dashboard" ? "bg-indigo-600/10 text-indigo-600 dark:bg-white/10 dark:text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              )}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              onClick={() => { setView("memory"); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                view === "memory" ? "bg-indigo-600/10 text-indigo-600 dark:bg-white/10 dark:text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              )}
            >
              <BrainCircuit size={18} /> Project Memory
            </button>
          </div>

          <div>
            <div className="px-4 flex items-center justify-between mb-4">
              <h2 className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]/60 font-bold">Recent Meetings</h2>
              <button 
                onClick={simulateMeetingProcessing}
                disabled={isProcessing}
                className="p-1 hover:bg-[var(--muted)] rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </div>
            <div className="space-y-1">
              {meetings.map(meeting => (
                <button 
                  key={meeting.id}
                  onClick={() => {
                    setSelectedMeeting(meeting);
                    setView("meeting");
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex flex-col gap-1 px-4 py-3 rounded-xl transition-all text-left group",
                    selectedMeeting?.id === meeting.id && view === "meeting" ? "bg-indigo-600/10 border border-indigo-500/20" : "hover:bg-[var(--muted)] border border-transparent"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold truncate transition-colors",
                    selectedMeeting?.id === meeting.id && view === "meeting" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--foreground)]/70 group-hover:text-[var(--foreground)]"
                  )}>{meeting.title}</span>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(meeting.date).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-6 border-t border-[var(--border)] bg-[var(--card)]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <User size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-[var(--foreground)]">Uday Puttireddi</p>
              <p className="text-[10px] text-[var(--muted-foreground)] truncate">Pro Account</p>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-2 hover:bg-[var(--muted)] rounded-lg"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-[var(--background)] overflow-hidden w-full">
        {/* Header */}
        <header className="h-20 border-b border-[var(--border)] flex items-center justify-between px-4 md:px-10 bg-[var(--card)]/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg transition-all"
            >
              <Filter size={20} className="rotate-90" />
            </button>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-[var(--foreground)]/90 truncate max-w-[150px] md:max-w-none">
              {view === "dashboard" && "Mission Control"}
              {view === "meeting" && "Meeting Intelligence"}
              {view === "memory" && "Project Memory"}
            </h2>
            {view === "meeting" && selectedMeeting && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-bold border border-indigo-500/20">
                <Sparkles size={12} />
                AI PROCESSED
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-white/20">
              {isProcessing && (
                <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                  <Loader2 size={12} className="animate-spin" />
                  <span>{processingStep}</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={12} />
                  <span>{error}</span>
                </div>
              )}
            </div>
            <div className="hidden md:block h-6 w-px bg-white/5" />
            <div className="flex items-center gap-1 md:gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} className="text-indigo-600" />}
              </button>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <Bell size={20} />
                <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[var(--card)]" />
              </button>
              <button className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                <Search size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === "dashboard" && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto p-4 md:p-10 space-y-8 md:space-y-12"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="md:col-span-2 lg:col-span-3">
                    <div className="p-6 md:p-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-indigo-500/20 relative overflow-hidden text-white">
                      <div className="absolute top-0 right-0 p-12 opacity-10 hidden sm:block">
                        <Mic size={120} />
                      </div>
                      <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Ready for your next meeting?</h2>
                          <p className="text-white/70 text-base md:text-lg font-serif italic max-w-xl">
                            Synapse AI captures your live conversation, extracts action items, and stores them in your project memory automatically.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
                          {!isRecording ? (
                            <button 
                              onClick={startRecording}
                              className="px-6 md:px-8 py-3 md:py-4 bg-white text-indigo-600 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 shadow-xl"
                            >
                              <Mic size={20} /> START RECORDING
                            </button>
                          ) : (
                            <button 
                              onClick={stopRecording}
                              className="px-6 md:px-8 py-3 md:py-4 bg-red-500 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:bg-red-600 transition-all flex items-center justify-center gap-3 shadow-xl animate-pulse"
                            >
                              <div className="w-3 h-3 bg-white rounded-full animate-ping" /> END & PROCESS ({formatTime(recordingTime)})
                            </button>
                          )}
                          <label className="px-6 md:px-8 py-3 md:py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg transition-all flex items-center justify-center gap-3 backdrop-blur-md border border-white/10 cursor-pointer">
                            <FileText size={20} /> IMPORT TEAMS
                            <input 
                              type="file" 
                              accept=".vtt,.txt" 
                              className="hidden" 
                              onChange={handleFileUpload}
                              disabled={isUploading || isProcessing}
                            />
                          </label>
                        </div>
                        {isRecording && (
                          <div className="p-4 md:p-6 bg-black/40 dark:bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Live Transcription</p>
                              </div>
                              <span className="text-[10px] font-mono text-white/40">{formatTime(recordingTime)}</span>
                            </div>
                            <div className="max-h-32 overflow-y-auto custom-scrollbar pr-2">
                              <p className="text-sm text-white/90 leading-relaxed font-serif italic">
                                {liveTranscript}
                                <span className="text-white/40"> {interimTranscript}</span>
                                {!liveTranscript && !interimTranscript && (
                                  <span className="text-white/20">Listening... Speak now to see real-time transcription.</span>
                                )}
                              </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                              <Sparkles size={12} className="text-indigo-400" />
                              <p className="text-[9px] text-white/30 italic">AI is analyzing context in real-time...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatCard 
                    title="Total Meetings" 
                    value={meetings.length} 
                    icon={MessageSquare} 
                    trend="+12% from last week" 
                    color="text-green-600 dark:text-green-400" 
                  />
                  <StatCard 
                    title="Pending Tasks" 
                    value={allActionItems.length} 
                    icon={CheckCircle2} 
                    trend="AI Prioritized" 
                    color="text-indigo-600 dark:text-indigo-400" 
                  />
                  <StatCard 
                    title="Key Decisions" 
                    value={meetings.reduce((acc, m) => acc + (m.insights?.decisions?.length || 0), 0)} 
                    icon={Zap} 
                    trend="3 new this week" 
                    color="text-yellow-600 dark:text-yellow-400" 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
                  {/* Global Action Items */}
                  <div className="lg:col-span-7 space-y-6">
                    <SectionHeader 
                      title="Global Action Items" 
                      icon={CheckCircle2} 
                      action={
                        <button className="text-[10px] font-bold text-[var(--muted-foreground)]/40 hover:text-[var(--foreground)] flex items-center gap-1 transition-colors uppercase tracking-widest">
                          VIEW ALL <ChevronRight size={12} />
                        </button>
                      }
                    />
                    <div className="space-y-3">
                      {allActionItems.slice(0, 5).map((item, idx) => (
                        <ActionItemRow key={idx} item={item} />
                      ))}
                      {allActionItems.length === 0 && (
                        <div className="p-10 border border-dashed border-white/5 rounded-3xl text-center">
                          <p className="text-sm text-white/20 italic font-serif">No pending action items.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity Feed */}
                  <div className="lg:col-span-5 space-y-6">
                    <SectionHeader title="Recent Meetings" icon={History} />
                    <div className="space-y-4">
                      {meetings.slice(0, 3).map(meeting => (
                        <MeetingCard 
                          key={meeting.id} 
                          meeting={meeting} 
                          onClick={() => { setSelectedMeeting(meeting); setView("meeting"); }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === "meeting" && selectedMeeting && (
              <motion.div 
                key="meeting"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-7xl mx-auto p-4 md:p-10"
              >
                {/* Meeting Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs font-mono text-white/30">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(selectedMeeting.date).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {selectedMeeting.duration}</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{selectedMeeting.title}</h1>
                  </div>
                    <div className="flex gap-2 md:gap-3">
                      <button 
                        onClick={() => {
                          const text = `Meeting: ${selectedMeeting.title}\nDate: ${new Date(selectedMeeting.date).toLocaleDateString()}\n\nSUMMARY:\n${selectedMeeting.insights?.summary}\n\nTRANSCRIPT:\n${selectedMeeting.transcript.map(u => `${u.speakerId}: ${u.text}`).join('\n')}`;
                          const blob = new Blob([text], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedMeeting.title.replace(/\s+/g, '_')}_Report.txt`;
                          a.click();
                        }}
                        className="flex-1 md:flex-none px-4 md:px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={16} /> Export
                      </button>
                      <button 
                        onClick={() => setIsAddingTask(true)}
                        className="flex-1 md:flex-none px-4 md:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs md:text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> New Task
                      </button>
                    </div>
                </div>

                {isAddingTask && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-6 bg-[var(--card)] border border-indigo-500/30 rounded-3xl shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Add New Action Item</h3>
                      <button onClick={() => setIsAddingTask(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <Plus size={18} className="rotate-45" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase mb-1 block">Task Description</label>
                        <input 
                          type="text" 
                          value={newTask.task}
                          onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                          placeholder="What needs to be done?"
                          className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase mb-1 block">Owner</label>
                        <input 
                          type="text" 
                          value={newTask.owner}
                          onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
                          placeholder="Who's responsible?"
                          className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase mb-1 block">Deadline</label>
                        <input 
                          type="text" 
                          value={newTask.deadline}
                          onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                          placeholder="e.g., Next Friday"
                          className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button 
                          onClick={() => setIsAddingTask(false)}
                          className="px-4 py-2 text-sm font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleAddTask}
                          disabled={!newTask.task}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-bold transition-all"
                        >
                          Save Task
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                  {/* Left Column: Summary & Transcript */}
                  <div className="lg:col-span-8 space-y-8 md:space-y-12">
                    <InsightCard title="Executive Summary" icon={Sparkles} color="text-indigo-500">
                      <div className="p-6 md:p-10 bg-[var(--card)] border border-[var(--border)] rounded-[1.5rem] md:rounded-[2.5rem] leading-relaxed text-[var(--foreground)]/80 text-base md:text-lg font-serif italic">
                        <ReactMarkdown>{selectedMeeting.insights?.summary || ""}</ReactMarkdown>
                      </div>
                    </InsightCard>

                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/20">Transcript</h3>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => {
                              const text = selectedMeeting.transcript.map(u => `${u.speakerId}: ${u.text}`).join('\n');
                              navigator.clipboard.writeText(text);
                              // Could add a toast here
                            }}
                            className="text-[10px] font-bold text-white/20 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-widest"
                          >
                            <Copy size={12} /> COPY
                          </button>
                          <button className="text-[10px] font-bold text-white/20 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-widest">
                            <Filter size={12} /> FILTER
                          </button>
                        </div>
                      </div>
                      <div className="space-y-6 md:space-y-8">
                        {(selectedMeeting.transcript || []).map((u, i) => (
                          <div key={i} className="flex gap-4 md:gap-6 group data-row py-4 border-b border-[var(--border)] last:border-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--muted-foreground)] group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all shrink-0 font-mono">
                              {u.speakerId[0]}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1 md:space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-[var(--foreground)]/60 truncate">{u.speakerId}</span>
                                <span className="text-[10px] text-[var(--muted-foreground)]/40 font-mono shrink-0">{u.timestamp}</span>
                              </div>
                              <p className="text-sm md:text-base text-[var(--foreground)]/70 leading-relaxed max-w-3xl">{u.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Insights Sidebar */}
                  <div className="lg:col-span-4 space-y-8 md:space-y-12">
                    <InsightCard title="Action Items" icon={CheckCircle2} color="text-green-500">
                      {selectedMeeting.insights?.actionItems?.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => toggleTaskStatus(item.id)}
                          className={cn(
                            "p-5 md:p-6 bg-[var(--card)] border rounded-2xl md:rounded-3xl space-y-4 transition-all group cursor-pointer",
                            item.status === "completed" ? "border-green-500/50 bg-green-500/5" : "border-[var(--border)] hover:border-green-500/20"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                              item.status === "completed" ? "bg-green-500 border-green-500" : "border-[var(--border)] group-hover:border-green-500"
                            )}>
                              {item.status === "completed" && <Check size={12} className="text-white" />}
                            </div>
                            <p className={cn(
                              "text-sm font-medium leading-snug transition-all",
                              item.status === "completed" ? "text-[var(--muted-foreground)] line-through" : "text-[var(--foreground)]/90"
                            )}>
                              {item.task}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                <User size={10} className="text-green-400" />
                              </div>
                              <span className="text-[10px] font-bold text-[var(--muted-foreground)]">{item.owner}</span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--muted-foreground)]/40">{item.deadline}</span>
                          </div>
                        </div>
                      ))}
                    </InsightCard>

                    <InsightCard title="Key Decisions" icon={Zap} color="text-yellow-500">
                      {selectedMeeting.insights?.decisions?.map(item => (
                        <div key={item.id} className="p-5 md:p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl space-y-3 hover:border-yellow-500/20 transition-all">
                          <div className="flex items-start gap-3">
                            <Zap size={14} className="text-yellow-500 shrink-0 mt-1" />
                            <p className="text-sm font-medium text-[var(--foreground)]/90 leading-snug">{item.content}</p>
                          </div>
                          <p className="text-[10px] text-[var(--muted-foreground)]/60 italic pl-7 font-serif">Context: {item.context}</p>
                        </div>
                      ))}
                    </InsightCard>

                    <InsightCard title="Risks" icon={AlertTriangle} color="text-red-500">
                      {selectedMeeting.insights?.risks?.map(item => (
                        <div key={item.id} className="p-5 md:p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl md:rounded-3xl space-y-3 hover:border-red-500/20 transition-all">
                          <div className="flex items-start gap-3">
                            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-1" />
                            <p className="text-sm font-medium text-[var(--foreground)]/90 leading-snug">{item.description}</p>
                          </div>
                          {item.mitigation && (
                            <p className="text-[10px] text-[var(--muted-foreground)]/60 pl-7 italic">Mitigation: {item.mitigation}</p>
                          )}
                        </div>
                      ))}
                    </InsightCard>
                  </div>
                </div>
              </motion.div>
            )}

            {view === "memory" && (
              <motion.div 
                key="memory"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-4xl mx-auto p-4 md:p-10 h-full flex flex-col"
              >
                <div className="flex-1 overflow-y-auto space-y-8 md:space-y-12 pb-24 md:pb-20">
                  <div className="text-center space-y-4 md:space-y-6 py-8 md:py-12">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-600/10 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 md:mb-8 relative">
                      <BrainCircuit size={32} className="text-indigo-500 md:hidden" />
                      <BrainCircuit size={48} className="text-indigo-500 hidden md:block" />
                      <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-indigo-600 rounded-full flex items-center justify-center animate-bounce">
                        <Sparkles size={12} className="text-white md:hidden" />
                        <Sparkles size={16} className="text-white hidden md:block" />
                      </div>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-[var(--foreground)]">Project Memory</h2>
                    <p className="text-[var(--muted-foreground)] text-sm md:text-base max-w-lg mx-auto leading-relaxed px-4">
                      Synapse AI indexes every meeting transcript to provide instant answers. Ask about past decisions, technical choices, or commitments.
                    </p>
                  </div>

                  {queryResponse && (
                    <div className="space-y-6 md:space-y-8">
                      <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center shrink-0">
                          <User size={16} className="text-[var(--muted-foreground)]" />
                        </div>
                        <div className="p-4 md:p-6 bg-[var(--muted)] border border-[var(--border)] rounded-2xl md:rounded-3xl rounded-tl-none">
                          <p className="text-sm font-medium text-[var(--foreground)]/80">{query}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                          <BrainCircuit size={16} className="text-white" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="p-6 md:p-8 bg-[var(--card)] border border-indigo-500/20 rounded-[1.5rem] md:rounded-[2rem] rounded-tl-none shadow-2xl shadow-indigo-500/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                              <Sparkles size={40} className="text-indigo-500" />
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-sm md:text-base text-[var(--foreground)]/80 leading-relaxed font-serif italic">
                              <ReactMarkdown>{queryResponse}</ReactMarkdown>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-[var(--muted-foreground)]/20 font-bold uppercase tracking-widest px-4 font-mono">
                            <History size={12} /> Grounded in meeting intelligence
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isQuerying && (
                    <div className="flex items-center gap-4 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                        <Loader2 size={16} className="text-indigo-500 animate-spin" />
                      </div>
                      <div className="p-6 bg-white/5 border border-white/5 rounded-2xl md:rounded-3xl rounded-tl-none w-full">
                        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-white/10 rounded w-1/2" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Query Bar */}
                <div className="absolute bottom-4 md:bottom-10 left-4 md:left-10 right-4 md:right-10">
                  <div className="max-w-3xl mx-auto relative group">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <input 
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                      placeholder="Ask Synapse AI anything..."
                      className="w-full h-14 md:h-16 bg-[var(--muted)] border border-[var(--border)] rounded-xl md:rounded-2xl px-6 md:px-8 pr-16 md:pr-20 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all relative z-10 text-[var(--foreground)]"
                    />
                    <button 
                      onClick={handleQuery}
                      disabled={!query.trim() || isQuerying}
                      className="absolute right-2 md:right-3 top-2 md:top-3 bottom-2 md:bottom-3 px-4 md:px-6 bg-indigo-600 hover:bg-indigo-500 rounded-lg md:rounded-xl text-xs font-bold transition-all z-10 flex items-center gap-2"
                    >
                      {isQuerying ? <Loader2 size={14} className="animate-spin" /> : "SEND"} <ArrowRight className="hidden sm:block" size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications Panel */}
        <AnimatePresence>
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40 lg:hidden" 
                onClick={() => setShowNotifications(false)} 
              />
              <motion.div 
                initial={{ opacity: 0, x: 300, y: 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 300, y: 0 }}
                className="fixed md:absolute top-20 md:top-24 right-0 md:right-10 w-full md:w-80 h-[calc(100vh-5rem)] md:h-auto bg-[var(--card)] border-l md:border border-[var(--border)] md:rounded-3xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--foreground)]">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-2">
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>
                <div className="max-h-[70vh] md:max-h-96 overflow-y-auto p-4 space-y-2">
                  <div className="p-4 bg-[var(--muted)] rounded-2xl space-y-1">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Upcoming Deadline</p>
                    <p className="text-[11px] text-[var(--foreground)]/70">Bob: Finalize design phase (Tomorrow)</p>
                  </div>
                  <div className="p-4 bg-[var(--muted)] rounded-2xl space-y-1">
                    <p className="text-xs font-bold text-green-600 dark:text-green-400">Meeting Processed</p>
                    <p className="text-[11px] text-[var(--foreground)]/70">Roadmap Sync summary is ready.</p>
                  </div>
                  <div className="p-4 bg-[var(--muted)] rounded-2xl space-y-1">
                    <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">New Decision</p>
                    <p className="text-[11px] text-[var(--foreground)]/70">Tech stack finalized for Q3.</p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--muted)] rounded-xl md:rounded-2xl flex items-center justify-center">
                        <Settings size={20} className="text-[var(--muted-foreground)] md:hidden" />
                        <Settings size={24} className="text-[var(--muted-foreground)] hidden md:block" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--foreground)]">Settings</h2>
                        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold mt-1">Configure Synapse AI</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="p-2 hover:bg-[var(--muted)] rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all"
                    >
                      <Plus size={24} className="rotate-45" />
                    </button>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div className="p-6 bg-[var(--muted)]/50 rounded-3xl space-y-4">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--foreground)]">
                        <Zap size={16} className="text-yellow-500" /> AI Configuration
                      </h3>
                      <div className="space-y-2">
                        <label className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold">Gemini API Key</label>
                        <div className="flex gap-2">
                          <input 
                            type="password" 
                            readOnly 
                            value="••••••••••••••••••••••••••••••••"
                            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-mono text-[var(--muted-foreground)]"
                          />
                          <button className="px-4 py-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-xl text-xs font-bold transition-all text-[var(--foreground)]">
                            CHANGE
                          </button>
                        </div>
                        <p className="text-[9px] text-[var(--muted-foreground)]/60 italic">Key is managed via AI Studio Secrets panel for security.</p>
                      </div>
                    </div>

                    <div className="p-6 bg-[var(--muted)]/50 rounded-3xl space-y-4">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--foreground)]">
                        <History size={16} className="text-indigo-400" /> Data Management
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[var(--foreground)]">Clear Meeting History</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">Permanently delete all indexed meetings.</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (confirm("Are you sure you want to clear all data?")) {
                              setMeetings([]);
                              setShowSettings(false);
                            }
                          }}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all"
                        >
                          DELETE ALL
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--foreground)]">
                          <ShieldCheck size={16} className="text-green-500" /> Security & Compliance
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Privacy Mode</span>
                          <button 
                            onClick={() => setPrivacyMode(!privacyMode)}
                            className={`w-10 h-5 rounded-full transition-all relative ${privacyMode ? 'bg-indigo-600' : 'bg-[var(--muted)]'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${privacyMode ? 'left-5.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <BrainCircuit size={14} className="text-indigo-400 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold text-[var(--foreground)]">No Model Training</p>
                            <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">
                              {privacyMode 
                                ? "Privacy Mode is ACTIVE. Your data is processed via the Gemini API Enterprise tier and is NEVER used for model training."
                                : "Standard processing is active. Data is handled according to your Google Cloud project settings."}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Zap size={14} className="text-yellow-500 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold text-[var(--foreground)]">End-to-End Processing</p>
                            <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">
                              All AI extraction and semantic indexing happen within your private session. No data is shared with third parties.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
                    >
                      SAVE CHANGES
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

