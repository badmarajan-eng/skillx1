import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import SkillExchange from './components/SkillExchange';
import Credits from './components/Credits';
import Chat from './components/Chat';
import Admin from './components/Admin';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import AIInterview from './components/AIInterview';
import SkillVerification from './components/SkillVerification';
import Profile from './components/Profile';
import StudyMaterials from './components/StudyMaterials';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Github, Mail, ArrowRight, X } from 'lucide-react';
import { cn } from './lib/utils';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  signOut, 
  onSnapshot,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from './lib/firebase';

const AuthModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name.trim()) {
          setError("Please enter your name.");
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
        
        // Create user document immediately for signup
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userDocRef, {
          uid: userCredential.user.uid,
          displayName: name,
          email: userCredential.user.email,
          photoURL: null,
          role: 'learner',
          credits: 500,
          createdAt: serverTimestamp(),
          skills: [],
          isVerified: false
        });
      }
      onClose();
    } catch (err: any) {
      console.error("Email auth failed:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error("Google login failed:", err);
      
      if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked! Trying redirect login...");
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: any) {
          console.error("Redirect login failed:", redirectErr);
          setError("Login failed. Try opening the app in a new tab.");
        }
      } else if (err.code === 'auth/internal-error') {
        setError("Internal error. This often happens in iframes. Try opening the app in a new tab.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Login window was closed. Please try again.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>

        <div className="p-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-primary-200">
              <BrainCircuit size={24} />
            </div>
            <span className="text-2xl font-bold font-display tracking-tight text-slate-900">SkillX</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">{isLogin ? 'Welcome Back' : 'Join SkillX'}</h2>
          <p className="text-slate-500 text-sm mb-4">{isLogin ? 'Log in to continue your learning journey.' : 'Start your AI-powered career growth today.'}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium animate-shake">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  <X size={14} />
                </div>
                <div>
                  <p>{error}</p>
                  {error.includes("new tab") && (
                    <button 
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="mt-2 text-xs font-bold underline hover:text-red-700"
                    >
                      Open in New Tab
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 rounded-xl border border-slate-200 flex items-center justify-center gap-3 font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              {isLoading ? 'Connecting...' : 'Continue with Google'}
            </button>
            <button className="w-full py-3 rounded-xl border border-slate-200 flex items-center justify-center gap-3 font-bold text-slate-700 hover:bg-slate-50 transition-all opacity-50 cursor-not-allowed">
              <Github size={20} />
              Continue with GitHub
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or with email</span></div>
          </div>

          <form className="space-y-4" onSubmit={handleEmailAuth}>
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson" 
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com" 
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl gradient-bg text-white font-bold shadow-xl shadow-primary-200 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')} <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary-600 font-bold hover:underline">
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<'learner' | 'mentor' | 'both' | 'admin'>('learner');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatContact, setSelectedChatContact] = useState<any>(null);

  useEffect(() => {
    // Handle redirect result
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login error:", error);
    });

    let unsubDoc: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubDoc = onSnapshot(userDocRef, async (docSnap) => {
          console.log("User doc snapshot received, exists:", docSnap.exists());
          if (!docSnap.exists()) {
            // Only create if it doesn't exist. 
            // For email signup, AuthModal handles this to capture the name.
            // For Google login, we handle it here.
            const newUser = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'New User',
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              role: 'learner',
              credits: 500,
              createdAt: serverTimestamp(),
              skills: [],
              isVerified: false
            };
            try {
              await setDoc(userDocRef, newUser);
            } catch (err) {
              console.error("Error creating user doc:", err);
            }
          } else {
            const userData = docSnap.data();
            setUser({ ...firebaseUser, ...userData });
            setUserRole(userData.role);
          }
          setIsAuthReady(true);
        });
      } else {
        setUser(null);
        if (unsubDoc) unsubDoc();
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} setActiveTab={setActiveTab} setSearchQuery={setSearchQuery} />;
      case 'skill-exchange':
        return <SkillExchange user={user} setActiveTab={setActiveTab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} setSelectedChatContact={setSelectedChatContact} />;
      case 'credits':
        return <Credits user={user} />;
      case 'chat':
        return <Chat user={user} selectedChatContact={selectedChatContact} setSelectedChatContact={setSelectedChatContact} />;
      case 'resume-analyzer':
        return <ResumeAnalyzer user={user} />;
      case 'ai-interview':
        return <AIInterview user={user} />;
      case 'skill-verification':
        return <SkillVerification user={user} />;
      case 'study-materials':
        return <StudyMaterials user={user} />;
      case 'profile':
        return <Profile user={user} />;
      case 'admin':
        return <Admin user={user} />;
      default:
        return <Dashboard user={user} setActiveTab={setActiveTab} setSearchQuery={setSearchQuery} />;
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onGetStarted={() => setIsAuthModalOpen(true)} />
        <AnimatePresence>
          {isAuthModalOpen && (
            <AuthModal 
              isOpen={isAuthModalOpen} 
              onClose={() => setIsAuthModalOpen(false)} 
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} user={user}>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderContent()}
      </motion.div>
    </Layout>
  );
}
