'use client';

import { useState, useEffect } from 'react';
import { useVolunteerOpportunities } from '@/hooks/useVolunteerOpportunities';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VolunteerOpportunityForm from '@/components/VolunteerOpportunityForm';

export default function VolunteerPage() {
  useEffect(() => {
    document.title = 'Volunteer Opportunities | Sioux Falls Church of Christ';
  }, []);

  const { 
    items: opportunities, 
    loading, 
    error, 
    isIndexBuilding,
    signUpForOpportunity,
    removeSignUp
  } = useVolunteerOpportunities();
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  const handleRemoveSignUp = async (opportunityId: string) => {
    try {
      setSignUpError(null);
      
      if (!user || !userProfile) {
        router.push('/auth/signin');
        return;
      }

      await removeSignUp(opportunityId, userProfile.uid);
    } catch (error) {
      setSignUpError(error instanceof Error ? error.message : 'Failed to remove sign up');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-success/20 text-success border border-success/20';
      case 'closed':
        return 'bg-warning/20 text-warning border border-warning/20';
      case 'cancelled':
        return 'bg-error/20 text-error border border-error/20';
      default:
        return 'bg-muted text-text border border-border';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-error';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-secondary';
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
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-text uppercase tracking-wide">Volunteer Opportunities</h1>
          
          {user && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center p-2 sm:px-4 sm:py-2 !bg-secondary !text-on-secondary font-semibold rounded-lg hover:!bg-secondary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors"
              aria-label="Create opportunity"
            >
              <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Create Opportunity</span>
            </button>
          )}
        </div>
        <p className="text-text-light text-center">
          {user ? 'Sign up for opportunities or create your own!' : 'Sign in to volunteer or create opportunities'}
        </p>
      </div>

      {signUpError && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-error">{signUpError}</p>
        </div>
      )}

      {showCreateForm && (
        <VolunteerOpportunityForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'fixed top-4 right-4 bg-success-bg border border-success text-success px-6 py-3 rounded-lg shadow-lg z-50';
            successDiv.textContent = 'Volunteer opportunity submitted for approval!';
            document.body.appendChild(successDiv);
            setTimeout(() => successDiv.remove(), 5000);
          }}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Index Building State */}
      {isIndexBuilding && (
        <div className="text-center p-8 bg-info/10 border border-info/20 rounded-lg">
          <div className="animate-pulse mb-4">
            <div className="h-8 w-8 mx-auto rounded-full bg-info/20"></div>
          </div>
          <h3 className="text-lg font-medium text-info mb-2 uppercase tracking-wide">Optimizing Database</h3>
          <p className="text-info/80">
            We're optimizing the database for faster queries. This may take a few minutes.
            Please refresh the page shortly.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isIndexBuilding && (
        <div className="text-center p-4 text-error">
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
              <div key={opportunity.id} className="bg-card rounded-lg shadow border border-sage/20">
                <div 
                  className="p-6 cursor-pointer hover:bg-sage/5 transition-colors duration-150"
                  onClick={() => toggleExpand(opportunity.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(opportunity.status)}`}>
                          {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
                        </span>
                        <span className="text-sm text-text/60">
                          {formatDateTime(opportunity.dateTime)}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-text">{opportunity.title}</h3>
                      <p className="text-sm text-text/60 mt-1">
                        Location: {opportunity.location}
                      </p>

                      {/* Availability Info - Always visible */}
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-text">
                            {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                          </span>
                          <span className="text-sm text-text/60">
                            {opportunity.currentVolunteers} of {opportunity.maxVolunteers}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`${getProgressColor(percentage)} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="ml-4 p-1 rounded-full hover:bg-sage/5 text-text/40"
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
                    <div className="mt-4 pt-4 border-t border-sage/20">
                      <div className="prose prose-sm max-w-none text-text/80">
                        <p>{opportunity.description}</p>

                        <div className="mt-4">
                          <h4 className="font-medium text-text uppercase tracking-wide">Contact Information:</h4>
                          <p className="mt-1 text-text/80">
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
                            <h4 className="font-medium text-text uppercase tracking-wide">Current Volunteers:</h4>
                            <ul className="mt-2">
                              {opportunity.volunteers.map((volunteer) => (
                                <li key={volunteer.id} className="text-text/80">{volunteer.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {opportunity.status === 'open' && (
                        <div className="mt-6 flex items-center gap-3">
                          {user ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!opportunity.volunteers?.some((volunteer) => volunteer.id === userProfile?.uid)) {
                                    handleSignUp(opportunity.id);
                                  }
                                }}
                                disabled={opportunity.volunteers?.some((volunteer) => volunteer.id === userProfile?.uid)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#E88B5F] hover:bg-[#D6714A] active:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E88B5F] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide transition-colors"
                              >
                                Sign Up
                              </button>
                              {opportunity.volunteers?.some((volunteer) => volunteer.id === userProfile?.uid) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSignUp(opportunity.id);
                                  }}
                                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 active:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide transition-colors"
                                >
                                  Remove Sign Up
                                </button>
                              )}
                            </>
                          ) : (
                            <Link 
                              href="/auth/signin" 
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#E88B5F] hover:bg-[#D6714A] active:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E88B5F] uppercase tracking-wide transition-colors"
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
            <div className="text-center p-8 text-text/50">
              No volunteer opportunities available at this time.
            </div>
          )}
        </div>
      )}
    </div>
  );
} 