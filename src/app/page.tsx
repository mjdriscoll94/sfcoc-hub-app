'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import BuildStatus from '@/components/BuildStatus';

const eventCategories = [
  {
    title: "Group Events",
    events: [
      {
        name: "Sunday Service",
        time: "9:45AM - 12:00PM",
        day: "Every Sunday",
        description: "Join us for worship, fellowship, and bible classes",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )
      },
      {
        name: "Wednesday Study",
        time: "7:00 PM",
        day: "Every Wednesday",
        description: "Deep dive into God's word",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      },
      {
        name: "4th Sunday Fellowship",
        time: "5:00 PM",
        day: "Last Sunday of each month",
        description: "Food and fellowship",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      },
      {
        name: "5th Sunday Singing",
        time: "5:00 PM",
        day: "Each 5th Sunday of a month",
        description: "Worship and a shared meal with other congregations",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      }
    ]
  },
  {
    title: "Men's Events",
    events: [
      {
        name: "Men's Bible Study",
        time: "8:30 PM",
        day: "Every Thursday",
        description: "Bible study and discussion for men",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      },
      {
        name: "Men's Breakfast",
        time: "8:00 AM",
        day: "Last Saturday of each month",
        description: "Breakfast and fellowship for men",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      }
    ]
  },
  {
    title: "Women's Events",
    events: [
      {
        name: "Ladies Bible Study",
        time: "8:30 AM",
        day: "Every Other Thursday",
        description: "Bible study and discussion for ladies",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      }
    ]
  },
  {
    title: "Youth Events",
    events: [
      {
        name: "Youth Group",
        time: "7:00 PM",
        day: "Every Wednesday",
        description: "Bible Study classes for youth",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      },
      {
        name: "Youth/Young Adults Bible Study",
        time: "7:00 PM",
        day: "One Saturday of each month",
        description: "Bible study and discussion for youth and young adults",
        icon: (
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      }
      
    ]
  },
];

export default function Home() {
  const [expandedCategories, setExpandedCategories] = useState(new Set([0])); // Start with first category expanded

  const toggleCategory = (index: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px]">
        <div className="absolute inset-0">
          <Image
            src="/images/church-interior.jpg"
            alt="Church sanctuary with congregation"
            fill
            className="object-cover"
            priority
            quality={100}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="text-white max-w-2xl text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-wide">
              Sioux Falls Church of Christ
            </h1>
            <p className="text-xl md:text-2xl mb-8 uppercase tracking-wide">
              One body. Many members. United and serving together.
            </p>
            <div className="flex justify-center">
              <Link
                href="/calendar"
                className="bg-primary text-on-primary px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center space-x-2 focus-ring uppercase tracking-wide"
              >
                <span>View Calendar</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      
      
      <BuildStatus />

      {/* Regular Events Section */}
      <section className="py-16 bg-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text uppercase tracking-wide">Events</h2>
            <p className="mt-4 text-lg text-text/70 uppercase tracking-wide">Join us for our regular gatherings</p>
          </div>
          
          <div className="space-y-6">
            {eventCategories.map((category, categoryIndex) => (
              <div 
                key={categoryIndex} 
                className="bg-card rounded-lg border-2 border-border overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => toggleCategory(categoryIndex)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover-bg transition-colors focus-ring"
                >
                  <h3 className="text-xl font-semibold text-text">
                    {category.title}
                  </h3>
                  <svg
                    className={`w-5 h-5 text-text transform transition-transform ${
                      expandedCategories.has(categoryIndex) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                
                <div
                  className={`transition-all duration-200 ease-in-out ${
                    expandedCategories.has(categoryIndex)
                      ? 'max-h-[1000px] opacity-100'
                      : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 pt-2">
                    {category.events.map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className="bg-card rounded-lg p-4 border-2 border-border hover:border-primary transition-colors flex items-start space-x-4 shadow-sm focus-ring"
                      >
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-primary/20 rounded-full">
                            {event.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-semibold text-text mb-1">{event.name}</h4>
                          <p className="text-primary font-medium text-sm mb-1">{event.time}</p>
                          <p className="text-text/60 text-sm mb-1">{event.day}</p>
                          <p className="text-text/80 text-sm leading-snug">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/calendar"
              className="inline-flex items-center text-primary hover:opacity-80 transition-opacity focus-ring"
            >
              <span>View Full Calendar</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
