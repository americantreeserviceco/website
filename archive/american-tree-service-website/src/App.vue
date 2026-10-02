<template>
  <div class="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
    
    <!-- Test Card Grid -->
    <div class="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 text-center transform transition hover:scale-105 duration-300">
      
      <!-- Vue Reactive Feature Indicator -->
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 animate-bounce">
        <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
        It Works!
      </h1>
      
      <p class="text-slate-400 mt-2 text-sm">
        Vue 3 & Tailwind CSS are actively compiling and running smoothly.
      </p>

      <!-- Interactive Vue Test Button -->
      <div class="mt-6 pt-6 border-t border-slate-700/50">
        <p class="text-xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Test Vue Reactivity</p>
        <button 
          @click="count++" 
          class="cursor-pointer px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-150 inline-flex items-center gap-2"
        >
          Clicks: <span class="bg-slate-950/20 px-2 py-0.5 rounded text-sm font-mono">{{ count }}</span>
        </button>
      </div>

    </div>

    <!-- Live Status Pill -->
    <div class="mt-6 flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-full border border-slate-700/30 text-xs text-slate-400">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      Vite Server Active
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
