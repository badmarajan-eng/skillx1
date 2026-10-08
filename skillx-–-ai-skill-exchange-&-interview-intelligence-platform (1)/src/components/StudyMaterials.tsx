import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  FileText, 
  Video, 
  Link as LinkIcon,
  Download,
  Share2,
  MoreVertical,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ChevronRight,
  X,
  CheckCircle2
} from 'lucide-react';
import { db, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from '../lib/firebase';
import { cn } from '../lib/utils';

interface Material {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'pdf' | 'video' | 'link' | 'article';
  url: string;
  author: string;
  authorId: string;
  likes: number;
  comments: number;
  timestamp: any;
}

export default function StudyMaterials({ user }: { user: any }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    category: 'Programming',
    type: 'link' as const,
    url: ''
  });

  const categories = ['All', 'Programming', 'Design', 'Marketing', 'Business', 'Soft Skills', 'Other'];

  useEffect(() => {
    const q = query(collection(db, 'materials'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
      setMaterials(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'materials'), {
        ...newMaterial,
        author: user.displayName,
        authorId: user.uid,
        likes: 0,
        comments: 0,
        timestamp: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewMaterial({ title: '', description: '', category: 'Programming', type: 'link', url: '' });
    } catch (err) {
      console.error("Error adding material:", err);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-600 text-[10px] font-bold uppercase tracking-widest border border-primary-100">
            <BookOpen size={14} />
            Resource Hub
          </div>
          <h1 className="text-4xl font-bold text-slate-900 font-display tracking-tight">Study Materials</h1>
          <p className="text-slate-500 max-w-xl">
            Access and share high-quality learning resources curated by the SkillX community.
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus size={20} /> Share Resource
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources, topics, or authors..."
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-6 py-4 rounded-2xl text-sm font-bold whitespace-nowrap transition-all",
                selectedCategory === cat 
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-100" 
                  : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredMaterials.map((material) => (
            <motion.div
              key={material.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group p-6 rounded-[40px] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={cn(
                  "p-4 rounded-2xl",
                  material.type === 'pdf' ? "bg-red-50 text-red-600" :
                  material.type === 'video' ? "bg-blue-50 text-blue-600" :
                  material.type === 'article' ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"
                )}>
                  {material.type === 'pdf' && <FileText size={24} />}
                  {material.type === 'video' && <Video size={24} />}
                  {material.type === 'article' && <FileText size={24} />}
                  {material.type === 'link' && <LinkIcon size={24} />}
                </div>
                <div className="flex gap-1">
                  <button className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                    <Share2 size={18} />
                  </button>
                  <button className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{material.category}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{material.type}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-primary-600 transition-colors">
                  {material.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2">
                  {material.description}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {material.author[0]}
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{material.author}</p>
                    <p className="text-slate-400">Contributor</p>
                  </div>
                </div>
                <a 
                  href={material.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-900 text-white hover:bg-primary-600 transition-all shadow-lg shadow-slate-200"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Material Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden p-10"
            >
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900 font-display">Share Resource</h2>
                  <p className="text-slate-500 text-sm">Contribute to the community by sharing helpful materials.</p>
                </div>

                <form onSubmit={handleAddMaterial} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Title</label>
                    <input 
                      type="text" 
                      required
                      value={newMaterial.title}
                      onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                      placeholder="e.g. Advanced React Patterns Guide"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        value={newMaterial.category}
                        onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      >
                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Type</label>
                      <select 
                        value={newMaterial.type}
                        onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value as any})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      >
                        <option value="link">Link</option>
                        <option value="pdf">PDF</option>
                        <option value="video">Video</option>
                        <option value="article">Article</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">URL</label>
                    <input 
                      type="url" 
                      required
                      value={newMaterial.url}
                      onChange={(e) => setNewMaterial({...newMaterial, url: e.target.value})}
                      placeholder="https://example.com/resource"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      required
                      value={newMaterial.description}
                      onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                      placeholder="Briefly describe what this resource covers..."
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all h-24 resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold shadow-xl hover:scale-[1.02] transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} /> Publish Resource
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
