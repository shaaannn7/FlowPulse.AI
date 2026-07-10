import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, X, ArrowRight, CheckCircle2, TrendingUp, Zap, ShieldAlert } from 'lucide-react';
import { useJudgeMode } from '../../context/JudgeModeContext';
import { playSynthesizedSound } from '../../lib/sound';

export const JudgeModeHUD: React.FC = () => {
  const {
    isJudgeMode,
    currentStepIndex,
    isPlaying,
    steps,
    togglePlay: contextTogglePlay,
    nextStep: contextNextStep,
    prevStep: contextPrevStep,
    setStep: contextSetStep,
    stopJudgeMode: contextStopJudgeMode,
    showSummary,
  } = useJudgeMode();

  const handlePrev = () => {
    contextPrevStep();
    playSynthesizedSound('click');
  };

  const handleNext = () => {
    contextNextStep();
    playSynthesizedSound('click');
  };

  const handleToggle = () => {
    contextTogglePlay();
    playSynthesizedSound('click');
  };

  const handleSetStep = (idx: number) => {
    contextSetStep(idx);
    playSynthesizedSound('click');
  };

  const handleStop = () => {
    contextStopJudgeMode();
    playSynthesizedSound('click');
  };

  const [progress, setProgress] = useState(0);

  const activeStep = steps[currentStepIndex];

  // Track progress bar timer
  useEffect(() => {
    if (!isJudgeMode || !isPlaying) {
      setProgress(0);
      return;
    }

    setProgress(0);
    const duration = activeStep.durationMs;
    const intervalTime = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalTime;
      setProgress(Math.min(100, (elapsed / duration) * 100));
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isJudgeMode, currentStepIndex, isPlaying, activeStep]);

  if (!isJudgeMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-4xl w-full px-4"
      >
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-950/85 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center gap-6">
          {/* Animated Glowing Ambient Accent */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-10 bg-emerald-500/10 blur-xl rounded-full" />
          
          {/* Progress bar line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-800">
            <motion.div
              className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>

          {/* Left panel: badge & controls */}
          <div className="flex flex-col items-center md:items-start gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 font-mono">
                Judge Walkthrough
              </span>
            </div>
            
            {/* Playback Control Bar */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-white/5 rounded-xl p-1.5 shadow-inner">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Previous Step"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              
              <button
                type="button"
                onClick={handleToggle}
                className="p-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/10 transition-all"
                title={isPlaying ? 'Pause Auto-Play' : 'Resume Auto-Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-slate-950" /> : <Play className="h-4 w-4 fill-slate-950" />}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentStepIndex === steps.length - 1}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Next Step"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Middle panel: Narrative Text */}
          <div className="flex-1 text-center md:text-left space-y-1">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <h4 className="text-sm font-extrabold text-white">
                {activeStep.name}
              </h4>
              <span className={`px-2.5 py-0.5 rounded-full border text-[8px] font-extrabold uppercase tracking-wide ${activeStep.badgeColor}`}>
                {activeStep.subtitle}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-xl truncate md:whitespace-normal">
              {activeStep.description}
            </p>
          </div>

          {/* Right panel: Step indicator list & exit button */}
          <div className="flex items-center gap-4 flex-shrink-0 w-full md:w-auto justify-between md:justify-end">
            {/* Step selection pills */}
            <div className="flex items-center gap-1.5">
              {steps.map((step, idx) => (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => handleSetStep(idx)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-black font-mono transition-all flex items-center justify-center border ${
                    idx === currentStepIndex
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-900 border-white/5 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  0{step.number}
                </button>
              ))}
            </div>

            {/* Exit button */}
            <button
              type="button"
              onClick={handleStop}
              className="p-2.5 rounded-xl border border-white/5 bg-slate-900 hover:bg-rose-950/20 hover:border-rose-500/20 text-slate-500 hover:text-rose-400 transition-all active:scale-95"
              title="Exit Judge Walkthrough"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* --- AI Mission Summary Overlay (End of Demo) --- */}
      {showSummary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.2 }}
            className="relative w-full max-w-4xl rounded-[2rem] border border-emerald-500/30 bg-slate-900/80 p-12 shadow-[0_0_120px_rgba(16,185,129,0.15)] overflow-hidden"
          >
            {/* Background cinematic glow */}
            <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[100px]" />
            <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[100px]" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.5 }}
                className="mb-6 rounded-2xl bg-emerald-500/20 p-4 border border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              >
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>
              
              <h2 className="text-4xl font-black tracking-tight text-white mb-2">
                Mission Accomplished
              </h2>
              <p className="text-lg font-medium text-slate-400 mb-12 max-w-2xl">
                FlowPulse AI successfully balanced the gridlock, resolved the emergency crisis, and dynamically restored full urban mobility.
              </p>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full mb-12">
                {[
                  { label: 'Traffic Health', before: '61', after: '94', suffix: '', icon: <TrendingUp className="h-4 w-4" /> },
                  { label: 'Avg Wait Time', before: '52', after: '18', suffix: 's', icon: <SkipForward className="h-4 w-4" /> },
                  { label: 'Clearance Time', before: '48', after: '9', suffix: 's', icon: <ShieldAlert className="h-4 w-4" /> },
                  { label: 'Fuel Saved', before: '0', after: '18', suffix: '%', icon: <Zap className="h-4 w-4" /> },
                  { label: 'CO₂ Reduction', before: '0', after: '22', suffix: '%', icon: <Zap className="h-4 w-4" /> },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 40, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1.2 + i * 0.4, type: 'spring', stiffness: 200, damping: 12 }}
                    className="flex flex-col items-center p-4 rounded-2xl bg-slate-950/50 border border-white/5 shadow-2xl"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                      {stat.icon} {stat.label}
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-xl font-medium text-slate-500 line-through decoration-rose-500/50">
                        {stat.before}{stat.suffix}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-600" />
                      <span className="text-2xl font-black text-emerald-400 shadow-emerald-400/20 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                        {stat.after}{stat.suffix}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                onClick={handleStop}
                className="rounded-xl bg-white text-slate-950 px-10 py-4 text-sm font-black uppercase tracking-wider hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
              >
                End Demonstration
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JudgeModeHUD;
