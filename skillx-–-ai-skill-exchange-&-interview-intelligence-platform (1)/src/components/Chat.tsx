import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Send, 
  Smile, 
  Paperclip, 
  CheckCheck,
  User,
  BrainCircuit,
  Zap,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, handleFirestoreError, OperationType } from '../lib/firebase';

const ContactItem = ({ name, lastMsg, time, unread, active, image, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-l-4",
      active ? "bg-primary-50 border-primary-600" : "border-transparent"
    )}
  >
    <div className="relative">
      <img src={image || `https://picsum.photos/seed/${name}/100/100`} className="w-12 h-12 rounded-full object-cover" alt={name} referrerPolicy="no-referrer" />
      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
    </div>
    <div className="flex-1 text-left min-w-0">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-bold text-slate-800 truncate">{name}</h4>
        <span className="text-[10px] text-slate-400 font-medium">{time}</span>
      </div>
      <p className="text-xs text-slate-500 truncate">{lastMsg || 'Start a conversation'}</p>
    </div>
    {unread > 0 && (
      <div className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
        {unread}
      </div>
    )}
  </button>
);

const Message = ({ content, time, isMe }: any) => (
  <div className={cn(
    "flex flex-col max-w-[80%]",
    isMe ? "items-end self-end" : "items-start self-start"
  )}>
    <div className={cn(
      "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
      isMe ? "bg-primary-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
    )}>
      {content}
    </div>
    <div className="flex items-center gap-1 mt-1 px-1">
      <span className="text-[10px] text-slate-400 font-medium">{time}</span>
      {isMe && <CheckCheck size={12} className="text-primary-400" />}
    </div>
  </div>
);

export default function Chat({ user, selectedChatContact, setSelectedChatContact }: { user: any, selectedChatContact?: any, setSelectedChatContact?: (c: any) => void }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(selectedChatContact || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        // Fetch users who are mentors or both
        const q = query(
          collection(db, 'users'), 
          where('role', 'in', ['mentor', 'both'])
        );
        const querySnapshot = await getDocs(q);
        setContacts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter(u => u.uid !== user.uid));
      } catch (error: any) {
        console.error("Error fetching contacts:", error);
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchContacts();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedContact) return;

    const chatId = [user.uid, selectedContact.uid].sort().join('_');
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error: any) => {
      console.error("Error in messages snapshot:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'messages');
      }
    });

    return () => unsubscribe();
  }, [user, selectedContact]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (selectedChatContact) {
      setSelectedContact(selectedChatContact);
    }
  }, [selectedChatContact]);

  const handleSendMessage = async () => {
    if (!msgInput.trim() || !user || !selectedContact) return;

    const chatId = [user.uid, selectedContact.uid].sort().join('_');
    const newMsg = {
      chatId,
      senderId: user.uid,
      receiverId: selectedContact.uid,
      content: msgInput,
      timestamp: serverTimestamp(),
      read: false
    };

    setMsgInput('');
    try {
      await addDoc(collection(db, 'messages'), newMsg);
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.CREATE, 'messages');
      }
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : contacts.map((contact) => (
            <ContactItem 
              key={contact.id}
              name={contact.displayName} 
              lastMsg={contact.lastMsg} 
              time="" 
              unread={0} 
              active={selectedContact?.uid === contact.uid}
              image={contact.photoURL}
              onClick={() => setSelectedContact(contact)}
            />
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-20 bg-white border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={selectedContact.photoURL || `https://picsum.photos/seed/${selectedContact.displayName}/100/100`} className="w-10 h-10 rounded-full object-cover" alt={selectedContact.displayName} referrerPolicy="no-referrer" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedContact.displayName}</h3>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-primary-600 rounded-xl transition-all">
                  <Phone size={20} />
                </button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-primary-600 rounded-xl transition-all">
                  <Video size={20} />
                </button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-primary-600 rounded-xl transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col no-scrollbar">
              {messages.map((m) => (
                <Message 
                  key={m.id}
                  content={m.content} 
                  time={m.timestamp?.toDate ? m.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} 
                  isMe={m.senderId === user.uid} 
                />
              ))}
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center gap-4"
              >
                <button type="button" className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                  <Paperclip size={20} />
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    placeholder="Type your message..." 
                    className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors">
                    <Smile size={20} />
                  </button>
                </div>
                <button 
                  type="submit"
                  className="p-3 rounded-2xl gradient-bg text-white shadow-lg shadow-primary-200 hover:scale-105 transition-all active:scale-95"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
              <MessageSquare size={40} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Your Messages</h3>
            <p className="text-sm max-w-xs text-center">Select a contact from the sidebar to start a conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
