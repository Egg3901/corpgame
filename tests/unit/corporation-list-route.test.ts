import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/mongo', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/models/MarketEntry', () => ({
  MarketEntryModel: {
    calculateCorporationFinances: vi.fn(),
  },
}));

vi.mock('@/lib/utils/valuation', () => ({
  calculateBalanceSheet: vi.fn(),
}));

vi.mock('@/lib/utils/imageUrl', () => ({
  normalizeImageUrl: vi.fn((x: unknown) => (typeof x === 'string' ? `norm:${x}` : null)),
}));

import { GET } from '@/app/api/corporation/list/route';
import { getDb } from '@/lib/db/mongo';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { calculateBalanceSheet } from '@/lib/utils/valuation';

describe('GET /api/corporation/list', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset();
    vi.mocked(MarketEntryModel.calculateCorporationFinances).mockReset();
    vi.mocked(calculateBalanceSheet).mockReset();
  });

  it('returns paginated, sorted results with computed metrics', async () => {
    const corporations = [
      { id: 1, name: 'Zeta Corp', logo: 'z.png', type: null, ceo_id: 10, shares: 1000, share_price: 2 },
      { id: 2, name: 'Alpha Corp', logo: 'a.png', type: 'Energy', ceo_id: 11, shares: 1000, share_price: 5 },
      { id: 3, name: 'Beta Corp', logo: null, type: 'Manufacturing', ceo_id: 12, shares: 500, share_price: 1 },
    ];

    const users = [
      { id: 10, profile_id: 100, username: 'ceo10', player_name: 'CEO 10', profile_slug: 'ceo-10', profile_image_url: 'p10.png' },
      { id: 11, profile_id: 101, username: 'ceo11', player_name: 'CEO 11', profile_slug: 'ceo-11', profile_image_url: null },
      { id: 12, profile_id: 102, username: 'ceo12', player_name: null, profile_slug: 'ceo-12', profile_image_url: null },
    ];

    const corporationsCollection = {
      countDocuments: vi.fn().mockResolvedValue(3),
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(corporations) }),
    };

    const usersCollection = {
      find: vi.fn().mockImplementation((filter: any) => {
        if (filter && filter.$or) {
          return { toArray: vi.fn().mockResolvedValue([{ id: 10 }]) };
        }
        if (filter && filter.id && filter.id.$in) {
          return { toArray: vi.fn().mockResolvedValue(users.filter((u) => filter.id.$in.includes(u.id))) };
        }
        return { toArray: vi.fn().mockResolvedValue([]) };
      }),
    };

    vi.mocked(getDb).mockReturnValue({
      collection: (name: string) => {
        if (name === 'corporations') return corporationsCollection as any;
        if (name === 'users') return usersCollection as any;
        throw new Error(`unexpected collection ${name}`);
      },
    } as any);

    vi.mocked(MarketEntryModel.calculateCorporationFinances).mockImplementation(async (id: number) => {
      if (id === 1) return { display_revenue: 500, display_costs: 200, display_profit: 300 } as any;
      if (id === 2) return { display_revenue: 1000, display_costs: 400, display_profit: 600 } as any;
      return { display_revenue: 700, display_costs: 800, display_profit: -100 } as any;
    });

    vi.mocked(calculateBalanceSheet).mockImplementation(async (id: number) => {
      return { totalAssets: id * 10_000, shareholdersEquity: id * 1000 } as any;
    });

    const req = {
      nextUrl: new URL('http://localhost/api/corporation/list?page=1&limit=2&sort=name&dir=asc'),
    } as any;

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(3);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);

    expect(body.items).toHaveLength(2);
    expect(body.items[0].name).toBe('Alpha Corp');
    expect(body.items[1].name).toBe('Beta Corp');

    const alpha = body.items[0];
    expect(alpha.sector).toBe('Energy');
    expect(alpha.logo).toBe('norm:a.png');
    expect(alpha.market_cap).toBe(5000);
    expect(alpha.revenue_96h).toBe(1000);
    expect(alpha.assets).toBe(20_000);
    expect(alpha.book_value).toBe(2000);

    const unknownSector = (await (await GET({ nextUrl: new URL('http://localhost/api/corporation/list?sort=name&dir=desc') } as any)).json()).items.find(
      (x: any) => x.name === 'Zeta Corp'
    );
    expect(unknownSector.sector).toBe('Unknown');
  });

  it('builds query from sector, q, and ceo params', async () => {
    const corporationsCollection = {
      countDocuments: vi.fn().mockResolvedValue(0),
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    };

    const usersCollection = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ id: 10 }, { id: 11 }]),
      }),
    };

    vi.mocked(getDb).mockReturnValue({
      collection: (name: string) => {
        if (name === 'corporations') return corporationsCollection as any;
        if (name === 'users') return usersCollection as any;
        throw new Error(`unexpected collection ${name}`);
      },
    } as any);

    const req = {
      nextUrl: new URL('http://localhost/api/corporation/list?sector=Energy&q=Alpha&ceo=ceo&page=1&limit=25'),
    } as any;

    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(corporationsCollection.countDocuments).toHaveBeenCalledTimes(1);
    expect(corporationsCollection.countDocuments).toHaveBeenCalledWith({
      type: 'Energy',
      name: { $regex: 'Alpha', $options: 'i' },
      ceo_id: { $in: [10, 11] },
    });
    expect(corporationsCollection.find).toHaveBeenCalledTimes(1);
    expect(corporationsCollection.find).toHaveBeenCalledWith({
      type: 'Energy',
      name: { $regex: 'Alpha', $options: 'i' },
      ceo_id: { $in: [10, 11] },
    });
    expect(usersCollection.find).toHaveBeenCalledTimes(1);
    expect(usersCollection.find.mock.calls[0][0]).toHaveProperty('$or');
  });

  it('supports sorting by all metrics', async () => {
    const corporations = [
      { id: 1, name: 'Alpha Corp', logo: 'a.png', type: 'Energy', ceo_id: 10, shares: 100, share_price: 1 },
      { id: 2, name: 'Beta Corp', logo: 'b.png', type: 'Energy', ceo_id: 11, shares: 200, share_price: 2 },
      { id: 3, name: 'Gamma Corp', logo: 'g.png', type: 'Energy', ceo_id: 12, shares: 300, share_price: 0.5 },
    ];

    const corporationsCollection = {
      countDocuments: vi.fn().mockResolvedValue(3),
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(corporations) }),
    };

    const usersCollection = {
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    };

    vi.mocked(getDb).mockReturnValue({
      collection: (name: string) => {
        if (name === 'corporations') return corporationsCollection as any;
        if (name === 'users') return usersCollection as any;
        throw new Error(`unexpected collection ${name}`);
      },
    } as any);

    vi.mocked(MarketEntryModel.calculateCorporationFinances).mockImplementation(async (id: number) => {
      if (id === 1) return { display_revenue: 100, display_costs: 90, display_profit: 10 } as any;
      if (id === 2) return { display_revenue: 300, display_costs: 280, display_profit: 20 } as any;
      return { display_revenue: 200, display_costs: 205, display_profit: -5 } as any;
    });

    vi.mocked(calculateBalanceSheet).mockImplementation(async (id: number) => {
      if (id === 1) return { totalAssets: 1000, shareholdersEquity: 500 } as any;
      if (id === 2) return { totalAssets: 5000, shareholdersEquity: 800 } as any;
      return { totalAssets: 2000, shareholdersEquity: 100 } as any;
    });

    const metricSorts = ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value', 'name'] as const;
    for (const sortKey of metricSorts) {
      const res = await GET({ nextUrl: new URL(`http://localhost/api/corporation/list?sort=${sortKey}&dir=desc`) } as any);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items[0].id).toBe(sortKey === 'name' ? 3 : 2);
    }

    const resDefault = await GET({ nextUrl: new URL('http://localhost/api/corporation/list?sort=invalid&dir=desc') } as any);
    expect(resDefault.status).toBe(200);
    expect((await resDefault.json()).items[0].id).toBe(2);

    const resAsc = await GET({ nextUrl: new URL('http://localhost/api/corporation/list?sort=market_cap&dir=asc') } as any);
    expect(resAsc.status).toBe(200);
    expect((await resAsc.json()).items[0].id).toBe(1);
  });

  it('defaults computed metrics to zero when finance lookups fail', async () => {
    const corporations = [
      { id: 1, name: 'Alpha Corp', logo: 'a.png', type: 'Energy', ceo_id: 10, shares: undefined, share_price: undefined },
    ];

    const corporationsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(corporations) }),
    };

    const usersCollection = {
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    };

    vi.mocked(getDb).mockReturnValue({
      collection: (name: string) => {
        if (name === 'corporations') return corporationsCollection as any;
        if (name === 'users') return usersCollection as any;
        throw new Error(`unexpected collection ${name}`);
      },
    } as any);

    vi.mocked(MarketEntryModel.calculateCorporationFinances).mockRejectedValue(new Error('finance error'));
    vi.mocked(calculateBalanceSheet).mockRejectedValue(new Error('valuation error'));

    const res = await GET({ nextUrl: new URL('http://localhost/api/corporation/list?sort=revenue&dir=desc') } as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].market_cap).toBe(0);
    expect(body.items[0].revenue_96h).toBe(0);
    expect(body.items[0].costs_96h).toBe(0);
    expect(body.items[0].profit_96h).toBe(0);
    expect(body.items[0].assets).toBe(0);
    expect(body.items[0].book_value).toBe(0);
  });

  it('returns a 500 with a stable error payload on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(getDb).mockImplementation(() => {
      throw new Error('db down');
    });

    const req = { nextUrl: new URL('http://localhost/api/corporation/list') } as any;
    const res = await GET(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toMatch(/failed to fetch corporations list/i);

    consoleSpy.mockRestore();
  });
});
