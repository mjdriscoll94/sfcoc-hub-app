import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = '' }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-white/60 hover:text-[#D6805F] hover:bg-gray-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#D6805F] ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="h-6 w-6" />
    </button>
  );
} 