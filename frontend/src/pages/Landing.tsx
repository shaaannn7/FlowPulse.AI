import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Award,
  Activity,
  CheckCircle,
  TrendingUp,
  Clock,
  Play
} from 'lucide-react';
import { useJudgeMode } from '../context/JudgeModeContext';
import { useNavigate } from 'react-router-dom';

// ─── Sub-component: Floating Canvas City Simulator ──────────────────────────
const CityVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Track cursor for magnetic force interactions
    const mouse = { x: -1000, y: -1000, radius: 100 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes representing cars flowing through smart grids
    class VehicleParticle {
      x: number;
      y: number;
      speed: number;
      color: string;
      direction: 'h' | 'v';
      size: number;

      constructor() {
        this.direction = Math.random() > 0.5 ? 'h' : 'v';
        this.size = Math.random() * 2 + 2;
        this.speed = Math.random() * 1.5 + 0.8;
        this.color = Math.random() > 0.85 ? '#f43f5e' : '#10b981'; // 15% emergency red
        
        if (this.direction === 'h') {
          this.x = Math.random() * width;
          this.y = Math.floor(Math.random() * 4) * (height / 4) + height / 8;
        } else {
          this.x = Math.floor(Math.random() * 4) * (width / 4) + width / 8;
          this.y = Math.random() * height;
        }
      }

      update() {
        if (this.direction === 'h') {
          this.x += this.speed;
          if (this.x > width) this.x = -10;
        } else {
          this.y += this.speed;
          if (this.y > height) this.y = -10;
        }

        // Mouse magnetic deviation
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          if (this.direction === 'h') {
            this.y += dy * force * 0.1;
          } else {
            this.x += dx * force * 0.1;
          }
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color;
        // Bounding box glow for emergency vehicle particles
        if (this.color === '#f43f5e') {
          c.shadowColor = '#f43f5e';
          c.shadowBlur = 8;
        } else {
          c.shadowBlur = 0;
        }
        c.fill();
      }
    }

    const particles: VehicleParticle[] = Array.from({ length: 45 }, () => new VehicleParticle());

    const drawGridLines = () => {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;

      // Draw horizontal streets
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i * height) / 4);
        ctx.lineTo(width, (i * height) / 4);
        ctx.stroke();
      }

      // Draw vertical streets
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo((i * width) / 4, 0);
        ctx.lineTo((i * width) / 4, height);
        ctx.stroke();
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(9, 10, 15, 0.2)'; // trail effect
      ctx.fillRect(0, 0, width, height);

      drawGridLines();

      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />;
};

export const Landing: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { startJudgeMode } = useJudgeMode();
  const [activeTab, setActiveTab] = useState<'problem' | 'solution'>('solution');
  // Use a ref for the spotlight element — avoids any re-render on mouse move
  const spotlightRef = useRef<HTMLDivElement>(null);

  const handleLaunchJudgeMode = () => {
    startJudgeMode();
    navigate('/digital-twin');
  };

  const steps = [
    { icon: <Cpu className="h-5 w-5" />, title: 'Observe', desc: 'Neural YOLOv11 frames classification runs at 15 FPS on CPU/GPU bounds.' },
    { icon: <Activity className="h-5 w-5" />, title: 'Analyze', desc: 'Decoded bounding box tracks are converted to high-frequency telemetry metrics.' },
    { icon: <TrendingUp className="h-5 w-5" />, title: 'Predict', desc: 'Predictive analytics forecast peak wait times and congestion patterns.' },
    { icon: <Clock className="h-5 w-5" />, title: 'Optimize', desc: 'Adaptive controller cycles signal actuators depending on balanced traffic queues.' },
    { icon: <CheckCircle className="h-5 w-5" />, title: 'Improve', desc: 'Minimizes passenger wait index and tracks real-time carbon offsets.' },
  ];




  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (!spotlightRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Mutate the DOM directly — zero re-renders
    spotlightRef.current.style.background =
      `radial-gradient(400px circle at ${x}px ${y}px, rgba(16,185,129,0.05), transparent 80%)`;
  };

  return (
    <div
      onMouseMove={handleGlobalMouseMove}
      className="min-h-screen bg-[#07080c] text-slate-100 selection:bg-emerald-500/30 overflow-x-hidden relative"
    >
      {/* ─── Mouse-responsive flashlight spotlight ─── */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
      />

      {/* ─── Ambient Glow Gradients ────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] rounded-full bg-violet-500/5 blur-[150px] pointer-events-none" />

      {/* ─── Navigation Header ─────────────────────────────────────────────── */}
      <header className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white">FlowPulse AI</h1>
            <p className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest font-mono">ATSC PLATFORM</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <button
            onClick={onLogin}
            className="rounded-xl border border-white/10 hover:border-white/20 bg-slate-900/40 px-4 py-2 text-xs font-bold transition-all cursor-pointer"
          >
            Console Login
          </button>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Hero Copy */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/15 bg-emerald-950/20 text-[9px] font-black uppercase tracking-widest text-emerald-400 font-mono"
          >
            <Award className="h-3 w-3" /> CodeStorm 2026 Month 2 Submission
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white"
          >
            Autonomous Flow <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-450 via-teal-400 to-indigo-400">
              Adaptive Grid Control
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs md:text-sm text-slate-400 font-semibold leading-relaxed max-w-xl mx-auto lg:mx-0"
          >
            FlowPulse AI is a computer-vision powered Adaptive Traffic Signal Control (ATSC) system. It transforms raw video streams into sub-second signal overrides, optimizing traffic efficiency, emergency corridors, and emissions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
          >
            <motion.button
              onClick={handleLaunchJudgeMode}
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(16,185,129,0.25)' }}
              whileTap={{ scale: 0.96 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black transition-all px-6 py-4 text-xs shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              <span>Start Demo: Judge Mode</span>
            </motion.button>

            <motion.button
              onClick={onLogin}
              whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.25)' }}
              whileTap={{ scale: 0.96 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-slate-950/60 hover:bg-slate-900/60 transition-all px-6 py-4 text-xs font-bold text-slate-300 cursor-pointer"
            >
              <span>Operator Console</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </motion.div>
        </div>

        {/* Hero Interactive Visualization Canvas */}
        <div className="lg:col-span-5 relative w-full aspect-square md:aspect-video lg:aspect-square rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md shadow-2xl overflow-hidden min-h-[300px]">
          <CityVisualizer />
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
            <span className="text-[8px] font-mono text-slate-500">GRID VIEWPORT</span>
            <span className="text-[10px] font-extrabold text-slate-300">Junction Central Simulation</span>
          </div>
        </div>
      </section>

      {/* ─── Product Narrative Section (Observing to Optimizing) ─────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-450 font-mono">The Pipeline Flow</h3>
          <h2 className="text-2xl md:text-3xl font-black text-white">How FlowPulse AI Restores Balance</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Five asynchronous stages of real-time computer vision and control loops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {steps.map((s, idx) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-white/5 bg-slate-950/20 p-6 space-y-4 hover:border-emerald-500/10 transition-all hover:bg-slate-950/40"
            >
              <div className="rounded-xl bg-slate-900/80 border border-white/5 w-fit p-3 text-emerald-400">
                {s.icon}
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Stage 0{idx + 1}</span>
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-wide">{s.title}</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Interactive Tab: Problem vs Solution ──────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="flex justify-center mb-10">
          <div className="flex bg-slate-950 border border-white/5 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-6 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
                activeTab === 'problem'
                  ? 'bg-rose-500/15 border border-rose-500/20 text-rose-400 shadow-md shadow-black/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              The Problem
            </button>
            <button
              onClick={() => setActiveTab('solution')}
              className={`px-6 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
                activeTab === 'solution'
                  ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shadow-md shadow-black/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              The FlowPulse Solution
            </button>
          </div>
        </div>

        <div className="min-h-[220px]">
          {activeTab === 'problem' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-rose-500/10 bg-rose-950/5 p-6 space-y-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase">Static Clocks</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Conventional lights operate on rigid presets, allocating green time to empty lanes while congested roads idle.
                </p>
              </div>
              <div className="rounded-2xl border border-rose-500/10 bg-rose-950/5 p-6 space-y-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase">Emergency Blocking</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Ambulance queues are locked behind red signals, adding critical delays when routing emergency services.
                </p>
              </div>
              <div className="rounded-2xl border border-rose-500/10 bg-rose-950/5 p-6 space-y-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase">CO2 Emissions</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Prolonged vehicle idling at intersections accounts for over 15% of urban greenhouse gas pollutants.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/5 p-6 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase">Adaptive Actuation</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Inferences vehicle counts at sub-second speeds, dynamically balancing green signal allocations.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/5 p-6 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase">Green Corridors</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Generates automated preemption corridors upon classifying priority vehicles, clearing routes in advance.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/5 p-6 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase">Emissions Tracking</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Directly outputs cumulative carbon metric savings relative to baseline traffic idle cycles.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Technology Stack Section ─────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto space-y-3 mb-12">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 font-mono">Platform Stack</h3>
          <h2 className="text-xl md:text-2xl font-black text-slate-200">Built with Industry Standards</h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'FastAPI', 'OpenCV', 'YOLOv11', 'Pytest'].map((t) => (
            <span
              key={t}
              className="rounded-xl border border-white/5 bg-slate-950/40 px-5 py-2.5 text-xs font-bold font-mono text-slate-355 text-emerald-300 shadow-sm"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ─── Call To Action: Judge Mode Highlight ──────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-28 text-center">
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-slate-950 to-slate-950/40 p-12 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-12 bg-emerald-500/10 blur-2xl rounded-full" />
          
          <div className="flex justify-center">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/40 p-3.5 text-emerald-400">
              <ShieldCheck className="h-7 w-7" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Evaluate with One-Click Judge Mode</h2>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-xl mx-auto">
              Ready to see the platform in action? Trigger the simulated demonstration script. It loops the interface through normal states, congestion spikes, emergency preemption corridor activations, and recovery telemetry.
            </p>
          </div>

          <button
            onClick={handleLaunchJudgeMode}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-8 py-4 text-xs transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/10"
          >
            <Play className="h-4.5 w-4.5 fill-slate-950" />
            <span>Launch Automatic Walkthrough</span>
          </button>
        </div>
      </section>

      {/* ─── Footer Section ───────────────────────────────────────────────── */}
      <footer className="relative z-20 border-t border-white/5 bg-[#06070a] py-8 text-center text-[10px] text-slate-500 font-mono">
        <p>© 2026 FlowPulse AI. Built for CodeStorm Month 2. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
