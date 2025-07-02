import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Phone, Mail, MapPin, User } from 'lucide-react';
import Image from 'next/image';

interface FamilyMember {
  firstName: string;
  lastName: string;
  relationship: string;
  birthday: string;
}

interface DirectoryEntry {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  photoURL: string | null;
  familyMembers: FamilyMember[];
}

interface DirectoryModalProps {
  member: DirectoryEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DirectoryModal({ member, isOpen, onClose }: DirectoryModalProps) {
  if (!member) return null;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-white/10 backdrop-blur-md w-full max-w-2xl px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4 z-10">
                  <button
                    type="button"
                    className="rounded-md text-gray-400 dark:text-white/40 hover:text-gray-500 dark:hover:text-white/60 focus:outline-none bg-white/10 backdrop-blur-sm p-1"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div>
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {member.photoURL ? (
                        <div className="relative h-48 sm:h-32 w-full sm:w-32">
                          <Image
                            src={member.photoURL}
                            alt={`${member.lastName} Family`}
                            fill
                            className="rounded-lg object-cover"
                            sizes="(max-width: 640px) 100vw, 128px"
                          />
                        </div>
                      ) : null}
                      <div>
                        <Dialog.Title as="h3" className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {member.lastName}
                        </Dialog.Title>
                      </div>
                    </div>

                    <div className="mt-6 space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Contact Information</h4>
                        <div className="mt-4 space-y-3">
                          {member.email && (
                            <div className="flex items-center text-gray-500 dark:text-gray-300">
                              <Mail className="h-5 w-5 mr-3 flex-shrink-0" />
                              <a href={`mailto:${member.email}`} className="hover:text-[#D6805F] break-all">
                                {member.email}
                              </a>
                            </div>
                          )}
                          {member.phoneNumber && (
                            <div className="flex items-center text-gray-500 dark:text-gray-300">
                              <Phone className="h-5 w-5 mr-3 flex-shrink-0" />
                              <a href={`tel:${member.phoneNumber}`} className="hover:text-[#D6805F]">
                                {member.phoneNumber}
                              </a>
                            </div>
                          )}
                          {member.address && (
                            <div className="flex items-center text-gray-500 dark:text-gray-300">
                              <MapPin className="h-5 w-5 mr-3 flex-shrink-0" />
                              <span className="break-words">{member.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Family Members</h4>
                        <div className="mt-4 space-y-3">
                          <div className="flex items-start">
                            <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-900 dark:text-white">
                              {member.firstName} {member.lastName}
                            </span>
                          </div>
                          {member.familyMembers?.map((familyMember, index) => (
                            <div key={index} className="flex items-start">
                              <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span className="text-gray-900 dark:text-white">
                                  {familyMember.firstName} {familyMember.lastName}
                                </span>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    ({familyMember.relationship})
                                  </span>
                                  {familyMember.birthday && (
                                    <>
                                      <span className="text-gray-500 dark:text-gray-400">•</span>
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Born: {new Date(familyMember.birthday).toLocaleDateString()}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 