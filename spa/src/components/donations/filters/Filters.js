import * as S from './Filters.styled';

// Children
import CreatedFilter from 'components/donations/filters/CreatedFilter';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import StatusFilter from 'components/common/Filters/StatusFilter';
import AmountFilter from 'components/common/Filters/AmountFilter';

function Filters({ filters, handleFilterChange, donationsCount, excludeStatusFilters = [] }) {
  // whenever we need to enable this, toggle this switch to true
  let dateFilterEnabled = false;
  return (
    <S.Filters layout>
      <GenericErrorBoundary>
        <StatusFilter
          filter={filters.status}
          onClick={(status) => handleFilterChange('status', status)}
          excludeStatusFilters={excludeStatusFilters}
        />
      </GenericErrorBoundary>
      <GenericErrorBoundary>
        <AmountFilter
          onChange={(amount) =>
            handleFilterChange('amount', {
              amount__gte: Number(amount.gte) * 100 || '',
              amount__lte: Number(amount.lte) * 100 || ''
            })
          }
        />
      </GenericErrorBoundary>
      {dateFilterEnabled ? (
        <GenericErrorBoundary>
          <CreatedFilter filter={filters.created} handleFilterChange={handleFilterChange} />
        </GenericErrorBoundary>
      ) : null}
      <GenericErrorBoundary>
        <S.ResultsCount>
          <span data-testid="filter-results-count">{donationsCount}</span> results
        </S.ResultsCount>
      </GenericErrorBoundary>
    </S.Filters>
  );
}

export default Filters;

export function FilterWrapper({ children, ...props }) {
  return <S.FilterWrapper {...props}>{children}</S.FilterWrapper>;
}

export function FilterLabel({ children }) {
  return <S.FilterLabel>{children}</S.FilterLabel>;
}
