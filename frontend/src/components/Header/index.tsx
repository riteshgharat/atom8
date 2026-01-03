"use client";

import React from 'react';
import { Search, Zap } from 'lucide-react';

export default function Header() {
    return (
        <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
                {/* <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Zap className="w-5 h-5 text-white" />
                </div> */}
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                    ATOM<span className="text-blue-500">8</span>
                </h1>
            </div>

            {/* User Avatar */}
            <div className="flex items-center">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium text-sm shadow-md">
                    U
                </div>
            </div>
        </header>
    );
}
