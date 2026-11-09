'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, ChevronDown, ExternalLink, PlayCircle, Search, X } from 'lucide-react';
import { useSermons } from '@/hooks/useSermons';
import type { YouTubeVideo } from '@/lib/youtube/api';
import { LoadingCardList } from '@/components/LoadingSkeleton';

type GroupedSermons = Record<string, { monthLabel: string; videos: YouTubeVideo[] }>;

function groupVideosByMonth(videos: YouTubeVideo[]): GroupedSermons {
  return videos.reduce<GroupedSermons>((groups, video) => {
    const date = new Date(video.publishedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const group = groups[monthKey] ?? {
      monthLabel: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      videos: [],
    };
    group.videos.push(video);
    groups[monthKey] = group;
    return groups;
  }, {});
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatViewCount(count: string) {
  const number = Number.parseInt(count, 10);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M views`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K views`;
  return `${Number.isNaN(number) ? 0 : number} views`;
}

export default function SermonsPage() {
  const { videos, loading, error, selectedVideo, selectVideo } = useSermons();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    document.title = 'Sermons | Sioux Falls Church of Christ';
  }, []);

  const availableYears = useMemo(
    () => Array.from(new Set(videos.map((video) => new Date(video.publishedAt).getFullYear()))).sort((a, b) => b - a),
    [videos],
  );

  const filteredVideos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return videos.filter((video) => {
      const matchesYear = selectedYear === 'all' || new Date(video.publishedAt).getFullYear().toString() === selectedYear;
      const matchesSearch = !query || video.title.toLowerCase().includes(query) || video.description.toLowerCase().includes(query);
      return matchesYear && matchesSearch;
    });
  }, [searchTerm, selectedYear, videos]);

  const groupedVideos = useMemo(() => groupVideosByMonth(filteredVideos), [filteredVideos]);
  const monthKeys = useMemo(() => Object.keys(groupedVideos).sort().reverse(), [groupedVideos]);
  const newestMonth = monthKeys[0];

  useEffect(() => {
    if (!newestMonth) return;
    setExpandedMonths((current) => monthKeys.some((monthKey) => current.has(monthKey)) ? current : new Set([newestMonth]));
  }, [monthKeys, newestMonth]);

  function toggleMonth(monthKey: string) {
    setExpandedMonths((current) => {
      const next = new Set(current);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }

  const hasFilters = Boolean(searchTerm.trim()) || selectedYear !== 'all';

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text">Sermons</h1>
        <p className="mt-2 max-w-2xl text-base text-text-light">
          Watch recent lessons or search by a word in the sermon title or description.
        </p>
      </header>

      <section aria-label="Find a sermon" className="mb-8 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
          <div>
            <label htmlFor="sermon-search" className="mb-2 block font-semibold text-text">Search sermons</label>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-3 h-5 w-5 text-text-muted" />
              <input
                id="sermon-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Try a title or topic"
                className="min-h-11 w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-base text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label htmlFor="sermon-year" className="mb-2 block font-semibold text-text">Year</label>
            <select
              id="sermon-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All years</option>
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedYear('all'); }}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 font-semibold text-charcoal hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <X aria-hidden="true" className="mr-2 h-4 w-4" />
              Clear filters
            </button>
          ) : <span aria-hidden="true" />}
        </div>
      </section>

      {loading ? (
        <LoadingCardList label="Loading sermons…" count={4} className="mx-auto max-w-4xl" />
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-error/20 bg-error/10 p-6 text-center">
          <AlertTriangle aria-hidden="true" className="mx-auto h-10 w-10 text-error" />
          <h2 className="mt-3 text-xl font-semibold text-text">Sermons could not be loaded</h2>
          <p className="mt-2 text-text-light">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-on-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <PlayCircle aria-hidden="true" className="mx-auto h-10 w-10 text-text-muted" />
          <h2 className="mt-3 text-xl font-semibold text-text">No sermons are available yet</h2>
          <p className="mt-2 text-text-light">Please check again later.</p>
        </div>
      ) : null}

      {!loading && !error && videos.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section aria-label="Selected sermon" className="lg:col-span-2">
            {selectedVideo ? (
              <div className="space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.id}`}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-xl font-semibold text-text">{selectedVideo.title}</h2>
                  <p className="mt-2 text-sm text-text-light tabular-nums">
                    {formatDate(selectedVideo.publishedAt)} <span aria-hidden="true">•</span> {formatViewCount(selectedVideo.viewCount)}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-text/80">{selectedVideo.description}</p>
                  <a
                    href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline"
                  >
                    Open this sermon on YouTube
                    <ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
                    <span className="sr-only"> (opens in a new window)</span>
                  </a>
                </div>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="sermon-list-heading" className="lg:col-span-1">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h2 id="sermon-list-heading" className="text-lg font-semibold text-text">
                  {hasFilters ? `${filteredVideos.length} matching sermon${filteredVideos.length === 1 ? '' : 's'}` : 'All sermons'}
                </h2>
              </div>
              {filteredVideos.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="font-semibold text-text">No sermons match those filters.</p>
                  <button type="button" onClick={() => { setSearchTerm(''); setSelectedYear('all'); }} className="mt-3 min-h-11 font-semibold text-primary underline">
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="max-h-[680px] overflow-y-auto">
                  {monthKeys.map((monthKey) => {
                    const group = groupedVideos[monthKey];
                    const isExpanded = expandedMonths.has(monthKey);
                    return (
                      <div key={monthKey} className="border-b border-border last:border-b-0">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`sermons-${monthKey}`}
                          onClick={() => toggleMonth(monthKey)}
                          className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left font-semibold text-text hover:bg-sage/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                        >
                          <span>{group.monthLabel} <span className="font-normal text-text-muted">({group.videos.length})</span></span>
                          <ChevronDown aria-hidden="true" className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded ? (
                          <div id={`sermons-${monthKey}`} className="divide-y divide-border">
                            {group.videos.map((video) => (
                              <button
                                key={video.id}
                                type="button"
                                aria-pressed={selectedVideo?.id === video.id}
                                onClick={() => selectVideo(video)}
                                className={`w-full p-4 text-left transition-colors hover:bg-sage/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary ${selectedVideo?.id === video.id ? 'bg-sage/10' : ''}`}
                              >
                                <span className="flex gap-3">
                                  <Image src={video.thumbnailUrl} alt="" width={128} height={72} className="h-[72px] w-32 shrink-0 rounded object-cover" unoptimized />
                                  <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 block text-sm font-semibold text-text">{video.title}</span>
                                    <span className="mt-1 block text-sm text-text-light tabular-nums">{formatDate(video.publishedAt)}</span>
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
