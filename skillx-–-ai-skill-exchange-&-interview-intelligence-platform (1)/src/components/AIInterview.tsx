import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Mic2, 
  MicOff, 
  Video, 
  VideoOff, 
  Play, 
  Square, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  RefreshCcw,
  Clock,
  User,
  Zap,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  FileText,
  Eye,
  Shield,
  Lock,
  Mic
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '../lib/utils';
import { db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function AIInterview({ user }: { user: any }) {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'interviewing' | 'completed'>('idle');
  const [role, setRole] = useState('');
  const [experience, setExperience] = useState('Junior');
  const [careerGoals, setCareerGoals] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [proctoringViolations, setProctoringViolations] = useState<{ type: string, timestamp: number }[]>([]);
  const [showProctorWarning, setShowProctorWarning] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const proctorIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'interviewing') {
      startCamera();
      startProctoring();
    } else {
      stopCamera();
      stopProctoring();
    }
    return () => stopProctoring();
  }, [status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'interviewing') return;
      
      // Don't trigger if user is typing in the textarea
      if (document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          handleNext();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleRecording();
      } else if (e.key === 'Enter') {
        if (currentAnswer.trim()) {
          handleNext();
        }
      } else if (e.key === 'Escape') {
        finishInterview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, isRecording, currentAnswer, currentQuestionIndex]);

  const startProctoring = () => {
    proctorIntervalRef.current = setInterval(runProctorCheck, 10000); // Check every 10 seconds
  };

  const stopProctoring = () => {
    if (proctorIntervalRef.current) {
      clearInterval(proctorIntervalRef.current);
    }
  };

  const runProctorCheck = async () => {
    if (!videoRef.current || !canvasRef.current || status !== 'interviewing') return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

    try {
      const prompt = `
        You are an advanced AI proctor for a high-stakes technical interview. Analyze this frame of the candidate for any "illegal activities" or cheating attempts.
        
        STRICT CHECKLIST:
        1. Eye Contact & Focus: Is the user looking at the camera/screen? Are they consistently looking away (e.g., at another monitor or notes)?
        2. Multiple People: Is there more than one person visible or audible?
        3. Device Usage: Is the user using a phone, tablet, or wearing unauthorized headphones?
        4. Reading/Scripting: Does it look like the user is reading from a script (monotone voice, eyes moving horizontally across the screen)?
        5. Environment: Is the environment quiet and professional?
        
        If everything is perfect, return "OK".
        If there is a violation, return a specific, firm warning message (max 10 words).
        Be very strict. If you see a phone or another person, flag it immediately.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
          }
        ]
      });

      const result = response.text?.trim() || "OK";
      if (result !== "OK") {
        const violation = { type: 'AI Proctor Warning', timestamp: Date.now(), detail: result };
        setProctoringViolations(prev => [...prev, violation]);
        setShowProctorWarning(result);
        
        // Use Speech Synthesis for audible warning
        const utterance = new SpeechSynthesisUtterance(result);
        window.speechSynthesis.speak(utterance);
        
        setTimeout(() => setShowProctorWarning(null), 5000);
      }
    } catch (err) {
      console.error("Proctoring check failed:", err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const [interviewMode, setInterviewMode] = useState<'voice' | 'text'>('voice');

  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setCurrentAnswer(prev => (prev + ' ' + finalTranscript).trim());
          setInterimTranscript('');
        } else {
          setInterimTranscript(interim);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === 'interviewing') {
        const message = "CRITICAL: Tab switching detected! This activity is logged as a violation.";
        const violation = { type: 'Illegal Activity: Tab Switch', timestamp: Date.now() };
        setProctoringViolations(prev => [...prev, violation]);
        setShowProctorWarning(message);
        
        // Audible warning
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.9;
        utterance.pitch = 0.8;
        window.speechSynthesis.speak(utterance);
        
        setTimeout(() => setShowProctorWarning(null), 5000);
      }
    };

    const handleBlur = () => {
      if (status === 'interviewing') {
        const message = "WARNING: Window focus lost! Please stay on the interview screen.";
        const violation = { type: 'Illegal Activity: Window Blur', timestamp: Date.now() };
        setProctoringViolations(prev => [...prev, violation]);
        setShowProctorWarning(message);
        
        // Audible warning
        const utterance = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(utterance);
        
        setTimeout(() => setShowProctorWarning(null), 4000);
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && status === 'interviewing') {
        const message = "WARNING: Full-screen mode exited! Please return to full-screen.";
        const violation = { type: 'Illegal Activity: Fullscreen Exit', timestamp: Date.now() };
        setProctoringViolations(prev => [...prev, violation]);
        setShowProctorWarning(message);
        
        const utterance = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(utterance);
        
        setTimeout(() => setShowProctorWarning(null), 4000);
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      if (status === 'interviewing') {
        const message = "CRITICAL: Copy/Paste detected! This activity is logged as a violation.";
        const violation = { type: 'Illegal Activity: Clipboard Usage', timestamp: Date.now() };
        setProctoringViolations(prev => [...prev, violation]);
        setShowProctorWarning(message);
        
        const utterance = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(utterance);
        
        setTimeout(() => setShowProctorWarning(null), 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopyPaste as any);
    document.addEventListener('paste', handleCopyPaste as any);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopyPaste as any);
      document.removeEventListener('paste', handleCopyPaste as any);
    };
  }, [status]);

  useEffect(() => {
    if (status === 'interviewing') {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const startInterview = async () => {
    if (!role.trim()) return;
    setStatus('preparing');
    
    // Try to enter full screen
    try {
      await containerRef.current?.requestFullscreen();
    } catch (err) {
      console.warn("Fullscreen request failed", err);
    }
    
    try {
      const prompt = `
        Generate 20 technical and behavioral interview questions for a ${experience} ${role} position.
        
        Context:
        - Career Goals: ${careerGoals || 'Not specified'}
        - Job Description: ${jobDescription || 'Not specified'}
        
        Return as a JSON array of strings. 
        Ensure questions cover a wide range of topics relevant to the role, specifically tailored to the provided job description and career goals if available.
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      
      const generatedQuestions = JSON.parse(response.text || '[]');
      setQuestions(generatedQuestions);
      setStatus('interviewing');
      setTimer(0);
      setProctoringViolations([]);
    } catch (err) {
      console.error("Failed to generate questions:", err);
      setStatus('idle');
    }
  };

  const handleNext = () => {
    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);
    setCurrentAnswer('');
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishInterview(newAnswers);
    }
  };

  const finishInterview = async (finalAnswers?: string[]) => {
    setStatus('completed');
    setIsAnalyzing(true);
    
    const interviewAnswers = finalAnswers || [...answers, currentAnswer];
    
    try {
      const interviewData = interviewAnswers.map((ans, i) => ({
        question: questions[i],
        answer: ans
      }));

      const prompt = `
        Analyze this mock interview for a ${role} position.
        The interview was intended to be 20 questions, but the user answered ${interviewAnswers.length} questions.
        Provide a score out of 100 based on the performance in these questions.
        Provide overall feedback, granular strengths, and actionable areas for improvement.
        
        Feedback Requirements:
        1. Strengths: For each strength, provide a specific point, evidence from the user's response, an actionable tip to leverage it further, and the specific question it relates to.
        2. Improvements: For each improvement, provide a specific point, the issue identified, a clear actionable tip for improvement, and the specific question it relates to.
        
        Skills Assessment:
        Based on the user's technical and behavioral answers, identify the key skills they demonstrated and their proficiency level in each (e.g., "React: Advanced", "Problem Solving: Intermediate").
        
        Communication Analysis Requirements:
        1. Verbal Communication: Analyze the user's responses for pacing (speed), tone (professionalism/confidence), and clarity of speech (based on the transcript quality and structure).
        2. Non-Verbal Communication: Analyze the visual performance based on the proctoring data provided.
        
        Context:
        - Experience Level: ${experience}
        - Career Goals: ${careerGoals || 'Not specified'}
        - Job Description: ${jobDescription || 'Not specified'}
        
        Proctoring Data:
        The user had ${proctoringViolations.length} violations during the interview.
        Violations: ${JSON.stringify(proctoringViolations)}
        
        Note: "AI Proctor Warning" violations are based on visual analysis (looking away, suspicious activity).
        "Tab Switch" and "Window Blur" are technical violations.
        
        Interview Data:
        ${JSON.stringify(interviewData)}
        
        Integrity Assessment:
        Based on the proctoring violations, provide an "integrityScore" out of 100. 
        - 100: No violations.
        - 80-99: Minor issues (looking away occasionally).
        - 50-79: Moderate issues (tab switching once, window blur).
        - <50: Critical issues (multiple tab switches, another person detected, phone usage).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              integrityScore: { type: Type.NUMBER },
              overallFeedback: { type: Type.STRING },
              strengths: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    point: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                    actionableTip: { type: Type.STRING },
                    relatedQuestion: { type: Type.STRING }
                  },
                  required: ["point", "evidence", "actionableTip"]
                } 
              },
              improvements: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    point: { type: Type.STRING },
                    issue: { type: Type.STRING },
                    actionableTip: { type: Type.STRING },
                    relatedQuestion: { type: Type.STRING }
                  },
                  required: ["point", "issue", "actionableTip"]
                } 
              },
              skillsAssessment: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING },
                    level: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["skill", "level", "description"]
                }
              },
              communication: {
                type: Type.OBJECT,
                properties: {
                  verbal: {
                    type: Type.OBJECT,
                    properties: {
                      pacing: { type: Type.STRING },
                      tone: { type: Type.STRING },
                      clarity: { type: Type.STRING }
                    },
                    required: ["pacing", "tone", "clarity"]
                  },
                  nonVerbal: {
                    type: Type.OBJECT,
                    properties: {
                      eyeContact: { type: Type.STRING },
                      bodyLanguage: { type: Type.STRING },
                      professionalism: { type: Type.STRING }
                    },
                    required: ["eyeContact", "bodyLanguage", "professionalism"]
                  }
                },
                required: ["verbal", "nonVerbal"]
              },
              detailedFeedback: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    feedback: { type: Type.STRING },
                    score: { type: Type.NUMBER }
                  }
                }
              }
            },
            required: ["score", "overallFeedback", "strengths", "improvements", "detailedFeedback"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(response.text);
      setFeedback(data);

      // Call backend for additional processing/logging
      try {
        await fetch('/api/interview/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: interviewData,
            role,
            experience,
            userId: user?.uid
          })
        });
      } catch (backendErr) {
        console.warn("Backend analysis call failed (non-critical):", backendErr);
      }

      // Save to Firestore
      if (user) {
        await addDoc(collection(db, 'interviews'), {
          userId: user.uid,
          role: role,
          experience: experience,
          date: serverTimestamp(),
          overallScore: data.score,
          feedback: data.overallFeedback,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Failed to analyze interview:", err);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.CREATE, 'interviews');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getChartData = () => {
    if (!feedback?.skillsAssessment) return [];
    return feedback.skillsAssessment.map((s: any) => ({
      subject: s.skill,
      A: s.level === 'Expert' ? 100 : s.level === 'Proficient' ? 80 : s.level === 'Intermediate' ? 60 : 40,
      B: 90, // Target level
      fullMark: 100,
    }));
  };

  const getCommunicationData = () => {
    return [
      { name: 'Pacing', value: 85, color: '#3b82f6' },
      { name: 'Tone', value: 90, color: '#8b5cf6' },
      { name: 'Clarity', value: 75, color: '#ec4899' },
      { name: 'Eye Contact', value: 80, color: '#10b981' },
    ];
  };

  return (
    <div ref={containerRef} className="max-w-7xl mx-auto space-y-8 pb-20 bg-inherit min-h-screen p-4 overflow-y-auto scrollbar-hide">
      {status === 'idle' && (
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-600 text-xs font-bold uppercase tracking-widest border border-primary-100">
                <BrainCircuit size={14} />
                Interview Command Center
              </div>
              <h1 className="text-5xl font-bold text-slate-900 font-display tracking-tight">Ready for your next <span className="text-primary-600">big break?</span></h1>
              <p className="text-slate-500 max-w-xl text-lg">
                Configure your mock interview session below. Our AI will generate tailored questions and proctor your session for maximum realism.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg. Score</p>
                  <p className="text-xl font-bold text-slate-900">84%</p>
                </div>
              </div>
              <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Practice</p>
                  <p className="text-xl font-bold text-slate-900">12h</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Main Config Card */}
            <div className="lg:col-span-8 p-10 rounded-[48px] bg-white border border-slate-100 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary-50 rounded-full -mr-48 -mt-48 opacity-50 blur-3xl" />
              
              <div className="relative z-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <User size={14} className="text-primary-600" />
                      Target Job Title
                    </label>
                    <input 
                      type="text" 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Product Manager"
                      className="w-full px-6 py-5 rounded-3xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-primary-500/10 focus:bg-white outline-none transition-all text-lg font-medium"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Zap size={14} className="text-amber-500" />
                      Seniority Level
                    </label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      {['Junior', 'Mid', 'Senior'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setExperience(level === 'Mid' ? 'Mid-Level' : level)}
                          className={cn(
                            "py-3 rounded-xl text-xs font-bold transition-all",
                            (experience === level || (level === 'Mid' && experience === 'Mid-Level'))
                              ? "bg-white text-primary-600 shadow-sm border border-slate-200" 
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Mic2 size={14} className="text-primary-600" />
                      Interview Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      {[
                        { id: 'voice', label: 'Voice Mode', icon: Mic2 },
                        { id: 'text', label: 'Text Mode', icon: FileText }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setInterviewMode(mode.id as any)}
                          className={cn(
                            "py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                            interviewMode === mode.id 
                              ? "bg-white text-primary-600 shadow-sm border border-slate-200" 
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          <mode.icon size={14} />
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <FileText size={14} className="text-indigo-600" />
                    Job Description or Key Skills
                  </label>
                  <textarea 
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job requirements to get highly relevant questions..."
                    className="w-full px-8 py-6 rounded-[32px] bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-primary-500/10 focus:bg-white outline-none transition-all h-48 resize-none text-base leading-relaxed"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Star size={14} className="text-primary-600" />
                    Quick Start Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Frontend Engineer', 'Product Manager', 'Data Scientist', 'UX Designer', 'Backend Dev'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold transition-all",
                          role === r 
                            ? "bg-primary-600 text-white shadow-md" 
                            : "bg-white text-slate-600 border border-slate-200 hover:border-primary-300 hover:text-primary-600"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-slate-500">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <img key={i} src={`https://picsum.photos/seed/${i+20}/40/40`} className="w-8 h-8 rounded-full border-2 border-white" alt="User" referrerPolicy="no-referrer" />
                      ))}
                    </div>
                    <p className="text-xs font-medium">Join 2,400+ candidates practicing today</p>
                  </div>
                  <button 
                    onClick={startInterview}
                    disabled={!role.trim()}
                    className="px-12 py-5 rounded-3xl bg-slate-900 text-white font-bold shadow-2xl shadow-slate-200 hover:bg-primary-600 hover:shadow-primary-100 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
                  >
                    <Play size={20} fill="currentColor" />
                    Launch Interview
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Stats/Info */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-8 rounded-[40px] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary-500/30 transition-colors" />
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary-400" />
                  Proctoring Protocol
                </h3>
                <div className="space-y-6">
                  {[
                    { icon: Eye, title: 'Eye Tracking', desc: 'AI monitors focus and attention' },
                    { icon: Lock, title: 'Environment Lock', desc: 'Tab switching & blur detection' },
                    { icon: Mic2, title: 'Voice Clarity', desc: 'Real-time pacing & tone analysis' }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <item.icon size={18} className="text-primary-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{item.title}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 rounded-[40px] bg-emerald-50 border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="font-bold text-emerald-900">AI Interview Tip</h4>
                </div>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  "Try to structure your answers using the <strong>STAR method</strong> (Situation, Task, Action, Result). Our AI specifically looks for this structure in behavioral responses."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

        {status === 'preparing' && (
          <motion.div 
            key="preparing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 space-y-6"
          >
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium animate-pulse">Generating your personalized interview questions...</p>
          </motion.div>
        )}

        {status === 'interviewing' && (
          <motion.div 
            key="interviewing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid lg:grid-cols-12 gap-8 relative h-[calc(100vh-120px)]"
          >
            <AnimatePresence>
              {showProctorWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border-2 border-white/20"
                >
                  <AlertCircle size={24} />
                  {showProctorWarning}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Left Column: Camera (Extra Large - 9 cols) */}
            <div className={cn(
              "flex flex-col gap-6 relative transition-all duration-500",
              interviewMode === 'voice' ? "lg:col-span-9" : "lg:col-span-6"
            )}>
              <div className={cn(
                "flex-1 rounded-[40px] bg-slate-900 relative overflow-hidden shadow-2xl border-4 border-white/20 backdrop-blur-xl group transition-all duration-500",
                interviewMode === 'voice' ? "min-h-[600px]" : "min-h-[400px]"
              )}>
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover mirror opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                
                {/* Floating Question Overlay */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={currentQuestionIndex}
                  className="absolute top-8 left-8 right-8 p-8 rounded-[32px] bg-white/10 backdrop-blur-3xl border border-white/20 shadow-2xl z-30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/30 text-primary-100 text-[10px] font-bold uppercase tracking-widest border border-white/10">
                      <Sparkles size={12} className="text-primary-300" />
                      Question {currentQuestionIndex + 1} of {questions.length || 20}
                    </div>
                    <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5">
                      <Clock size={12} />
                      {formatTime(timer)}
                    </div>
                  </div>
                  <h3 className={cn(
                    "font-bold text-white leading-tight font-display drop-shadow-2xl transition-all",
                    interviewMode === 'voice' ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"
                  )}>
                    {questions[currentQuestionIndex] || "Generating next question..."}
                  </h3>
                </motion.div>

                <div className="absolute bottom-8 left-8 flex flex-col gap-3 z-30">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-xl text-white text-[10px] font-bold uppercase tracking-widest border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Live Interview Session
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/30 backdrop-blur-xl text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                    <ShieldCheck size={14} />
                    AI Proctoring Active
                  </div>
                </div>

                {/* Live Transcript Overlay */}
                {interviewMode === 'voice' && isRecording && (currentAnswer || interimTranscript) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute bottom-8 right-8 left-48 p-6 rounded-3xl bg-black/80 backdrop-blur-2xl border border-white/10 text-white/90 text-sm font-medium z-30 max-w-xl ml-auto shadow-2xl"
                  >
                    <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-primary-400 uppercase tracking-widest">
                      <Mic size={12} className="animate-pulse" />
                      Live Analysis
                    </div>
                    <p className="line-clamp-3 italic leading-relaxed">
                      {currentAnswer} <span className="text-white/40">{interimTranscript}</span>
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right Column: Interaction (3 cols or 6 cols) */}
            <div className={cn(
              "flex flex-col gap-6 h-full transition-all duration-500",
              interviewMode === 'voice' ? "lg:col-span-3" : "lg:col-span-6"
            )}>
              {/* Proctoring Status & Logs */}
              <div className={cn(
                "p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm space-y-6",
                interviewMode === 'text' && "hidden lg:block"
              )}>
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} className="text-primary-600" />
                    Security Monitor
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase tracking-widest">Active</span>
                </div>
                
                <div className="space-y-3">
                  {[
                    { label: 'Eye Contact', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Tab Focus', icon: Lock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Environment', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", item.bg, item.color)}>
                          <item.icon size={12} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{item.label}</span>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Live Logs</h4>
                  <div className="max-h-[150px] overflow-y-auto space-y-2 scrollbar-hide">
                    {proctoringViolations.length === 0 ? (
                      <p className="text-[9px] text-slate-400 text-center py-4 italic">No violations detected.</p>
                    ) : (
                      proctoringViolations.map((v, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-2 rounded-lg bg-red-50 border border-red-100 flex gap-2"
                        >
                          <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold text-red-700">{v.type}</p>
                            <p className="text-[8px] text-red-400">{new Date(v.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Question Box */}
              <div className="p-8 rounded-[40px] bg-gradient-to-br from-primary-600 to-purple-700 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <label className="text-[10px] font-bold text-primary-200 uppercase tracking-widest mb-3 block flex items-center gap-2">
                  <Sparkles size={14} />
                  Question {currentQuestionIndex + 1} / {questions.length}
                </label>
                <h3 className="text-xl font-bold leading-tight relative z-10 font-display">
                  {questions[currentQuestionIndex]}
                </h3>
              </div>

              {/* Answer Box */}
              <div className="flex-1 p-8 rounded-[40px] bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Response</label>
                  {isRecording && (
                    <div className="flex gap-1 items-center">
                      {[1, 2, 3].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: [4, 12, 4] }}
                          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                          className="w-1 bg-red-500 rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <textarea 
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type or speak your answer..."
                  className="flex-1 w-full p-5 rounded-3xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-primary-500/10 focus:bg-white outline-none transition-all text-base resize-none mb-6 scrollbar-hide"
                />

                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Shortcuts</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-medium text-slate-500">
                        <span>Toggle Mic</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-sm">Space</kbd>
                      </div>
                      <div className="flex justify-between text-[9px] font-medium text-slate-500">
                        <span>Next Question</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-sm">Enter</kbd>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={toggleRecording}
                    className={cn(
                      "w-full py-4 rounded-2xl transition-all flex items-center justify-center gap-3 font-bold shadow-lg",
                      isRecording 
                        ? "bg-red-500 text-white shadow-red-200" 
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {isRecording ? <MicOff size={20} /> : <Mic2 size={20} />}
                    <span>{isRecording ? "Stop Recording" : "Use Voice Input"}</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => finishInterview()}
                      className="flex-1 py-4 rounded-2xl text-slate-400 font-bold hover:text-red-500 hover:bg-red-50 transition-all text-sm"
                    >
                      End
                    </button>
                    <button 
                      onClick={handleNext}
                      disabled={!currentAnswer.trim()}
                      className="flex-[2] py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-xl hover:scale-[1.02] transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>{currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Logs & Progress */}
              <div className="p-6 rounded-[40px] bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proctoring Logs</h4>
                  <div className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                    {formatTime(timer)}
                  </div>
                </div>
                <div className="max-h-[100px] overflow-y-auto space-y-2 scrollbar-hide">
                  {proctoringViolations.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2">System secure. No violations.</p>
                  ) : (
                    proctoringViolations.map((v, i) => (
                      <div key={i} className="p-2 rounded-lg bg-red-50 border border-red-100 flex gap-2">
                        <AlertCircle size={10} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold text-red-700">{v.type}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'completed' && (
          <motion.div 
            key="completed"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-7xl mx-auto pb-20 scroll-smooth"
          >
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-8">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-primary-100 rounded-full"></div>
                  <div className="absolute inset-0 w-24 h-24 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-bold text-slate-900">AI Analysis in Progress</p>
                  <p className="text-slate-500 font-medium animate-pulse">Evaluating your responses, communication, and integrity...</p>
                </div>
              </div>
            ) : feedback && (
              <div className="space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full -mr-32 -mt-32 opacity-20 blur-3xl" />
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold uppercase tracking-widest">
                        Analysis Complete
                      </div>
                      <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest">
                        AI Certified
                      </div>
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 font-display tracking-tight">Interview Performance Summary</h2>
                    <p className="text-slate-500 text-lg">Comprehensive evaluation for <span className="text-primary-600 font-bold">{role}</span></p>
                  </div>
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Session ID</p>
                      <p className="text-sm font-mono font-bold text-slate-900">#INT-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                    </div>
                    <div className="w-px h-12 bg-slate-100" />
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          const text = `Interview Feedback for ${role}\nScore: ${feedback.score}%\n\nStrengths:\n${feedback.strengths.map((s: any) => `- ${s.point}: ${s.tip}`).join('\n')}\n\nImprovements:\n${feedback.improvements.map((i: any) => `- ${i.point}: ${i.tip}`).join('\n')}`;
                          navigator.clipboard.writeText(text);
                          alert("Feedback copied to clipboard!");
                        }}
                        className="p-4 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                        title="Copy Feedback"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const interviewRef = collection(db, 'interviews');
                            await addDoc(interviewRef, {
                              userId: user.uid,
                              role,
                              score: feedback.score,
                              feedback: feedback,
                              timestamp: serverTimestamp()
                            });
                            alert("Interview result saved to your profile!");
                          } catch (err) {
                            handleFirestoreError(err, OperationType.WRITE, 'interviews');
                          }
                        }}
                        className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2"
                      >
                        <ShieldCheck size={18} /> Save Result
                      </button>
                      <button 
                        onClick={() => setStatus('idle')}
                        className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-primary-600 transition-all shadow-xl shadow-slate-200"
                      >
                        New Session
                      </button>
                    </div>
                  </div>
                </div>

                {/* Key Takeaways */}
                <div className="grid sm:grid-cols-3 gap-6">
                  {[
                    { label: 'Primary Strength', value: feedback.strengths[0]?.point || 'N/A', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Main Improvement', value: feedback.improvements[0]?.point || 'N/A', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Role Fit', value: feedback.score > 80 ? 'High Match' : 'Potential Match', icon: BrainCircuit, color: 'text-primary-600', bg: 'bg-primary-50' }
                  ].map((item, i) => (
                    <div key={i} className={cn("p-6 rounded-[32px] border border-transparent shadow-sm flex items-start gap-4", item.bg)}>
                      <div className={cn("p-3 rounded-2xl bg-white shadow-sm", item.color)}>
                        <item.icon size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid lg:grid-cols-12 gap-8">
                  {/* Left Column: Scores & Metrics (4 cols) */}
                  <div className="lg:col-span-4 space-y-8">
                    <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-50" />
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Performance Score</h3>
                      <div className="relative w-48 h-48 mx-auto mb-8">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle className="text-slate-50" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                          <motion.circle 
                            initial={{ strokeDashoffset: 264 }}
                            animate={{ strokeDashoffset: 264 - (264 * feedback.score) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="text-primary-600" 
                            strokeWidth="8" 
                            strokeDasharray={264} 
                            strokeLinecap="round" 
                            stroke="currentColor" 
                            fill="transparent" 
                            r="42" 
                            cx="50" 
                            cy="50" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-5xl font-bold text-slate-900 leading-none">{feedback.score}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PERCENT</span>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{feedback.overallFeedback}"</p>
                      </div>
                    </div>

                    <div className="p-8 rounded-[40px] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary-500/10 rounded-full -mb-20 -mr-20 blur-3xl" />
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck size={14} className="text-primary-400" />
                          Integrity Report
                        </h4>
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                          feedback.integrityScore >= 90 ? "bg-emerald-500/20 text-emerald-400" : 
                          feedback.integrityScore >= 70 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {feedback.integrityScore >= 90 ? "Secure" : feedback.integrityScore >= 70 ? "Caution" : "Flagged"}
                        </span>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="flex items-end justify-between">
                          <span className="text-4xl font-bold">{feedback.integrityScore}%</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reliability Index</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${feedback.integrityScore}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className={cn(
                              "h-full rounded-full",
                              feedback.integrityScore >= 90 ? "bg-emerald-500" : 
                              feedback.integrityScore >= 70 ? "bg-amber-500" : "bg-red-500"
                            )}
                          />
                        </div>
                        
                        <div className="space-y-3 pt-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Violation Summary</p>
                          <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                            {proctoringViolations.length === 0 ? (
                              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                <p className="text-[10px] text-emerald-400 font-medium">Perfect integrity maintained.</p>
                              </div>
                            ) : (
                              proctoringViolations.map((v, i) => (
                                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-200">{v.type}</p>
                                    <p className="text-[9px] text-slate-500">{new Date(v.timestamp).toLocaleTimeString()}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Total Flags</p>
                            <p className="text-lg font-bold">{proctoringViolations.length}</p>
                          </div>
                          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Session Time</p>
                            <p className="text-lg font-bold">{formatTime(timer)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Detailed Insights (8 cols) */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* Action Plan Section */}
                    <div className="p-8 rounded-[40px] bg-gradient-to-br from-primary-600 to-purple-700 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Sparkles size={120} />
                      </div>
                      <h4 className="text-xl font-bold flex items-center gap-3 mb-6">
                        <Sparkles size={24} className="text-primary-300" />
                        AI-Generated Action Plan
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4 relative z-10">
                        {feedback.actionPlan?.map((step: string, i: number) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm flex gap-3"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                              {i + 1}
                            </span>
                            <p className="text-xs font-medium leading-relaxed">{step}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    {/* Visual Analytics */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm relative group">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary-600" />
                            Skill Proficiency vs Target
                          </h4>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-primary-500" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">You</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-slate-200" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Target</span>
                            </div>
                          </div>
                        </div>
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getChartData()}>
                              <PolarGrid stroke="#f1f5f9" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} />
                              <Radar
                                name="User"
                                dataKey="A"
                                stroke="#3b82f6"
                                fill="#3b82f6"
                                fillOpacity={0.5}
                              />
                              <Radar
                                name="Target"
                                dataKey="B"
                                stroke="#e2e8f0"
                                fill="#e2e8f0"
                                fillOpacity={0.2}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-900 mb-8 flex items-center gap-2">
                          <BarChart3 size={18} className="text-purple-600" />
                          Communication Efficiency
                        </h4>
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getCommunicationData()} layout="vertical" margin={{ left: -20, right: 20 }}>
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} width={90} />
                              <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-xl border border-white/10">
                                        {payload[0].value}% Efficiency
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                                {getCommunicationData().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid gap-8">
                      <div className="p-10 rounded-[40px] bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <CheckCircle2 size={120} className="text-emerald-600" />
                        </div>
                        <h4 className="text-emerald-800 font-bold flex items-center gap-3 mb-8 text-2xl">
                          <CheckCircle2 size={28} className="text-emerald-600" /> 
                          Key Strengths
                        </h4>
                        <div className="grid gap-6 relative z-10">
                          {feedback.strengths.map((s: any, i: number) => (
                            <motion.div 
                              key={i} 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-emerald-200/50 shadow-sm space-y-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                  <h5 className="font-bold text-emerald-900 text-lg">{s.point}</h5>
                                </div>
                                {s.relatedQuestion && (
                                  <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                                    Linked to Q
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-3 pl-5">
                                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Evidence</p>
                                  <p className="text-sm text-slate-600 italic">"{s.evidence}"</p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4">
                                  <div className="flex-1">
                                    <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Actionable Tip</p>
                                    <p className="text-sm text-slate-700">{s.actionableTip}</p>
                                  </div>
                                  {s.relatedQuestion && (
                                    <div className="flex-1">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Context</p>
                                      <p className="text-xs text-slate-500 line-clamp-2">{s.relatedQuestion}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <div className="p-10 rounded-[40px] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Zap size={120} className="text-amber-600" />
                        </div>
                        <h4 className="text-amber-800 font-bold flex items-center gap-3 mb-8 text-2xl">
                          <Zap size={28} className="text-amber-600" /> 
                          Areas to Improve
                        </h4>
                        <div className="grid gap-6 relative z-10">
                          {feedback.improvements.map((imp: any, i: number) => (
                            <motion.div 
                              key={i} 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-amber-200/50 shadow-sm space-y-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                                  <h5 className="font-bold text-amber-900 text-lg">{imp.point}</h5>
                                </div>
                                {imp.relatedQuestion && (
                                  <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                                    Linked to Q
                                  </span>
                                )}
                              </div>

                              <div className="space-y-3 pl-5">
                                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50">
                                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Observation</p>
                                  <p className="text-sm text-slate-600 italic">"{imp.issue}"</p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4">
                                  <div className="flex-1">
                                    <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Actionable Tip</p>
                                    <p className="text-sm text-slate-700 font-bold">{imp.actionableTip}</p>
                                  </div>
                                  {imp.relatedQuestion && (
                                    <div className="flex-1">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Context</p>
                                      <p className="text-xs text-slate-500 line-clamp-2">{imp.relatedQuestion}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Communication Insights */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Mic2 size={80} className="text-blue-600" />
                        </div>
                        <h4 className="text-slate-900 font-bold flex items-center gap-2 mb-8 text-lg">
                          <Mic2 size={22} className="text-blue-600" /> 
                          Verbal Analysis
                        </h4>
                        <div className="space-y-4 relative z-10">
                          {[
                            { label: 'Pacing', value: feedback.communication.verbal.pacing, color: 'text-blue-600' },
                            { label: 'Tone & Confidence', value: feedback.communication.verbal.tone, color: 'text-indigo-600' },
                            { label: 'Clarity', value: feedback.communication.verbal.clarity, color: 'text-cyan-600' }
                          ].map((item, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                              <p className="text-sm text-slate-700 font-medium leading-relaxed">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Video size={80} className="text-purple-600" />
                        </div>
                        <h4 className="text-slate-900 font-bold flex items-center gap-2 mb-8 text-lg">
                          <Video size={22} className="text-purple-600" /> 
                          Non-Verbal Analysis
                        </h4>
                        <div className="space-y-4 relative z-10">
                          {[
                            { label: 'Eye Contact', value: feedback.communication.nonVerbal.eyeContact, color: 'text-purple-600' },
                            { label: 'Body Language', value: feedback.communication.nonVerbal.bodyLanguage, color: 'text-fuchsia-600' },
                            { label: 'Professionalism', value: feedback.communication.nonVerbal.professionalism, color: 'text-pink-600' }
                          ].map((item, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                              <p className="text-sm text-slate-700 font-medium leading-relaxed">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Skills Assessment */}
                    <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                          <ShieldCheck className="text-primary-600" size={24} /> 
                          Demonstrated Competencies
                        </h4>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {feedback.skillsAssessment?.length || 0} Skills Analyzed
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                        {feedback.skillsAssessment?.map((skill: any, i: number) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary-200 transition-colors group"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{skill.skill}</span>
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                                skill.level === 'Expert' ? "bg-primary-100 text-primary-700" : 
                                skill.level === 'Proficient' ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                              )}>
                                {skill.level}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{skill.description}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Analysis Section */}
                <div className="space-y-8 pt-10 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-slate-900 font-display">Question-by-Question Analysis</h3>
                    <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-widest">
                      {feedback.detailedFeedback.length} Responses Evaluated
                    </div>
                  </div>
                  <div className="grid gap-6">
                    {feedback.detailedFeedback.map((item: any, i: number) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Question {i + 1}</span>
                            <h4 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-primary-700 transition-colors">{item.question}</h4>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</p>
                              <p className="text-xl font-bold text-slate-900">{item.score}/100</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                              <TrendingUp size={24} />
                            </div>
                          </div>
                        </div>
                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                          <p className="text-sm text-slate-600 leading-relaxed italic">"{item.feedback}"</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-6 pt-12">
                  <div className="w-20 h-1 bg-slate-100 rounded-full" />
                  <button 
                    onClick={() => setStatus('idle')}
                    className="group px-12 py-5 rounded-[32px] bg-slate-900 text-white font-bold hover:bg-primary-600 transition-all active:scale-95 flex items-center gap-3 shadow-xl hover:shadow-primary-500/20"
                  >
                    <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" /> 
                    Start New Interview Session
                  </button>
                  <p className="text-slate-400 text-xs font-medium">Your progress is automatically saved to your profile.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
