'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export interface PriceHistoryPoint {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  volume: number;
}

interface PriceHistoryChartProps {
  history: PriceHistoryPoint[];
  currentSteamPrice: number | null;
  currency?: string;
}

export default function PriceHistoryChart({ history, currentSteamPrice, currency = 'USD' }: PriceHistoryChartProps) {
  const t = useTranslations('priceHistory');
  const locale = useLocale();

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-blue-800 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-gray-400 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v18h18M7 14l4-4 4 4 4-6" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          {t('noData')}
        </p>
        {currentSteamPrice !== null && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('steamCurrentPrice', { price: currentSteamPrice.toFixed(2) })}
          </p>
        )}
      </div>
    );
  }

  const labels = history.map(h =>
    new Date(h.date).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })
  );

  const datasets: any[] = [
    {
      label: t('avgPrice'),
      data: history.map(h => h.avgPrice),
      borderColor: 'rgb(37, 99, 235)',
      backgroundColor: 'rgba(37, 99, 235, 0.15)',
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      tension: 0.25,
      fill: true,
      order: 1
    },
    {
      label: t('maxPrice'),
      data: history.map(h => h.maxPrice),
      borderColor: 'rgba(34, 197, 94, 0.6)',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.25,
      fill: false,
      order: 2
    },
    {
      label: t('minPrice'),
      data: history.map(h => h.minPrice),
      borderColor: 'rgba(239, 68, 68, 0.6)',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.25,
      fill: false,
      order: 2
    }
  ];

  if (currentSteamPrice !== null) {
    datasets.push({
      label: t('steamCurrentPriceLabel', { price: currentSteamPrice.toFixed(2) }),
      data: history.map(() => currentSteamPrice),
      borderColor: 'rgba(249, 115, 22, 0.9)',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [8, 4],
      pointRadius: 0,
      tension: 0,
      fill: false,
      order: 0
    });
  }

  const data = { labels, datasets };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: $${Number(context.parsed.y).toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        ticks: {
          callback: (value) => `$${value}`
        }
      }
    }
  };

  return (
    <div>
      <div style={{ height: '320px' }}>
        <Line data={data} options={options} />
      </div>
      {currentSteamPrice !== null && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {t('steamReferenceNote')}
        </p>
      )}
    </div>
  );
}
