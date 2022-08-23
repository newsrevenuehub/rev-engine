import * as S from './StatusFilter.styled';

// Children
import { FilterWrapper, FilterLabel } from 'components/donations/filters/Filters';
import { StatusCellIcon } from 'components/contributor/contributorDashboard/ContributorDashboard';
import { PAYMENT_STATUS } from 'constants';

const STATUS_FILTERS = Object.values(PAYMENT_STATUS);

function StatusFilter({ filter = [], handleFilterChange, excludeStatusFilters = [] }) {
  return (
    <FilterWrapper data-testid="status-filter">
      <S.StatusFilter>
        <FilterLabel>Status:</FilterLabel>
        <S.Statuses>
          {STATUS_FILTERS.filter(status => excludeStatusFilters.includes(status)).map(
            (status) => (
                <S.StatusBadge
                  key={f}
                  data-testid={`status-filter-${f}`}
                  selected={filter.includes(f)}
                  onClick={() => handleFilterChange('status', f)}
                >
                  <StatusCellIcon status={f} showText size="sm" />
                </S.StatusBadge>
              )
          )}
        </S.Statuses>
      </S.StatusFilter>
    </FilterWrapper>
  );
}

export default StatusFilter;
