'use client';

import { useState } from 'react';
import { useVolunteerOpportunities } from '@/hooks/useVolunteerOpportunities';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VolunteerPage() {
  const { 
    items: opportunities, 
    loading, 
    error, 
    isIndexBuilding,
    signUpForOpportunity 
  } = useVolunteerOpportunities();
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [signUpError, setSignUpError] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSignUp = async (opportunityId: string) => {
    try {
      setSignUpError(null);
      
      if (!user || !userProfile) {
        router.push('/auth/signin');
        return;
      }

      await signUpForOpportunity(
        opportunityId, 
        userProfile.uid,
        userProfile.displayName || user.email || 'Anonymous User'
      );
    } catch (error) {
      setSignUpError(error instanceof Error ? error.message : 'Failed to sign up');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-500/50';
      case 'closed':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-500/50';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-500/50';
      default:
        return 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-500/50';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-[#85AAA0]';
  };

  const formatDateTime = (date: Date) => {
    try {
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      return 'Date not available';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Volunteer Opportunities</h1>
      </div>

      {signUpError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 rounded-lg">
          <p className="text-red-700 dark:text-red-200">{signUpError}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7c54]"></div>
        </div>
      )}

      {/* Index Building State */}
      {isIndexBuilding && (
        <div className="text-center p-8 bg-blue-50 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-500/50">
          <div className="animate-pulse mb-4">
            <div className="h-8 w-8 mx-auto rounded-full bg-blue-200 dark:bg-blue-700"></div>
          </div>
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">Optimizing Database</h3>
          <p className="text-blue-700 dark:text-blue-200">
            We're optimizing the database for faster queries. This may take a few minutes.
            Please refresh the page shortly.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isIndexBuilding && (
        <div className="text-center p-4 text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}

      {/* Opportunities List */}
      {!loading && !error && !isIndexBuilding && (
        <div className="space-y-6">
          {opportunities.map((opportunity) => {
            const percentage = Math.round((opportunity.currentVolunteers / opportunity.maxVolunteers) * 100);
            const spotsLeft = opportunity.maxVolunteers - opportunity.currentVolunteers;
            
            return (
              <div key={opportunity.id} className="bg-white dark:bg-white/5 rounded-lg shadow border border-gray-200 dark:border-white/10">
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150"
                  onClick={() => toggleExpand(opportunity.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(opportunity.status)}`}>
                          {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {formatDateTime(opportunity.dateTime)}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{opportunity.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Location: {opportunity.location}
                      </p>

                      {/* Availability Info - Always visible */}
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {opportunity.currentVolunteers} of {opportunity.maxVolunteers}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`${getProgressColor(percentage)} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="ml-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                      aria-label={expandedItems.has(opportunity.id) ? "Collapse" : "Expand"}
                    >
                      <svg
                        className={`w-5 h-5 transform transition-transform ${
                          expandedItems.has(opportunity.id) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                  
                  {expandedItems.has(opportunity.id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                      <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                        <p>{opportunity.description}</p>

                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">Contact Information:</h4>
                          <p className="mt-1 text-gray-700 dark:text-gray-300">
                            Email: {opportunity.contactEmail}
                            {opportunity.contactPhone && (
                              <>
                                <br />
                                Phone: {opportunity.contactPhone}
                              </>
                            )}
                          </p>
                        </div>

                        {opportunity.volunteers?.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 dark:text-white">Current Volunteers:</h4>
                            <ul className="mt-2">
                              {opportunity.volunteers.map((volunteer) => (
                                <li key={volunteer.id} className="text-gray-700 dark:text-gray-300">{volunteer.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {opportunity.status === 'open' && (
                        <div className="mt-6">
                          {user ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSignUp(opportunity.id);
                              }}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#ff7c54] hover:bg-[#e66e4a] active:bg-[#cc6242] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff7c54] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sign Up
                            </button>
                          ) : (
                            <Link 
                              href="/auth/signin" 
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#ff7c54] hover:bg-[#e66e4a] active:bg-[#cc6242] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff7c54]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Sign in to Volunteer
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {opportunities.length === 0 && (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              No volunteer opportunities available at this time.
            </div>
          )}
        </div>
      )}
    </div>
  );
} 