import React from 'react';
import { Skin } from '@/lib/types';

interface RarityBadgeProps {
  rarity: Skin['rarity'] | string;
  size?: 'sm' | 'md' | 'lg';
}

const rarityColors = {
  'Consumer': 'bg-gray-500 text-white',
  'Industrial': 'bg-blue-500 text-white',
  'Mil-Spec': 'bg-green-500 text-white',
  'Restricted': 'bg-purple-500 text-white',
  'Classified': 'bg-pink-500 text-white',
  'Covert': 'bg-red-500 text-white',
  'Contraband': 'bg-yellow-500 text-black'
};

const rarityNames = {
  'Consumer': 'Consumer',
  'Industrial': 'Industrial',
  'Mil-Spec': 'Mil-Spec',
  'Restricted': 'Restricted',
  'Classified': 'Classified',
  'Covert': 'Covert',
  'Contraband': 'Contraband'
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export default function RarityBadge({ rarity, size = 'md' }: RarityBadgeProps) {
  const rarityKey = rarity as keyof typeof rarityColors;
  const color = rarityColors[rarityKey] || 'bg-gray-500 text-white';
  const name = rarityNames[rarityKey] || rarity;
  
  return (
    <span className={`
      inline-flex items-center font-semibold rounded-full
      ${color}
      ${sizeClasses[size]}
    `}>
      {name}
    </span>
  );
} 