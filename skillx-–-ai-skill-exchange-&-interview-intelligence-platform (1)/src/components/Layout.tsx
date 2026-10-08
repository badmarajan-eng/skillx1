import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Mic2, 
  BarChart3, 
  FileText, 
  CreditCard, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  ShieldCheck,
  User,
  BrainCircuit,
  MessageSquare,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, signOut } from '../lib/firebase';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
  key?: string;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full p-3 my-1 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-primary-600 text-white shadow-lg shadow-primary-200" 
        : "text-slate-500 hover:bg-slate-100 hover:text-primary-600"
    )}
  >
    <Icon size={22} className={cn("min-w-[22px]", active ? "text-white" : "group-hover:scale-110 transition-transform")} />
    {!collapsed && (
      <motion.span 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="ml-3 font-medium whitespace-nowrap"
      >
        {label}
      </motion.span>
    )}
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'learner' | 'mentor' | 'both' | 'admin';
  user: any;
}

export default function Layout({ children, activeTab, setActiveTab, userRole, user }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'skill-exchange', label: 'Skill Exchange', icon: Users },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'resume-analyzer', label: 'Resume Analyzer', icon: FileText },
    { id: 'ai-interview', label: 'AI Interview', icon: Mic2 },
    { id: 'skill-verification', label: 'Skill Verification', icon: ShieldCheck },
    { id: 'study-materials', label: 'Study Materials', icon: BookOpen },
    { id: 'credits', label: 'Wallet', icon: CreditCard },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  if (userRole === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Settings });
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-30",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white">
                <BrainCircuit size={20} />
              </div>
              <span className="text-xl font-bold font-display tracking-tight text-slate-800">SkillX</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
                collapsed={sidebarCollapsed}
              />
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <SidebarItem
            icon={LogOut}
            label="Logout"
            onClick={handleLogout}
            collapsed={sidebarCollapsed}
          />
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white">
                  <BrainCircuit size={20} />
                </div>
                <span className="text-xl font-bold font-display tracking-tight text-slate-800">SkillX</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-500">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 px-4">
              {menuItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                />
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <SidebarItem icon={LogOut} label="Logout" onClick={handleLogout} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-bottom border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center bg-slate-100 rounded-full px-4 py-1.5 w-64 lg:w-96 border border-transparent focus-within:border-primary-300 focus-within:bg-white transition-all">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search skills, mentors, or jobs..." 
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user?.displayName}</p>
                <p className="text-xs text-slate-500 mt-1 capitalize">{user?.role}</p>
              </div>
              <button 
                onClick={() => setActiveTab('profile')}
                className="w-10 h-10 rounded-full bg-primary-100 border-2 border-white shadow-sm flex items-center justify-center text-primary-600 font-bold overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
              >
                <img 
                  src={user?.photoURL || "https://picsum.photos/seed/alex/100/100"} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
