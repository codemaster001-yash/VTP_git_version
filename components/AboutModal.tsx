import React from 'react';
import { X, Map, Move, MousePointerClick, Layout, Sparkles, PieChart } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome to Visual Trip Planner</h2>
            <p className="text-slate-500">Your interactive guide to planning the perfect journey.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="flex gap-4 items-start">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                    <Map className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Visual Canvas</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Double-click anywhere to add a stop. Use the <strong>Pan Map</strong> toggle to move around or <strong>Drag Pins</strong> to rearrange your route visually.
                    </p>
                </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4 items-start">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                    <MousePointerClick className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Interactive Transport</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Click the icons on the connecting lines to open the <strong>Transport HUD</strong>. Manage flights, trains, or car rides, compare multiple options, and auto-calculate durations.
                    </p>
                </div>
            </div>

             {/* Feature 3 */}
             <div className="flex gap-4 items-start">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
                    <Layout className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Detailed Itinerary</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Use the <strong>Left Panel</strong> to add stays, activities, and food spots for each stop. Costs are automatically summed up to help you stay on budget.
                    </p>
                </div>
            </div>

             {/* Feature 4 */}
             <div className="flex gap-4 items-start">
                <div className="p-3 bg-violet-100 text-violet-600 rounded-xl shrink-0">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">AI Assistant</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Stuck on ideas? Click <strong>AI Plan</strong> to let Gemini generate a full itinerary for you, complete with estimated costs and hidden gems.
                    </p>
                </div>
            </div>
            
             {/* Feature 5 */}
             <div className="flex gap-4 items-start">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl shrink-0">
                    <PieChart className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Budget Tracking</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Keep an eye on the <strong>Budget HUD</strong> in the top-right corner. It updates in real-time as you add expenses for transport, accommodation, and activities.
                    </p>
                </div>
            </div>

             {/* Feature 6 */}
             <div className="flex gap-4 items-start">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl shrink-0">
                    <Move className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Flexible Design</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Drag the Transport info cards anywhere on the canvas to declutter your view. Toggle "Return Trip" to complete your journey loop.
                    </p>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
             <button 
                onClick={onClose}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-transform active:scale-95 shadow-lg shadow-blue-200"
             >
                Got it, let's plan!
             </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;