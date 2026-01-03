"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  SortDescriptor
} from "@heroui/react";
import { Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';

interface Corporation {
  id: number;
  name: string;
  sector: string;
  ceo?: {
    player_name?: string;
    username?: string;
  } | null;
  market_cap: number;
  revenue_96h: number;
  profit_96h: number;
  assets: number;
  share_price: number;
  book_value: number;
}

interface CorporationsTableProps {
  initialItems: Corporation[];
  initialTotal: number;
  initialSectors: string[];
}

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'sector', label: 'Sector', sortable: true },
  { key: 'ceo', label: 'CEO', sortable: false },
  { key: 'market_cap', label: 'Market Cap', sortable: true },
  { key: 'revenue', label: 'Revenue (96h)', sortable: true },
  { key: 'profit', label: 'Profit (96h)', sortable: true },
  { key: 'assets', label: 'Assets', sortable: true },
  { key: 'share_price', label: 'Share Price', sortable: true },
];

export default function CorporationsTable({ initialItems, initialTotal, initialSectors }: CorporationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Corporation[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  
  // URL Params State
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  const sort = searchParams.get('sort') || 'revenue';
  const dir = searchParams.get('dir') || 'desc';
  const sector = searchParams.get('sector') || '';
  const q = searchParams.get('q') || '';
  const ceo = searchParams.get('ceo') || '';

  const sortDescriptor = useMemo(() => ({
    column: sort,
    direction: dir === 'asc' ? 'ascending' : 'descending'
  } as SortDescriptor), [sort, dir]);

  // Handlers
  const updateUrl = (newParams: Record<string, string>) => {
    const usp = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) usp.set(key, value);
      else usp.delete(key);
    });
    setLoading(true);
    router.push(`/corporations?${usp.toString()}`);
  };

  const handleSortChange = (descriptor: SortDescriptor) => {
    updateUrl({
      sort: descriptor.column as string,
      dir: descriptor.direction === 'ascending' ? 'asc' : 'desc',
      page: '1'
    });
  };

  const handleSearch = (key: string, value: string) => {
    updateUrl({ [key]: value, page: '1' });
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  
  const formatNumber = (value: number) => 
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <Input
            isClearable
            classNames={{
              base: "w-full sm:max-w-[44%]",
              inputWrapper: "border-1",
            }}
            placeholder="Search by name..."
            startContent={<Search className="text-default-300" />}
            value={q}
            onValueChange={(val) => handleSearch('q', val)}
            labelPlacement="outside"
          />
          <Input
            isClearable
            classNames={{
              base: "w-full sm:max-w-[44%]",
              inputWrapper: "border-1",
            }}
            placeholder="Search CEO..."
            startContent={<Search className="text-default-300" />}
            value={ceo}
            onValueChange={(val) => handleSearch('ceo', val)}
            labelPlacement="outside"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            label="Sector"
            labelPlacement="outside"
            className="max-w-xs"
            selectedKeys={sector ? [sector] : []}
            onChange={(e) => updateUrl({ sector: e.target.value, page: '1' })}
          >
            {initialSectors.map((s) => (
              <SelectItem key={s}>
                {s}
              </SelectItem>
            ))}
          </Select>
          <Select
             label="Rows"
             labelPlacement="outside"
             className="max-w-[100px]"
             selectedKeys={[String(limit)]}
             onChange={(e) => updateUrl({ limit: e.target.value, page: '1' })}
          >
             {['10', '25', '50', '100'].map((v) => (
               <SelectItem key={v}>{v}</SelectItem>
             ))}
          </Select>
        </div>
      </div>

      {/* Table */}
      <Table
        aria-label="Corporations table"
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={page}
              total={Math.ceil(total / limit)}
              onChange={(page) => updateUrl({ page: String(page) })}
            />
          </div>
        }
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn 
              key={column.key}
              allowsSorting={column.sortable}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody 
          items={items}
          loadingContent={<Spinner />}
          loadingState={loading ? "loading" : "idle"}
          emptyContent={"No corporations found"}
        >
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => (
                <TableCell>
                  {(() => {
                    switch (columnKey) {
                      case 'name':
                        return (
                          <Link href={`/corporation/${item.id}`} className="text-primary hover:underline">
                            {item.name}
                          </Link>
                        );
                      case 'ceo':
                        return item.ceo?.player_name || item.ceo?.username || '-';
                      case 'market_cap':
                        return <span className="font-mono">{formatCurrency(item.market_cap)}</span>;
                      case 'revenue':
                        return <span className="font-mono">{formatCurrency(item.revenue_96h)}</span>;
                      case 'profit':
                        return <span className="font-mono">{formatCurrency(item.profit_96h)}</span>;
                      case 'assets':
                        return <span className="font-mono">{formatCurrency(item.assets)}</span>;
                      case 'share_price':
                        return <span className="font-mono">{formatNumber(item.share_price)}</span>;
                      case 'sector':
                        return item.sector;
                      default:
                        return null;
                    }
                  })()}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
