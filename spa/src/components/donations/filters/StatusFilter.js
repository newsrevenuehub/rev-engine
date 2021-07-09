import * as S from './StatusFilter.styled';

// Children
import { FilterWrapper, FilterLabel } from 'components/donations/filters/Filters';
import { StatusCellIcon } from 'components/contributor/contributorDashboard/ContributorDashboard';

const STATUS_FILTERS = ['processing', 'paid', 'canceled', 'failed', 'flagged', 'rejected'];

function StatusFilter({ filter = [], handleFilterChange }) {
  return (
    <FilterWrapper>
      <S.StatusFilter>
        <FilterLabel>Status:</FilterLabel>
        <S.Statuses>
          {STATUS_FILTERS.map((f) => (
            <S.StatusBadge key={f} selected={filter.includes(f)} onClick={() => handleFilterChange('status', f)}>
              <StatusCellIcon status={f} showText size="sm" />
            </S.StatusBadge>
          ))}
        </S.Statuses>
      </S.StatusFilter>
    </FilterWrapper>
  );
}

export default StatusFilter;
