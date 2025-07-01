'use client';

import { useState } from 'react';
import { usePrayerPraise, PrayerPraiseItem } from '@/hooks/usePrayerPraise';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

export default function PrayerBoard() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { items, loading, error, incrementPrayerCount } = usePrayerPraise();

  const toggleExpand = (id: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (expandedItems.has(id)) {
      newExpandedItems.delete(id);
    } else {
      newExpandedItems.add(id);
    }
    setExpandedItems(newExpandedItems);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Prayer Request Board</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">Share your prayer requests and praises with our community</p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg shadow-sm border transition-all ${
              item.type === 'prayer'
                ? 'bg-[#F7E6E1] border-coral'
                : 'bg-[#E2EAE8] border-mint'
            }`}
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => toggleExpand(item.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        item.type === 'prayer'
                          ? 'bg-coral text-white'
                          : 'bg-mint text-white'
                      }`}
                    >
                      {item.type === 'prayer' ? 'Prayer Request' : 'Praise'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatDate(item.dateCreated)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">
                    {item.isAnonymous ? 'Anonymous' : item.author.name}
                  </p>
                </div>
                <button
                  className={`ml-4 p-1 rounded-full transition-colors ${
                    item.type === 'prayer'
                      ? 'hover:bg-coral/10'
                      : 'hover:bg-mint/10'
                  }`}
                >
                  {expandedItems.has(item.id) ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {expandedItems.has(item.id) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    incrementPrayerCount(item.id);
                  }}
                  className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
                    item.type === 'prayer'
                      ? 'bg-coral/10 text-coral hover:bg-coral/20'
                      : 'bg-mint/10 text-mint hover:bg-mint/20'
                  }`}
                >
                  {item.type === 'prayer' ? 'I Prayed' : 'I Give Thanks'} (
                  {item.prayerCount})
                </button>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            No prayer requests or praises yet.
          </div>
        )}
      </div>
    </div>
  );
} 