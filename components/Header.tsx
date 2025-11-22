import React from 'react';
import { Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 text-white p-6 shadow-md sticky top-0 z-10">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <div className="p-2 bg-indigo-500 rounded-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Perfume Jessi Dubai</h1>
          <p className="text-slate-400 text-xs">CATÁLOG MANAGER</p>
        </div>
      </div>
    </header>
  );
};