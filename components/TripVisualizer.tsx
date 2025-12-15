
import React, { useState, useRef, useEffect } from 'react';
import { Trip, TripItem, TransportType, TransportDetails, MapImage, StickyNote } from '../types';
import BudgetHUD from './BudgetHUD';
import { MapPin, Upload, Move, Plane, Train, Car, Bus, Ship, Footprints, X, ZoomIn, ZoomOut, Eye, BedDouble, Camera, Utensils, StickyNote as StickyNoteIcon, Ban, Repeat, Plus, Trash2, Check, CalendarDays, Ticket, AlertCircle, CheckCircle2, ArrowRight, AlertTriangle, Grip, Maximize2, Layers, BringToFront, SendToBack, Lock, Unlock, Palette } from 'lucide-react';

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
        default: return <StickyNoteIcon className="w-3 h-3" />;
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
    prevArrival?: string 
}) => {
    const [validationError, setValidationError] = useState<string | null>(null);
    const [options, setOptions] = useState<TransportDetails[]>([]);
    const [selectedOptionId, setSelectedOptionId] = useState<string>('');
    const departRef = useRef<HTMLInputElement>(null);
    const arriveRef = useRef<HTMLInputElement>(null);
    const isExpanded = !!item.isTransportInfoExpanded;

    useEffect(() => {
        let currentOptions = item.transportOptions || [];
        if (currentOptions.length === 0) {
            const initialDetails: TransportDetails = item.transportDetails || {
                id: crypto.randomUUID(),
                mode: item.transportToNext || TransportType.CAR,
                cost: 0,
                isBooked: false,
                trainStatus: 'Confirmed'
            };
            if (!initialDetails.id) initialDetails.id = crypto.randomUUID();
            currentOptions = [initialDetails];
            onUpdate(item.id, { transportOptions: currentOptions, transportDetails: initialDetails });
        }
        setOptions(currentOptions);
        if (!selectedOptionId && item.transportDetails?.id) {
            setSelectedOptionId(item.transportDetails.id);
        } else if (!selectedOptionId && currentOptions.length > 0) {
            setSelectedOptionId(currentOptions[0].id);
        }
    }, [item.id, item.transportOptions?.length]); 

    const activeOption = options.find(o => o.id === selectedOptionId) || options[0];

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
            if (updates.departureTime || updates.arrivalTime) {
                const start = updates.departureTime !== undefined ? updates.departureTime : opt.departureTime;
                const end = updates.arrivalTime !== undefined ? updates.arrivalTime : opt.arrivalTime;
                updatedOpt.duration = calculateDuration(start, end);
            }
            return updatedOpt;
        });
        setOptions(newOptions);
        if (id === selectedOptionId) {
             const updatedActive = newOptions.find(o => o.id === id);
             if (updatedActive) {
                onUpdate(item.id, { 
                    transportOptions: newOptions,
                    transportDetails: updatedActive,
                    transportToNext: updatedActive.mode,
                    cost: updatedActive.cost 
                });
             }
        } else {
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
        onUpdate(item.id, { 
            transportOptions: newList,
            transportDetails: newOpt,
            transportToNext: newOpt.mode,
            cost: newOpt.cost
        });
    };

    const handleDeleteOption = (e: React.MouseEvent, idToDelete: string) => {
        e.stopPropagation();
        if (options.length <= 1) return; 
        const newList = options.filter(o => o.id !== idToDelete);
        setOptions(newList);
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
        e.stopPropagation();
        onUpdate(item.id, { isTransportInfoExpanded: !isExpanded });
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

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
            onMouseDown={onMouseDown} 
        >
            <div 
                className={`relative transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-white border shadow-md rounded-full transition-all cursor-pointer hover:scale-110 w-10 h-10 border-slate-300 p-2 text-slate-600 hover:text-blue-600 hover:border-blue-500 ${activeOption.mode === TransportType.NONE ? 'border-red-200 bg-red-50' : ''}`}
                onClick={toggleExpand}
            >
                {getTransportIcon(item.transportToNext)}
                {activeOption.duration && activeOption.mode !== TransportType.NONE && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                        {activeOption.duration}
                    </div>
                )}
            </div>
            {isExpanded && (
                <div 
                    className={`absolute bg-white rounded-xl shadow-2xl border border-slate-200 w-80 overflow-hidden animate-in zoom-in-50 duration-200 cursor-move ring-2 ring-blue-400/50`}
                    style={{ 
                        transform: `translate(calc(-50% + ${offX}px), calc(10px + ${offY}px))`, 
                        top: '100%',
                    }}
                    onDoubleClick={handleDoubleClick}
                    onClick={(e) => e.stopPropagation()} 
                    onMouseDown={onMouseDown} 
                >
                    <div className="bg-slate-100 border-b border-slate-200 p-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {options.map((opt, idx) => (
                             <div 
                                key={opt.id}
                                onClick={(e) => { e.stopPropagation(); handleSelectOption(opt.id); }}
                                onMouseDown={(e) => e.stopPropagation()} 
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

                    <div className="p-4 space-y-3 cursor-default" onMouseDown={(e) => e.stopPropagation()}>
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

                        {validationError && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 flex items-start gap-2 text-xs text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{validationError}</span>
                            </div>
                        )}

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
                                <button 
                                    onClick={() => updateOption(activeOption.id, { isBooked: !activeOption.isBooked })}
                                    className={`h-8 px-2 rounded border flex items-center gap-1 text-[10px] font-bold transition-colors ${activeOption.isBooked ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                    title={activeOption.isBooked ? "Mark as Not Booked" : "Mark as Booked"}
                                >
                                    <Ticket className="w-3.5 h-3.5" />
                                    {activeOption.isBooked ? 'Booked' : 'Pending'}
                                </button>
                             </div>

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
                                         />
                                    </div>
                                 </div>

                                 <div className="relative">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                                        <span>Arrive</span>
                                    </label>
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
  
  // Dragging states
  // Types: 'pin' | 'hud' | 'image-move' | 'image-resize' | 'note-move' | 'note-resize'
  const [dragData, setDragData] = useState<{ type: string, startX: number, startY: number, initialWidth?: number, initialHeight?: number, handle?: string } | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastMouseRef = useRef<{ x: number, y: number } | null>(null);
  
  // Fixed Large Canvas Dimensions to simulate "Infinite" feel
  const CANVAS_WIDTH = 3200;
  const CANVAS_HEIGHT = 2400;

  // Save map state when it changes
  const saveMapState = () => {
      onUpdateTrip({ mapView: { zoom, pan } });
  };

  // Calculate total spent for HUD
  const transportCost = trip.items.reduce((acc, item) => acc + item.cost, 0);
  const stayCost = trip.accommodations.reduce((acc, stay) => acc + stay.costPerNight, 0);
  const subItemsCost = trip.items.reduce((acc, item) => acc + (item.subItems?.reduce((s, sub) => s + sub.cost, 0) || 0), 0);
  const totalSpent = transportCost + stayCost + subItemsCost;

  // -- Image Logic --

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2.5 * 1024 * 1024) {
              alert("Image is too large (max 2.5MB).");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              const img = new Image();
              img.onload = () => {
                  // Default scale to fit reasonably within viewport, max 800px width
                  let w = img.width;
                  let h = img.height;
                  const maxW = 800;
                  if (w > maxW) {
                      const ratio = maxW / w;
                      w = maxW;
                      h = h * ratio;
                  }

                  const newMapImage: MapImage = {
                      id: crypto.randomUUID(),
                      url: reader.result as string,
                      x: (CANVAS_WIDTH / 2) - (w / 2), // Center of canvas
                      y: (CANVAS_HEIGHT / 2) - (h / 2),
                      width: w,
                      height: h,
                      opacity: 1,
                      locked: false
                  };
                  
                  const currentImages = trip.mapImages || [];
                  onUpdateTrip({ mapImages: [...currentImages, newMapImage] });
                  setSelectedImageId(newMapImage.id);
                  setSelectedNoteId(null); // Deselect notes
              };
              img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
      }
      // Reset input
      e.target.value = '';
  };

  const handleImageUpdate = (id: string, updates: Partial<MapImage>) => {
      const currentImages = trip.mapImages || [];
      const updated = currentImages.map(img => img.id === id ? { ...img, ...updates } : img);
      onUpdateTrip({ mapImages: updated });
  };

  const handleDeleteSelected = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (selectedImageId) {
          const currentImages = trip.mapImages || [];
          const img = currentImages.find(i => i.id === selectedImageId);
          if (img && img.locked) return; // Respect lock

          const updatedImages = currentImages.filter(img => img.id !== selectedImageId);
          onUpdateTrip({ mapImages: updatedImages });
          setSelectedImageId(null);
      } else if (selectedNoteId) {
          const currentNotes = trip.stickyNotes || [];
          const note = currentNotes.find(n => n.id === selectedNoteId);
          if (note && note.locked) return; // Respect lock

          const updatedNotes = currentNotes.filter(n => n.id !== selectedNoteId);
          onUpdateTrip({ stickyNotes: updatedNotes });
          setSelectedNoteId(null);
      }
  };

  // -- Sticky Note Logic --

  const handleAddNote = () => {
      const newNote: StickyNote = {
          id: crypto.randomUUID(),
          x: (CANVAS_WIDTH / 2) - 100,
          y: (CANVAS_HEIGHT / 2) - 75,
          width: 200,
          height: 150,
          text: "", // Empty to allow placeholder
          color: "#fef08a", // Default Yellow
          locked: false
      };
      const currentNotes = trip.stickyNotes || [];
      onUpdateTrip({ stickyNotes: [...currentNotes, newNote] });
      setSelectedNoteId(newNote.id);
      setSelectedImageId(null);
  };

  const handleNoteUpdate = (id: string, updates: Partial<StickyNote>) => {
      const currentNotes = trip.stickyNotes || [];
      const updated = currentNotes.map(n => n.id === id ? { ...n, ...updates } : n);
      onUpdateTrip({ stickyNotes: updated });
  };


  // -- Event Handlers --

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const scaleAmount = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(0.1, zoom + scaleAmount), 5);
    setZoom(newZoom);
    onUpdateTrip({ mapView: { zoom: newZoom, pan } });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if the target is NOT an interactive element
    // We allow panning if clicking on: the main wrapper, the canvas bg, or the large container itself
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button') || 
                          target.closest('input') || 
                          target.closest('textarea') ||
                          target.closest('.cursor-move') || // Pins/HUDs when editing
                          (target.tagName === 'IMG' && isEditing) ||
                          (target.closest('.sticky-note') && isEditing);

    // If we are NOT clicking an interactive element, we can pan
    // If we are left clicking, we also deselect the image/note
    if (!isInteractive) {
        if (e.button === 0) { // Left click
            setSelectedImageId(null);
            setSelectedNoteId(null);
        }
        setIsPanning(true);
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePinMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (isEditing) {
          setDraggingId(id);
          setDragData({ type: 'pin', startX: 0, startY: 0 }); // start coords not needed for pin delta logic used below
      }
  };
  
  const handleHudMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDraggingId(id);
      setDragData({ type: 'hud', startX: 0, startY: 0 });
  };

  // Image Drag/Resize Handlers
  const handleImageMouseDown = (e: React.MouseEvent, id: string, locked: boolean) => {
      // If we are not editing, we allow the event to bubble up to the container
      // This enables panning the map even when clicking on an image
      if (!isEditing) return;

      e.stopPropagation();
      setSelectedImageId(id);
      setSelectedNoteId(null);
      
      if (locked) return; // Prevent drag if locked

      setDraggingId(id);
      setDragData({ type: 'image-move', startX: e.clientX, startY: e.clientY });
  };

  const handleImageResizeStart = (e: React.MouseEvent, id: string, handle: string, img: MapImage) => {
      e.stopPropagation();
      
      if (img.locked) return; // Prevent resize if locked

      if (isEditing) {
          setDraggingId(id);
          setDragData({ 
              type: 'image-resize', 
              startX: e.clientX, 
              startY: e.clientY,
              initialWidth: img.width,
              initialHeight: img.height,
              handle
          });
      }
  };

  // Sticky Note Drag/Resize
  const handleNoteMouseDown = (e: React.MouseEvent, id: string, locked: boolean) => {
      if (!isEditing) return;

      e.stopPropagation();
      setSelectedNoteId(id);
      setSelectedImageId(null);
      
      if (locked) return;

      setDraggingId(id);
      setDragData({ type: 'note-move', startX: e.clientX, startY: e.clientY });
  };

  const handleNoteResizeStart = (e: React.MouseEvent, id: string, handle: string, note: StickyNote) => {
      e.stopPropagation();
      
      if (note.locked) return;

      if (isEditing) {
          setDraggingId(id);
          setDragData({ 
              type: 'note-resize', 
              startX: e.clientX, 
              startY: e.clientY,
              initialWidth: note.width,
              initialHeight: note.height,
              handle
          });
      }
  };


  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && lastMouseRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        return;
    }

    if (draggingId && dragData && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        
        // PINS
        if (dragData.type === 'pin') {
            const item = trip.items.find(i => i.id === draggingId);
            if (item) {
                 const currentX = item.canvasX ?? 50;
                 const currentY = item.canvasY ?? 50;
                 // Use raw movement / scaled dimensions
                 const nextX = Math.max(0, Math.min(100, currentX + (e.movementX / rect.width * 100)));
                 const nextY = Math.max(0, Math.min(100, currentY + (e.movementY / rect.height * 100)));
                 onUpdateItem(draggingId, { canvasX: nextX, canvasY: nextY });
            }
        } 
        // HUD
        else if (dragData.type === 'hud') {
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
        // IMAGE MOVE
        else if (dragData.type === 'image-move') {
             const movementX = e.movementX / zoom;
             const movementY = e.movementY / zoom;
             const img = (trip.mapImages || []).find(i => i.id === draggingId);
             if (img && !img.locked) {
                 handleImageUpdate(draggingId, {
                     x: img.x + movementX,
                     y: img.y + movementY
                 });
             }
        }
        // IMAGE RESIZE
        else if (dragData.type === 'image-resize') {
             const dx = (e.clientX - dragData.startX) / zoom;
             const dy = (e.clientY - dragData.startY) / zoom;
             
             let newW = (dragData.initialWidth || 0) + dx;
             let newH = (dragData.initialHeight || 0) + dy;
             
             if (newW < 50) newW = 50;
             if (newH < 50) newH = 50;

             handleImageUpdate(draggingId, { width: newW, height: newH });
        }
        // NOTE MOVE
        else if (dragData.type === 'note-move') {
             const movementX = e.movementX / zoom;
             const movementY = e.movementY / zoom;
             const note = (trip.stickyNotes || []).find(n => n.id === draggingId);
             if (note && !note.locked) {
                 handleNoteUpdate(draggingId, {
                     x: note.x + movementX,
                     y: note.y + movementY
                 });
             }
        }
        // NOTE RESIZE
        else if (dragData.type === 'note-resize') {
             const dx = (e.clientX - dragData.startX) / zoom;
             const dy = (e.clientY - dragData.startY) / zoom;
             
             let newW = (dragData.initialWidth || 0) + dx;
             let newH = (dragData.initialHeight || 0) + dy;
             
             if (newW < 100) newW = 100;
             if (newH < 50) newH = 50;

             handleNoteUpdate(draggingId, { width: newW, height: newH });
        }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
        saveMapState();
    }
    setIsPanning(false);
    setDraggingId(null);
    setDragData(null);
    lastMouseRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || (e.target as HTMLElement).tagName === 'IMG' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    
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

  // -- Render Helper: Connection Lines --
  const renderConnections = () => {
    const lines = [];
    for (let index = 0; index < trip.items.length; index++) {
        let nextItem: TripItem | null = null;
        let item = trip.items[index];
        let prevItem = index > 0 ? trip.items[index - 1] : null;

        if (trip.returnTrip && index === 0 && trip.items.length > 1) {
             prevItem = trip.items[trip.items.length - 1];
        }

        if (index < trip.items.length - 1) {
            nextItem = trip.items[index + 1];
        } else if (trip.returnTrip && trip.items.length > 1) {
            nextItem = trip.items[0];
        }

        if (!nextItem) continue;

        let prevArrival: string | undefined = undefined;
        if (index > 0 && prevItem && prevItem.transportDetails?.arrivalTime) {
             prevArrival = prevItem.transportDetails.arrivalTime;
        }

        const x1 = item.canvasX ?? 50;
        const y1 = item.canvasY ?? 50;
        const x2 = nextItem.canvasX ?? 50;
        const y2 = nextItem.canvasY ?? 50;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const isNone = item.transportToNext === TransportType.NONE;

        lines.push(
            <React.Fragment key={`conn-${item.id}-${nextItem.id}`}>
                {!isNone && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                        <defs>
                            <marker id={`arrowhead-${item.id}`} markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                <polygon points="0 0, 6 2, 0 4" fill={trip.returnTrip && index === trip.items.length - 1 ? "#ef4444" : "#475569"} />
                            </marker>
                        </defs>
                        <line 
                            x1={`${x1}%`} y1={`${y1}%`} 
                            x2={`${x2}%`} y2={`${y2}%`} 
                            stroke={trip.returnTrip && index === trip.items.length - 1 ? "#ef4444" : "#475569"} 
                            strokeWidth={`${2 / zoom}px`}
                            strokeDasharray="5,5"
                            markerEnd={`url(#arrowhead-${item.id})`}
                            className="drop-shadow-sm opacity-80"
                            vectorEffect="non-scaling-stroke" 
                        />
                    </svg>
                )}
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

  const selectedImage = (trip.mapImages || []).find(img => img.id === selectedImageId);
  const selectedNote = (trip.stickyNotes || []).find(n => n.id === selectedNoteId);
  const hasSelection = !!selectedImage || !!selectedNote;

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
                 {isEditing ? 'Edit Canvas' : 'Pan Map'}
               </button>
           </div>
           
           <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
               <button 
                 onClick={() => onUpdateTrip({ returnTrip: !trip.returnTrip })}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${trip.returnTrip ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}
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
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={handleAddNote}
                className="cursor-pointer px-3 py-1.5 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded shadow text-xs font-bold flex items-center gap-2 transition-transform active:scale-95"
            >
                <StickyNoteIcon className="w-3.5 h-3.5" /> <span>Add Note</span>
            </button>
            <label className="cursor-pointer px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded shadow text-xs font-bold flex items-center gap-2 transition-transform active:scale-95">
                <Upload className="w-3.5 h-3.5" /> <span>Add Image</span>
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                />
            </label>
        </div>
      </div>

      {/* --- Canvas Area --- */}
      <div className="flex-1 relative overflow-hidden bg-slate-200/50">
         <div 
            id="canvas-bg"
            className="w-full h-full relative overflow-hidden cursor-crosshair select-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
         >
            {/* FIXED LARGE CANVAS LAYER */}
            <div
                className="absolute origin-center"
                style={{ 
                    width: `${CANVAS_WIDTH}px`,
                    height: `${CANVAS_HEIGHT}px`,
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${CANVAS_WIDTH / 2}px`,
                    marginTop: `-${CANVAS_HEIGHT / 2}px`,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
                ref={containerRef}
            >
                {/* 1. MAP IMAGES LAYER (Lowest Z-Index) */}
                {(trip.mapImages || []).map((img) => (
                    <div
                        key={img.id}
                        className={`absolute group select-none ${selectedImageId === img.id ? 'z-10' : 'z-0'}`}
                        style={{
                            left: `${img.x}px`,
                            top: `${img.y}px`,
                            width: `${img.width}px`,
                            height: `${img.height}px`,
                        }}
                        onMouseDown={(e) => handleImageMouseDown(e, img.id, !!img.locked)}
                    >
                        {/* The Image */}
                        <img 
                            src={img.url} 
                            alt="Map" 
                            className={`w-full h-full object-fill pointer-events-none transition-opacity duration-200 ${selectedImageId === img.id ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                            style={{ opacity: img.opacity }}
                        />

                        {/* Controls (Only if selected) */}
                        {selectedImageId === img.id && (
                            <>
                                {/* Selection Border - counter scaled to always appear thin but visible */}
                                <div 
                                    className={`absolute inset-0 border-2 pointer-events-none ${img.locked ? 'border-red-400 border-dashed' : 'border-blue-500'}`}
                                    style={{ borderWidth: `${2 / zoom}px` }}
                                ></div>
                                
                                {/* Resize Handle (Bottom Right) - Only show if UNLOCKED */}
                                {!img.locked && (
                                    <div 
                                        className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 cursor-nwse-resize flex items-center justify-center shadow-md z-20 origin-bottom-right"
                                        style={{ 
                                            width: `${24 / zoom}px`, 
                                            height: `${24 / zoom}px`,
                                            borderTopLeftRadius: `${4 / zoom}px`
                                        }}
                                        onMouseDown={(e) => handleImageResizeStart(e, img.id, 'se', img)}
                                    >
                                        <Maximize2 className="text-white" style={{ width: `${12 / zoom}px`, height: `${12 / zoom}px` }} />
                                    </div>
                                )}
                                
                                {/* Lock Indicator (if Locked) */}
                                {img.locked && (
                                    <div 
                                        className="absolute top-0 right-0 bg-red-500 flex items-center justify-center shadow-md z-20"
                                        style={{ 
                                            width: `${24 / zoom}px`, 
                                            height: `${24 / zoom}px`,
                                            borderBottomLeftRadius: `${4 / zoom}px`
                                        }}
                                    >
                                        <Lock className="text-white" style={{ width: `${12 / zoom}px`, height: `${12 / zoom}px` }} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}

                {/* 1.5 STICKY NOTES LAYER (Z-Index 15) */}
                {(trip.stickyNotes || []).map((note) => (
                    <div
                        key={note.id}
                        className={`absolute group sticky-note shadow-lg ${selectedNoteId === note.id ? 'z-20' : 'z-15'}`}
                        style={{
                            left: `${note.x}px`,
                            top: `${note.y}px`,
                            width: `${note.width}px`,
                            height: `${note.height}px`,
                            backgroundColor: note.color,
                        }}
                        onMouseDown={(e) => handleNoteMouseDown(e, note.id, !!note.locked)}
                    >
                        {/* Text Content */}
                        <textarea
                            className="w-full h-full bg-transparent resize-none p-4 text-slate-800 focus:outline-none text-sm font-medium leading-relaxed"
                            value={note.text}
                            onChange={(e) => handleNoteUpdate(note.id, { text: e.target.value })}
                            placeholder="Type a note..."
                            style={{ pointerEvents: isEditing && !note.locked ? 'auto' : 'none' }}
                        />

                        {/* Controls (Only if selected) */}
                        {selectedNoteId === note.id && (
                            <>
                                {/* Selection Border */}
                                <div 
                                    className={`absolute inset-0 border-2 pointer-events-none ${note.locked ? 'border-red-400 border-dashed' : 'border-blue-500'}`}
                                    style={{ borderWidth: `${2 / zoom}px` }}
                                ></div>
                                
                                {/* Resize Handle (Bottom Right) */}
                                {!note.locked && (
                                    <div 
                                        className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 cursor-nwse-resize flex items-center justify-center shadow-md z-20 origin-bottom-right"
                                        style={{ 
                                            width: `${24 / zoom}px`, 
                                            height: `${24 / zoom}px`,
                                            borderTopLeftRadius: `${4 / zoom}px`
                                        }}
                                        onMouseDown={(e) => handleNoteResizeStart(e, note.id, 'se', note)}
                                    >
                                        <Maximize2 className="text-white" style={{ width: `${12 / zoom}px`, height: `${12 / zoom}px` }} />
                                    </div>
                                )}

                                {/* Lock Indicator */}
                                {note.locked && (
                                    <div 
                                        className="absolute top-0 right-0 bg-red-500 flex items-center justify-center shadow-md z-20"
                                        style={{ 
                                            width: `${24 / zoom}px`, 
                                            height: `${24 / zoom}px`,
                                            borderBottomLeftRadius: `${4 / zoom}px`
                                        }}
                                    >
                                        <Lock className="text-white" style={{ width: `${12 / zoom}px`, height: `${12 / zoom}px` }} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
                
                {/* 2. CONNECTIONS LAYER */}
                {renderConnections()}

                {/* 3. PINS LAYER (Highest Z-Index) */}
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
                                <div className="absolute -top-1 -right-1 bg-white text-slate-900 border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm z-10">
                                    {index + 1}
                                </div>
                            </div>
                            
                            <div 
                                className="bg-white/95 backdrop-blur px-3 py-1 rounded-md text-[11px] font-bold shadow-md mt-1 whitespace-nowrap border border-slate-200 text-slate-800"
                                style={{ transform: `scale(${Math.max(1, 1/zoom)})` }} 
                            >
                                {item.location.name}
                            </div>

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
            
            {/* Empty State Overlay */}
            {(trip.mapImages?.length === 0 && trip.items.length === 0 && (!trip.stickyNotes || trip.stickyNotes.length === 0)) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                        <div className="text-center bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-300/50 shadow-sm">
                        <Upload className="w-12 h-12 mx-auto mb-2 text-slate-500" />
                        <p className="font-medium text-lg text-slate-700">Infinite Canvas</p>
                        <p className="text-sm text-slate-600">Upload map images, add notes, or double click to add pins.</p>
                    </div>
                </div>
            )}
         </div>
         
         {/* FLOATING TOOLBAR - CONTEXT AWARE */}
         {hasSelection && (
             <div 
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md shadow-2xl rounded-full px-6 py-3 border border-white/40 ring-1 ring-black/5 animate-in slide-in-from-bottom-10 z-50 flex items-center gap-4"
                onMouseDown={(e) => e.stopPropagation()} // CRITICAL: Stop interaction from affecting canvas
             >
                 
                 {/* 1. IMAGE CONTROLS */}
                 {selectedImage && (
                    <div className="flex items-center gap-3 border-r border-slate-300 pr-4">
                        <Eye className="w-4 h-4 text-slate-500" />
                        <input 
                            type="range" 
                            min="0.1" max="1" step="0.05"
                            value={selectedImage.opacity}
                            onChange={(e) => handleImageUpdate(selectedImage.id, { opacity: parseFloat(e.target.value) })}
                            className="w-24 h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-slate-800"
                            title={`Opacity: ${Math.round(selectedImage.opacity * 100)}%`}
                        />
                    </div>
                 )}

                 {/* 2. NOTE CONTROLS */}
                 {selectedNote && (
                    <div className="flex items-center gap-3 border-r border-slate-300 pr-4">
                         {/* Color Picker Swatches */}
                         <div className="flex gap-1.5">
                             {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe', '#ffffff'].map(c => (
                                 <button
                                    key={c}
                                    onClick={() => handleNoteUpdate(selectedNote.id, { color: c })}
                                    className={`w-5 h-5 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110 ${selectedNote.color === c ? 'ring-2 ring-slate-400' : ''}`}
                                    style={{ backgroundColor: c }}
                                    title="Change Color"
                                 />
                             ))}
                         </div>
                    </div>
                 )}

                 {/* 3. COMMON CONTROLS */}
                 {/* Lock Toggle */}
                 <button 
                    onClick={() => {
                        if (selectedImage) handleImageUpdate(selectedImage.id, { locked: !selectedImage.locked });
                        if (selectedNote) handleNoteUpdate(selectedNote.id, { locked: !selectedNote.locked });
                    }}
                    className={`flex items-center justify-center p-2 rounded-full transition-colors ${
                        (selectedImage?.locked || selectedNote?.locked) 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={(selectedImage?.locked || selectedNote?.locked) ? "Unlock" : "Lock Position"}
                 >
                     {(selectedImage?.locked || selectedNote?.locked) ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                 </button>
                 
                 {/* Delete Button - RED as requested */}
                 <button 
                    onClick={handleDeleteSelected}
                    className="flex items-center justify-center p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md shadow-red-200"
                    title="Delete Selected Item"
                 >
                     <Trash2 className="w-4 h-4" />
                 </button>

                 <button 
                    onClick={() => { setSelectedImageId(null); setSelectedNoteId(null); }} 
                    className="ml-2 text-slate-400 hover:text-slate-600"
                 >
                     <X className="w-4 h-4"/>
                 </button>
             </div>
         )}
         
         <div className="absolute top-4 right-4 z-50 pointer-events-auto">
             <BudgetHUD totalBudget={trip.totalBudget} totalSpent={totalSpent} onUpdateBudget={onUpdateBudget} />
         </div>
      </div>
    </div>
  );
};

export default TripVisualizer;
