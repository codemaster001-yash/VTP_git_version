import React, { useState } from 'react';
import { generateItinerary } from '../services/geminiService';
import { TripItem, Accommodation, TransportType, SubItem, TransportDetails } from '../types';
import { Sparkles, Loader2, X } from 'lucide-react';

interface AIPlannerProps {
  onPlanGenerated: (items: TripItem[], acc: Accommodation[], title: string) => void;
  onClose: () => void;
}

const AIPlanner: React.FC<AIPlannerProps> = ({ onPlanGenerated, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const mapTransportMode = (modeStr?: string): TransportType => {
      const m = modeStr?.toLowerCase() || '';
      if (m.includes('flight') || m.includes('plane')) return TransportType.FLIGHT;
      if (m.includes('train') || m.includes('rail')) return TransportType.TRAIN;
      if (m.includes('bus')) return TransportType.BUS;
      if (m.includes('ferry') || m.includes('boat')) return TransportType.FERRY;
      if (m.includes('walk')) return TransportType.WALK;
      return TransportType.CAR;
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const startDateObj = new Date(); // Start today for the plan
      const startDateStr = startDateObj.toISOString().split('T')[0];
      
      const result = await generateItinerary(prompt, startDateStr);
      
      if (result && result.stops) {
        let currentCursorDate = new Date(startDateObj);

        // Transform API result to app types
        const items: TripItem[] = result.stops.map((stop: any, index: number) => {
            const stayDuration = stop.stayDuration || 1;
            
            // Calculate Arrival Date (Current Cursor)
            const arrivalTime = new Date(currentCursorDate).toISOString();

            // Calculate Departure Date (Arrival + Stay)
            const departureDate = new Date(currentCursorDate);
            departureDate.setDate(departureDate.getDate() + stayDuration);
            const departureTime = departureDate.toISOString();

            // Parse Transport
            const transMode = mapTransportMode(stop.transportToNext?.mode);
            const transDetails: TransportDetails = {
                id: crypto.randomUUID(),
                mode: transMode,
                cost: stop.transportToNext?.cost || 0,
                duration: stop.transportToNext?.duration || '',
                departureTime: departureTime, // Depart after stay
                // For the next item's arrival, we'd theoretically add transport duration, 
                // but for simplicity we'll just set arrival of next item to this departure + offset in the next loop iteration if needed.
                // However, our visualizer uses the *next* item's arrival time for logic, so we set this leg's info here.
                isBooked: false
            };

            // Parse Activities (SubItems)
            const subItems: SubItem[] = (stop.activities || []).map((act: any) => ({
                id: crypto.randomUUID(),
                name: act.name,
                type: act.type === 'Food' ? 'Food' : 'Activity',
                cost: act.cost || 0,
                notes: act.description,
                // Distribute activities across the stay duration roughly? 
                // For now, leave date unset or set to arrival date
                date: '' 
            }));

            // Update Cursor for NEXT iteration
            // Add transport time buffer? Let's assume travel takes a few hours, 
            // but for date logic, next stop starts roughly when this one ends.
            currentCursorDate = new Date(departureDate); 

            // Calculate arrival time for the transport leg (approximate)
            // If the AI gave a duration like "2h", we could parse it, but for now let's just use departureTime
            // In a real app, we'd parse "2h" -> add to departureTime -> set as arrivalTime of this transport leg.
            // Let's try a simple heuristic:
            let travelHours = 4; // default
            if (stop.transportToNext?.duration) {
                const d = stop.transportToNext.duration;
                if (d.includes('h')) travelHours = parseInt(d) || 4;
            }
            const arrivalAtDestTime = new Date(departureDate);
            arrivalAtDestTime.setHours(arrivalAtDestTime.getHours() + travelHours);
            transDetails.arrivalTime = arrivalAtDestTime.toISOString();


            return {
                id: crypto.randomUUID(),
                location: {
                    name: stop.locationName,
                    lat: stop.lat || 0,
                    lng: stop.lng || 0,
                },
                cost: 0, // Stop cost is sum of subitems usually, or we could add a base cost
                type: 'Stop',
                category: 'Activity',
                notes: stop.description,
                subItems: subItems,
                
                // Transport Logic
                transportToNext: transMode,
                transportDetails: transDetails,
                transportOptions: [transDetails]
            };
        });

        // Generate some accommodations based on the stops (Mocking, as the new prompt focuses on activities)
        const accommodations: Accommodation[] = items.map(item => ({
            id: crypto.randomUUID(),
            name: `Hotel in ${item.location.name}`,
            costPerNight: 1000 + Math.floor(Math.random() * 5000), // Random placeholder
            checkIn: item.transportDetails?.departureTime || new Date().toISOString(), // Rough approx
            checkOut: item.transportDetails?.departureTime || new Date().toISOString(),
            status: 'Candidate'
        }));

        onPlanGenerated(items, accommodations, result.title || "AI Generated Trip");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600">
           <div className="flex justify-between items-center text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> AI Trip Planner
              </h2>
              <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition">
                <X className="w-5 h-5" />
              </button>
           </div>
           <p className="text-indigo-100 text-sm mt-2">
             Describe your dream trip. We'll group activities by city and find the best travel options for you.
           </p>
        </div>
        
        <div className="p-6">
            <textarea
                className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm bg-white text-slate-900 placeholder:text-slate-400"
                placeholder="e.g., A 10-day trip to Japan starting in Tokyo, then Kyoto and Osaka. I like food and temples."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            ></textarea>
            
            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {loading ? "Planning Itinerary..." : "Generate Itinerary"}
            </button>
            
            <div className="mt-4 text-xs text-slate-400 text-center">
                Powered by Gemini 2.5 Flash & Google Maps Grounding
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIPlanner;