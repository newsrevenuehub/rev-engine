import * as S from './Filters.styled';

// Children
import StatusFilter from 'components/donations/filters/StatusFilter';
import AmountFilter from 'components/donations/filters/AmountFilter';
import CreatedFilter from 'components/donations/filters/CreatedFilter';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

function Filters({ filters, handleFilterChange, donationsCount, enableStatusFilter = true }) {
  // whenever we need to enable this, toggle this switch to true
  let dateFilterEnabled = false;
  return (
    <S.Filters layout>
      <GenericErrorBoundary>
        {enableStatusFilter ? <StatusFilter filter={filters.status} handleFilterChange={handleFilterChange} /> : null}
      </GenericErrorBoundary>
      <GenericErrorBoundary>
        <AmountFilter filter={filters.amount} handleFilterChange={handleFilterChange} />
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
