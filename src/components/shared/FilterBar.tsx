import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';

export interface FilterState {
  mode: string;
  dateRange: string;
  classes: string;
  organizer: string;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  organizers?: Array<{ _id: string; name: string }>;
}

export function FilterBar({ filters, onFilterChange, organizers = [] }: FilterBarProps) {
  const { t } = useTranslation();

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('common.filter')}:</span>
      </div>

      <Select value={filters.mode} onValueChange={(v) => updateFilter('mode', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('filter.mode')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filter.modeAll')}</SelectItem>
          <SelectItem value="online">{t('filter.modeOnline')}</SelectItem>
          <SelectItem value="physical">{t('filter.modePhysical')}</SelectItem>
          <SelectItem value="hybrid">{t('filter.modeHybrid')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.dateRange} onValueChange={(v) => updateFilter('dateRange', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('filter.dateRange')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          <SelectItem value="today">{t('common.date')}</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.classes} onValueChange={(v) => updateFilter('classes', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('filter.classes')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filter.classesAll')}</SelectItem>
          <SelectItem value="1-3">{t('filter.classes1to3')}</SelectItem>
          <SelectItem value="4-7">{t('filter.classes4to7')}</SelectItem>
          <SelectItem value="8+">{t('filter.classes8plus')}</SelectItem>
        </SelectContent>
      </Select>

      {organizers.length > 0 && (
        <Select value={filters.organizer} onValueChange={(v) => updateFilter('organizer', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filter.organizer')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allOrganizers')}</SelectItem>
            {organizers.map((org) => (
              <SelectItem key={org._id} value={org._id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
