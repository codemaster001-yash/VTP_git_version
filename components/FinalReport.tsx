
import React from 'react';
import { Trip, TripItem, TransportType, SubItem } from '../types';
import { Calendar, MapPin, DollarSign, Clock, Plane, Train, Car, Bus, Ship, Footprints, Printer, ArrowLeft, CheckCircle2, BedDouble, Utensils, Camera, StickyNote, ArrowRight, Ban, Moon, AlertCircle, Info } from 'lucide-react';

interface FinalReportProps {
  trip: Trip;
  onBack: () => void;
}

const FinalReport: React.FC<FinalReportProps> = ({ trip, onBack }) => {
  // Calculations
  const totalCost = trip.items.reduce((acc, item) => acc + item.cost, 0);
  
  const firstItem = trip.items[0];
  const lastItem = trip.items.length > 0 ? trip.items[trip.items.length - 1] : null;

  const displayStartDate = firstItem?.transportDetails?.departureTime 
      ? new Date(firstItem.transportDetails.departureTime) 
      : new Date(trip.startDate);

  const displayEndDate = lastItem?.transportDetails?.arrivalTime 
      ? new Date(lastItem.transportDetails.arrivalTime) 
      : new Date(trip.endDate);
      
  const durationTimeDiff = displayEndDate.getTime() - displayStartDate.getTime();
  const durationDays = Math.max(1, Math.ceil(durationTimeDiff / (1000 * 3600 * 24)));

  const handlePrint = () => {
    window.print();
  };

  const getTransportIcon = (type?: TransportType, className: string = "w-4 h-4") => {
    switch (type) {
      case TransportType.FLIGHT: return <Plane className={className} />;
      case TransportType.TRAIN: return <Train className={className} />;
      case TransportType.CAR: return <Car className={className} />;
      case TransportType.BUS: return <Bus className={className} />;
      case TransportType.FERRY: return <Ship className={className} />;
      case TransportType.WALK: return <Footprints className={className} />;
      case TransportType.NONE: return <Ban className={className} />;
      default: return <Car className={className} />;
    }
  };

  // Helper to format date ranges for stops
  const getStopTimeline = (arrival?: string, departure?: string) => {
      const arr = arrival ? new Date(arrival) : null;
      const dep = departure ? new Date(departure) : null;
      
      let durationStr = "";
      if (arr && dep) {
          const diffMs = dep.getTime() - arr.getTime();
          const nights = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); 
          if (nights > 0) durationStr = `${nights} Nights`;
          else durationStr = "Day Visit";
      }

      return {
          arrivalText: arr ? arr.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : "Start of Trip",
          departureText: dep ? dep.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : "End of Trip",
          duration: durationStr,
          arrivalDateObj: arr
      };
  };

  const groupSubItemsByDate = (subItems: SubItem[], arrivalDate?: Date) => {
      const grouped: Record<string, SubItem[]> = {};
      const noDateKey = "Unscheduled";

      subItems.forEach(sub => {
          let dateKey = noDateKey;
          if (sub.date) {
              // Group by YYYY-MM-DD
              dateKey = sub.date.split('T')[0]; 
          }
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(sub);
      });

      // Sort logic
      return Object.keys(grouped).sort().map(dateKey => {
          let title = "Unscheduled Activities";
          let subTitle = "";

          if (dateKey !== noDateKey) {
              const d = new Date(dateKey);
              title = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
              
              // Calculate Day Number relative to stop arrival if possible
              if (arrivalDate) {
                  const arrMidnight = new Date(arrivalDate);
                  arrMidnight.setHours(0,0,0,0);
                  const currMidnight = new Date(d);
                  currMidnight.setHours(0,0,0,0);
                  
                  // Use UTC to avoid DST issues roughly
                  const diffTime = currMidnight.getTime() - arrMidnight.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays >= 0) {
                      subTitle = `Day ${diffDays + 1}`;
                  }
              }
          }

          return {
              dateKey,
              title,
              subTitle,
              items: grouped[dateKey].sort((a, b) => {
                  if (!a.date) return 1; 
                  if (!b.date) return -1;
                  return new Date(a.date).getTime() - new Date(b.date).getTime();
              })
          };
      });
  };

  return (
    <div className="h-full bg-slate-100 overflow-y-auto print:overflow-visible print:h-auto p-4 md:p-8">
      {/* Toolbar */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
         <button 
           onClick={onBack}
           className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 font-medium transition-colors"
         >
           <ArrowLeft className="w-4 h-4" /> Back to Planner
         </button>
         <button 
           onClick={handlePrint}
           className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 font-bold transition-colors"
         >
           <Printer className="w-4 h-4" /> Print Report
         </button>
      </div>

      {/* Report Paper */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden min-h-[1000px] print:shadow-none print:rounded-none">
         {/* Report Header */}
         <div className="bg-slate-900 text-white p-10 print:bg-slate-900 print:text-white">
            <div className="flex justify-between items-start">
               <div>
                  <h6 className="text-blue-400 font-bold tracking-widest uppercase text-xs mb-2">Trip Itinerary Report</h6>
                  <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">{trip.title}</h1>
                  
                  <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-300">
                      <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span>{displayStartDate.toLocaleDateString(undefined, { dateStyle: 'long' })} &mdash; {displayEndDate.toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span>{durationDays} Days / {durationDays - 1} Nights</span>
                      </div>
                  </div>
               </div>
               <div className="text-right bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/20">
                   <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Estimated Cost</div>
                   <div className="text-3xl font-bold text-emerald-400">₹{totalCost.toLocaleString()}</div>
               </div>
            </div>
         </div>

         {/* Itinerary Body */}
         <div className="p-10">
            {trip.items.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                    <p>No itinerary items found. Go back and plan your trip!</p>
                </div>
            )}

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-12">
               {trip.items.map((item, index) => {
                  const isLastItem = index === trip.items.length - 1;
                  const nextItem = trip.items[index + 1] || (trip.returnTrip && isLastItem ? trip.items[0] : null);
                  
                  // Calculate Timeline for this stop
                  const prevItem = index > 0 ? trip.items[index - 1] : null;
                  const arrivalTime = (index === 0) ? undefined : prevItem?.transportDetails?.arrivalTime;
                  const departureTime = item.transportDetails?.departureTime;
                  
                  const timeline = getStopTimeline(arrivalTime, departureTime);

                  // Group Sub Items by Date
                  const groupedActivities = groupSubItemsByDate(item.subItems || [], timeline.arrivalDateObj || undefined);

                  return (
                     <div key={item.id} className="relative pl-8 break-inside-avoid">
                        {/* Timeline Node */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-sm ring-2 ring-slate-100"></div>

                        {/* Location Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold uppercase tracking-wide">Stop {index + 1}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                                <MapPin className="w-6 h-6 text-blue-600" /> {item.location.name}
                            </h2>
                            
                            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 inline-flex">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Arrived</span>
                                    <span className="font-semibold">{timeline.arrivalText}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300" />
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Departing</span>
                                    <span className="font-semibold">{timeline.departureText}</span>
                                </div>
                                {timeline.duration && (
                                    <div className="pl-6 border-l border-slate-200 flex items-center gap-1.5 text-indigo-600 font-bold">
                                        <Moon className="w-4 h-4" /> {timeline.duration}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sub Items - Grouped by Day */}
                        {groupedActivities.length > 0 && (
                            <div className="ml-2 mb-6 space-y-6">
                                {groupedActivities.map((group) => (
                                    <div key={group.dateKey} className="border-l-2 border-slate-100 pl-4">
                                        <div className="flex items-baseline gap-2 mb-3">
                                            {group.subTitle && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{group.subTitle}</span>}
                                            <h3 className="font-bold text-slate-700 text-sm">{group.title}</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {group.items.map((sub) => (
                                                <div key={sub.id} className="flex flex-col p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all break-inside-avoid">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-full shrink-0 ${
                                                            sub.type === 'Stay' ? 'bg-indigo-100 text-indigo-600' : 
                                                            sub.type === 'Food' ? 'bg-orange-100 text-orange-600' : 
                                                            'bg-emerald-100 text-emerald-600'
                                                        }`}>
                                                            {sub.type === 'Stay' && <BedDouble className="w-4 h-4" />}
                                                            {sub.type === 'Food' && <Utensils className="w-4 h-4" />}
                                                            {sub.type === 'Activity' && <Camera className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                                                    {sub.name || 'Untitled'}
                                                                    {sub.notes && (
                                                                        <Info className="w-3.5 h-3.5 text-blue-400" />
                                                                    )}
                                                                </h4>
                                                                {sub.cost > 0 && <span className="text-xs font-mono text-slate-500 bg-white px-1.5 rounded border border-slate-200">₹{sub.cost}</span>}
                                                            </div>
                                                            {sub.date && (
                                                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(sub.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* NOTE Display */}
                                                    {sub.notes && (
                                                        <div className="mt-2 ml-11 text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 italic">
                                                            "{sub.notes}"
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Transport Leg */}
                        {nextItem && item.transportDetails && (
                             <div className="mt-8 mb-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50 break-inside-avoid relative overflow-hidden">
                                 {/* Background Watermark */}
                                 <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                                      {getTransportIcon(item.transportDetails.mode, "w-32 h-32 text-blue-900")}
                                 </div>
                                 
                                 <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-blue-800 font-bold uppercase text-xs tracking-wider mb-3">
                                        {getTransportIcon(item.transportDetails.mode, "w-4 h-4")}
                                        <span>
                                            {isLastItem && trip.returnTrip ? "Return Trip to " : "Travel to "} 
                                            {nextItem.location.name}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap md:flex-nowrap gap-6 md:gap-12">
                                        <div className="flex-1">
                                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Departure</div>
                                            <div className="text-lg font-bold text-slate-800">
                                                {item.transportDetails.departureTime ? new Date(item.transportDetails.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {item.transportDetails.departureTime ? new Date(item.transportDetails.departureTime).toLocaleDateString() : 'Date TBD'}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center justify-center px-4">
                                             <div className="text-xs text-blue-400 font-mono mb-1">{item.transportDetails.duration || '---'}</div>
                                             <div className="w-20 h-0.5 bg-blue-200 relative">
                                                 <div className="absolute -right-1 -top-1 w-2 h-2 border-t-2 border-r-2 border-blue-300 rotate-45"></div>
                                             </div>
                                             <div className="text-[10px] text-slate-400 mt-1 uppercase">{item.transportDetails.provider || 'Direct'} {item.transportDetails.number}</div>
                                        </div>

                                        <div className="flex-1 text-right md:text-left">
                                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Arrival</div>
                                            <div className="text-lg font-bold text-slate-800">
                                                {item.transportDetails.arrivalTime ? new Date(item.transportDetails.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {item.transportDetails.arrivalTime ? new Date(item.transportDetails.arrivalTime).toLocaleDateString() : 'Date TBD'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-3 border-t border-blue-100 flex justify-between items-center">
                                         <div className="flex items-center gap-4">
                                            {item.transportDetails.isBooked ? (
                                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3" /> Booked
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                                    Pending Booking
                                                </span>
                                            )}

                                            {item.transportDetails.mode === TransportType.TRAIN && item.transportDetails.trainStatus && (
                                                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                                                    item.transportDetails.trainStatus === 'Confirmed' 
                                                    ? 'bg-blue-100 text-blue-600' 
                                                    : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                    <Train className="w-3 h-3" />
                                                    {item.transportDetails.trainStatus === 'Confirmed' ? 'Confirmed' : 'Waitlist'}
                                                </span>
                                            )}
                                         </div>
                                         {item.transportDetails.cost && (
                                             <div className="font-mono font-bold text-slate-600">₹{item.transportDetails.cost}</div>
                                         )}
                                    </div>
                                 </div>
                             </div>
                        )}
                     </div>
                  );
               })}
            </div>
         </div>
         
         {/* Footer */}
         <div className="bg-slate-50 p-8 text-center text-slate-400 text-sm border-t border-slate-100">
             <p>Generated by Visual Trip Planner</p>
         </div>
      </div>
    </div>
  );
};

export default FinalReport;
