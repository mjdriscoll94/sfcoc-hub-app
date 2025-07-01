'use client';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div className="fixed inset-0 transition-opacity" aria-hidden="true">
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Modal positioning */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Modal content */}
        <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-[#1A1A1A] text-left shadow-xl sm:my-8">
          <div className="bg-[#1A1A1A] px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-white" id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-white/60">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#1A1A1A] px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-white/10">
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex w-full justify-center rounded-md bg-[#D6805F] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D6805F]/90 sm:ml-3 sm:w-auto"
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-white/20 hover:bg-white/20 sm:mt-0 sm:w-auto"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 