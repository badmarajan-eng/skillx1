import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Star, 
  Calendar, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2,
  BrainCircuit,
  Zap,
  Target,
  MessageSquare,
  FileText,
  Search,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../lib/utils';
import { db, collection, query, where, getDocs, orderBy, limit, handleFirestoreError, OperationType } from '../lib/firebase';

const data = [
  { name: 'Mon', score: 65 },
  { name: 'Tue', score: 72 },
  { name: 'Wed', score: 68 },
  { name: 'Thu', score: 85 },
  { name: 'Fri', score: 78 },
  { name: 'Sat', score: 92 },
  { name: 'Sun', score: 88 },
];

const StatCard = ({ icon: Icon, label, value, trend, color }: { icon: any, label: string, value: string | number, trend: string, color: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", color)}>
        <Icon size={24} />
      </div>
      <div className="flex items-center gap-1 text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
        <TrendingUp size={12} />
        {trend}
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </motion.div>
);

const ActivityItem = ({ icon: Icon, title, time, type, onClick }: any) => (
  <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500">{type} • {time}</p>
    </div>
    <button 
      onClick={onClick}
      className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
    >
      <ArrowUpRight size={18} />
    </button>
  </div>
);

export default function Dashboard({ user, setActiveTab, setSearchQuery }: { user: any, setActiveTab: (tab: string) => void, setSearchQuery: (query: string) => void }) {
  const [nextSession, setNextSession] = useState<any>(null);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [stats, setStats] = useState({
    interviews: 0,
    sessions: 0,
    credits: 0,
    skills: 0
  });

  const filteredActivities = recentActivities.filter(activity => {
    const searchLower = localSearch.toLowerCase();
    const title = activity.type === 'Interview' ? `Interview: ${activity.role}` : `Resume Analysis: ${activity.score}%`;
    return title.toLowerCase().includes(searchLower) || activity.type.toLowerCase().includes(searchLower);
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch next session
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('learnerId', '==', user.uid),
          where('status', 'in', ['pending', 'confirmed']),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const sessionDocs = await getDocs(sessionsQuery);
        if (!sessionDocs.empty) {
          setNextSession({ id: sessionDocs.docs[0].id, ...sessionDocs.docs[0].data() });
        }

        // Fetch completed sessions for review
        const completedQuery = query(
          collection(db, 'sessions'),
          where('learnerId', '==', user.uid),
          where('status', '==', 'completed'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const completedDocs = await getDocs(completedQuery);
        setCompletedSessions(completedDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch overall stats
        const allSessions = await getDocs(query(collection(db, 'sessions'), where('learnerId', '==', user.uid)));
        const allInterviews = await getDocs(query(collection(db, 'interviews'), where('userId', '==', user.uid)));
        
        setStats({
          interviews: allInterviews.size,
          sessions: allSessions.size,
          credits: user.credits || 0,
          skills: user.skills?.length || 0
        });

        // Fetch recent activities
        const recentInterviews = await getDocs(query(collection(db, 'interviews'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3)));
        const recentAnalyses = await getDocs(query(collection(db, 'resume_analyses'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3)));
        
        const activities: any[] = [];
        recentInterviews.docs.forEach(doc => activities.push({ id: doc.id, type: 'Interview', ...doc.data() }));
        recentAnalyses.docs.forEach(doc => activities.push({ id: doc.id, type: 'Resume Analysis', ...doc.data() }));
        
        setRecentActivities(activities.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()).slice(0, 5));

      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'dashboard_data_fetch');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Welcome back, {user?.displayName?.split(' ')[0]}! 👋</h1>
          <p className="text-slate-500 mt-1">You're on a 5-day learning streak. Keep it up!</p>
        </div>
        <div className="flex items-center gap-3">
          {recentActivities.length > 0 && recentActivities[0].type === 'Interview' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('ai-interview')}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xl shadow-indigo-100 flex items-center gap-2"
            >
              <BrainCircuit size={16} /> Resume Last Interview
            </motion.button>
          )}
          <div className="relative hidden md:block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search activities..." 
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all w-64"
            />
          </div>
          <button 
            onClick={() => setActiveTab('skill-exchange')}
            className="px-5 py-2.5 rounded-xl gradient-bg text-white text-sm font-bold shadow-lg shadow-primary-200 hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
          >
            <Calendar size={18} /> Book Session
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Sessions" 
          value={stats.sessions} 
          trend="+5%" 
          color="bg-emerald-50 text-emerald-600" 
        />
        <StatCard 
          icon={Zap} 
          label="Credits" 
          value={stats.credits} 
          trend="+20%" 
          color="bg-amber-50 text-amber-600" 
        />
        <StatCard 
          icon={Star} 
          label="Skills" 
          value={stats.skills} 
          trend="+2" 
          color="bg-rose-50 text-rose-600" 
        />
        <StatCard 
          icon={MessageSquare} 
          label="Messages" 
          value="12" 
          trend="+4" 
          color="bg-indigo-50 text-indigo-600" 
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'AI Interview', icon: BrainCircuit, tab: 'ai-interview', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Resume Check', icon: FileText, tab: 'resume-analyzer', color: 'bg-primary-50 text-primary-600' },
          { label: 'Study Hub', icon: BookOpen, tab: 'study-materials', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Skill Verify', icon: ShieldCheck, tab: 'skill-verification', color: 'bg-amber-50 text-amber-600' },
        ].map((action, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(action.tab)}
            className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 group hover:border-primary-200 transition-all"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", action.color)}>
              <action.icon size={20} />
            </div>
            <span className="text-xs font-bold text-slate-700">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart */}
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900">Learning Progress</h3>
              <select className="bg-slate-50 border-none text-xs font-bold text-slate-500 rounded-lg px-3 py-1.5 outline-none">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Career Tools */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm group hover:border-primary-200 transition-all cursor-pointer" onClick={() => setActiveTab('resume-analyzer')}>
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Resume Analyzer</h3>
              <p className="text-sm text-slate-500 mb-4">Get an ATS score and AI-powered suggestions to optimize your resume.</p>
              <div className="flex items-center gap-2 text-primary-600 text-sm font-bold">
                Analyze Now <ArrowUpRight size={16} />
              </div>
            </div>
            <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm group hover:border-primary-200 transition-all cursor-pointer" onClick={() => setActiveTab('ai-interview')}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI Interview</h3>
              <p className="text-sm text-slate-500 mb-4">Practice with our AI simulator and get detailed performance feedback.</p>
              <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold">
                Start Practice <ArrowUpRight size={16} />
              </div>
            </div>
          </div>

          {/* Sessions Section */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-primary-600" />
                Next Session
              </h3>
              {nextSession ? (
                <div className="flex items-center gap-3 mt-2 mb-6">
                  <img src={`https://picsum.photos/seed/${nextSession.mentorId}/100/100`} className="w-10 h-10 rounded-full" alt="Mentor" referrerPolicy="no-referrer" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Mentor Session</p>
                    <p className="text-xs text-slate-500">{nextSession.topic} • {nextSession.startTime?.toDate ? nextSession.startTime.toDate().toLocaleString() : 'Upcoming'}</p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500 mb-4">No sessions scheduled.</p>
                </div>
              )}
              <button 
                onClick={() => setActiveTab('skill-exchange')}
                className="mt-auto w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all"
              >
                {nextSession ? 'Join Meeting' : 'Browse Mentors'}
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                Pending Reviews
              </h3>
              {completedSessions.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {completedSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-600 shadow-sm">
                          <Star size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{session.topic}</p>
                          <p className="text-[10px] text-slate-500">Completed</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('skill-verification')}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-primary-600 hover:bg-primary-50 transition-all"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500 mb-4">No pending reviews.</p>
                </div>
              )}
              <button 
                onClick={() => setActiveTab('skill-verification')}
                className="mt-auto w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
              >
                View Credibility
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
            <button 
              onClick={() => setActiveTab('skill-exchange')}
              className="text-xs font-bold text-primary-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {filteredActivities.map((activity) => (
              <ActivityItem 
                key={activity.id}
                icon={activity.type === 'Interview' ? BrainCircuit : FileText} 
                title={activity.type === 'Interview' ? `Interview: ${activity.role}` : `Resume Analysis: ${activity.score}%`} 
                type={activity.type} 
                time={activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleDateString() : 'N/A'} 
                onClick={() => setActiveTab(activity.type === 'Interview' ? 'ai-interview' : 'resume-analyzer')}
              />
            ))}
            {nextSession && (
              <ActivityItem 
                icon={Calendar} 
                title={`Session: ${nextSession.topic}`} 
                type="Upcoming" 
                time={nextSession.startTime?.toDate ? nextSession.startTime.toDate().toLocaleDateString() : 'N/A'} 
                onClick={() => setActiveTab('skill-exchange')}
              />
            )}
            {recentActivities.length === 0 && !nextSession && (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity.</p>
            )}
          </div>

          <div className="mt-10 p-6 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Premium Upgrade</p>
                <p className="text-xs text-slate-500">Unlock unlimited AI sessions</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('credits')}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
