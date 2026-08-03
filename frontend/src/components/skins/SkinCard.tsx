'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Skin } from '@/lib/types';
import { cdnUrl } from '@/lib/cdn';

// API'den gelen skin tipi için genişletilmiş interface
interface APISkin extends Omit<Skin, 'rarity' | 'price'> {
  rarity: string;
  price: {
    min: number;
    max: number;
    currency: string;
  };
}
import RarityBadge from '../ui/RarityBadge';
import PriceDisplay from '../ui/PriceDisplay';

interface SkinCardProps {
  skin: Skin | APISkin;
  weaponSlug: string;
  categorySlug: string;
  onClick?: () => void;
}

export default function SkinCard({ skin, weaponSlug, categorySlug, onClick }: SkinCardProps) {
  const t = useTranslations('skinCard');
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className="group bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 p-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer"
      onClick={handleClick}
    >
      {/* Skin Görseli */}
      <div className="relative aspect-video mb-4 bg-gray-100 dark:bg-blue-800 rounded-lg overflow-hidden">
        <Image
          src={cdnUrl(skin.image)}
          alt={skin.name}
          fill
          className="object-contain group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      {/* Skin Bilgileri */}
      <div className="space-y-2">
        {/* Başlık ve Rarity */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {skin.name}
          </h3>
          <RarityBadge rarity={skin.rarity} size="sm" />
        </div>

        {/* Silah Adı */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {skin.weapon}
        </p>

        {/* Fiyat */}
        <div className="flex items-center justify-between">
          <PriceDisplay price={skin.price} size="md" />
          
          {/* Detay Linki */}
          <Link
            href={`/cs2/skins/${categorySlug}/${weaponSlug}/${skin.id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {t('details')} →
          </Link>
        </div>

        {/* Wear Bilgisi */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{t('wear')}: {skin.wear ? (skin.wear * 100).toFixed(1) : 'N/A'}%</span>
          {skin.collection && (
            <span className="truncate max-w-[120px]" title={skin.collection}>
              {skin.collection}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 