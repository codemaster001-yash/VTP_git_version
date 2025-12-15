
import React, { useState } from 'react';
import { X, Key, Save, ExternalLink, CheckCircle } from 'lucide-react';
import { storageService } from '../services/storageService';

interface SettingsModalProps {
  currentKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentKey, onSave, onClose }) => {
  const [apiKey, setApiKey] = useState(currentKey);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    await storageService.saveApiKey(apiKey.trim());
    onSave(apiKey.trim());
    setIsSaved(true);
    setTimeout(() => {
        setIsSaved(false);
        onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" /> Settings
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
            <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Google Gemini API Key</label>
                <div className="relative">
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm bg-white text-slate-900 placeholder:text-slate-400"
                    />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Your key is stored locally in your browser and used only for AI requests.
                </p>
            </div>

            <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-6"
            >
                <ExternalLink className="w-4 h-4" /> Get a free API key from Google
            </a>

            <button 
                onClick={handleSave}
                disabled={isSaved}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
                {isSaved ? (
                    <>
                        <CheckCircle className="w-5 h-5" /> Saved!
                    </>
                ) : (
                    <>
                        <Save className="w-5 h-5" /> Save API Key
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
