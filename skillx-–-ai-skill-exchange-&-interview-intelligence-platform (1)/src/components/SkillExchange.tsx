import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Calendar, 
  MessageSquare, 
  ChevronRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  X,
  AlertCircle,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, query, where, getDocs, addDoc, setDoc, serverTimestamp, doc, updateDoc, orderBy, handleFirestoreError, OperationType, onSnapshot } from '../lib/firebase';

export default function SkillExchange({ user, setActiveTab, searchQuery, setSearchQuery, setSelectedChatContact }: { user: any, setActiveTab: (tab: string) => void, searchQuery: string, setSearchQuery: (q: string) => void, setSelectedChatContact: (c: any) => void }) {
  const [mentors, setMentors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');
  const [expandedBios, setExpandedBios] = useState<Record<string, boolean>>({});
  const [mentorReviews, setMentorReviews] = useState<any[]>([]);
  const [activeMentorTab, setActiveMentorTab] = useState<'info' | 'reviews'>('info');
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [applicationData, setApplicationData] = useState({
    skills: '',
    bio: '',
    price: 50
  });

  useEffect(() => {
    const fetchMentors = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        console.log("Fetching mentors from collection: users");
        const mentorsQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['mentor', 'both'])
        );
        const mentorDocs = await getDocs(mentorsQuery);
        console.log("Mentor docs fetched successfully, count:", mentorDocs.size);
        
        if (mentorDocs.empty) {
          // Add seed mentors if none exist
          const seedMentors = [
            {
              displayName: "Sarah Chen",
              role: "mentor",
              skills: ["Frontend", "React", "UI/UX Design"],
              bio: "Senior Frontend Engineer at Google with 8+ years of experience in building scalable web applications.",
              rating: 4.9,
              reviewsCount: 124,
              price: 50,
              isVerified: true,
              verifiedSkills: ["Frontend", "React"],
              photoURL: "https://picsum.photos/seed/sarah/200/200",
              credits: 1000
            },
            {
              displayName: "Marcus Rodriguez",
              role: "mentor",
              skills: ["Backend", "Node.js", "System Design"],
              bio: "Lead Backend Architect specializing in distributed systems and cloud infrastructure.",
              rating: 4.8,
              reviewsCount: 89,
              price: 75,
              isVerified: true,
              verifiedSkills: ["Backend", "Node.js"],
              photoURL: "https://picsum.photos/seed/marcus/200/200",
              credits: 1000
            },
            {
              displayName: "Priya Sharma",
              role: "mentor",
              skills: ["Data Science", "Python", "Machine Learning"],
              bio: "Data Scientist at Meta. Passionate about teaching ML and helping students land their first data role.",
              rating: 5.0,
              reviewsCount: 56,
              price: 60,
              isVerified: true,
              verifiedSkills: ["Python", "Machine Learning"],
              photoURL: "https://picsum.photos/seed/priya/200/200",
              credits: 1000
            },
            {
              displayName: "Alex Rivera",
              role: "mentor",
              skills: ["Mobile Dev", "React Native", "iOS"],
              bio: "Mobile Tech Lead. Expert in cross-platform development and app store optimization.",
              rating: 4.7,
              reviewsCount: 42,
              price: 55,
              isVerified: true,
              verifiedSkills: ["Mobile Dev", "React Native"],
              photoURL: "https://picsum.photos/seed/alex/200/200",
              credits: 1000
            },
            {
              displayName: "Jordan Smith",
              role: "mentor",
              skills: ["Product Management", "Agile", "Strategy"],
              bio: "Product Director at a top fintech. Helping aspiring PMs master the craft of product discovery.",
              rating: 4.9,
              reviewsCount: 78,
              price: 90,
              isVerified: true,
              verifiedSkills: ["Product Management"],
              photoURL: "https://picsum.photos/seed/jordan/200/200",
              credits: 1000
            },
            {
              displayName: "Elena Volkov",
              role: "mentor",
              skills: ["Cybersecurity", "Ethical Hacking", "Network Security"],
              bio: "Security Researcher and Consultant. I help developers write secure code and understand modern threat landscapes.",
              rating: 4.9,
              reviewsCount: 63,
              price: 80,
              isVerified: true,
              verifiedSkills: ["Cybersecurity", "Network Security"],
              photoURL: "https://picsum.photos/seed/elena/200/200",
              credits: 1000
            },
            {
              displayName: "David Kim",
              role: "mentor",
              skills: ["Cloud Computing", "AWS", "DevOps", "Kubernetes"],
              bio: "Cloud Solutions Architect. Expert in migrating legacy systems to the cloud and optimizing CI/CD pipelines.",
              rating: 4.8,
              reviewsCount: 95,
              price: 70,
              isVerified: true,
              verifiedSkills: ["AWS", "DevOps"],
              photoURL: "https://picsum.photos/seed/david/200/200",
              credits: 1000
            },
            {
              displayName: "Aisha Bello",
              role: "mentor",
              skills: ["Blockchain", "Solidity", "Web3"],
              bio: "Web3 Developer and Smart Contract Auditor. Let's build the decentralized future together.",
              rating: 4.7,
              reviewsCount: 31,
              price: 85,
              isVerified: true,
              verifiedSkills: ["Solidity", "Web3"],
              photoURL: "https://picsum.photos/seed/aisha/200/200",
              credits: 1000
            }
          ];

          for (const mentor of seedMentors) {
            const mentorId = `seed_${mentor.displayName.toLowerCase().replace(/\s+/g, '_')}`;
            await setDoc(doc(db, 'users', mentorId), {
              ...mentor,
              uid: mentorId,
              createdAt: serverTimestamp()
            });
          }
          
          // Re-fetch after seeding
          const updatedDocs = await getDocs(mentorsQuery);
          let fetchedMentors = updatedDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort manually if index is not ready
          fetchedMentors.sort((a: any, b: any) => {
            const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() / 1000 || 0;
            const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() / 1000 || 0;
            return timeB - timeA;
          });
          setMentors(fetchedMentors);
        } else {
          let fetchedMentors = mentorDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort manually
          fetchedMentors.sort((a: any, b: any) => {
            const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() / 1000 || 0;
            const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() / 1000 || 0;
            return timeB - timeA;
          });
          setMentors(fetchedMentors);
        }
      } catch (error: any) {
        console.error("Error fetching mentors:", error);
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, [user]);

  useEffect(() => {
    if (!selectedMentor) return;

    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('mentorId', '==', selectedMentor.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMentorReviews(data);
    });

    return () => unsubscribe();
  }, [selectedMentor]);

  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleBookSession = async (mentor: any) => {
    if (!user) return;
    
    const price = mentor.price || 50;
    if ((user.credits || 0) < price) {
      setBookingError("Insufficient credits! Please top up your wallet.");
      setTimeout(() => setBookingError(null), 3000);
      return;
    }

    setBookingStatus('booking');
    setBookingError(null);
    try {
      // Subtract credits from user
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        credits: (user.credits || 0) - price
      });

      // Add transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'spend',
        title: `Session with ${mentor.displayName}`,
        amount: price,
        timestamp: serverTimestamp(),
        status: 'completed'
      });

      // Create session
      await addDoc(collection(db, 'sessions'), {
        mentorId: mentor.uid,
        learnerId: user.uid,
        topic: 'Introduction & Goal Setting',
        startTime: serverTimestamp(),
        duration: 60,
        status: 'pending',
        price: price,
        createdAt: serverTimestamp()
      });
      
      setBookingStatus('success');
      setTimeout(() => {
        setBookingStatus('idle');
        setSelectedMentor(null);
        setActiveTab('dashboard');
      }, 2000);
    } catch (error: any) {
      console.error("Error booking session:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.WRITE, 'booking_flow');
      }
      setBookingStatus('idle');
    }
  };

  const handleApplyMentor = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const skillsArray = applicationData.skills.split(',').map(s => s.trim()).filter(s => s !== '');
      
      await updateDoc(userRef, {
        role: user.role === 'learner' ? 'both' : user.role,
        skills: skillsArray,
        bio: applicationData.bio,
        price: Number(applicationData.price),
        isVerified: false, // Admin needs to verify
        rating: 5.0,
        reviewsCount: 0
      });
      
      setIsApplicationModalOpen(false);
      // The onSnapshot in App.tsx will handle the UI update
    } catch (error: any) {
      console.error("Error applying for mentor:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!user || !selectedMentor) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        mentorId: selectedMentor.uid,
        userId: user.uid,
        userName: user.displayName,
        rating: newReview.rating,
        comment: newReview.comment,
        timestamp: serverTimestamp()
      });
      setNewReview({ rating: 5, comment: '' });
    } catch (err) {
      console.error("Error adding review:", err);
    }
  };

  const categories = ['All', 'Frontend', 'Backend', 'UI/UX Design', 'Data Science', 'Product Management', 'Mobile Dev', 'Cybersecurity', 'Cloud Computing', 'Blockchain'];

  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = mentor.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mentor.skills?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || mentor.skills?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Skill Exchange</h1>
          <p className="text-slate-500 mt-1">Connect with expert mentors and learn new skills through 1-on-1 sessions.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-4 py-2 bg-primary-50 rounded-xl">
            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest leading-none mb-1">Your Balance</p>
            <p className="text-lg font-bold text-primary-700 leading-none">{user?.credits || 0} <span className="text-xs font-medium">Credits</span></p>
          </div>
          <button className="p-3 text-primary-600 hover:bg-primary-50 rounded-xl transition-all">
            <Zap size={20} />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, skill, or expertise..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                selectedCategory === cat 
                  ? "bg-slate-900 text-white shadow-lg" 
                  : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mentors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredMentors.length > 0 ? (
          filteredMentors.map((mentor, i) => (
            <motion.div
              key={mentor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                    <img 
                      src={mentor.photoURL || `https://picsum.photos/seed/${mentor.uid}/200/200`} 
                      className="w-20 h-20 rounded-3xl object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform" 
                      alt={mentor.displayName}
                      referrerPolicy="no-referrer"
                    />
                    {mentor.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full border-4 border-white flex items-center justify-center text-white shadow-sm">
                        <ShieldCheck size={14} />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-bold justify-end">
                      <Star size={16} fill="currentColor" />
                      <span>{mentor.rating || '5.0'}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1">{mentor.reviewsCount || '0'} Reviews</p>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{mentor.displayName}</h3>
                <div className="mt-1 relative">
                  <p className={cn(
                    "text-sm text-slate-500 transition-all duration-300",
                    !expandedBios[mentor.id] && "line-clamp-2"
                  )}>
                    {mentor.bio || 'Expert Mentor'}
                  </p>
                  {(mentor.bio?.length > 80) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedBios(prev => ({ ...prev, [mentor.id]: !prev[mentor.id] }));
                      }}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 mt-1"
                    >
                      {expandedBios[mentor.id] ? 'Read Less' : 'Read More'}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-6">
                  {(mentor.skills || ['React', 'Node.js']).slice(0, 3).map((skill: string) => {
                    const isSkillVerified = mentor.verifiedSkills?.includes(skill);
                    return (
                      <span key={skill} className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                        isSkillVerified 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-slate-50 text-slate-600"
                      )}>
                        {skill}
                        {isSkillVerified && <ShieldCheck size={10} />}
                      </span>
                    );
                  })}
                  {mentor.skills?.length > 3 && (
                    <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-400 text-[10px] font-bold tracking-wider">
                      +{mentor.skills.length - 3}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-auto p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Price</p>
                  <p className="text-lg font-bold text-slate-900">{mentor.price || 50} <span className="text-xs font-medium text-slate-500">/ session</span></p>
                </div>
                <button 
                  onClick={() => setSelectedMentor(mentor)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
                >
                  Book Now
                </button>
                <button 
                  onClick={() => {
                    setSelectedChatContact(mentor);
                    setActiveTab('chat');
                  }}
                  className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                  title="Message Mentor"
                >
                  <MessageSquare size={20} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Users size={40} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">No mentors found</p>
              <p className="text-slate-500">We couldn't find any mentors matching your criteria.</p>
            </div>
            <button 
              onClick={() => {
                setIsLoading(true);
                // Trigger a re-fetch which will trigger seeding if empty
                window.location.reload();
              }}
              className="px-8 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
            >
              Refresh Platform
            </button>
          </div>
        )}
        
        {/* Become a Mentor Card */}
        {user?.role !== 'mentor' && user?.role !== 'both' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-[32px] bg-linear-to-br from-primary-600 to-accent-600 text-white shadow-xl shadow-primary-200 flex flex-col justify-center items-center text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <Star size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Become a Mentor</h3>
              <p className="text-primary-100 text-sm">Share your expertise and earn credits by helping others grow.</p>
            </div>
            <button 
              onClick={() => setIsApplicationModalOpen(true)}
              className="w-full py-4 rounded-2xl bg-white text-primary-600 font-bold hover:bg-primary-50 transition-all shadow-lg"
            >
              Apply Now
            </button>
          </motion.div>
        )}
      </div>

      {/* Mentor Application Modal */}
      <AnimatePresence>
        {isApplicationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsApplicationModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Become a Mentor</h2>
                  <button onClick={() => setIsApplicationModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Your Skills (comma separated)</label>
                    <input 
                      type="text" 
                      value={applicationData.skills}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, skills: e.target.value }))}
                      placeholder="React, Node.js, UI/UX"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Professional Bio</label>
                    <textarea 
                      value={applicationData.bio}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about your experience..."
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all h-32 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Hourly Rate (Credits)</label>
                    <input 
                      type="number" 
                      value={applicationData.price}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleApplyMentor}
                  disabled={isLoading || !applicationData.skills || !applicationData.bio}
                  className="w-full mt-10 py-4 rounded-2xl gradient-bg text-white font-bold shadow-xl shadow-primary-200 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>Submit Application</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedMentor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMentor(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10 max-h-[90vh] overflow-y-auto scrollbar-hide">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Mentor Details</h2>
                  <button onClick={() => setSelectedMentor(null)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex items-center gap-6 p-6 rounded-3xl bg-slate-50 border border-slate-100 mb-8">
                  <img 
                    src={selectedMentor.photoURL || `https://picsum.photos/seed/${selectedMentor.uid}/200/200`} 
                    className="w-20 h-20 rounded-3xl object-cover shadow-md" 
                    alt={selectedMentor.displayName}
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedMentor.displayName}</h3>
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                      <Star size={14} fill="currentColor" />
                      <span>{selectedMentor.rating || '5.0'}</span>
                      <span className="text-slate-400 font-medium">({selectedMentor.reviewsCount || '0'} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="flex p-1 rounded-2xl bg-slate-100 mb-8">
                  <button 
                    onClick={() => setActiveMentorTab('info')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                      activeMentorTab === 'info' ? "bg-white text-primary-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Information
                  </button>
                  <button 
                    onClick={() => setActiveMentorTab('reviews')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                      activeMentorTab === 'reviews' ? "bg-white text-primary-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Reviews
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {activeMentorTab === 'info' ? (
                    <motion.div 
                      key="info"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">About</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{selectedMentor.bio}</p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Pricing & Duration</h4>
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                              <Clock size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                              <p className="text-sm font-bold text-slate-900">60 Minutes</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cost</p>
                            <p className="text-sm font-bold text-primary-600">{selectedMentor.price || 50} Credits</p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleBookSession(selectedMentor)}
                        disabled={bookingStatus !== 'idle'}
                        className="w-full py-5 rounded-2xl gradient-bg text-white font-bold shadow-xl shadow-primary-200 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {bookingStatus === 'booking' ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : bookingStatus === 'success' ? (
                          <div className="flex items-center gap-2 text-white">
                            <CheckCircle2 size={20} className="text-emerald-300" /> 
                            <span>Booking Confirmed!</span>
                          </div>
                        ) : (
                          <>Book Session Now</>
                        )}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="reviews"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-6"
                    >
                      {/* Add Review */}
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900">Write a Review</h4>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star} 
                              onClick={() => setNewReview({...newReview, rating: star})}
                              className={cn(
                                "transition-all",
                                star <= newReview.rating ? "text-amber-500" : "text-slate-300"
                              )}
                            >
                              <Star size={20} fill={star <= newReview.rating ? "currentColor" : "none"} />
                            </button>
                          ))}
                        </div>
                        <textarea 
                          value={newReview.comment}
                          onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                          placeholder="Share your experience with this mentor..."
                          className="w-full p-4 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm h-24 resize-none"
                        />
                        <button 
                          onClick={handleAddReview}
                          disabled={!newReview.comment.trim()}
                          className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                          Submit Review
                        </button>
                      </div>

                      {/* Reviews List */}
                      <div className="space-y-4">
                        {mentorReviews.length === 0 ? (
                          <p className="text-center py-10 text-slate-400 text-sm italic">No reviews yet. Be the first to review!</p>
                        ) : (
                          mentorReviews.map((review) => (
                            <div key={review.id} className="p-4 rounded-2xl border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-900 text-sm">{review.userName}</p>
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      size={10} 
                                      className={i < review.rating ? "text-amber-500" : "text-slate-200"} 
                                      fill={i < review.rating ? "currentColor" : "none"} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                              <p className="text-[10px] text-slate-400">
                                {review.timestamp?.seconds ? new Date(review.timestamp.seconds * 1000).toLocaleDateString() : 'Recently'}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
