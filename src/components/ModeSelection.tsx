import { useEditorStore } from '../stores/editorStore';
import { Image, Video, Sparkles } from 'lucide-react';

export default function ModeSelection() {
  const { setMode } = useEditorStore();

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505]/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Image/Design Card */}
        <div 
          onClick={() => setMode('image')}
          className="group relative aspect-[4/5] md:aspect-auto md:h-[500px] bg-[#11151E] border border-[#232A36] rounded-3xl p-8 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-[#7B5CFF]/50 hover:bg-[#161B25] transition-all duration-500 overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={120} className="text-[#7B5CFF]" />
          </div>
          
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#7B5CFF] to-[#00C8FF] flex items-center justify-center shadow-[0_0_40px_rgba(123,92,255,0.3)] group-hover:scale-110 transition-transform duration-500">
            <Image size={48} className="text-white" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-black tracking-tight text-white group-hover:text-[#00C8FF] transition-colors">
              DESIGN STUDIO
            </h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">
              Create stunning social media graphics, <br /> posters and professional layouts.
            </p>
          </div>

          <div className="mt-4 px-6 py-2 rounded-full bg-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 group-hover:text-[#7B5CFF] transition-colors">
            Select Mode
          </div>
        </div>

        {/* Video Card */}
        <div 
          onClick={() => setMode('video')}
          className="group relative aspect-[4/5] md:aspect-auto md:h-[500px] bg-[#11151E] border border-[#232A36] rounded-3xl p-8 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-[#00C8FF]/50 hover:bg-[#161B25] transition-all duration-500 overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={120} className="text-[#00C8FF]" />
          </div>

          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#00C8FF] to-[#7B5CFF] flex items-center justify-center shadow-[0_0_40px_rgba(0,200,255,0.3)] group-hover:scale-110 transition-transform duration-500">
            <Video size={48} className="text-white" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-black tracking-tight text-white group-hover:text-[#00C8FF] transition-colors">
              VIDEO COMPOSITOR
            </h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">
              Advanced multi-track video editing, <br /> transitions and cinematic effects.
            </p>
          </div>

          <div className="mt-4 px-6 py-2 rounded-full bg-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 group-hover:text-[#00C8FF] transition-colors">
            Select Mode
          </div>
        </div>

      </div>
    </div>
  );
}
