import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  ShieldCheck, 
  Plus,
  Gift,
  CheckCircle2,
  BrainCircuit,
  Mic2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, collection, query, where, getDocs, orderBy, limit, doc, updateDoc, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';

const TransactionItem = ({ type, title, amount, date, status }: any) => (
  <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      type === 'earn' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
    )}>
      {type === 'earn' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500">{date} • {status}</p>
    </div>
    <div className={cn(
      "text-sm font-bold",
      type === 'earn' ? "text-green-600" : "text-red-600"
    )}>
      {type === 'earn' ? '+' : '-'}{amount}
    </div>
  </div>
);

export default function Credits({ user }: { user: any }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        setTransactions(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error: any) {
        console.error("Error fetching transactions:", error);
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'transactions');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const handleAddCredits = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        credits: (user.credits || 0) + 500
      });
      
      // Add transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'earn',
        title: 'Test Credit Top-up',
        amount: 500,
        timestamp: serverTimestamp(),
        status: 'completed'
      });
    } catch (error: any) {
      console.error("Error adding credits:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.WRITE, 'credits_flow');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Wallet & Credits</h1>
          <p className="text-slate-500 mt-1">Manage your credits and view your transaction history.</p>
        </div>
      </div>

      {/* Credit Balance Card */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="p-10 rounded-3xl bg-slate-900 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-primary-400 text-xs font-bold uppercase tracking-widest mb-8">
                <ShieldCheck size={16} />
                Secure Wallet
              </div>
              <div className="flex flex-col md:flex-row items-end justify-between gap-8">
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-2">Available Balance</p>
                  <div className="flex items-center gap-4">
                    <h2 className="text-5xl font-bold font-display">{user?.credits || 0}</h2>
                    <div className="px-3 py-1 rounded-lg bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center gap-2 border border-primary-500/30">
                      <Zap size={14} /> Credits
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="flex-1 md:flex-none p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-1">Earned this month</p>
                    <p className="text-xl font-bold text-green-400">+0</p>
                  </div>
                  <div className="flex-1 md:flex-none p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-1">Spent this month</p>
                    <p className="text-xl font-bold text-red-400">-0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="text-primary-600" size={20} />
                Recent Transactions
              </h3>
              <button className="text-xs font-bold text-primary-600 hover:underline">Download Statement</button>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TransactionItem 
                    key={tx.id}
                    type={tx.type} 
                    title={tx.title} 
                    amount={tx.amount} 
                    date={tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleString() : 'N/A'} 
                    status={tx.status} 
                  />
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-10">No transactions found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Quick Buy */}
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Top-up</h3>
            <div className="space-y-4">
              <button 
                onClick={handleAddCredits}
                className="w-full p-4 rounded-2xl border border-primary-100 bg-primary-50 hover:bg-primary-100 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-800">500 Credits</span>
                  <span className="text-sm font-bold text-primary-600">$10</span>
                </div>
                <p className="text-xs text-slate-500">Perfect for 10 AI sessions</p>
              </button>
            </div>
            <button className="w-full mt-8 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all">
              Proceed to Checkout
            </button>
          </div>

          {/* Earn More */}
          <div className="p-8 rounded-3xl bg-linear-to-br from-primary-600 to-accent-600 text-white shadow-xl shadow-primary-200">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <Gift size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2">Invite Friends</h3>
            <p className="text-primary-100 text-sm mb-6">Get 100 free credits for every friend who joins SkillX.</p>
            <button className="w-full py-3 rounded-xl bg-white text-primary-600 font-bold text-sm hover:bg-primary-50 transition-all">
              Share Referral Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
