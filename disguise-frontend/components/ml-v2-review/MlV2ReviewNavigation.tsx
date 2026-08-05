'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export const MlV2ReviewNavigation = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const isReviewAllowed = ['admin', 'operator', 'investigator', 'super_admin'].includes(user?.role || '');

  return (
    <div className="flex items-center gap-4 border-b border-[rgba(255,255,255,0.1)] pb-4 mb-6">
      <Link
        href="/dashboard/ml-v2"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          pathname === '/dashboard/ml-v2'
            ? 'bg-blue-500/20 text-blue-400'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`}
      >
        Observability
      </Link>

      {isReviewAllowed && (
        <Link
          href="/dashboard/ml-v2/reviews"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname?.startsWith('/dashboard/ml-v2/reviews')
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          Operator Reviews
        </Link>
      )}

      <Link
        href="/dashboard/ml-v2/promotions"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          pathname?.startsWith('/dashboard/ml-v2/promotions')
            ? 'bg-blue-500/20 text-blue-400'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`}
      >
        Promotions
      </Link>

      <Link
        href="/dashboard/ml-v2/reviewed-alerts"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          pathname?.startsWith('/dashboard/ml-v2/reviewed-alerts')
            ? 'bg-blue-500/20 text-blue-400'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`}
      >
        Reviewed Alerts
      </Link>
    </div>
  );
};
