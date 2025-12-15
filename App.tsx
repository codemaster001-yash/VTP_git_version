
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trip, TripItem, Accommodation, ExpenseCategory, TransportType, SubItem, TransportDetails } from './types';
import ItineraryPanel from './components/ItineraryPanel';
import TripVisualizer from './components/TripVisualizer';
import Dashboard from './components/Dashboard';
import AIPlanner from './components/AIPlanner';
import TripHistory from './components/TripHistory';
import AboutModal from './components/AboutModal';
import SettingsModal from './components/SettingsModal';
import FinalReport from './components/FinalReport';
import { storageService } from './services/storageService';
import { Layout, Map as MapIcon, PieChart, Sparkles, Share2, Menu, Save, History as HistoryIcon, Edit2, Calendar, HelpCircle, Download, Upload, Plane, Hotel, MapPin, IndianRupee, Clock, FileText, FilePlus, Loader2, Settings } from 'lucide-react';

const INITIAL_TRIP: Trip = {
  id: crypto.randomUUID(),
  title: 'My Awesome Trip',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  items: [],
  accommodations: [],
  mapImages: [], 
  stickyNotes: [], // Initialize empty sticky notes
  totalBudget: 50000, 
  createdAt: Date.now(),
  returnTrip: false,
  hasFinalReport: false,
};

const App: React.FC = () => {
  // State initialization is now simple, data loading happens in useEffect
  const [trip, setTrip] = useState<Trip>(INITIAL_TRIP);
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');

  const [activeTab, setActiveTab] = useState<'visualizer' | 'dashboard' | 'history' | 'report'>('visualizer');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAIPlanner, setShowAIPlanner] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Resizing Logic
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizingRef = useRef(false);
  
  // -- Asynchronous Load Effect --
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedTrip, loadedHistory, loadedKey] = await Promise.all([
          storageService.loadCurrentTrip(),
          storageService.loadHistory(),
          storageService.loadApiKey()
        ]);

        if (loadedTrip) {
          // Ensure we merge with initial defaults to handle new fields
          setTrip({ ...INITIAL_TRIP, ...loadedTrip });
        }
        if (loadedHistory) {
          setSavedTrips(loadedHistory);
        }
        if (loadedKey) {
            setApiKey(loadedKey);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadData();
  }, []);

  // -- Persistence Effects (Debounced) --
  
  // We use a ref to prevent saving the INITIAL_TRIP over the real data 
  // before the real data has finished loading from IDB.
  useEffect(() => {
    if (!isDataLoaded) return;

    const timeoutId = setTimeout(() => {
      storageService.saveCurrentTrip(trip);
    }, 1000); // 1 second debounce to avoid hammering the DB

    return () => clearTimeout(timeoutId);
  }, [trip, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    storageService.saveHistory(savedTrips);
  }, [savedTrips, isDataLoaded]);


  // -- Derived State for Dates & Duration --
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


  const handleUpdateItems = (newItems: TripItem[]) => {
    setTrip(prev => ({ ...prev, items: newItems }));
  };
  
  const handleUpdateTrip = (updates: Partial<Trip>) => {
      setTrip(prev => ({ ...prev, ...updates }));
  };

  const handleUpdateItem = (itemId: string, updates: Partial<TripItem>) => {
    setTrip(prev => ({
        ...prev,
        items: prev.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
    }));
  };

  const handleAddItem = (newItem: TripItem) => {
    setTrip(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleUpdateBudget = (newBudget: number) => {
    setTrip(prev => ({ ...prev, totalBudget: newBudget }));
  };

  const handleAIPlan = (items: TripItem[], acc: Accommodation[], title: string) => {
    setTrip(prev => ({
        ...prev,
        title,
        items,
        accommodations: acc
    }));
    setShowAIPlanner(false);
    setActiveTab('visualizer');
  };

  const handleSaveTrip = () => {
      setSavedTrips(prev => {
          const existing = prev.findIndex(t => t.id === trip.id);
          if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = trip;
              return updated;
          }
          return [...prev, trip];
      });
      alert('Trip saved to History!');
  };

  const createNewProjectLogic = () => {
      setSavedTrips(prev => {
          const existing = prev.findIndex(t => t.id === trip.id);
          if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = trip;
              return updated;
          }
          return [...prev, trip];
      });

      setTrip({
          ...INITIAL_TRIP,
          id: crypto.randomUUID(),
          title: "New Adventure",
          items: [],
          accommodations: [],
          createdAt: Date.now()
      });
      setActiveTab('visualizer');
  };

  const handleCreateNewProject = () => {
      createNewProjectLogic();
  };

  const handleNewTrip = () => {
      createNewProjectLogic();
  };

  const handleLoadTrip = (loadedTrip: Trip) => {
      setTrip(loadedTrip);
      if (loadedTrip.hasFinalReport) {
        setActiveTab('visualizer'); 
      } else {
        setActiveTab('visualizer');
      }
  };

  const handleViewReport = (loadedTrip: Trip) => {
    setTrip(loadedTrip);
    setActiveTab('report');
  }

  const handleDeleteTrip = (id: string) => {
      if(confirm("Are you sure you want to delete this trip from history?")) {
        setSavedTrips(prev => prev.filter(t => t.id !== id));
      }
  };

  const handleCreateReport = () => {
      handleUpdateTrip({ hasFinalReport: true });
      setSavedTrips(prev => {
          const existing = prev.findIndex(t => t.id === trip.id);
          const updatedTrip = { ...trip, hasFinalReport: true };
          if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = updatedTrip;
              return updated;
          }
          return [...prev, updatedTrip];
      });
      setActiveTab('report');
  };

  // -- JSON Export --
  
  const handleExportJSON = () => {
    // Create a Sanitized Export Object
    const exportData: Partial<Trip> = {
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        totalBudget: trip.totalBudget,
        mapImages: trip.mapImages,
        stickyNotes: trip.stickyNotes,
        returnTrip: trip.returnTrip,
        items: trip.items, 
        accommodations: trip.accommodations,
        createdAt: Date.now(),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${trip.title.replace(/\s+/g, '_')}_plan.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Resize Handlers
  const startResizing = (e: React.MouseEvent) => {
      isResizingRef.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isResizingRef.current) return;
          const newWidth = Math.min(Math.max(250, e.clientX), 600); // Min 250px, Max 600px
          setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
          isResizingRef.current = false;
          document.body.style.cursor = 'default';
          document.body.style.userSelect = 'auto';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, []);

  // -- Loading Screen --
  if (!isDataLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
           <p className="text-sm font-medium">Loading your trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      
      {/* Mobile Overlay */}
      {sidebarOpen && activeTab !== 'report' && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar - Itinerary (Hidden in History & Report Mode) */}
      {activeTab !== 'history' && activeTab !== 'report' && (
        <aside 
            className={`fixed lg:relative z-30 h-full transition-all duration-75 ease-out shadow-xl lg:shadow-none bg-white flex shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} print:hidden`}
            style={{ width: isSidebarCollapsed ? '4rem' : `${sidebarWidth}px` }}
        >
            <ItineraryPanel 
                key={trip.id}
                items={trip.items} 
                setItems={handleUpdateItems} 
                onSelect={(id) => setSelectedItemId(id)}
                selectedId={selectedItemId}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onStartResize={startResizing}
                apiKey={apiKey}
            />
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Header - Hidden in Report Mode (Report has its own toolbar) */}
        {activeTab !== 'report' && (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            {activeTab !== 'history' && (
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-md">
                    <Menu className="w-5 h-5" />
                </button>
            )}
            <div className="min-w-0 flex flex-col justify-center">
              {isEditingTitle ? (
                  <input 
                    type="text" 
                    value={trip.title}
                    onChange={(e) => handleUpdateTrip({ title: e.target.value })}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    className="text-lg lg:text-xl font-bold text-slate-900 bg-white border border-blue-300 rounded px-2 py-0 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[300px]"
                    autoFocus
                  />
              ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                      <h1 className="text-lg lg:text-xl font-bold text-slate-800 truncate max-w-[200px] sm:max-w-md">{trip.title}</h1>
                      <Edit2 className="w-4 h-4 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
              )}
              
              {activeTab !== 'history' && (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {displayStartDate.toLocaleDateString()} - {displayEndDate.toLocaleDateString()}
                    </span>
                    <span className="bg-slate-100 px-1.5 rounded-full text-[10px] font-bold">
                        {Math.max(1, durationDays)} Days
                    </span>
                  </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
             {/* View Toggles */}
             <div className="flex bg-slate-100 rounded-lg p-1">
               <button 
                 onClick={() => setActiveTab('visualizer')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'visualizer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <MapIcon className="w-4 h-4" />
                 <span className="hidden sm:inline">Visuals</span>
               </button>
               <button 
                 onClick={() => setActiveTab('dashboard')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <PieChart className="w-4 h-4" />
                 <span className="hidden sm:inline">Stats</span>
               </button>
               <button 
                 onClick={() => setActiveTab('history')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <HistoryIcon className="w-4 h-4" />
                 <span className="hidden sm:inline">History</span>
               </button>
             </div>

             <div className="h-6 w-px bg-slate-200 mx-1"></div>

             {/* New Project Button */}
             <button onClick={handleCreateNewProject} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Save & New Trip">
                 <FilePlus className="w-5 h-5" />
             </button>

             <button onClick={handleCreateReport} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full" title="Create Final Report">
                 <FileText className="w-5 h-5" />
             </button>
             
             {/* Export uses Upload icon (Up Arrow) as requested */}
             <button onClick={handleExportJSON} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Export JSON Plan">
                 <Upload className="w-5 h-5" />
             </button>

             <button onClick={() => setShowAbout(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Help & About">
                 <HelpCircle className="w-5 h-5" />
             </button>

             <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Settings (API Key)">
                 <Settings className="w-5 h-5" />
             </button>

             <button onClick={handleSaveTrip} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Save Trip to History">
                 <Save className="w-5 h-5" />
             </button>

             <button 
               onClick={() => setShowAIPlanner(true)}
               className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:brightness-110 transition-all"
             >
               <Sparkles className="w-4 h-4" />
               <span className="hidden sm:inline">AI Plan</span>
             </button>
          </div>
        </header>
        )}

        {/* Content Body */}
        <div className="flex-1 relative bg-slate-50 overflow-hidden">
           {activeTab === 'visualizer' && (
             <TripVisualizer 
                key={trip.id} /* Force remount on new trip load */
                trip={trip} 
                onUpdateBudget={handleUpdateBudget} 
                onUpdateTrip={handleUpdateTrip}
                onUpdateItem={handleUpdateItem}
                onAddItem={handleAddItem}
             />
           )}
           
           {activeTab === 'dashboard' && (
             <div className="h-full p-4 lg:p-8 overflow-y-auto">
               <div className="max-w-5xl mx-auto h-full">
                  <Dashboard key={trip.id} trip={trip} />
               </div>
             </div>
           )}

           {activeTab === 'history' && (
               <TripHistory 
                    savedTrips={savedTrips} 
                    onLoadTrip={handleLoadTrip} 
                    onDeleteTrip={handleDeleteTrip}
                    onNewTrip={handleNewTrip}
                    onViewReport={handleViewReport}
               />
           )}
           
           {activeTab === 'report' && (
               <FinalReport key={trip.id} trip={trip} onBack={() => setActiveTab('visualizer')} />
           )}

           {/* Mobile FAB */}
           {activeTab !== 'report' && (
           <button className="absolute bottom-6 right-6 p-4 bg-white text-slate-800 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 lg:hidden z-50 print:hidden">
              <Share2 className="w-6 h-6" />
           </button>
           )}
        </div>

      </main>

      {/* Modals */}
      {showAIPlanner && (
        <AIPlanner onPlanGenerated={handleAIPlan} onClose={() => setShowAIPlanner(false)} apiKey={apiKey} />
      )}
      
      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}

      {showSettings && (
          <SettingsModal 
            currentKey={apiKey} 
            onSave={(newKey) => setApiKey(newKey)} 
            onClose={() => setShowSettings(false)} 
          />
      )}
    </div>
  );
};

export default App;
