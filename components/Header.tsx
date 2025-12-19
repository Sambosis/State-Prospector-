import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-900/20 text-white">
            S
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">State Chemical Prospector</h1>
            <p className="text-[11px] text-slate-300 font-medium uppercase tracking-wider">AI Market Intelligence</p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div>
          <span className="text-xs font-medium text-slate-300">
            System Online
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;