'use client';

export default function GivePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="aspect-[3/4] w-full max-w-3xl mx-auto">
            <iframe
              src="https://give.tithe.ly/?formId=99dfd8d8-6864-11ee-90fc-1260ab546d11"
              className="w-full h-full bg-white"
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