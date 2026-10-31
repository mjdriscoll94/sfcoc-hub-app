'use client';

import { useState, useEffect } from 'react';
import { useVolunteerOpportunities } from '@/hooks/useVolunteerOpportunities';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VolunteerOpportunityForm from '@/components/VolunteerOpportunityForm';
import { CheckCircle, ChevronDown, LoaderCircle, Plus } from 'lucide-react';

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingOpportunityId, setPendingOpportunityId] = useState<string | null>(null);
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
      setSuccessMessage(null);
      
      if (!user || !userProfile) {
        router.push('/auth/signin');
        return;
      }

      setPendingOpportunityId(opportunityId);
      await signUpForOpportunity(
        opportunityId, 
        userProfile.uid,
        userProfile.displayName || user.email || 'Anonymous User'
      );
      setSuccessMessage('You are signed up. The opportunity contact can now see your name.');
    } catch (error) {
      setSignUpError(error instanceof Error ? error.message : 'Failed to sign up');
    } finally {
      setPendingOpportunityId(null);
    }
  };

  const handleRemoveSignUp = async (opportunityId: string) => {
    try {
      setSignUpError(null);
      setSuccessMessage(null);
      
      if (!user || !userProfile) {
        router.push('/auth/signin');
        return;
      }

      setPendingOpportunityId(opportunityId);
      await removeSignUp(opportunityId, userProfile.uid);
      setSuccessMessage('Your volunteer sign-up was removed.');
    } catch (error) {
      setSignUpError(error instanceof Error ? error.message : 'Failed to remove sign up');
    } finally {
      setPendingOpportunityId(null);
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
    } catch {
      return 'Date not available';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text">Volunteer Opportunities</h1>
            <p className="mt-2 text-base text-text-light">
              {user ? 'Find a place to help or submit a new opportunity for approval.' : 'Sign in to volunteer or submit an opportunity.'}
            </p>
          </div>
          
          {user && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg !bg-secondary px-4 py-2 font-semibold !text-on-secondary transition-colors hover:!bg-secondary-hover focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            >
              <Plus aria-hidden="true" className="mr-2 h-5 w-5" />
              Submit an opportunity
            </button>
          )}
        </div>
      </div>

      {signUpError && (
        <div role="alert" className="mb-6 rounded-lg border border-error/20 bg-error/10 p-4">
          <p className="text-error">{signUpError}</p>
        </div>
      )}

      {successMessage && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-success/20 bg-success/10 p-4 text-success">
          <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      {showCreateForm && (
        <VolunteerOpportunityForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setSignUpError(null);
            setSuccessMessage('Your opportunity was submitted. An administrator will review it before it appears here.');
          }}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div role="status" className="flex min-h-[200px] items-center justify-center gap-3 text-text-light">
          <LoaderCircle aria-hidden="true" className="h-7 w-7 animate-spin text-primary" />
          <span>Loading volunteer opportunities…</span>
        </div>
      )}

      {/* Index Building State */}
      {isIndexBuilding && (
        <div className="text-center p-8 bg-info/10 border border-info/20 rounded-lg">
          <div className="animate-pulse mb-4">
            <div className="h-8 w-8 mx-auto rounded-full bg-info/20"></div>
          </div>
          <h3 className="mb-2 text-lg font-medium text-info">Preparing volunteer opportunities</h3>
          <p className="text-info/80">
            We&apos;re optimizing the database for faster queries. This may take a few minutes.
            Please refresh the page shortly.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isIndexBuilding && (
        <div role="alert" className="rounded-lg border border-error/20 bg-error/10 p-5 text-error">
          <p className="font-semibold">Volunteer opportunities could not be loaded.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Opportunities List */}
      {!loading && !error && !isIndexBuilding && (
        <div className="space-y-6">
          {opportunities.map((opportunity) => {
            const percentage = Math.round((opportunity.currentVolunteers / opportunity.maxVolunteers) * 100);
            const spotsLeft = opportunity.maxVolunteers - opportunity.currentVolunteers;
            const isSignedUp = opportunity.volunteers?.some((volunteer) => volunteer.id === userProfile?.uid);
            const isUpdating = pendingOpportunityId === opportunity.id;
            
            return (
              <article key={opportunity.id} className="overflow-hidden rounded-xl border border-sage/20 bg-card shadow-sm">
                <button
                  type="button"
                  aria-expanded={expandedItems.has(opportunity.id)}
                  aria-controls={`opportunity-${opportunity.id}`}
                  className="w-full p-5 text-left transition-colors hover:bg-sage/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary sm:p-6"
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
                        <div
                          className="h-2 w-full rounded-full bg-muted"
                          role="progressbar"
                          aria-label={`${opportunity.title} volunteer spaces filled`}
                          aria-valuemin={0}
                          aria-valuemax={opportunity.maxVolunteers}
                          aria-valuenow={opportunity.currentVolunteers}
                        >
                          <div
                            className={`${getProgressColor(percentage)} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      aria-hidden="true"
                      className={`ml-4 h-5 w-5 shrink-0 text-text/50 transition-transform ${expandedItems.has(opportunity.id) ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {expandedItems.has(opportunity.id) && (
                    <div id={`opportunity-${opportunity.id}`} className="border-t border-sage/20 p-5 sm:p-6">
                      <div className="prose prose-sm max-w-none text-text/80">
                        <p>{opportunity.description}</p>

                        <div className="mt-4">
                          <h4 className="font-semibold text-text">Contact information</h4>
                          <p className="mt-1 text-text/80">
                            Email: <a className="font-medium text-primary underline" href={`mailto:${opportunity.contactEmail}`}>{opportunity.contactEmail}</a>
                            {opportunity.contactPhone && (
                              <>
                                <br />
                                Phone: <a className="font-medium text-primary underline" href={`tel:${opportunity.contactPhone}`}>{opportunity.contactPhone}</a>
                              </>
                            )}
                          </p>
                        </div>

                        {opportunity.volunteers?.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-text">Current volunteers</h4>
                            <ul className="mt-2">
                              {opportunity.volunteers.map((volunteer) => (
                                <li key={volunteer.id} className="text-text/80">{volunteer.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {opportunity.status === 'open' && (
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          {user ? (
                            <>
                              <button
                                onClick={() => handleSignUp(opportunity.id)}
                                disabled={Boolean(isSignedUp) || isUpdating || spotsLeft <= 0}
                                className="inline-flex min-h-11 items-center rounded-lg bg-[#E88B5F] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#D6714A] focus:outline-none focus:ring-2 focus:ring-[#E88B5F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isUpdating && !isSignedUp ? <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {spotsLeft <= 0 ? 'Opportunity is full' : isSignedUp ? 'You are signed up' : 'Sign up to help'}
                              </button>
                              {isSignedUp && (
                                <button
                                  onClick={() => handleRemoveSignUp(opportunity.id)}
                                  disabled={isUpdating}
                                  className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUpdating ? <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Remove my sign-up
                                </button>
                              )}
                            </>
                          ) : (
                            <Link 
                              href="/auth/signin" 
                              className="inline-flex min-h-11 items-center rounded-lg bg-[#E88B5F] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#D6714A] focus:outline-none focus:ring-2 focus:ring-[#E88B5F] focus:ring-offset-2"
                            >
                              Sign in to volunteer
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )}
              </article>
            );
          })}

          {opportunities.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <h2 className="text-lg font-semibold text-text">No volunteer opportunities are open right now</h2>
              <p className="mt-2 text-text-light">Please check again later.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
