import * as S from './Filters.styled';

// Children
import StatusFilter from 'components/donations/filters/StatusFilter';
import AmountFilter from 'components/donations/filters/AmountFilter';
import CreatedFilter from 'components/donations/filters/CreatedFilter';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

function Filters({ filters, handleFilterChange, donationsCount }) {
  return (
    <S.Filters layout>
      <GenericErrorBoundary>
        <StatusFilter filter={filters.status} handleFilterChange={handleFilterChange} />
      </GenericErrorBoundary>
      <GenericErrorBoundary>
        <AmountFilter filter={filters.amount} handleFilterChange={handleFilterChange} />
      </GenericErrorBoundary>
      <GenericErrorBoundary>
        <CreatedFilter filter={filters.created} handleFilterChange={handleFilterChange} />
      </GenericErrorBoundary>
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
