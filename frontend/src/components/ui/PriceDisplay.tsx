import React from 'react';
import { useTranslations } from 'next-intl';
import { Skin } from '@/lib/types';

interface PriceDisplayProps {
  price: Skin['price'] | { min: number; max: number; currency: string };
  size?: 'sm' | 'md' | 'lg';
  showRange?: boolean;
}

const currencySymbols = {
  'TRY': '₺',
  'USD': '$'
};

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

export default function PriceDisplay({ price, size = 'md', showRange = true }: PriceDisplayProps) {
  const t = useTranslations('common');
  // Price null veya undefined ise loading göster
  if (!price) {
    return (
      <div className={`text-gray-500 dark:text-gray-400 ${sizeClasses[size]}`}>
        {t('priceLoading')}
      </div>
    );
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (showRange && price.min !== price.max) {
    return (
      <div className={`font-bold text-green-600 ${sizeClasses[size]}`}>
        {formatPrice(price.min)} - {formatPrice(price.max)}
      </div>
    );
  }

  return (
    <div className={`font-bold text-green-600 ${sizeClasses[size]}`}>
      {formatPrice(price.min)}
    </div>
  );
} 