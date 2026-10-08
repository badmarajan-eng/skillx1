import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Clock, 
  Award, 
  Settings, 
  Edit3, 
  Save, 
  X, 
  History, 
  TrendingUp, 
  Star,
  BookOpen,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { db, doc, updateDoc, collection, query, where, onSnapshot, auth, signOut } from '../lib/firebase';
import { cn } from '../lib/utils';

export default function Profile({ user }: { user: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [interviews, setInterviews] = useState<any[]>([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'interviews' | 'sessions'>('interviews');

  useEffect(() => {
    if (!user) return;

    const interviewsQuery = query(
      collection(db, 'interviews'),
      where('userId', '==', user.uid)
    );

    const unsubInterviews = onSnapshot(interviewsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInterviews(data.sort((a: any, b: any) => b.timestamp?.seconds - a.timestamp?.seconds));
    });

    return () => unsubInterviews();
  }, [user]);

  const handleSave = async () => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: name,
        bio: bio,
        skills: skills
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Profile Header */}
      <div className="relative h-48 rounded-[40px] bg-gradient-to-r from-primary-600 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mb-32 blur-3xl" />
        </div>
        
        <div className="absolute -bottom-16 left-10 flex items-end gap-6">
          <div className="w-32 h-32 rounded-[40px] bg-white p-2 shadow-2xl">
            <div className="w-full h-full rounded-[32px] bg-slate-100 flex items-center justify-center overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-slate-300" />
              )}
            </div>
          </div>
          <div className="mb-4 pb-2">
            <h1 className="text-3xl font-bold text-white font-display tracking-tight drop-shadow-sm">
              {user?.displayName || 'SkillX User'}
            </h1>
            <p className="text-primary-100 font-medium flex items-center gap-2">
              <ShieldCheck size={16} />
              {user?.role === 'mentor' ? 'Expert Mentor' : 'Active Learner'}
            </p>
          </div>
        </div>

        <div className="absolute bottom-6 right-10 flex gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold hover:bg-white/20 transition-all flex items-center gap-2"
          >
            {isEditing ? <X size={18} /> : <Edit3 size={18} />}
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="px-4 py-3 rounded-2xl bg-red-500/20 backdrop-blur-md border border-red-500/20 text-red-100 font-bold hover:bg-red-500/30 transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 pt-12">
        {/* Left Column: Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User size={20} className="text-primary-600" />
              About Me
            </h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Display Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about your journey..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all h-32 resize-none"
                  />
                </div>
                <button 
                  onClick={handleSave}
                  className="w-full py-4 rounded-2xl bg-primary-600 text-white font-bold shadow-xl shadow-primary-100 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Save Changes
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-600 leading-relaxed">
                  {user?.bio || "No bio added yet. Tell the community about your skills and goals!"}
                </p>
                <div className="pt-4 border-t border-slate-50 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Email</span>
                    <span className="text-slate-900 font-medium">{user?.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Credits</span>
                    <span className="text-primary-600 font-bold">{user?.credits} XP</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Joined</span>
                    <span className="text-slate-900 font-medium">
                      {user?.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award size={20} className="text-purple-600" />
              Skills & Expertise
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <div key={i} className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700 flex items-center gap-2 group">
                  {skill}
                  {isEditing && (
                    <button onClick={() => removeSkill(skill)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {skills.length === 0 && !isEditing && (
                <p className="text-sm text-slate-400 italic">No skills added yet.</p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  placeholder="Add a skill..."
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                />
                <button 
                  onClick={addSkill}
                  className="p-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-8 space-y-8">
          <div className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-slate-900 font-display">Activity History</h3>
              <div className="flex p-1 rounded-2xl bg-slate-100">
                <button 
                  onClick={() => setActiveHistoryTab('interviews')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                    activeHistoryTab === 'interviews' ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Interviews
                </button>
                <button 
                  onClick={() => setActiveHistoryTab('sessions')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                    activeHistoryTab === 'sessions' ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Sessions
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {activeHistoryTab === 'interviews' ? (
                interviews.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                      <History size={40} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">No interviews yet</p>
                      <p className="text-sm text-slate-500">Complete an AI interview to see your results here.</p>
                    </div>
                  </div>
                ) : (
                  interviews.map((interview) => (
                    <motion.div 
                      key={interview.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-3xl border border-slate-100 hover:border-primary-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                            <TrendingUp size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{interview.role}</h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock size={12} />
                              {interview.timestamp?.seconds ? new Date(interview.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</p>
                          <p className="text-xl font-bold text-primary-600">{interview.score}%</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {interview.feedback?.strengths?.slice(0, 2).map((s: string, i: number) => (
                          <span key={i} className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                    <BookOpen size={40} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">No sessions yet</p>
                    <p className="text-sm text-slate-500">Join a skill exchange session to see your history.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
