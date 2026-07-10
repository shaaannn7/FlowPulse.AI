/**
 * File: VideoUploader.tsx
 * Purpose: Drag-and-drop video file upload component.
 * Why it exists: Gives operators a polished, intuitive interface to feed recorded
 *                traffic videos into the AI pipeline for real-time analysis.
 */

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Film, CheckCircle, AlertCircle, Loader2, X, Play } from 'lucide-react';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { useNotifications } from '../ui/Notifications';

export const VideoUploader: React.FC = () => {
  const {
    uploadState,
    handleFileSelect,
    handleUpload,
    handleRemove,
    isDragging,
    setIsDragging,
  } = useVideoUpload();
  const { addToast } = useNotifications();
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const onUploadClick = async () => {
    await handleUpload();
    if (uploadState.status !== 'error') {
      addToast('AI pipeline started — stream is live!', 'success');
    }
  };

  const onRemove = async () => {
    await handleRemove();
    addToast('Video stream removed.', 'info');
  };

  const { status, progress, error, filename, sizeMb } = uploadState;
  const isStreaming = status === 'streaming';
  const isUploading = status === 'uploading' || status === 'processing';
  const hasFile = !!uploadState.file && status !== 'streaming';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Video Intelligence Feed
          </h3>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[8px] font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            LIVE AI STREAM
          </span>
        )}
      </div>

      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {!isStreaming && (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !hasFile && inputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer min-h-[160px] ${
                isDragging
                  ? 'border-emerald-500/60 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                  : error
                  ? 'border-rose-500/40 bg-rose-950/10'
                  : hasFile
                  ? 'border-violet-500/40 bg-violet-950/10'
                  : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".mp4,.avi,.mov,.mkv"
                className="hidden"
                onChange={onFileInput}
              />

              {!hasFile && !error && (
                <>
                  <div className="rounded-full bg-slate-800 border border-white/10 p-3 mb-3">
                    <Upload className={`h-5 w-5 transition-colors ${isDragging ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">
                    {isDragging ? 'Release to upload' : 'Drop your traffic video here'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">MP4 · AVI · MOV · MKV · Max 500 MB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="mt-4 px-4 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Browse Files
                  </button>
                </>
              )}

              {error && (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-400" />
                  <p className="text-[10px] text-rose-400 font-semibold max-w-[200px]">{error}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {hasFile && !error && (
                <div className="flex flex-col items-center gap-2 w-full">
                  <CheckCircle className="h-5 w-5 text-violet-400" />
                  <p className="text-xs font-bold text-slate-200 truncate max-w-[240px]">{filename}</p>
                  <p className="text-[9px] text-slate-500">{sizeMb} MB · Ready to process</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="mt-2 w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.4 }}
                />
              </div>
            )}

            {/* Action buttons */}
            {hasFile && !isUploading && (
              <div className="flex gap-3 mt-3">
                <button
                  onClick={onUploadClick}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-[10px] font-extrabold text-white transition-colors"
                >
                  <Play className="h-3 w-3" />
                  Start AI Analysis
                </button>
                <button
                  onClick={onRemove}
                  className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {isUploading && (
              <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-slate-400 font-semibold">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                {status === 'processing' ? 'Starting AI pipeline...' : 'Uploading video...'}
              </div>
            )}
          </motion.div>
        )}

        {isStreaming && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 flex items-center gap-4"
          >
            <div className="rounded-full bg-emerald-500/10 p-2.5">
              <Film className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{filename}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{sizeMb} MB · AI processing active</p>
            </div>
            <button
              onClick={onRemove}
              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Format hints */}
      {status === 'idle' && !uploadState.file && (
        <div className="flex items-center gap-3 text-[9px] text-slate-600 font-mono px-1">
          <span>MP4</span><span className="text-slate-800">·</span>
          <span>AVI</span><span className="text-slate-800">·</span>
          <span>MOV</span><span className="text-slate-800">·</span>
          <span>MKV</span><span className="text-slate-800">·</span>
          <span className="text-slate-700">Webcam (soon)</span>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
