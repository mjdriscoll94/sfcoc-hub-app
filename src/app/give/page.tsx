'use client';

import { useEffect } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

const GIVING_URL = 'https://give.tithe.ly/?formId=99dfd8d8-6864-11ee-90fc-1260ab546d11';

export default function GivePage() {
  useEffect(() => {
    document.title = 'Give | Sioux Falls Church of Christ';
  }, []);
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto mb-6 max-w-3xl">
          <p className="font-semibold text-coral-dark">Giving</p>
          <h1 className="mt-1 text-3xl font-bold text-charcoal sm:text-4xl">Give securely online</h1>
          <p className="mt-3 text-lg text-text-light">
            Your gift is processed securely by Tithe.ly. If the form below does not load, use the secure link to open it directly.
          </p>
          <a
            href={GIVING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-lg bg-charcoal px-5 font-bold text-white hover:bg-charcoal-light"
          >
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            Open secure giving form
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
        <div className="bg-card rounded-lg border border-sage/20 overflow-hidden">
          <div className="aspect-[3/4] w-full max-w-3xl mx-auto">
            <iframe
              src={GIVING_URL}
              title="Secure Tithe.ly giving form"
              className="w-full h-full bg-card"
              frameBorder="0"
              scrolling="yes"
              allow="payment"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
