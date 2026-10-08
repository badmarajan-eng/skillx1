import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  BarChart3, 
  Target,
  Sparkles,
  ArrowRight,
  RefreshCcw,
  ShieldAlert,
  SearchCode
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function ResumeAnalyzer({ user }: { user: any }) {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedWords, setDetectedWords] = useState<string[]>([]);
  const [highlightedResume, setHighlightedResume] = useState<React.ReactNode | null>(null);

  const RED_FLAG_WORDS = [
    'synergy', 'detail-oriented', 'team player', 'hard worker', 'dynamic',
    'self-motivated', 'go-getter', 'think outside the box', 'passionate',
    'results-driven', 'expert', 'world-class', 'innovative', 'motivated',
    'responsible for', 'assisted with', 'familiar with', 'knowledge of',
    'guru', 'ninja', 'rockstar', 'evangelist', 'visionary', 'strategic thinker',
    'bottom-line', 'value-add', 'best of breed', 'game-changer', 'paradigm shift',
    'leverage', 'utilize', 'proactive', 'punctual', 'reliable'
  ];

  useEffect(() => {
    const text = resumeText.toLowerCase();
    const found = RED_FLAG_WORDS.filter(word => text.includes(word.toLowerCase()));
    setDetectedWords(found);
  }, [resumeText]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.type === 'application/pdf') {
      try {
        const pdfjs = await import('pdfjs-dist');
        const pdfjsLib = (pdfjs as any).default || pdfjs;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        setResumeText(fullText);
      } catch (err) {
        console.error("PDF parsing failed:", err);
        setError("Failed to parse PDF. Please try pasting the text manually.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setResumeText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) {
      setError("Please provide your resume content.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `
        Analyze the following resume${jobDescription ? ' against the provided job description' : ''}.
        Provide a detailed ATS (Applicant Tracking System) score out of 100.
        Identify key strengths, areas for improvement, and missing keywords.
        Also, provide 3-5 actionable tips to improve the resume.
        
        ${jobDescription ? `
        Keyword Extraction Task:
        1. Extract specific keywords related to skills, tools, and technologies mentioned in the Job Description.
        2. Identify which of these keywords are present in the Resume.
        3. Calculate a keyword density/relevance score (0-100) based on how well the resume matches the core requirements.
        ` : ''}

        Special Focus:
        - Word Filter Analysis: Check for overused buzzwords, clichés, or "red flag" phrases.
        - Professionalism: Ensure the language is impactful and action-oriented.
        - Illegal/Unprofessional Content: Flag any content that might be considered inappropriate or unprofessional.

        Resume:
        ${resumeText}

        ${jobDescription ? `Job Description:\n${jobDescription}` : ''}
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
              summary: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywordsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywordScore: { type: Type.NUMBER }
            },
            required: ["score", "summary", "strengths", "improvements", "missingKeywords", "actionItems"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setResult(data);

      if (data.keywordsFound && data.keywordsFound.length > 0) {
        highlightKeywords(resumeText, data.keywordsFound);
      }

      // Save to Firestore
      if (user) {
        await addDoc(collection(db, 'resume_analyses'), {
          userId: user.uid,
          score: data.score,
          summary: data.summary,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Resume analysis failed:", err);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.CREATE, 'resume_analyses');
      }
      setError("Failed to analyze resume. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const highlightKeywords = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0) {
      setHighlightedResume(text);
      return;
    }

    // Sort keywords by length descending to avoid partial matches inside longer ones
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    
    const parts = text.split(pattern);
    const highlighted = parts.map((part, i) => {
      if (pattern.test(part)) {
        return <span key={i} className="bg-primary-100 text-primary-700 px-1 rounded font-bold">{part}</span>;
      }
      return part;
    });

    setHighlightedResume(highlighted);
  };

  const reset = () => {
    setResult(null);
    setResumeText('');
    setJobDescription('');
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-600 text-xs font-bold uppercase tracking-widest border border-primary-100">
          <Sparkles size={14} />
          AI-Powered Analysis
        </div>
        <h1 className="text-4xl font-bold text-slate-900 font-display tracking-tight">Resume Analyzer</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Optimize your resume for Applicant Tracking Systems (ATS) and get personalized feedback to land your dream job.
        </p>
      </div>

      {!result ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-2 gap-8"
        >
          <div className="space-y-6">
            <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Your Resume</h3>
              </div>
              <textarea 
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here..."
                className="w-full h-64 p-6 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm resize-none"
              />
              
              {detectedWords.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
                    <ShieldAlert size={14} />
                    Buzzwords/Clichés Detected
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detectedWords.map(word => (
                      <span key={word} className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-600 text-[10px] font-bold">
                        {word}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-600/80 italic">Consider replacing these with more specific achievements or action verbs.</p>
                </div>
              )}

              <div className="relative">
                <input 
                  type="file" 
                  accept=".txt,.md,.pdf" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 group hover:border-primary-400 hover:bg-primary-50/30 transition-all">
                  <div className="text-center">
                    <Upload className="mx-auto text-slate-400 group-hover:text-primary-500 mb-2" size={24} />
                    <p className="text-xs font-bold text-slate-500 group-hover:text-primary-600 uppercase tracking-widest">Upload PDF or Text File</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Target size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Job Description (Optional)</h3>
              </div>
              <textarea 
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description to tailor your analysis..."
                className="w-full h-64 p-6 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm resize-none"
              />
              
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-4 rounded-2xl gradient-bg text-white font-bold shadow-xl shadow-primary-200 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCcw className="animate-spin" size={20} />
                    Analyzing Resume...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Start AI Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm text-center">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">ATS Score</h3>
              <div className="relative w-40 h-40 mx-auto mb-6">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  <circle 
                    className="text-primary-600" 
                    strokeWidth="8" 
                    strokeDasharray={251.2} 
                    strokeDashoffset={251.2 - (251.2 * result.score) / 100} 
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-slate-900">{result.score}</span>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-600">{result.summary}</p>
            </div>

            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
              {result.keywordScore !== undefined && (
                <div className="sm:col-span-2 p-8 rounded-[32px] bg-primary-50/50 border border-primary-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg">
                      <SearchCode size={24} />
                    </div>
                    <div>
                      <h4 className="text-primary-900 font-bold">Keyword Match Score</h4>
                      <p className="text-sm text-primary-600">Based on job description relevance</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary-700">{result.keywordScore}%</div>
                </div>
              )}

              <div className="p-8 rounded-[32px] bg-emerald-50/50 border border-emerald-100">
                <h4 className="text-emerald-700 font-bold flex items-center gap-2 mb-4">
                  <CheckCircle2 size={18} /> Key Strengths
                </h4>
                <ul className="space-y-3">
                  {result.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-emerald-600 flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-8 rounded-[32px] bg-amber-50/50 border border-amber-100">
                <h4 className="text-amber-700 font-bold flex items-center gap-2 mb-4">
                  <BarChart3 size={18} /> Missing Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((k: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-white border border-amber-200 text-amber-600 text-xs font-bold">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              {detectedWords.length > 0 && (
                <div className="sm:col-span-2 p-8 rounded-[32px] bg-red-50/50 border border-red-100">
                  <h4 className="text-red-700 font-bold flex items-center gap-2 mb-4">
                    <ShieldAlert size={18} /> Buzzword Detection
                  </h4>
                  <p className="text-sm text-red-600 mb-4">We found several overused buzzwords that might weaken your resume's impact:</p>
                  <div className="flex flex-wrap gap-2">
                    {detectedWords.map((word, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-white border border-red-200 text-red-600 text-xs font-bold">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-10 rounded-[40px] bg-white border border-slate-100 shadow-sm overflow-hidden">
            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <FileText className="text-primary-600" size={24} />
              Highlighted Resume
            </h3>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono">
              {highlightedResume || resumeText}
            </div>
          </div>

          <div className="p-10 rounded-[40px] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <Zap className="text-primary-400" size={24} />
                Actionable Improvements
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Areas to Refine</p>
                  <ul className="space-y-4">
                    {result.improvements.map((imp: string, i: number) => (
                      <li key={i} className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-bold">{i + 1}</div>
                        <p className="text-sm text-slate-300">{imp}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Next Steps</p>
                  <div className="space-y-3">
                    {result.actionItems.map((item: string, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                        <span className="text-sm text-slate-200">{item}</span>
                        <ArrowRight size={16} className="text-primary-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                onClick={reset}
                className="mt-12 px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold hover:bg-primary-50 transition-all flex items-center gap-2"
              >
                <RefreshCcw size={18} /> Analyze Another Resume
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
