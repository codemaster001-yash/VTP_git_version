import React, { useState, useRef, useEffect } from 'react';
import { Trip, TripItem, TransportType, TransportDetails } from '../types';
import BudgetHUD from './BudgetHUD';
import { MapPin, Upload, Move, Plane, Train, Car, Bus, Ship, Footprints, X, ZoomIn, ZoomOut, Eye, BedDouble, Camera, Utensils, StickyNote, Ban, Repeat, Plus, Trash2, Check, CalendarDays, Ticket, AlertCircle, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';

interface TripVisualizerProps {
  trip: Trip;
  onUpdateTrip: (updates: Partial<Trip>) => void;
  onUpdateItem: (itemId: string, updates: Partial<TripItem>) => void;
  onAddItem: (item: TripItem) => void;
  onUpdateBudget: (newBudget: number) => void;
}

// --- Helper Functions ---

const calculateDuration = (start?: string, end?: string): string => {
    if (!start || !end) return '';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (isNaN(diff) || diff < 0) return '';
    
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
};

const getTransportIcon = (type?: TransportType) => {
  switch (type) {
    case TransportType.FLIGHT: return <Plane className="w-4 h-4" />;
    case TransportType.TRAIN: return <Train className="w-4 h-4" />;
    case TransportType.CAR: return <Car className="w-4 h-4" />;
    case TransportType.BUS: return <Bus className="w-4 h-4" />;
    case TransportType.FERRY: return <Ship className="w-4 h-4" />;
    case TransportType.WALK: return <Footprints className="w-4 h-4" />;
    case TransportType.NONE: return <Ban className="w-4 h-4 text-red-500" />;
    default: return <Car className="w-4 h-4" />;
  }
};

const getSubItemIcon = (type: string) => {
    switch (type) {
        case 'Stay': return <BedDouble className="w-3 h-3" />;
        case 'Activity': return <Camera className="w-3 h-3" />;
        case 'Food': return <Utensils className="w-3 h-3" />;
        default: return <StickyNote className="w-3 h-3" />;
    }
};

// --- Floating Transport Card Component ---
const TransportInfoCard = ({ 
    item, 
    nextItem, 
    onUpdate,
    isEditing,
    onMouseDown,
    prevArrival
}: { 
    item: TripItem, 
    nextItem: TripItem, 
    onUpdate: (id: string, data: Partial<TripItem>) => void,
    isEditing: boolean,
    onMouseDown: (e: React.MouseEvent) => void,
    prevArrival?: string // The arrival time at the CURRENT start location (from previous leg)
}) => {
    const [validationError, setValidationError] = useState<string | null>(null);
    
    // Ensure we have a valid list of options. If not, initialize with current details or default.
    const [options, setOptions] = useState<TransportDetails[]>([]);
    const [selectedOptionId, setSelectedOptionId] = useState<string>('');

    // Refs for manual date picker triggering
    const departRef = useRef<HTMLInputElement>(null);
    const arriveRef = useRef<HTMLInputElement>(null);
    
    // UI state from props (persistence)
    const isExpanded = !!item.isTransportInfoExpanded;

    // Sync state with props when item changes, but only if IDs mismatch to avoid typing lag
    useEffect(() => {
        let currentOptions = item.transportOptions || [];
        
        // If no options exist, create a default one from existing single details
        if (currentOptions.length === 0) {
            const initialDetails: TransportDetails = item.transportDetails || {
                id: crypto.randomUUID(),
                mode: item.transportToNext || TransportType.CAR,
                cost: 0,
                isBooked: false,
                trainStatus: 'Confirmed'
            };
            // Ensure ID exists
            if (!initialDetails.id) initialDetails.id = crypto.randomUUID();
            currentOptions = [initialDetails];
            
            // Immediate update to parent to normalize data structure
            onUpdate(item.id, { transportOptions: currentOptions, transportDetails: initialDetails });
        }
        
        setOptions(currentOptions);
        
        // If we don't have a selected ID internally, or the prop changed externally (like a reset), pick the active one
        if (!selectedOptionId && item.transportDetails?.id) {
            setSelectedOptionId(item.transportDetails.id);
        } else if (!selectedOptionId && currentOptions.length > 0) {
            setSelectedOptionId(currentOptions[0].id);
        }
    }, [item.id, item.transportOptions?.length]); // Only re-run if ID changes or length changes (add/remove)

    const activeOption = options.find(o => o.id === selectedOptionId) || options[0];

    // --- Validation Logic ---
    useEffect(() => {
        if (!activeOption) return;
        
        const depart = activeOption.departureTime ? new Date(activeOption.departureTime).getTime() : 0;
        const arrive = activeOption.arrivalTime ? new Date(activeOption.arrivalTime).getTime() : 0;
        const prev = prevArrival ? new Date(prevArrival).getTime() : 0;

        if (depart && arrive && arrive <= depart) {
            setValidationError("Arrival must be after Departure.");
        } else if (depart && prev && depart < prev) {
            setValidationError("Departure overlaps with previous arrival.");
        } else {
            setValidationError(null);
        }
    }, [activeOption?.departureTime, activeOption?.arrivalTime, prevArrival]);


    const updateOption = (id: string, updates: Partial<TransportDetails>) => {
        const newOptions = options.map(opt => {
            if (opt.id !== id) return opt;
            
            const updatedOpt = { ...opt, ...updates };
            
            // Auto Calculate Duration if dates change
            if (updates.departureTime || updates.arrivalTime) {
                const start = updates.departureTime !== undefined ? updates.departureTime : opt.departureTime;
                const end = updates.arrivalTime !== undefined ? updates.arrivalTime : opt.arrivalTime;
                updatedOpt.duration = calculateDuration(start, end);
            }
            return updatedOpt;
        });

        setOptions(newOptions);
        
        // If we updated the currently active option, sync to parent
        if (id === selectedOptionId) {
             const updatedActive = newOptions.find(o => o.id === id);
             if (updatedActive) {
                onUpdate(item.id, { 
                    transportOptions: newOptions,
                    transportDetails: updatedActive,
                    transportToNext: updatedActive.mode,
                    cost: updatedActive.cost // Update item total cost to match active transport
                });
             }
        } else {
             // Just update the list
             onUpdate(item.id, { transportOptions: newOptions });
        }
    };

    const handleAddOption = () => {
        const newOpt: TransportDetails = {
            id: crypto.randomUUID(),
            mode: TransportType.CAR,
            provider: '',
            cost: 0,
            isBooked: false,
            trainStatus: 'Confirmed'
        };
        const newList = [...options, newOpt];
        setOptions(newList);
        setSelectedOptionId(newOpt.id);
        // Automatically make new option active
        onUpdate(item.id, { 
            transportOptions: newList,
            transportDetails: newOpt,
            transportToNext: newOpt.mode,
            cost: newOpt.cost
        });
    };

    const handleDeleteOption = (e: React.MouseEvent, idToDelete: string) => {
        e.stopPropagation();
        if (options.length <= 1) return; // Prevent deleting last option
        
        const newList = options.filter(o => o.id !== idToDelete);
        setOptions(newList);
        
        // If we deleted the active one, select the first available
        let newActive = options.find(o => o.id === selectedOptionId);
        if (idToDelete === selectedOptionId) {
            newActive = newList[0];
            setSelectedOptionId(newActive.id);
        }

        if (newActive) {
            onUpdate(item.id, { 
                transportOptions: newList,
                transportDetails: newActive,
                transportToNext: newActive.mode,
                cost: newActive.cost
            });
        }
    };
    
    const handleSelectOption = (id: string) => {
        setSelectedOptionId(id);
        const opt = options.find(o => o.id === id);
        if (opt) {
             onUpdate(item.id, { 
                transportDetails: opt,
                transportToNext: opt.mode,
                cost: opt.cost
            });
        }
    };

    const offX = item.transportHudOffset?.x || 0;
    const offY = item.transportHudOffset?.y || 0;

    const toggleExpand = (e: React.MouseEvent) => {
        // Allow expand toggle even in "Pan Map" mode, as long as we aren't dragging it.
        e.stopPropagation();
        onUpdate(item.id, { isTransportInfoExpanded: !isExpanded });
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    // Helper to safely open date picker
    const showPicker = (ref: React.RefObject<HTMLInputElement>) => {
        if(ref.current) {
            try {
                // @ts-ignore
                ref.current.showPicker();
            } catch(e) {
                ref.current.focus();
            }
        }
    }

    // Helper for rendering formatted date display in inputs
    const renderDateValue = (dateStr?: string) => {
        if (!dateStr) return <span className="text-slate-300 italic">Select Date</span>;
        const d = new Date(dateStr);
        return (
            <div className="flex flex-col leading-tight">
                <span className="font-bold text-slate-800">{d.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                <span className="text-[10px] text-slate-500">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        );
    };

    if (!activeOption) return null;

    return (
        <div 
            className={`absolute ${isExpanded ? 'z-[100]' : 'z-20'}`}
            style={{ pointerEvents: 'auto' }}
            onMouseDown={onMouseDown} // Attach handler to outer container
        >
            {/* Anchor Icon */}
            <div 
                className={`relative transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-white border shadow-md rounded-full transition-all cursor-pointer hover:scale-110 w-10 h-10 border-slate-300 p-2 text-slate-600 hover:text-blue-600 hover:border-blue-500 ${activeOption.mode === TransportType.NONE ? 'border-red-200 bg-red-50' : ''}`}
                onClick={toggleExpand}
            >
                {getTransportIcon(item.transportToNext)}
                
                {/* Duration Bubble */}
                {activeOption.duration && activeOption.mode !== TransportType.NONE && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                        {activeOption.duration}
                    </div>
                )}
            </div>

            {/* Expanded Card */}
            {isExpanded && (
                <div 
                    className={`absolute bg-white rounded-xl shadow-2xl border border-slate-200 w-80 overflow-hidden animate-in zoom-in-50 duration-200 cursor-move ring-2 ring-blue-400/50`}
                    style={{ 
                        transform: `translate(calc(-50% + ${offX}px), calc(10px + ${offY}px))`, 
                        top: '100%',
                    }}
                    onDoubleClick={handleDoubleClick}
                    onClick={(e) => e.stopPropagation()} // Prevent map clicks when interacting with card
                    onMouseDown={onMouseDown} // Ensure we can drag from the card body
                >
                    {/* Header: Option Tabs */}
                    <div className="bg-slate-100 border-b border-slate-200 p-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {options.map((opt, idx) => (
                             <div 
                                key={opt.id}
                                onClick={(e) => { e.stopPropagation(); handleSelectOption(opt.id); }}
                                onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when clicking tabs
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer whitespace-nowrap border ${selectedOptionId === opt.id ? 'bg-white border-slate-300 shadow-sm text-blue-600 font-bold' : 'bg-slate-200 border-transparent text-slate-500 hover:bg-slate-300'}`}
                             >
                                 {getTransportIcon(opt.mode)}
                                 <span>{opt.mode} {idx + 1}</span>
                                 {options.length > 1 && (
                                     <button onClick={(e) => handleDeleteOption(e, opt.id)} className="hover:text-red-500 ml-1">
                                         <X className="w-3 h-3" />
                                     </button>
                                 )}
                             </div>
                        ))}
                        <button onClick={handleAddOption} className="p-1 hover:bg-slate-200 rounded text-slate-500" title="Add Option" onMouseDown={(e) => e.stopPropagation()}>
                            <Plus className="w-3 h-3" />
                        </button>
                        <div className="flex-1"></div>
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(e); }} className="text-slate-400 hover:text-slate-600" onMouseDown={(e) => e.stopPropagation()}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3 cursor-default" onMouseDown={(e) => e.stopPropagation()}>
                        {/* Improved Route Header */}
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                             <div className="flex-1 min-w-0">
                                 <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">From</div>
                                 <div className="font-bold text-slate-800 text-sm truncate" title={item.location.name}>{item.location.name}</div>
                             </div>
                             
                             <div className="px-3 flex items-center justify-center text-blue-500">
                                 <ArrowRight className="w-5 h-5" strokeWidth={3} />
                             </div>

                             <div className="flex-1 min-w-0 text-right">
                                 <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">To</div>
                                 <div className="font-bold text-slate-800 text-sm truncate" title={nextItem.location.name}>{nextItem.location.name}</div>
                             </div>
                        </div>

                        {/* Error Warning */}
                        {validationError && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 flex items-start gap-2 text-xs text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{validationError}</span>
                            </div>
                        )}

                        {/* Input Grid */}
                        <div className="space-y-3">
                             <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Provider & No</label>
                                    <input 
                                        type="text" 
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-300"
                                        placeholder="e.g. Indigo 6E-123"
                                        value={`${activeOption.provider || ''} ${activeOption.number || ''}`.trim()}
                                        onChange={(e) => {
                                            const parts = e.target.value.split(' ');
                                            const num = parts.pop() || '';
                                            const prov = parts.join(' ');
                                            updateOption(activeOption.id, { provider: prov, number: num });
                                        }}
                                    />
                                </div>
                                {/* Booking Status Toggle */}
                                <button 
                                    onClick={() => updateOption(activeOption.id, { isBooked: !activeOption.isBooked })}
                                    className={`h-8 px-2 rounded border flex items-center gap-1 text-[10px] font-bold transition-colors ${activeOption.isBooked ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                    title={activeOption.isBooked ? "Mark as Not Booked" : "Mark as Booked"}
                                >
                                    <Ticket className="w-3.5 h-3.5" />
                                    {activeOption.isBooked ? 'Booked' : 'Pending'}
                                </button>
                             </div>

                             {/* Train Status Toggle (Conditional) */}
                             {activeOption.mode === TransportType.TRAIN && (
                                 <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                                     <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Status:</span>
                                     <button 
                                        onClick={() => updateOption(activeOption.id, { trainStatus: 'Confirmed' })}
                                        className={`flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 ${activeOption.trainStatus === 'Confirmed' ? 'bg-green-100 text-green-700 font-bold shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}
                                     >
                                         <CheckCircle2 className="w-3 h-3" /> Confirmed
                                     </button>
                                     <button 
                                        onClick={() => updateOption(activeOption.id, { trainStatus: 'Waitlist' })}
                                        className={`flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 ${activeOption.trainStatus === 'Waitlist' ? 'bg-orange-100 text-orange-700 font-bold shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}
                                     >
                                         <AlertCircle className="w-3 h-3" /> Waiting
                                     </button>
                                 </div>
                             )}

                             <div className="grid grid-cols-2 gap-3">
                                 <div className="relative">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                                        <span>Depart</span>
                                    </label>
                                    
                                    {/* Custom Clickable Date Area with Explicit Button */}
                                    <div className="relative w-full h-10 border border-slate-200 rounded bg-white hover:border-blue-400 transition-colors flex items-center px-2 cursor-pointer group"
                                         onClick={(e) => { e.stopPropagation(); showPicker(departRef); }}
                                    >
                                         <div className="text-xs w-full pointer-events-none">
                                            {renderDateValue(activeOption.departureTime)}
                                         </div>
                                         <div className="absolute right-2 text-slate-400 group-hover:text-blue-500 pointer-events-none">
                                            <CalendarDays className="w-4 h-4" />
                                         </div>
                                         <input 
                                            ref={departRef}
                                            type="datetime-local" 
                                            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                            value={activeOption.departureTime || ''}
                                            onChange={(e) => updateOption(activeOption.id, { departureTime: e.target.value })}
                                            // Input is hidden/pointer-events-none, click is handled by parent div
                                         />
                                    </div>
                                 </div>

                                 <div className="relative">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                                        <span>Arrive</span>
                                    </label>
                                    
                                     {/* Custom Clickable Date Area */}
                                    <div className="relative w-full h-10 border border-slate-200 rounded bg-white hover:border-blue-400 transition-colors flex items-center px-2 cursor-pointer group"
                                        onClick={(e) => { e.stopPropagation(); showPicker(arriveRef); }}
                                    >
                                         <div className="text-xs w-full pointer-events-none">
                                            {renderDateValue(activeOption.arrivalTime)}
                                         </div>
                                         <div className="absolute right-2 text-slate-400 group-hover:text-blue-500 pointer-events-none">
                                            <CalendarDays className="w-4 h-4" />
                                         </div>
                                         <input 
                                            ref={arriveRef}
                                            type="datetime-local" 
                                            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                            value={activeOption.arrivalTime || ''}
                                            onChange={(e) => updateOption(activeOption.id, { arrivalTime: e.target.value })}
                                         />
                                    </div>
                                 </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Duration</label>
                                    <input 
                                        type="text" 
                                        readOnly
                                        placeholder="-- h -- m"
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50 text-slate-500 focus:outline-none"
                                        value={activeOption.duration || ''}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Cost (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1.5 text-xs text-slate-400">₹</span>
                                        <input 
                                            type="number" 
                                            className="w-full text-xs pl-5 p-1.5 border border-slate-200 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={activeOption.cost || ''}
                                            onChange={(e) => updateOption(activeOption.id, { cost: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Mode Switcher Mini */}
                        <div className="pt-2 border-t border-slate-100 flex justify-between gap-1 flex-wrap">
                            {Object.values(TransportType).map(mode => (
                                <button 
                                    key={mode}
                                    onClick={() => updateOption(activeOption.id, { mode: mode })}
                                    className={`p-1.5 rounded hover:bg-slate-100 ${activeOption.mode === mode ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200' : 'text-slate-400'}`}
                                    title={mode}
                                >
                                    {getTransportIcon(mode)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const TripVisualizer: React.FC<TripVisualizerProps> = ({ trip, onUpdateTrip, onUpdateItem, onAddItem, onUpdateBudget }) => {
  const [isEditing, setIsEditing] = useState(true);
  
  // Canvas State - Initialize from saved trip state if available
  const [zoom, setZoom] = useState(trip.mapView?.zoom ?? 1);
  const [pan, setPan] = useState(trip.mapView?.pan ?? { x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<'pin' | 'hud'>('pin');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMouseRef = useRef<{ x: number, y: number } | null>(null);
  const [bgInput, setBgInput] = useState('');

  // Save map state when it changes (Debounced by user interaction end would be ideal, 
  // but updating parent state on every pan might be too heavy. 
  // We'll update parent state on mouse up / wheel end)
  const saveMapState = () => {
      onUpdateTrip({ mapView: { zoom, pan } });
  };

  // Calculate total spent for HUD
  const transportCost = trip.items.reduce((acc, item) => acc + item.cost, 0);
  const stayCost = trip.accommodations.reduce((acc, stay) => acc + stay.costPerNight, 0);
  const subItemsCost = trip.items.reduce((acc, item) => acc + (item.subItems?.reduce((s, sub) => s + sub.cost, 0) || 0), 0);
  const totalSpent = transportCost + stayCost + subItemsCost;

  // -- Event Handlers --

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const scaleAmount = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(0.1, zoom + scaleAmount), 5);
    setZoom(newZoom);
    // Debouncing wheel save is complex, for now we save immediately on wheel as it's less frequent than mousemove
    onUpdateTrip({ mapView: { zoom: newZoom, pan } });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || !isEditing || (e.button === 0 && (e.target as HTMLElement).id === "canvas-bg")) {
        setIsPanning(true);
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePinMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (isEditing) {
          setDraggingId(id);
          setDraggingType('pin');
      }
  };
  
  const handleHudMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Always allow dragging HUD, regardless of mode
      setDraggingId(id);
      setDraggingType('hud');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && lastMouseRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        return;
    }

    if (draggingId && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        
        if (draggingType === 'pin') {
            const movementX = e.movementX / zoom;
            const movementY = e.movementY / zoom;
            const pixelToPercentX = 100 / rect.width;
            const pixelToPercentY = 100 / rect.height;

            const item = trip.items.find(i => i.id === draggingId);
            if (item) {
                 const currentX = item.canvasX ?? 50;
                 const currentY = item.canvasY ?? 50;
                 const nextX = Math.max(0, Math.min(100, currentX + (movementX * pixelToPercentX)));
                 const nextY = Math.max(0, Math.min(100, currentY + (movementY * pixelToPercentY)));
                 onUpdateItem(draggingId, { canvasX: nextX, canvasY: nextY });
            }
        } else if (draggingType === 'hud') {
             const movementX = e.movementX / zoom;
             const movementY = e.movementY / zoom;

             const item = trip.items.find(i => i.id === draggingId);
             if (item) {
                 const currentOffset = item.transportHudOffset || { x: 0, y: 0 };
                 const nextX = currentOffset.x + movementX;
                 const nextY = currentOffset.y + movementY;
                 onUpdateItem(draggingId, { transportHudOffset: { x: nextX, y: nextY } });
             }
        }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
        saveMapState(); // Save pan position on release
    }
    setIsPanning(false);
    setDraggingId(null);
    lastMouseRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    // Get the bounding rectangle of the transformed container
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate position relative to the container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to percentage
    const canvasX = (x / rect.width) * 100;
    const canvasY = (y / rect.height) * 100;

    const newItem: TripItem = {
      id: crypto.randomUUID(),
      location: { name: `Stop ${trip.items.length + 1}`, lat: 0, lng: 0, address: 'New Location' },
      canvasX, // Use calculated X
      canvasY, // Use calculated Y
      cost: 0, category: 'Activity', type: 'Stop', transportToNext: TransportType.CAR,
      isExpanded: true
    };
    onAddItem(newItem);
  };

  const handleBgSubmit = () => {
    if (bgInput) {
      onUpdateTrip({ backgroundImage: bgInput });
      setBgInput('');
    }
  };

  // -- Render Helper: Connection Lines --
  const renderConnections = () => {
    const lines = [];

    // Loop through all items
    for (let index = 0; index < trip.items.length; index++) {
        // Normal connections: Item -> Next Item
        // Return journey: Last Item -> First Item
        
        let nextItem: TripItem | null = null;
        let item = trip.items[index];
        let prevItem = index > 0 ? trip.items[index - 1] : null;

        // If return trip and this is start (index 0), prev is last
        if (trip.returnTrip && index === 0 && trip.items.length > 1) {
             prevItem = trip.items[trip.items.length - 1];
        }

        if (index < trip.items.length - 1) {
            nextItem = trip.items[index + 1];
        } else if (trip.returnTrip && trip.items.length > 1) {
            // Return journey case
            nextItem = trip.items[0];
        }

        if (!nextItem) continue;

        // Calculate arrival time at current item "A" (from prev item transport)
        // This is needed to validate that departure from A is > arrival at A
        let prevArrival: string | undefined = undefined;
        // VALIDATION FIX: If this is the start of the trip (index 0), do not consider the return trip's arrival
        // time as a "previous arrival" constraint for the DEPARTURE from stop 1.
        if (index > 0 && prevItem && prevItem.transportDetails?.arrivalTime) {
             prevArrival = prevItem.transportDetails.arrivalTime;
        }

        const x1 = item.canvasX ?? 50;
        const y1 = item.canvasY ?? 50;
        const x2 = nextItem.canvasX ?? 50;
        const y2 = nextItem.canvasY ?? 50;

        // Base midpoint
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        
        const isNone = item.transportToNext === TransportType.NONE;

        lines.push(
            <React.Fragment key={`conn-${item.id}-${nextItem.id}`}>
                {/* SVG Line - Hidden if 'None' */}
                {!isNone && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                        <defs>
                            <marker id={`arrowhead-${item.id}`} markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                <polygon points="0 0, 6 2, 0 4" fill={trip.returnTrip && index === trip.items.length - 1 ? "#ef4444" : "#475569"} />
                            </marker>
                        </defs>
                        <line 
                            x1={`${x1}%`} y1={`${y1}%`} 
                            x2={`${x2}%`} y2={`${y2}%`} 
                            stroke={trip.returnTrip && index === trip.items.length - 1 ? "#ef4444" : "#475569"} 
                            strokeWidth={`${0.5 / zoom}rem`}
                            strokeDasharray="5,5"
                            markerEnd={`url(#arrowhead-${item.id})`}
                            className="drop-shadow-sm opacity-80"
                            vectorEffect="non-scaling-stroke" 
                        />
                    </svg>
                )}

                {/* Floating Transport HUD at Midpoint */}
                <div 
                    className="absolute z-20"
                    style={{ left: `${mx}%`, top: `${my}%` }}
                >
                    <TransportInfoCard 
                        item={item} 
                        nextItem={nextItem} 
                        onUpdate={onUpdateItem} 
                        isEditing={isEditing}
                        onMouseDown={(e) => handleHudMouseDown(e, item.id)}
                        prevArrival={prevArrival}
                    />
                </div>
            </React.Fragment>
        );
    }
    return lines;
  };

  return (
    <div className="h-full w-full relative bg-slate-100 flex flex-col">
      {/* --- Toolbar --- */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
               <button 
                 onClick={() => setIsEditing(!isEditing)}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${isEditing ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
               >
                 <Move className="w-4 h-4" />
                 {isEditing ? 'Drag Pins & HUD' : 'Pan Map'}
               </button>
           </div>
           
           {/* Return Trip Toggle */}
           <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
               <button 
                 onClick={() => onUpdateTrip({ returnTrip: !trip.returnTrip })}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${trip.returnTrip ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}
                 title="Connect last stop to first stop"
               >
                 <Repeat className="w-4 h-4" />
                 Return Trip
               </button>
           </div>

           <div className="flex items-center gap-2">
                <button onClick={() => {
                    setZoom(Math.max(0.1, zoom - 0.1));
                    saveMapState();
                }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                <input type="range" min="0.1" max="3" step="0.1" value={zoom} onChange={(e) => {
                    const newZoom = parseFloat(e.target.value);
                    setZoom(newZoom);
                    onUpdateTrip({ mapView: { zoom: newZoom, pan } });
                }} className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                <button onClick={() => {
                    setZoom(Math.min(5, zoom + 0.1));
                    saveMapState();
                }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => { 
                    setZoom(1); 
                    setPan({x:0, y:0}); 
                    onUpdateTrip({ mapView: { zoom: 1, pan: {x:0, y:0} } });
                }} className="text-xs text-blue-600 hover:underline ml-1">Reset</button>
           </div>
           <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <Eye className="w-4 h-4 text-slate-400" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={trip.backgroundOpacity ?? 1} 
                  onChange={(e) => onUpdateTrip({ backgroundOpacity: parseFloat(e.target.value) })} 
                  className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                  title="Map Opacity" 
                />
           </div>
        </div>

        <div className="flex items-center gap-2">
            {!trip.backgroundImage && (
                <div className="flex gap-2">
                    <input type="text" placeholder="Map Image URL..." className="px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-500 w-32 bg-white text-slate-900" value={bgInput} onChange={(e) => setBgInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleBgSubmit()} />
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-xs font-medium flex items-center gap-1">
                        <Upload className="w-3 h-3" /> <span className="hidden sm:inline">Upload</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => { 
                                const file = e.target.files?.[0]; 
                                if (file) { 
                                    if (file.size > 2.5 * 1024 * 1024) {
                                        alert("Image is too large (max 2.5MB). Please use a smaller image to avoid storage issues.");
                                        return;
                                    }
                                    const reader = new FileReader(); 
                                    reader.onloadend = () => onUpdateTrip({ backgroundImage: reader.result as string }); 
                                    reader.readAsDataURL(file); 
                                } 
                            }} 
                        />
                    </label>
                </div>
            )}
            {trip.backgroundImage && (
                <button onClick={() => onUpdateTrip({ backgroundImage: undefined })} className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline">Clear Map</button>
            )}
        </div>
      </div>

      {/* --- Canvas Area --- */}
      <div className="flex-1 relative overflow-hidden bg-slate-200/50">
         <div 
            id="canvas-bg"
            className="w-full h-full relative overflow-hidden cursor-crosshair select-none origin-top-left"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
         >
            <div
                className="w-full h-full absolute top-0 left-0 transition-transform duration-75 ease-linear"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
                ref={containerRef}
            >
                {/* Background Image Layer */}
                {trip.backgroundImage ? (
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: `url("${trip.backgroundImage}")`, opacity: trip.backgroundOpacity ?? 1 }} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 select-none pointer-events-none border-2 border-dashed border-slate-300 m-10 rounded-xl opacity-50">
                        <div className="text-center">
                            <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="font-medium text-lg">Empty Canvas</p>
                            <p className="text-sm">Double click to add a pin</p>
                        </div>
                    </div>
                )}
                
                {renderConnections()}

                {/* Pins Layer */}
                {trip.items.map((item, index) => {
                    const isStart = index === 0;
                    const isEnd = index === trip.items.length - 1;
                    let pinColor = "text-blue-600";
                    if (isStart) pinColor = "text-emerald-600";
                    if (isEnd) pinColor = "text-rose-600";

                    return (
                        <div
                            key={item.id}
                            className={`absolute flex flex-col items-center group transform -translate-x-1/2 -translate-y-full ${isEditing ? 'cursor-move' : 'cursor-pointer'}`}
                            style={{ 
                                left: `${item.canvasX ?? 50}%`, 
                                top: `${item.canvasY ?? 50}%`, 
                                zIndex: draggingId === item.id ? 100 : 30 
                            }}
                            onMouseDown={(e) => handlePinMouseDown(e, item.id)}
                        >
                            <div className="relative filter drop-shadow-lg transition-transform hover:scale-110">
                                <MapPin className={`w-12 h-12 ${pinColor}`} fill="currentColor" stroke="white" strokeWidth={1.5} />
                                {/* Pin Number Badge - Moved to corner for readability */}
                                <div className="absolute -top-1 -right-1 bg-white text-slate-900 border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm z-10">
                                    {index + 1}
                                </div>
                            </div>
                            
                            {/* Label */}
                            <div 
                                className="bg-white/95 backdrop-blur px-3 py-1 rounded-md text-[11px] font-bold shadow-md mt-1 whitespace-nowrap border border-slate-200 text-slate-800"
                                style={{ transform: `scale(${Math.max(1, 1/zoom)})` }} 
                            >
                                {item.location.name}
                            </div>

                            {/* Sub-Items Tooltip */}
                            {item.subItems && item.subItems.length > 0 && (
                                <div className="absolute top-full mt-2 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-slate-200 p-2 min-w-[120px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {item.subItems.map((sub) => (
                                        <div key={sub.id} className="flex items-center gap-1.5 text-[10px] text-slate-600 py-0.5">
                                            {getSubItemIcon(sub.type)}
                                            <span className="truncate max-w-[100px]">{sub.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
         </div>
         
         <div className="absolute top-4 right-4 z-50 pointer-events-auto">
             <BudgetHUD totalBudget={trip.totalBudget} totalSpent={totalSpent} onUpdateBudget={onUpdateBudget} />
         </div>
      </div>
    </div>
  );
};

export default TripVisualizer;