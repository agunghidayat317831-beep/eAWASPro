import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, RefreshCw, Layers, FileText } from 'lucide-react';

interface PopupVideoPlayerProps {
  projectId: string;
  projectName: string;
  progress: number;
}

const VIDEO_TEMPLATES = [
  {
    id: '3d-map',
    label: '3D Map Pop-up',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-3d-city-map-40282-large.mp4',
    description: 'Animasi peta 3D dengan pin lokasi dan bangunan bermunculan.'
  },
  {
    id: '3d-house',
    label: 'Konstruksi 3D',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-architecture-blueprint-plan-design-31711-large.mp4',
    description: 'Animasi cetak biru dan konstruksi model rumah 3D.'
  },
  {
    id: 'field-work',
    label: 'Aktifitas Lapangan',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-crane-operating-on-a-construction-site-of-a-building-41005-large.mp4',
    description: 'Video rekaman proyek pembangunan gedung bertingkat.'
  }
];

export default function PopupVideoPlayer({ projectId, projectName, progress }: PopupVideoPlayerProps) {
  const [selectedVideo, setSelectedVideo] = useState(VIDEO_TEMPLATES[0]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isTorn, setIsTorn] = useState(false);
  const [showCrack, setShowCrack] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Automatic sequence of the paper-tear animation on component mount
  useEffect(() => {
    // Reset state when project changes
    setIsTorn(false);
    setShowCrack(false);
    setIsPlaying(true);

    // 1. Show the paper map
    // 2. Play pin-drop / crack animation after 400ms
    const crackTimer = setTimeout(() => {
      setShowCrack(true);
    }, 500);

    // 3. Tear the paper open after 1100ms
    const tearTimer = setTimeout(() => {
      setIsTorn(true);
    }, 1200);

    return () => {
      clearTimeout(crackTimer);
      clearTimeout(tearTimer);
    };
  }, [projectId]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => console.log('Video play error:', err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleReplayAnimation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTorn(false);
    setShowCrack(false);
    
    setTimeout(() => {
      setShowCrack(true);
    }, 400);

    setTimeout(() => {
      setIsTorn(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 1100);
  };

  const handleVideoSelect = (video: typeof VIDEO_TEMPLATES[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVideo(video);
    setIsPlaying(true);
    // Auto-trigger torn state immediately for secondary selections
    setIsTorn(true);
    setShowCrack(true);
  };

  return (
    <div className="w-full space-y-3 font-sans" onClick={(e) => e.stopPropagation()}>
      {/* Aspect Container */}
      <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
        
        {/* Underlay Video layer (Revealed when paper is torn) */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            src={selectedVideo.url}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Custom video overlay controls */}
          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePlay}
                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={handleToggleMute}
                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>

            <button
              onClick={handleReplayAnimation}
              className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
              title="Ulangi Animasi Robek"
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              <span>Efek Robek</span>
            </button>
          </div>
        </div>

        {/* PAPER OVERLAY: Replicates the stop-motion sequence */}
        <AnimatePresence>
          {!isTorn && (
            <motion.div 
              className="absolute inset-0 z-10 bg-slate-50 flex items-center justify-center overflow-hidden"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Paper Map Background Pattern */}
              <div 
                className="absolute inset-0 opacity-40 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px]"
                style={{
                  backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1.5px), linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
                  backgroundSize: '16px 16px, 32px 32px, 32px 32px'
                }}
              />

              {/* Simulated streets lines */}
              <svg className="absolute inset-0 w-full h-full opacity-20 stroke-slate-400" strokeWidth="2">
                <line x1="10%" y1="0%" x2="40%" y2="100%" />
                <line x1="0%" y1="40%" x2="100%" y2="40%" />
                <line x1="30%" y1="20%" x2="80%" y2="20%" />
                <line x1="70%" y1="0%" x2="70%" y2="100%" />
              </svg>

              {/* Pin-drop indicator */}
              <div className="relative flex flex-col items-center">
                {/* Descending Pin hand representation or just dropping pin */}
                <motion.div
                  initial={{ y: -100, opacity: 0, scale: 1.5 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                  className="z-20 relative cursor-pointer"
                >
                  <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="drop-shadow-lg">
                    <path d="M16 2C10.477 2 6 6.477 6 12C6 19.5 16 30 16 30C16 30 26 19.5 26 12C26 6.477 21.523 2 16 2Z" fill="#ef4444" stroke="white" strokeWidth="2"/>
                    <circle cx="16" cy="12" r="4" fill="white"/>
                  </svg>
                </motion.div>

                {/* Simulated Glass/Paper Crack lines */}
                {showCrack && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-8 w-24 h-24 flex items-center justify-center pointer-events-none"
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full stroke-red-600/60 fill-none" strokeWidth="2" strokeLinecap="round">
                      {/* Cracking spokes */}
                      <path d="M50,50 L30,20 M50,50 L75,15 M50,50 L90,45 M50,50 L80,80 M50,50 L45,95 M50,50 L15,70 M50,50 L10,48" />
                      {/* Concentric crack rings */}
                      <circle cx="50" cy="50" r="10" strokeDasharray="3,3" />
                      <circle cx="50" cy="50" r="22" strokeDasharray="5,3" />
                    </svg>
                  </motion.div>
                )}

                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-4 px-2 py-0.5 bg-slate-200/50 rounded backdrop-blur-sm"
                >
                  Menancapkan Pin...
                </motion.span>
              </div>

              {/* Tearing slides - Split visual effect */}
              {showCrack && (
                <div className="absolute inset-0 flex pointer-events-none z-30">
                  {/* Left tear flap */}
                  <motion.div 
                    initial={{ x: 0 }}
                    animate={isTorn ? { x: '-100%', rotate: -5 } : { x: 0 }}
                    transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
                    className="w-1/2 h-full bg-slate-50/90 border-r border-dashed border-slate-300 shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-black/5 to-transparent" />
                  </motion.div>
                  {/* Right tear flap */}
                  <motion.div 
                    initial={{ x: 0 }}
                    animate={isTorn ? { x: '100%', rotate: 5 } : { x: 0 }}
                    transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
                    className="w-1/2 h-full bg-slate-50/90 border-l border-dashed border-slate-300 shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/5 to-transparent" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clean play state badge when paused */}
        {!isPlaying && isTorn && (
          <div 
            onClick={handleTogglePlay}
            className="absolute inset-0 bg-slate-950/40 flex items-center justify-center z-10 cursor-pointer hover:bg-slate-950/30 transition-colors"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-14 h-14 bg-white/90 hover:bg-white text-slate-900 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90"
            >
              <Play size={24} className="ml-1" />
            </motion.div>
          </div>
        )}
      </div>

      {/* Tabs to Switch Video Templates */}
      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          <Layers size={11} className="text-slate-500" />
          <span>Opsi Animasi Pop-up</span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
          {VIDEO_TEMPLATES.map((video) => {
            const isSelected = selectedVideo.id === video.id;
            return (
              <button
                key={video.id}
                onClick={(e) => handleVideoSelect(video, e)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate ${
                  isSelected 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {video.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 leading-normal bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
          <FileText size={12} className="text-slate-400 shrink-0 mt-0.5" />
          <span>{selectedVideo.description}</span>
        </p>
      </div>
    </div>
  );
}
