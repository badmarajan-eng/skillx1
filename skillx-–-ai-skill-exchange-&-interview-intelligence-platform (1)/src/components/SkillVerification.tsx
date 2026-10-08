import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  BrainCircuit, 
  Users, 
  Star,
  ChevronRight,
  Zap,
  AlertCircle,
  Timer,
  MessageSquare,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function SkillVerification({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'reviews'>('overview');
  const [isAssessing, setIsAssessing] = useState(false);
  const [currentSkill, setCurrentSkill] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [verifiedSkills, setVerifiedSkills] = useState<any[]>([]);
  const [peerReviews, setPeerReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchVerificationData = async () => {
      if (!user) return;
      try {
        // Fetch verified skills
        const verifiedQuery = query(
          collection(db, 'skill_verifications'),
          where('userId', '==', user.uid),
          where('status', '==', 'verified')
        );
        const verifiedDocs = await getDocs(verifiedQuery);
        setVerifiedSkills(verifiedDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch peer reviews (mocking for now, but could be from a 'reviews' collection)
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('targetUserId', '==', user.uid)
        );
        const reviewDocs = await getDocs(reviewsQuery);
        setPeerReviews(reviewDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching verification data:", err);
      }
    };

    fetchVerificationData();
  }, [user]);

  const startAssessment = async (skill: string) => {
    setCurrentSkill(skill);
    setIsAssessing(true);
    setIsLoadingQuestions(true);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setAssessmentResult(null);

    try {
      const prompt = `Generate 5 multiple-choice questions to assess proficiency in "${skill}". 
      The questions should range from intermediate to advanced level.
      Return the response in JSON format with the following structure:
      {
        "questions": [
          {
            "question": "string",
            "options": ["string", "string", "string", "string"],
            "correctAnswer": number (0-3),
            "explanation": "string"
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.NUMBER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "options", "correctAnswer", "explanation"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const data = JSON.parse(response.text);
      setQuestions(data.questions);
    } catch (err) {
      console.error("Failed to generate questions:", err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateResult(newAnswers);
    }
  };

  const calculateResult = async (finalAnswers: number[]) => {
    let score = 0;
    const details = questions.map((q, idx) => {
      const isCorrect = q.correctAnswer === finalAnswers[idx];
      if (isCorrect) score++;
      return {
        question: q.question,
        isCorrect,
        correctAnswer: q.options[q.correctAnswer],
        userAnswer: q.options[finalAnswers[idx]],
        explanation: q.explanation
      };
    });

    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 80;

    const result = {
      score: percentage,
      passed,
      details,
      timestamp: new Date().toISOString()
    };

    setAssessmentResult(result);

    if (passed && currentSkill) {
      try {
        // Save verification to Firestore
        await addDoc(collection(db, 'skill_verifications'), {
          userId: user.uid,
          skill: currentSkill,
          score: percentage,
          status: 'verified',
          type: 'ai_assessment',
          createdAt: serverTimestamp()
        });

        // Update user skills to mark as verified if needed
        const userRef = doc(db, 'users', user.uid);
        const currentVerifiedSkills = user.verifiedSkills || [];
        if (!currentVerifiedSkills.includes(currentSkill)) {
          await updateDoc(userRef, {
            verifiedSkills: [...currentVerifiedSkills, currentSkill]
          });
        }
      } catch (err: any) {
        console.error("Error saving verification:", err);
        if (err.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.CREATE, 'skill_verifications');
        }
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Skill Verification</h1>
          <p className="text-slate-500 mt-1">Enhance your credibility with AI-powered assessments and peer endorsements.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Credibility Score</p>
            <p className="text-xl font-bold text-slate-900 leading-none">
              {verifiedSkills.length * 10 + (user?.rating || 5) * 10} <span className="text-xs font-medium text-slate-500">Points</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: Trophy },
          { id: 'assessments', label: 'AI Assessments', icon: BrainCircuit },
          { id: 'reviews', label: 'Peer Reviews', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id 
                ? "bg-white text-primary-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-8">
              {/* Verified Skills List */}
              <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Award className="text-primary-600" size={24} />
                  Verified Skills
                </h3>
                {verifiedSkills.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {verifiedSkills.map((sv) => (
                      <div key={sv.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-primary-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary-600 shadow-sm">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{sv.skill}</p>
                            <p className="text-xs text-slate-500">Score: {sv.score}%</p>
                          </div>
                        </div>
                        <div className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                          Verified
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-500 mb-4">You haven't verified any skills yet.</p>
                    <button 
                      onClick={() => setActiveTab('assessments')}
                      className="px-6 py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all"
                    >
                      Start Your First Assessment
                    </button>
                  </div>
                )}
              </div>

              {/* Credibility Roadmap */}
              <div className="p-8 rounded-[32px] bg-linear-to-br from-slate-900 to-slate-800 text-white shadow-xl">
                <h3 className="text-xl font-bold mb-6">Credibility Roadmap</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Complete Profile', status: 'completed', points: 20 },
                    { label: 'First Skill Verification', status: verifiedSkills.length > 0 ? 'completed' : 'pending', points: 50 },
                    { label: 'Receive 5 Peer Endorsements', status: peerReviews.length >= 5 ? 'completed' : 'pending', points: 100 },
                    { label: 'Conduct 3 Mentorship Sessions', status: 'pending', points: 150 },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        step.status === 'completed' ? "bg-emerald-500" : "bg-white/10 border border-white/20"
                      )}>
                        {step.status === 'completed' ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className={cn("font-bold text-sm", step.status === 'completed' ? "text-white" : "text-slate-400")}>{step.label}</p>
                      </div>
                      <div className="text-xs font-bold text-primary-400">+{step.points} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Stats Card */}
              <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Verification Stats</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <BrainCircuit size={20} />
                      </div>
                      <span className="text-sm font-medium text-slate-600">AI Quizzes</span>
                    </div>
                    <span className="font-bold text-slate-900">{verifiedSkills.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <span className="text-sm font-medium text-slate-600">Peer Reviews</span>
                    </div>
                    <span className="font-bold text-slate-900">{peerReviews.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <Star size={20} />
                      </div>
                      <span className="text-sm font-medium text-slate-600">Avg Rating</span>
                    </div>
                    <span className="font-bold text-slate-900">{user?.rating || '5.0'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action */}
              <div className="p-8 rounded-[32px] bg-primary-50 border border-primary-100 text-center">
                <Zap className="text-primary-600 mx-auto mb-4" size={32} />
                <h4 className="font-bold text-primary-900 mb-2">Boost Your Profile</h4>
                <p className="text-sm text-primary-700 mb-6">Verified skills appear on your mentor profile and increase booking rates by 40%.</p>
                <button 
                  onClick={() => setActiveTab('assessments')}
                  className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                >
                  Verify New Skill
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'assessments' && (
          <motion.div
            key="assessments"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto"
          >
            {!isAssessing ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {(user?.skills?.length > 0 ? user.skills : ['React', 'Node.js', 'UI/UX Design', 'Python']).map((skill: string) => {
                  const isVerified = verifiedSkills.some(sv => sv.skill === skill);
                  return (
                    <div key={skill} className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm group hover:border-primary-200 transition-all">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                          <BrainCircuit size={28} />
                        </div>
                        {isVerified && (
                          <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest">
                            Verified
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{skill}</h3>
                      <p className="text-sm text-slate-500 mb-8">Take a 5-minute AI assessment to verify your expertise in {skill}.</p>
                      <button 
                        onClick={() => startAssessment(skill)}
                        disabled={isVerified}
                        className={cn(
                          "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                          isVerified 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                            : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg"
                        )}
                      >
                        {isVerified ? 'Already Verified' : 'Start Assessment'}
                        {!isVerified && <ChevronRight size={18} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
                {isLoadingQuestions ? (
                  <div className="p-20 text-center space-y-6">
                    <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Generating Assessment...</h3>
                      <p className="text-slate-500">Our AI is crafting custom questions for {currentSkill}.</p>
                    </div>
                  </div>
                ) : assessmentResult ? (
                  <div className="p-10">
                    <div className="text-center mb-10">
                      <div className={cn(
                        "w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg",
                        assessmentResult.passed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      )}>
                        {assessmentResult.passed ? <Trophy size={40} /> : <AlertCircle size={40} />}
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        {assessmentResult.passed ? 'Assessment Passed!' : 'Assessment Not Passed'}
                      </h2>
                      <p className="text-slate-500">You scored {assessmentResult.score}% in {currentSkill} verification.</p>
                    </div>

                    <div className="space-y-6 mb-10">
                      {assessmentResult.details.map((detail: any, i: number) => (
                        <div key={i} className={cn(
                          "p-6 rounded-3xl border",
                          detail.isCorrect ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
                        )}>
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                              detail.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            )}>
                              {detail.isCorrect ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            </div>
                            <div className="space-y-3">
                              <p className="font-bold text-slate-900">{detail.question}</p>
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Your Answer</p>
                                  <p className={cn("text-sm font-medium", detail.isCorrect ? "text-emerald-600" : "text-rose-600")}>{detail.userAnswer}</p>
                                </div>
                                {!detail.isCorrect && (
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Correct Answer</p>
                                    <p className="text-sm font-medium text-emerald-600">{detail.correctAnswer}</p>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 italic">"{detail.explanation}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => setIsAssessing(false)}
                        className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
                      >
                        Back to Skills
                      </button>
                      {assessmentResult.passed && (
                        <button 
                          onClick={() => setActiveTab('overview')}
                          className="flex-1 py-4 rounded-2xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                        >
                          View Verification
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-10">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{currentSkill} Assessment</h2>
                        <p className="text-sm text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-xl text-primary-600 font-bold text-sm">
                        <Timer size={18} />
                        <span>05:00</span>
                      </div>
                    </div>

                    <div className="mb-10">
                      <div className="w-full h-2 bg-slate-100 rounded-full mb-8">
                        <motion.div 
                          className="h-full bg-primary-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-8">{questions[currentQuestionIndex]?.question}</h3>
                      <div className="grid gap-4">
                        {questions[currentQuestionIndex]?.options.map((option, i) => (
                          <button
                            key={i}
                            onClick={() => handleAnswer(i)}
                            className="w-full p-6 rounded-3xl border border-slate-100 bg-slate-50 text-left hover:border-primary-500 hover:bg-white hover:shadow-lg transition-all group flex items-center justify-between"
                          >
                            <span className="font-medium text-slate-700 group-hover:text-slate-900">{option}</span>
                            <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-primary-500 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsAssessing(false)}
                      className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel Assessment
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {peerReviews.length > 0 ? (
                  peerReviews.map((review) => (
                    <div key={review.id} className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <img 
                            src={review.authorPhoto || `https://picsum.photos/seed/${review.authorId}/100/100`} 
                            className="w-12 h-12 rounded-2xl object-cover" 
                            alt={review.authorName}
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900">{review.authorName}</h4>
                            <p className="text-xs text-slate-500">{review.type || 'Session Review'} • {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Recent'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star size={16} fill="currentColor" />
                          <span>{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-slate-600 italic">"{review.comment}"</p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {review.skills?.map((skill: string) => (
                          <span key={skill} className="px-3 py-1 rounded-lg bg-primary-50 text-primary-600 text-[10px] font-bold uppercase tracking-wider">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-6">
                      <MessageSquare size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Reviews Yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Conduct sessions as a mentor or learner to receive peer endorsements and reviews.</p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Review Summary</h3>
                  <div className="space-y-4">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = peerReviews.filter(r => Math.round(r.rating) === star).length;
                      const percentage = peerReviews.length > 0 ? (count / peerReviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 w-4">{star}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-amber-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-400 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-8 rounded-[32px] bg-indigo-600 text-white shadow-xl shadow-indigo-100">
                  <h4 className="font-bold mb-2">Request Endorsement</h4>
                  <p className="text-sm text-indigo-100 mb-6">Ask your peers or past mentors to endorse your skills on SkillX.</p>
                  <button className="w-full py-3 rounded-xl bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-all">
                    Copy Profile Link
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
