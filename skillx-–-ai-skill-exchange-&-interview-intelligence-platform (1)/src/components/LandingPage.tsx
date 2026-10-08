import React from 'react';
import { motion } from 'motion/react';
import { 
  BrainCircuit, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Star, 
  ShieldCheck, 
  Sparkles,
  Zap,
  PlayCircle,
  X,
  MessageSquare,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="p-8 rounded-3xl glass hover:shadow-xl transition-all duration-300 group"
  >
    <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold font-display text-slate-800 mb-3">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{description}</p>
  </motion.div>
);

const TestimonialCard = ({ name, role, content, image }: { name: string, role: string, content: string, image: string }) => (
  <div className="p-6 rounded-2xl bg-white shadow-sm border border-slate-100">
    <div className="flex items-center gap-1 text-yellow-400 mb-4">
      {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
    </div>
    <p className="text-slate-600 italic mb-6">"{content}"</p>
    <div className="flex items-center gap-3">
      <img src={image} alt={name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
      <div>
        <h4 className="text-sm font-bold text-slate-800">{name}</h4>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
    </div>
  </div>
);

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md z-50 border-b border-slate-100 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-primary-200">
            <BrainCircuit size={24} />
          </div>
          <span className="text-2xl font-bold font-display tracking-tight text-slate-900">SkillX</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-primary-600 transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-primary-600 transition-colors">Pricing</a>
          <a href="#testimonials" className="hover:text-primary-600 transition-colors">Testimonials</a>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onGetStarted} className="text-sm font-semibold text-slate-700 hover:text-primary-600 transition-colors">Log In</button>
          <button 
            onClick={onGetStarted}
            className="px-6 py-2.5 rounded-full gradient-bg text-white text-sm font-bold shadow-lg shadow-primary-200 hover:scale-105 transition-all active:scale-95"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} />
            <span>AI-Powered Skill Exchange</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold font-display leading-[1.1] text-slate-900 mb-6">
            Learn. Teach. <br />
            <span className="gradient-text">Master New Skills.</span>
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-lg leading-relaxed">
            The world's first platform for peer-to-peer skill exchange. Connect with experts, share your knowledge, and grow your career together.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 rounded-full gradient-bg text-white font-bold shadow-xl shadow-primary-200 flex items-center justify-center gap-2 hover:translate-y-[-2px] transition-all active:scale-95"
            >
              Start Learning Now <ArrowRight size={20} />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
              <PlayCircle size={20} className="text-primary-600" /> Watch Demo
            </button>
          </div>
          <div className="mt-12 flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <img 
                  key={i} 
                  src={`https://picsum.photos/seed/user${i}/100/100`} 
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm" 
                  alt="User"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Joined by <span className="text-slate-900 font-bold">12,000+</span> learners this month
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-accent-400/20 rounded-full blur-3xl animate-pulse delay-700"></div>
          
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <img 
              src="https://picsum.photos/seed/dashboard/1200/800" 
              alt="Dashboard Preview" 
              className="w-full h-auto"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-900/40 to-transparent"></div>
            
            {/* Floating AI Card */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 -left-6 p-4 rounded-2xl glass shadow-xl max-w-[200px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <Zap size={12} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">AI Feedback</span>
              </div>
              <p className="text-xs font-medium text-slate-800">"Your confidence score increased by 15% in the last session!"</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-sm font-bold text-primary-600 uppercase tracking-widest mb-4">Core Features</h2>
            <h3 className="text-4xl md:text-5xl font-bold font-display text-slate-900 mb-6">Everything you need to master your career.</h3>
            <p className="text-slate-600">SkillX combines the best of peer learning with cutting-edge AI to provide a complete career growth ecosystem.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Users}
              title="Skill Exchange"
              description="Connect with peers worldwide. Teach what you know, learn what you don't. A credit-based system that values your time."
              delay={0.1}
            />
            <FeatureCard 
              icon={MessageSquare}
              title="Real-time Chat"
              description="Communicate instantly with your mentors and learners. Build relationships and learn faster through direct interaction."
              delay={0.2}
            />
            <FeatureCard 
              icon={Globe}
              title="Global Community"
              description="Join a diverse community of professionals from around the world. Expand your network and cultural horizons."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="space-y-12">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-primary-200">1</div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Create Your Profile</h4>
                  <p className="text-slate-600">List your skills and what you want to learn. Our AI matches you with the perfect learning partners.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-primary-200">2</div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Exchange & Earn</h4>
                  <p className="text-slate-600">Book sessions with mentors. Earn credits by teaching others. It's a self-sustaining knowledge economy.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-primary-200">3</div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Master Your Career</h4>
                  <p className="text-slate-600">Apply your new skills to real-world projects and advance your professional journey with confidence.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-4xl font-bold font-display text-slate-900 mb-8">A seamless journey from learning to earning.</h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              We've built SkillX to be more than just a learning platform. It's a community-driven intelligence engine designed to bridge the gap between education and employment.
            </p>
            <div className="p-8 rounded-3xl bg-slate-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl"></div>
              <div className="flex items-center gap-4 mb-6">
                <ShieldCheck className="text-primary-400" size={32} />
                <span className="text-lg font-bold">Verified Skills</span>
              </div>
              <p className="text-slate-300 mb-6">Every skill on SkillX is verified through peer feedback and AI assessments, ensuring high-quality learning for everyone.</p>
              <button className="text-primary-400 font-bold flex items-center gap-2 hover:gap-3 transition-all">
                Learn more about verification <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold font-display text-slate-900 mb-4">Simple, transparent pricing.</h3>
            <p className="text-slate-600">Choose the plan that fits your career goals.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-10 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <h4 className="text-xl font-bold text-slate-900 mb-2">Free</h4>
              <p className="text-slate-500 mb-6">Perfect for getting started.</p>
              <div className="text-4xl font-bold text-slate-900 mb-8">$0 <span className="text-lg font-normal text-slate-400">/mo</span></div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 size={18} className="text-green-500" /> 5 Credits / month</li>
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 size={18} className="text-green-500" /> Basic Skill Exchange</li>
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 size={18} className="text-green-500" /> Community Support</li>
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-all">Join Free</button>
            </div>

            {/* Premium Plan */}
            <div className="p-10 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 bg-primary-600 text-xs font-bold uppercase tracking-widest rounded-bl-xl">Popular</div>
              <h4 className="text-xl font-bold mb-2">Premium</h4>
              <p className="text-slate-400 mb-6">For serious career growth.</p>
              <div className="text-4xl font-bold mb-8">$19 <span className="text-lg font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 size={18} className="text-primary-400" /> Unlimited Credits</li>
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 size={18} className="text-primary-400" /> Priority Mentor Matching</li>
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 size={18} className="text-primary-400" /> Exclusive Workshops</li>
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 size={18} className="text-primary-400" /> 24/7 Premium Support</li>
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl gradient-bg font-bold text-white shadow-lg shadow-primary-900/20 hover:scale-105 transition-all">Go Premium</button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold font-display text-slate-900 mb-4">Loved by learners everywhere.</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <TestimonialCard 
            name="Sarah Johnson"
            role="Frontend Developer @ Google"
            content="SkillX helped me master React while teaching others CSS. The AI interview coach was the reason I landed my job at Google!"
            image="https://picsum.photos/seed/sarah/100/100"
          />
          <TestimonialCard 
            name="David Chen"
            role="Data Scientist @ Meta"
            content="The feedback system is incredible. It pointed out filler words I didn't even know I was using. My confidence has skyrocketed."
            image="https://picsum.photos/seed/david/100/100"
          />
          <TestimonialCard 
            name="Elena Rodriguez"
            role="Product Manager @ Airbnb"
            content="I love the credit system. It feels great to give back to the community while learning new leadership skills from experts."
            image="https://picsum.photos/seed/elena/100/100"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 border-b border-slate-800 pb-12 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 text-white mb-6">
              <BrainCircuit size={28} className="text-primary-500" />
              <span className="text-2xl font-bold font-display tracking-tight">SkillX</span>
            </div>
            <p className="max-w-sm mb-8">
              Empowering the next generation of professionals through peer-to-peer skill exchange and AI-driven interview intelligence.
            </p>
            <div className="flex gap-4">
              {/* Social Icons Placeholder */}
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer">
                <Users size={18} className="text-white" />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer">
                <MessageSquare size={18} className="text-white" />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer">
                <BrainCircuit size={18} className="text-white" />
              </div>
            </div>
          </div>
          <div>
            <h5 className="text-white font-bold mb-6">Platform</h5>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Skill Exchange</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Mentorship</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Workshops</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold mb-6">Company</h5>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-6 text-xs">
          <p>© 2026 SkillX Platform. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Support</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
            <a href="#" className="hover:text-white transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
