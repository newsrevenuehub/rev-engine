import * as S from './Filters.styled';

// Children
import StatusFilter from 'components/donations/filters/StatusFilter';
import AmountFilter from 'components/donations/filters/AmountFilter';
import CreatedFilter from 'components/donations/filters/CreatedFilter';

function Filters({ filters, handleFilterChange, donationsCount }) {
  return (
    <S.Filters>
      <StatusFilter filter={filters.status} handleFilterChange={handleFilterChange} />
      <AmountFilter filter={filters.amount} handleFilterChange={handleFilterChange} />
      <CreatedFilter filter={filters.created} handleFilterChange={handleFilterChange} />
      <S.ResultsCount>
        <span>{donationsCount}</span> results
      </S.ResultsCount>
    </S.Filters>
  );
}

export default Filters;

export function FilterWrapper({ children }) {
  return <S.FilterWrapper>{children}</S.FilterWrapper>;
}

export function FilterLabel({ children }) {
  return <S.FilterLabel>{children}</S.FilterLabel>;
}
