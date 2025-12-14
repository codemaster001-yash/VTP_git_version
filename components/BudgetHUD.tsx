import React, { useState } from 'react';
import { DollarSign, Edit2, AlertCircle, CheckCircle, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react';

interface BudgetHUDProps {
  totalBudget: number;
  totalSpent: number;
  onUpdateBudget: (newBudget: number) => void;
}

const BudgetHUD: React.FC<BudgetHUDProps> = ({ totalBudget, totalSpent, onUpdateBudget }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tempBudget, setTempBudget] = useState(totalBudget.toString());

  const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
  
  let statusColor = "bg-emerald-500";
  let textColor = "text-emerald-600";
  
  if (percentage > 75) {
      statusColor = "bg-amber-500";
      textColor = "text-amber-600";
  }
  if (percentage >= 100) {
      statusColor = "bg-red-500";
      textColor = "text-red-600";
  }

  const handleSave = () => {
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val > 0) {
        onUpdateBudget(val);
        setIsEditing(false);
    }
  };

  // Collapsed State
  if (isCollapsed) {
      return (
          <button 
            onClick={() => setIsCollapsed(false)}
            className={`p-3 rounded-full shadow-xl border border-white/20 ring-1 ring-black/5 transition-transform hover:scale-110 flex items-center justify-center bg-white ${percentage >= 100 ? 'text-red-600' : 'text-emerald-600'}`}
            title="Expand Budget"
          >
              <IndianRupee className="w-6 h-6" />
          </button>
      );
  }

  // Expanded State
  return (
    <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-5 w-80 border border-white/20 ring-1 ring-black/5 relative animate-in fade-in zoom-in-95 duration-200">
      
      {/* Collapse Button */}
      <button 
        onClick={() => setIsCollapsed(true)}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
      >
          <ChevronUp className="w-4 h-4" />
      </button>

      <div className="flex justify-between items-start mb-4 pr-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Budget</h3>
          {isEditing ? (
             <div className="flex items-center gap-2 mt-1">
                 <span className="text-slate-400 font-bold">₹</span>
                 <input 
                    type="number"
                    value={tempBudget}
                    onChange={(e) => setTempBudget(e.target.value)}
                    className="w-24 px-2 py-1 text-lg font-bold border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    autoFocus
                 />
                 <button onClick={handleSave} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                    <CheckCircle className="w-4 h-4" />
                 </button>
             </div>
          ) : (
            <div className="flex items-center gap-1 mt-1 group cursor-pointer" onClick={() => setIsEditing(true)}>
                <span className="text-2xl font-black text-slate-800">₹{totalBudget.toLocaleString()}</span>
                <Edit2 className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg ${percentage >= 100 ? 'bg-red-100' : 'bg-emerald-100'}`}>
            <IndianRupee className={`w-6 h-6 ${percentage >= 100 ? 'text-red-600' : 'text-emerald-600'}`} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
            <span className="text-slate-500">Spent so far</span>
            <span className={textColor}>₹{totalSpent.toLocaleString()}</span>
        </div>
        
        {/* Progress Bar Container */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div 
                className={`h-full ${statusColor} transition-all duration-1000 ease-out`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>

        <div className="flex justify-between text-xs text-slate-400 pt-1">
            <span>{percentage.toFixed(1)}% used</span>
            <span>₹{Math.max(0, totalBudget - totalSpent).toLocaleString()} remaining</span>
        </div>
      </div>

      {percentage >= 100 && (
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 p-2 rounded border border-red-100">
              <AlertCircle className="w-4 h-4" />
              <span>Budget exceeded! Review your expenses.</span>
          </div>
      )}
    </div>
  );
};

export default BudgetHUD;