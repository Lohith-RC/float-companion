import { FC, useRef, useState, useEffect } from 'react';
import { Pen, Highlighter, Eraser, RotateCcw, X } from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface ScreenCanvasProps {
  onClose: () => void;
}

export const ScreenCanvas: FC<ScreenCanvasProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState('#38bdf8'); // Sky blue

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color + '55'; // translucent
      ctx.lineWidth = 18;
      ctx.lineCap = 'square';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
    }

    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sounds.playClick();
  };

  return (
    <div className="fixed inset-0 z-[100] cursor-crosshair select-none bg-black/15 backdrop-blur-[0.5px]">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="w-full h-full block"
      />

      {/* Floating Canvas Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-white/20 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-2xl backdrop-blur-xl">
        <button
          onClick={() => {
            setTool('pen');
            sounds.playClick();
          }}
          className={`p-1.5 rounded-lg transition-all active:scale-95 ${
            tool === 'pen' ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
          title="Pen Tool"
        >
          <Pen className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setTool('highlighter');
            sounds.playClick();
          }}
          className={`p-1.5 rounded-lg transition-all active:scale-95 ${
            tool === 'highlighter' ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
          title="Highlighter"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setTool('eraser');
            sounds.playClick();
          }}
          className={`p-1.5 rounded-lg transition-all active:scale-95 ${
            tool === 'eraser' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
          title="Eraser"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* Color presets */}
        <div className="flex items-center gap-1.5 px-2 border-l border-r border-white/10">
          {['#38bdf8', '#ef4444', '#10b981', '#f59e0b', '#ffffff'].map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                sounds.playClick();
              }}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                color === c ? 'scale-125 ring-2 ring-white/70 shadow-sm' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          onClick={clearCanvas}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
          title="Clear Screen"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-all active:scale-95 ml-1"
          title="Exit Canvas (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
