'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import Image from 'next/image';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

type SubItem = {
  name: string;
  href: string;
  icon?: React.ReactNode;
};

type NavItem = {
  name: string;
  href?: string;
  icon: React.ReactNode;
  dropdown?: boolean;
  items?: SubItem[];
};

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();

  // Validate router on mount
  useEffect(() => {
    if (!router) {
      console.error('Router instance is not available');
    } else {
      console.log('Router instance is available');
    }
  }, [router]);

  // Debug navigation attempts
  const handleNavigation = async (href: string, itemName: string) => {
    try {
      console.log('Navigation handler called for:', itemName);
      console.log('Current pathname:', pathname);
      console.log('Target href:', href);
      
      // Close menus first
      setIsOpen(false);
      setOpenDropdown(null);
      
      console.log('Attempting navigation...');
      await router.push(href);
      console.log('Navigation completed');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDropdownClick = (dropdownName: string) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const publicNavItems: NavItem[] = [
    { 
      name: 'Home',
      href: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      name: 'Resources',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
      dropdown: true,
      items: [
        {
          name: 'Lesson Notes PDFs',
          href: '/resources/lesson-notes'
        }
      ]
    },
    {
      name: 'Give',
      href: '/give',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      )
    }
  ];

  const protectedNavItems: NavItem[] = [
    {
      name: 'Connect',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      dropdown: true,
      items: [
        {
          name: 'Prayer Board',
          href: '/prayer-board',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          )
        },
        {
          name: 'Directory',
          href: '/directory',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },

        {
          name: 'Announcements',
          href: '/announcements',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
            </svg>
          )
        },
        {
          name: 'Volunteer',
          href: '/volunteer',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6 0 3.375 3.375 0 016 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          )
        }
      ]
    },
    {
      name: 'Services',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      dropdown: true,
      items: [
        {
          name: 'Service Roles',
          href: '/service-roles',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          )
        },
        {
          name: 'Calendar',
          href: '/calendar',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          )
        }
      ]
    }
  ];

  const adminNavItems: NavItem[] = userProfile?.isAdmin ? [
    {
      name: 'Admin',
      href: '/admin',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      )
    }
  ] : [];

  const activeNavItems = [...publicNavItems, ...(user ? [...protectedNavItems, ...adminNavItems] : [])];

  return (
    <nav className="bg-[#171717]/50 backdrop-blur-sm border-b border-white/10 relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-[#D6805F] focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {isOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8" ref={dropdownRef}>
              {activeNavItems.map((item) => (
                item.dropdown ? (
                  <div key={item.name} className="relative inline-flex items-center">
                    <button
                      onClick={() => handleDropdownClick(item.name)}
                      className={`${
                        item.items?.some(subItem => pathname === subItem.href)
                          ? 'text-[#D6805F] border-[#D6805F]'
                          : 'text-white hover:text-[#D6805F] border-transparent'
                      } inline-flex items-center h-16 px-1 border-b-2 text-sm font-medium`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.name}
                      <svg
                        className={`ml-2 h-5 w-5 transform ${openDropdown === item.name ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openDropdown === item.name && (
                      <div className="absolute z-50 top-full pt-2 left-0 w-56">
                        <div className="rounded-md shadow-lg bg-[#1f1f1f] ring-1 ring-black ring-opacity-5">
                          <div className="py-1">
                            {item.items?.map((subItem) => (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={`${
                                  pathname === subItem.href
                                    ? 'text-[#D6805F] bg-white/5'
                                    : 'text-white hover:bg-white/5'
                                } flex items-center px-4 py-2 text-sm`}
                                onClick={() => handleDropdownClick(item.name)}
                              >
                                {subItem.icon && <span className="mr-2">{subItem.icon}</span>}
                                {subItem.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href || '#'}
                    className={`${
                      pathname === item.href
                        ? 'text-[#D6805F] border-[#D6805F]'
                        : 'text-white hover:text-[#D6805F] border-transparent'
                    } inline-flex items-center h-16 px-1 border-b-2 text-sm font-medium`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="max-w-xs bg-[#D6805F] flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#171717] focus:ring-white"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-[#D6805F] flex items-center justify-center text-white">
                    {userProfile?.displayName?.[0] || user.email?.[0] || '?'}
                  </div>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute z-50 top-full right-0 pt-2 w-48">
                    <div className="rounded-md shadow-lg bg-[#1f1f1f] ring-1 ring-black ring-opacity-5 divide-y divide-white/10">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-white">
                          {userProfile?.displayName || user.email}
                        </div>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/settings"
                          className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 cursor-pointer ${isSigningOut ? 'opacity-50' : ''}`}
                          onClick={async () => {
                            if (isSigningOut) return;
                            
                            setIsSigningOut(true);
                            try {
                              console.log('Navigation: Sign out button clicked');
                              await signOut();
                              setIsUserMenuOpen(false);
                            } catch (error) {
                              console.error('Navigation: Error during sign out:', error);
                              setIsSigningOut(false);
                            }
                          }}
                          disabled={isSigningOut}
                        >
                          {isSigningOut ? 'Signing out...' : 'Sign out'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="text-white hover:text-[#D6805F] text-sm font-medium"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden bg-[#171717]`}>
        <div className="pt-2 pb-3 space-y-1">
          {activeNavItems.map((item) => (
            item.dropdown ? (
              <div key={item.name}>
                {/* Dropdown header */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    handleDropdownClick(item.name);
                  }}
                  className={`${
                    item.items?.some(subItem => pathname === subItem.href)
                      ? 'text-[#D6805F] bg-white/5'
                      : 'text-white hover:bg-white/5'
                  } w-full flex items-center px-4 py-2 text-sm font-medium`}
                >
                  <span className="mr-2">{item.icon}</span>
                  <span className="flex-1 text-left">{item.name}</span>
                  <svg
                    className={`h-5 w-5 transform ${openDropdown === item.name ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Dropdown items */}
                {openDropdown === item.name && (
                  <div className="bg-[#1f1f1f]">
                    {item.items?.map((subItem) => (
                      <button
                        key={subItem.name}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent event bubbling
                          handleNavigation(subItem.href, subItem.name);
                        }}
                        className={`${
                          pathname === subItem.href
                            ? 'text-[#D6805F] bg-white/5'
                            : 'text-white hover:bg-white/5'
                        } flex items-center pl-12 pr-4 py-2 text-sm w-full text-left`}
                      >
                        {subItem.icon && <span className="mr-2">{subItem.icon}</span>}
                        {subItem.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={item.name}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  handleNavigation(item.href || '#', item.name);
                }}
                className={`${
                  pathname === item.href
                    ? 'text-[#D6805F] bg-white/5'
                    : 'text-white hover:bg-white/5'
                } flex items-center px-4 py-2 text-sm font-medium w-full text-left`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </button>
            )
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 