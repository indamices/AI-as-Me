
import React from 'react';
import { MemoryCategory, MemoryLayer } from './types';

export const CATEGORY_METADATA: Record<MemoryCategory, { icon: React.ReactNode; color: string; label: string }> = {
  [MemoryCategory.GOAL]: { icon: <i className="fa-solid fa-bullseye"></i>, color: 'text-blue-400', label: 'Goals' },
  [MemoryCategory.PREFERENCE]: { icon: <i className="fa-solid fa-heart"></i>, color: 'text-pink-400', label: 'Preferences' },
  [MemoryCategory.HABIT]: { icon: <i className="fa-solid fa-repeat"></i>, color: 'text-green-400', label: 'Habits' },
  [MemoryCategory.BOUNDARY]: { icon: <i className="fa-solid fa-shield-halved"></i>, color: 'text-red-400', label: 'Boundaries' },
  [MemoryCategory.VALUE]: { icon: <i className="fa-solid fa-scale-balanced"></i>, color: 'text-purple-400', label: 'Values' },
  [MemoryCategory.PROJECT]: { icon: <i className="fa-solid fa-diagram-project"></i>, color: 'text-yellow-400', label: 'Projects' },
  [MemoryCategory.PEOPLE]: { icon: <i className="fa-solid fa-users"></i>, color: 'text-cyan-400', label: 'People' },
};

export const LAYER_METADATA: Record<MemoryLayer, { label: string; stability: string; description: string }> = {
  [MemoryLayer.L0]: { label: 'L0', stability: 'Volatile', description: 'Immediate working context.' },
  [MemoryLayer.L1]: { label: 'L1', stability: 'Short-term', description: 'Recent context, auto-archived after 30 days.' },
  [MemoryLayer.L2]: { label: 'L2', stability: 'Patterned', description: 'Emerging patterns from repeated observations.' },
  [MemoryLayer.L3]: { label: 'L3', stability: 'Strategic', description: 'Mental models and decision frameworks.' },
  [MemoryLayer.L4]: { label: 'L4', stability: 'Identity', description: 'Core values and immutable constraints.' },
};
