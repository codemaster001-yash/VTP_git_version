
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TripItem, TransportType, ExpenseCategory, SubItem } from '../types';
import { MapPin, Trash2, Plus, Search, Tag, IndianRupee, GripVertical, BedDouble, Camera, Utensils, StickyNote, ChevronDown, ChevronRight, CalendarClock, ChevronLeft, PanelLeftClose, PanelLeftOpen, CalendarDays, Moon, X, Edit3 } from 'lucide-react';
import { searchLocation } from '../services/geminiService';

interface ItineraryPanelProps {
  items: TripItem[];
  setItems: (items: TripItem[]) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onStartResize: (e: React.MouseEvent) => void;
  apiKey: string;
}

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({ items, setItems, onSelect, selectedId, isCollapsed, onToggleCollapse, onStartResize, apiKey }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // -- Helper: Calculate Duration at Stop --
  // Time spent at Stop[i] is from Arrival at Stop[i] to Departure from Stop[i]
  const getStopDuration = (index: number) => {
      // Arrival at current stop depends on the transport of previous stop
      const prevItem = index > 0 ? items[index - 1] : null;
      // Departure from current stop depends on its own transport
      const currItem = items[index];

      // Arrival Time
      let arrivalTime: string | undefined;
      if (prevItem && prevItem.transportDetails?.arrivalTime) {
          arrivalTime = prevItem.transportDetails.arrivalTime;
      }
      
      // Departure Time
      let departureTime: string | undefined;
      if (currItem.transportDetails?.departureTime) {
          departureTime = currItem.transportDetails.departureTime;
      }

      if (!arrivalTime || !departureTime) return null;

      const diff = new Date(departureTime).getTime() - new Date(arrivalTime).getTime();
      if (diff < 0) return null;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return { days, nights: days };
  };

  // -- Add Stop --
  const handleAddLocation = async () => {
    if (!searchQuery.trim()) return;
    if (!apiKey) {
        alert("Please enter your Gemini API Key in Settings to use search.");
        return;
    }

    setIsSearching(true);
    
    const result = await searchLocation(searchQuery, apiKey);
    
    if (result) {
      const newItem: TripItem = {
        id: crypto.randomUUID(),
        location: {
          name: result.name,
          lat: result.lat,
          lng: result.lng,
          address: result.address
        },
        cost: 0,
        category: 'Activity',
        type: 'Stop',
        notes: '',
        transportToNext: TransportType.CAR,
        subItems: [],
        isExpanded: true // Auto expand new items
      };
      setItems([...items, newItem]);
      setSearchQuery('');
    } else {
      alert("Could not find location. Try a more specific name.");
    }
    setIsSearching(false);
  };

  // -- Sort / Drag & Drop --
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const _items = [...items];
    const draggedItemContent = _items[dragItem.current];
    _items.splice(dragItem.current, 1);
    _items.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    setItems(_items);
  };

  const handleUpdateItem = (id: string, updates: Partial<TripItem>) => {
      setItems(items.map(i => i.id === id ? { ...i, ...updates } : i));
  };
  
  const handleUpdateLocationName = (id: string, newName: string) => {
      setItems(items.map(i => i.id === id ? { ...i, location: { ...i.location, name: newName } } : i));
  };

  // -- Sub Items --
  const toggleExpand = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const item = items.find(i => i.id === id);
      if (item) {
        handleUpdateItem(id, { isExpanded: !item.isExpanded });
      }
  };

  const calculateTotalCost = (subItems: SubItem[]) => {
      return subItems.reduce((acc, curr) => acc + curr.cost, 0);
  };

  const handleAddSubItem = (itemId: string, type: 'Activity' | 'Stay' | 'Food') => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      
      const newSub: SubItem = {
          id: crypto.randomUUID(),
          name: '', // Empty name so placeholder shows
          type: type === 'Stay' ? 'Stay' : type === 'Food' ? 'Food' : 'Activity',
          cost: 0,
          date: '',
          notes: ''
      };
      
      const newSubItems = [...(item.subItems || []), newSub];
      handleUpdateItem(itemId, { 
          subItems: newSubItems,
          cost: calculateTotalCost(newSubItems),
          isExpanded: true // Ensure panel is expanded to see the new item
      });
  };

  const handleUpdateSubItem = (itemId: string, subId: string, updates: Partial<SubItem>) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      
      const updatedSubs = (item.subItems || []).map(s => s.id === subId ? { ...s, ...updates } : s);
      
      handleUpdateItem(itemId, { 
          subItems: updatedSubs,
          cost: calculateTotalCost(updatedSubs)
      });
  };

  const handleDeleteSubItem = (itemId: string, subId: string) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      
      const updatedSubs = (item.subItems || []).filter(s => s.id !== subId);
      
      handleUpdateItem(itemId, { 
          subItems: updatedSubs,
          cost: calculateTotalCost(updatedSubs)
      });
  };

  if (isCollapsed) {
      return (
          <div className="flex flex-col h-full bg-white border-r border-slate-200 items-center py-4 w-16 transition-all duration-300 relative group">
              <button onClick={onToggleCollapse} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg mb-4" title="Expand Panel">
                  <PanelLeftOpen className="w-6 h-6" />
              </button>
              
              <div className="space-y-4 flex flex-col items-center w-full overflow-y-auto">
                  {items.map((item, index) => (
                      <button 
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${selectedId === item.id ? 'bg-blue-600 text-white scale-110' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                          {index + 1}
                      </button>
                  ))}
                  
                  <button 
                    onClick={onToggleCollapse} 
                    className="w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 mt-2"
                  >
                      <Plus className="w-4 h-4" />
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-75 relative w-full">
      {/* Drag Handle */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-400 cursor-col-resize z-50 transition-colors"
        onMouseDown={onStartResize}
      ></div>

      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
            <h2 className="text-lg font-bold text-slate-800">Itinerary</h2>
            <p className="text-xs text-slate-500">Drag to reorder stops</p>
        </div>
        <button onClick={onToggleCollapse} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md">
             <PanelLeftClose className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-slate-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Add stop..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <button
            onClick={handleAddLocation}
            disabled={isSearching}
            className="absolute right-2 top-1.5 p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {items.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No items added.</p>
          </div>
        )}

        {items.map((item, index) => {
            const duration = getStopDuration(index);
            const isItemExpanded = !!item.isExpanded;

            return (
                <div 
                    key={item.id} 
                    className="relative"
                    draggable
                    onDragStart={(e) => { dragItem.current = index; }}
                    onDragEnter={(e) => { dragOverItem.current = index; }}
                    onDragEnd={handleSort}
                    onDragOver={(e) => e.preventDefault()}
                >
                    {/* Connection Line Visual (Left side) */}
                    {index < items.length - 1 && (
                    <div className="absolute left-[26px] top-10 bottom-[-10px] w-0.5 bg-slate-200 -z-10"></div>
                    )}
                    
                    <div 
                    onClick={() => onSelect(item.id)}
                    className={`relative flex flex-col p-3 rounded-lg border transition-all group/card ${
                        selectedId === item.id 
                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300 shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                    >
                    <div className="flex items-center gap-2 mb-1">
                        <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                            <GripVertical className="w-4 h-4" />
                        </div>
                        
                        {/* Number/Icon */}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm z-10">
                            {index + 1}
                        </div>

                        {/* Content Header */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <input 
                                    type="text" 
                                    className="font-semibold text-slate-800 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full mr-2"
                                    value={item.location.name}
                                    onChange={(e) => handleUpdateLocationName(item.id, e.target.value)}
                                />
                                {/* Header Actions */}
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={(e) => toggleExpand(item.id, e)} 
                                        className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                        title={isItemExpanded ? "Collapse" : "Expand"}
                                    >
                                        {isItemExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setItems(items.filter(i => i.id !== item.id)); }} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Duration Display */}
                            {duration && (
                                <div className="flex items-center gap-1.5 ml-0.5 mt-0.5">
                                    <Moon className="w-3 h-3 text-indigo-400" />
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        {duration.nights} {duration.nights === 1 ? 'Night' : 'Nights'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Collapsible Sub Items Area */}
                    {isItemExpanded && (
                        <div className="ml-8 animate-in slide-in-from-top-2 duration-200">
                            {/* Sub Items List */}
                            {(item.subItems && item.subItems.length > 0) && (
                                <div className="mb-3 space-y-2 mt-2">
                                    {/* Sort Items: Dates First (Ascending), No Dates Last */}
                                    {[...item.subItems]
                                        .sort((a, b) => {
                                            if (!a.date && !b.date) return 0;
                                            if (!a.date) return 1;
                                            if (!b.date) return -1;
                                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                                        })
                                        .map((sub) => (
                                        <SubItemRow 
                                            key={sub.id} 
                                            item={item} 
                                            sub={sub} 
                                            onUpdate={(subId, updates) => handleUpdateSubItem(item.id, subId, updates)} 
                                            onDelete={(subId) => handleDeleteSubItem(item.id, subId)} 
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Action Bar */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                <div className="flex gap-1">
                                    <button onClick={() => handleAddSubItem(item.id, 'Activity')} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors" title="Add Activity">
                                        <Camera className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleAddSubItem(item.id, 'Stay')} className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors" title="Add Stay">
                                        <BedDouble className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleAddSubItem(item.id, 'Food')} className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded transition-colors" title="Add Restaurant">
                                        <Utensils className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded px-2 py-1" title="Total Stop Cost">
                                        <IndianRupee className="w-3 h-3 text-slate-500 mr-1" />
                                        <span className="text-xs font-bold text-slate-700 w-12 text-right">
                                            {item.cost.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

// Extracted Row Component for cleaner date handling and Notes Popover
const SubItemRow = ({ item, sub, onUpdate, onDelete }: { item: TripItem, sub: SubItem, onUpdate: (id: string, u: Partial<SubItem>) => void, onDelete: (id: string) => void }) => {
    const [showNotes, setShowNotes] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState<{top: number, left: number} | null>(null);

    const toggleNotes = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showNotes) {
            setShowNotes(false);
        } else {
            // Calculate position relative to the button
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.top, // Align top with button
                    left: rect.right + 8 // Position to the right with small gap
                });
            }
            setShowNotes(true);
        }
    };

    const displayDate = sub.date 
        ? new Date(sub.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) 
        : 'Set Date';

    return (
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
            {/* Top Row: Icon + Name */}
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full shrink-0 ${
                    sub.type === 'Stay' ? 'bg-indigo-100 text-indigo-600' : 
                    sub.type === 'Food' ? 'bg-orange-100 text-orange-600' : 
                    'bg-emerald-100 text-emerald-600'
                }`}>
                    {sub.type === 'Stay' && <BedDouble className="w-3.5 h-3.5" />}
                    {sub.type === 'Activity' && <Camera className="w-3.5 h-3.5" />}
                    {sub.type === 'Food' && <Utensils className="w-3.5 h-3.5" />}
                    {sub.type === 'Note' && <StickyNote className="w-3.5 h-3.5" />}
                </div>
                
                <input 
                    className="flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none border-b border-transparent focus:border-blue-300 placeholder:text-slate-400 py-0.5"
                    value={sub.name}
                    onChange={(e) => onUpdate(sub.id, { name: e.target.value })}
                    placeholder={sub.type === 'Food' ? "Restaurant Name" : sub.type === 'Stay' ? "Hotel Name" : "Activity Name"}
                />
            </div>

            {/* Bottom Row: Date | Cost | Tools */}
            <div className="flex items-center justify-between mt-2 gap-2">
                
                {/* Date Picker Area (Left Aligned) */}
                <div 
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1.5 -ml-2 rounded transition-colors flex-1 min-w-0 relative"
                    title="Click to set date"
                >
                    <div className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0">
                        <CalendarDays className="w-3.5 h-3.5" />
                    </div>
                    
                    <div className={`text-[11px] truncate ${sub.date ? 'text-blue-600 font-medium' : 'text-slate-400 italic'}`}>
                        {displayDate}
                    </div>

                    {/* Input covering the parent - The Fix for reliable clicking */}
                    <input 
                        type="datetime-local"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        value={sub.date || ''}
                        onChange={(e) => onUpdate(sub.id, { date: e.target.value })}
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>

                {/* Right Aligned Tools: Note, Cost, Delete */}
                <div className="flex items-center gap-1 shrink-0 relative">
                     {/* Note Button */}
                     <button 
                        ref={buttonRef}
                        onClick={toggleNotes}
                        className={`p-1.5 rounded-md transition-colors relative ${sub.notes ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}
                        title="Add Note"
                     >
                         <StickyNote className="w-3.5 h-3.5" />
                         {sub.notes && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full border border-white"></div>}
                     </button>
                     
                     {/* Floating Note Dialog (Popover via Portal) */}
                     {showNotes && createPortal(
                        <div className="fixed inset-0 z-[9999] isolate">
                            {/* Backdrop - Covers whole screen */}
                            <div className="absolute inset-0 bg-black/5" onClick={() => setShowNotes(false)}></div>
                            
                            {/* Dialog Content */}
                            <div 
                                className="absolute bg-white rounded-lg shadow-xl border border-slate-200 w-64 animate-in zoom-in-95 duration-200"
                                style={{
                                    top: coords ? `${coords.top}px` : '50%',
                                    left: coords ? `${coords.left}px` : '50%',
                                }}
                            >
                                 <div className="flex items-center justify-between p-2 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                                     <span className="text-xs font-bold text-slate-500 uppercase">Notes</span>
                                     <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-3 h-3" /></button>
                                 </div>
                                 <textarea 
                                    className="w-full h-24 p-2 text-xs text-slate-900 bg-white resize-none focus:outline-none rounded-b-lg placeholder:text-slate-400"
                                    placeholder="Add details, booking numbers, or reminders..."
                                    value={sub.notes || ''}
                                    onChange={(e) => onUpdate(sub.id, { notes: e.target.value })}
                                    autoFocus
                                 />
                            </div>
                        </div>,
                        document.body
                     )}

                    {/* Cost Input */}
                    <div className="flex items-center bg-slate-50 px-2 py-1 rounded-md border border-slate-200 focus-within:ring-1 focus-within:ring-blue-200">
                        <span className="text-slate-400 text-[10px] mr-1">₹</span>
                        <input 
                            type="number" 
                            className="w-12 bg-transparent text-right text-xs font-mono focus:outline-none"
                            value={sub.cost === 0 ? '' : sub.cost}
                            placeholder="0"
                            onChange={(e) => onUpdate(sub.id, { cost: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    
                    {/* Delete */}
                    <button 
                        onClick={() => onDelete(sub.id)} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Item"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItineraryPanel;
