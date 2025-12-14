import React from 'react';
import { Trip } from '../types';
import { Calendar, Trash2, ArrowRight, FileText } from 'lucide-react';

interface TripHistoryProps {
  savedTrips: Trip[];
  onLoadTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onNewTrip: () => void;
  onViewReport: (trip: Trip) => void;
}

const TripHistory: React.FC<TripHistoryProps> = ({ savedTrips, onLoadTrip, onDeleteTrip, onNewTrip, onViewReport }) => {
  return (
    <div className="p-6 md:p-10 h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Trip History</h2>
                <p className="text-slate-500">Manage your saved adventures</p>
            </div>
            <button 
                onClick={onNewTrip}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
            >
                Start New Trip
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savedTrips.length === 0 && (
                <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-700">No saved trips yet</h3>
                    <p className="text-slate-500">Create a trip and save it to see it here.</p>
                </div>
            )}

            {savedTrips.map(trip => {
                // Approximate calculation for history view
                let totalCost = trip.accommodations.reduce((sum, a) => sum + a.costPerNight, 0);
                
                // Add Item Costs (which includes SubItems if logic is consistent, or sum transport details)
                // For history preview, a rough sum is fine.
                totalCost += trip.items.reduce((sum, i) => sum + i.cost + (i.transportDetails?.cost || 0), 0);
                
                return (
                    <div key={trip.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden flex flex-col group relative">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-slate-800 line-clamp-1 pr-8">{trip.title}</h3>
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        onDeleteTrip(trip.id); 
                                    }}
                                    className="absolute top-6 right-6 p-2 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors z-20 shadow-sm border border-transparent hover:border-red-100"
                                    title="Delete Trip"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {new Date(trip.startDate).toLocaleDateString()}
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Budget Used</p>
                                    <p className="text-lg font-semibold text-slate-700">
                                        ₹{totalCost.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ ₹{trip.totalBudget.toLocaleString()}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Stops</p>
                                    <p className="text-slate-700 font-medium">{trip.items.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-t border-slate-100 relative z-10">
                            <button 
                                onClick={() => onLoadTrip(trip)}
                                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-600 flex items-center justify-center gap-2 transition-colors border-r border-slate-100"
                            >
                                Edit Plan
                            </button>
                            {trip.hasFinalReport && (
                                <button 
                                    onClick={() => onViewReport(trip)}
                                    className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-sm font-medium text-blue-700 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <FileText className="w-4 h-4" /> Report
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default TripHistory;