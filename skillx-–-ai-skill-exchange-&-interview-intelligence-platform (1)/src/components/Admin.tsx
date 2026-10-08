import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db, collection, query, getDocs, deleteDoc, doc, updateDoc, orderBy, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  BarChart3, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserX,
  Mail,
  Trash2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { cn } from '../lib/utils';

const pieData = [
  { name: 'Learners', value: 4500 },
  { name: 'Mentors', value: 1200 },
  { name: 'Admins', value: 50 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#0f172a'];

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", color)}>
        <Icon size={24} />
      </div>
      <div className={cn("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full", trend > 0 ? "text-green-500 bg-green-50" : "text-red-500 bg-red-50")}>
        {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(trend)}%
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const UserRow = ({ user, onDelete, onVerify }: any) => (
  <tr className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none">
    <td className="py-4 px-6">
      <div className="flex items-center gap-3">
        <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-10 h-10 rounded-full object-cover" alt={user.displayName} referrerPolicy="no-referrer" />
        <div>
          <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
      </div>
    </td>
    <td className="py-4 px-6">
      <span className={cn(
        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
        user.role === 'admin' ? "bg-slate-900 text-white" : 
        user.role === 'mentor' ? "bg-purple-50 text-purple-600 border border-purple-100" : 
        "bg-blue-50 text-blue-600 border border-blue-100"
      )}>
        {user.role}
      </span>
    </td>
    <td className="py-4 px-6">
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", user.isVerified ? "bg-green-500" : "bg-amber-500")}></div>
        <span className="text-sm text-slate-600">{user.isVerified ? 'Verified' : 'Pending'}</span>
      </div>
    </td>
    <td className="py-4 px-6 text-sm text-slate-500">
      {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
    </td>
    <td className="py-4 px-6 text-right">
      <div className="flex items-center justify-end gap-2">
        <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
          <Mail size={18} />
        </button>
        {!user.isVerified && (
          <button 
            onClick={() => onVerify(user.uid)}
            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
            title="Verify User"
          >
            <UserCheck size={18} />
          </button>
        )}
        <button 
          onClick={() => onDelete(user.uid)}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          title="Delete User"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </td>
  </tr>
);

export default function Admin({ user: currentUser }: { user: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMentors: 0,
    pendingReports: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const usersList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as any[];
        setUsers(usersList);
        
        // Calculate stats
        const mentors = usersList.filter(u => u.role === 'mentor' || u.role === 'both').length;
        setStats({
          totalUsers: usersList.length,
          activeMentors: mentors,
          pendingReports: 0, // Placeholder
          totalRevenue: usersList.reduce((acc, u) => acc + (u.credits || 0), 0) / 10 // Mock revenue
        });
      } catch (error: any) {
        console.error("Error fetching users:", error);
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        setUsers(prev => prev.filter(u => u.uid !== uid));
      } catch (error: any) {
        console.error("Error deleting user:", error);
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
        }
      }
    }
  };

  const handleVerifyUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isVerified: true });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: true } : u));
    } catch (error: any) {
      console.error("Error verifying user:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const dynamicPieData = [
    { name: 'Learners', value: users.filter(u => u.role === 'learner').length },
    { name: 'Mentors', value: users.filter(u => u.role === 'mentor' || u.role === 'both').length },
    { name: 'Admins', value: users.filter(u => u.role === 'admin').length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage users, monitor platform health, and review reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
            <BarChart3 size={18} /> Reports
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
            <ShieldCheck size={18} /> System Status
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Total Users" 
          value={stats.totalUsers.toLocaleString()} 
          trend={15} 
          color="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          icon={UserCheck} 
          label="Active Mentors" 
          value={stats.activeMentors.toLocaleString()} 
          trend={8} 
          color="bg-purple-50 text-purple-600" 
        />
        <StatCard 
          icon={AlertTriangle} 
          label="Pending Reports" 
          value={stats.pendingReports} 
          trend={0} 
          color="bg-red-50 text-red-600" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Platform Credits" 
          value={(stats.totalRevenue * 10).toLocaleString()} 
          trend={12} 
          color="bg-green-50 text-green-600" 
        />
      </div>

      {/* Analytics Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* User Distribution */}
        <div className="lg:col-span-1 p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-8">User Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dynamicPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dynamicPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                  <Users size={16} />
                </div>
                <span className="text-sm font-bold text-slate-800">New Signups</span>
              </div>
              <span className="text-sm font-bold text-blue-600">+{users.filter(u => {
                const today = new Date();
                const created = u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000) : null;
                return created && created.toDateString() === today.toDateString();
              }).length} today</span>
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-col sm:row items-start sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-lg font-bold text-slate-900">User Management</h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                />
              </div>
              <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl border border-slate-100">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="pb-4 px-6">User</th>
                  <th className="pb-4 px-6">Role</th>
                  <th className="pb-4 px-6">Status</th>
                  <th className="pb-4 px-6">Joined</th>
                  <th className="pb-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow 
                    key={u.uid}
                    user={u}
                    onDelete={handleDeleteUser}
                    onVerify={handleVerifyUser}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Showing {users.length} users</p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg border border-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1.5 rounded-lg border border-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
