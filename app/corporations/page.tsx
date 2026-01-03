import AppNavigation from '@/components/AppNavigation';
import { CorporationService } from '@/lib/services/CorporationService';
import CorporationsTable from '@/components/corporations/CorporationsTable';
import { Suspense } from 'react';
import { Building2 } from 'lucide-react';

// Force dynamic rendering since this depends on searchParams
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    page?: string;
    limit?: string;
    sort?: string;
    dir?: string;
    sector?: string;
    q?: string;
    ceo?: string;
  };
}

async function CorporationsContent({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '25', 10);

  const validSorts = ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value', 'name'] as const;
  const sort = validSorts.includes(searchParams.sort as (typeof validSorts)[number])
    ? (searchParams.sort as (typeof validSorts)[number])
    : 'revenue';

  const dir = searchParams.dir === 'asc' || searchParams.dir === 'desc' ? searchParams.dir : 'desc';
  const sector = searchParams.sector || '';
  const q = searchParams.q || '';
  const ceo = searchParams.ceo || '';

  // Server-side data fetching - direct database call (no HTTP)
  const data = await CorporationService.getCorporationsList({
    page,
    limit,
    sort,
    dir,
    sector,
    q,
    ceo,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="w-6 h-6 text-gray-500" />
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Corporations</h1>
      </div>

      <CorporationsTable 
        initialItems={data.items}
        initialTotal={data.total}
        initialSectors={data.sectors}
      />
    </div>
  );
}

export default function CorporationsPage({ searchParams }: PageProps) {
  return (
    <AppNavigation>
      <Suspense fallback={
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-6 h-6 text-gray-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Corporations</h1>
          </div>
          <div className="p-8 text-center text-gray-500">Loading corporations...</div>
        </div>
      }>
        <CorporationsContent searchParams={searchParams} />
      </Suspense>
    </AppNavigation>
  );
}


