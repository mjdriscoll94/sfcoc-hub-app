'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  UsersRound,
} from 'lucide-react';
import EventIcon from '@/components/EventIcon';
import { useHomePageEvents } from '@/hooks/useHomePageEvents';

const DIRECTIONS_URL =
  'https://www.google.com/maps/search/?api=1&query=1208+S+Southeastern+Ave+Sioux+Falls+SD+57103';

export function PublicHome() {
  const { categories, loading, error } = useHomePageEvents();
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(() => new Set([0]));

  function toggleCategory(index: number) {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="bg-bg">
      <section className="relative min-h-[390px] overflow-hidden" id="tour-home-hero">
        <Image
          src="/images/church-interior.jpg"
          alt="Church family gathered in the Sioux Falls Church of Christ sanctuary"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-charcoal/70" />
        <div className="relative mx-auto flex min-h-[390px] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-3 text-lg font-semibold text-coral-light">You are welcome here</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Sioux Falls Church of Christ</h1>
            <p className="mt-5 max-w-2xl text-xl leading-relaxed">
              One body. Many members. United and serving together.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-coral px-5 font-bold text-charcoal hover:bg-coral-light"
              >
                <MapPin aria-hidden="true" className="h-5 w-5" />
                Get directions
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
              <Link
                href="/auth/signin"
                className="inline-flex min-h-12 items-center rounded-lg border-2 border-white px-5 font-bold text-white hover:bg-white hover:text-charcoal"
              >
                Member sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="visit-heading" className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 id="visit-heading" className="text-3xl font-bold text-charcoal">Plan your visit</h2>
            <p className="mt-3 text-lg text-text-light">
              Join us for worship, Bible study, and a welcoming church family.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="rounded-xl border border-border bg-bg p-6">
              <Clock3 aria-hidden="true" className="h-7 w-7 text-coral-dark" />
              <h3 className="mt-4 text-xl font-bold text-charcoal">Sunday</h3>
              <p className="mt-2 text-base text-text-light">Worship begins at 9:45 AM</p>
              <p className="text-base text-text-light">Bible classes follow at 11:15 AM</p>
            </article>
            <article className="rounded-xl border border-border bg-bg p-6">
              <CalendarDays aria-hidden="true" className="h-7 w-7 text-coral-dark" />
              <h3 className="mt-4 text-xl font-bold text-charcoal">Wednesday</h3>
              <p className="mt-2 text-base text-text-light">Bible study begins at 7:00 PM</p>
              <p className="text-base text-text-light">Classes are available for different ages.</p>
            </article>
            <article className="rounded-xl border border-border bg-bg p-6">
              <MapPin aria-hidden="true" className="h-7 w-7 text-coral-dark" />
              <h3 className="mt-4 text-xl font-bold text-charcoal">Location</h3>
              <address className="mt-2 not-italic text-base text-text-light">
                1208 S Southeastern Ave<br />Sioux Falls, SD 57103
              </address>
              <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-coral-dark underline-offset-4 hover:underline">
                Open directions <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section aria-labelledby="expect-heading" className="bg-bg">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
          <div>
            <h2 id="expect-heading" className="text-3xl font-bold text-charcoal">What to expect</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <UsersRound aria-hidden="true" className="h-6 w-6 text-coral-dark" />
                <h3 className="mt-3 text-lg font-bold text-charcoal">Come as you are</h3>
                <p className="mt-2 text-base text-text-light">You will find people in a range of clothing, from casual to more traditional.</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <CalendarDays aria-hidden="true" className="h-6 w-6 text-coral-dark" />
                <h3 className="mt-3 text-lg font-bold text-charcoal">Worship and Bible study</h3>
                <p className="mt-2 text-base text-text-light">Our Sunday gathering includes worship followed by Bible classes.</p>
              </div>
            </div>
          </div>
          <aside className="rounded-xl bg-charcoal p-6 text-white" aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-2xl font-bold">Questions before you visit?</h2>
            <p className="mt-3 text-white/85">Contact the church office and someone will be glad to help.</p>
            <div className="mt-5 grid gap-2">
              <a href="tel:+16053321902" className="inline-flex min-h-11 items-center gap-3 rounded-lg px-2 font-semibold hover:bg-white/10">
                <Phone aria-hidden="true" className="h-5 w-5 text-coral-light" />
                (605) 332-1902
              </a>
              <a href="mailto:siouxfallschurchofchrist@gmail.com" className="inline-flex min-h-11 items-center gap-3 rounded-lg px-2 font-semibold hover:bg-white/10">
                <Mail aria-hidden="true" className="h-5 w-5 text-coral-light" />
                Email the church office
              </a>
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="gatherings-heading" className="border-t border-border bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 id="gatherings-heading" className="text-3xl font-bold text-charcoal">Regular gatherings</h2>
          <p className="mt-3 text-lg text-text-light">Explore the weekly opportunities available to the church family.</p>

          {loading ? (
            <p className="mt-8 rounded-xl bg-bg p-6 text-text-light" role="status">Loading gathering information…</p>
          ) : error ? (
            <p className="mt-8 rounded-xl border border-error/30 bg-error-bg p-6 text-charcoal">We could not load gathering information right now. Please try again later.</p>
          ) : categories.length === 0 ? (
            <p className="mt-8 rounded-xl bg-bg p-6 text-text-light">Regular gathering details will be posted here.</p>
          ) : (
            <div className="mt-8 space-y-4">
              {categories.map((category, index) => {
                const expanded = expandedCategories.has(index);
                return (
                  <section key={category.id} className="overflow-hidden rounded-xl border border-border">
                    <h3>
                      <button
                        type="button"
                        onClick={() => toggleCategory(index)}
                        aria-expanded={expanded}
                        className="flex min-h-14 w-full items-center justify-between gap-4 bg-bg px-5 py-3 text-left text-lg font-bold text-charcoal hover:bg-bg-secondary"
                      >
                        {category.title}
                        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-coral-dark ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    </h3>
                    {expanded ? (
                      <div className="grid gap-4 p-5 sm:grid-cols-2">
                        {category.events.map((event, eventIndex) => (
                          <article key={event.id ?? eventIndex} className="flex gap-4 rounded-lg bg-bg p-4">
                            <div className="shrink-0 rounded-full bg-coral/15 p-2"><EventIcon icon={event.icon} /></div>
                            <div>
                              <h4 className="text-lg font-bold text-charcoal">{event.name}</h4>
                              <p className="mt-1 font-semibold text-coral-dark">{event.time}</p>
                              <p className="font-medium text-sage-dark">{event.day}</p>
                              <p className="mt-2 text-base text-text-light">{event.description}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
