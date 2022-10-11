import PropTypes from 'prop-types';

import { BUTTON_TYPE } from 'constants/buttonConstants';
import { PAYMENT_STATUS } from 'constants/paymentStatus';

import { Flex, Button, Label, Content } from './StatusFilter.styled';

export const STATUS_FILTERS = Object.values(PAYMENT_STATUS);

const StatusFilter = ({ onClick, className, excludeStatusFilters, filter }) => (
  <Flex className={className} data-testid="status-filter">
    <Label>Status</Label>
    <Content>
      {STATUS_FILTERS.filter((status) => !excludeStatusFilters?.includes(status)).map((status) => (
        <Button
          key={status}
          onClick={() => onClick(status)}
          aria-label={`filter by status: ${status}`}
          selected={filter?.includes(status)}
        >
          {status}
        </Button>
      ))}
    </Content>
  </Flex>
);

StatusFilter.propTypes = {
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  excludeStatusFilters: PropTypes.arrayOf(PropTypes.oneOf(STATUS_FILTERS)),
  filter: PropTypes.arrayOf(PropTypes.oneOf(STATUS_FILTERS))
};

StatusFilter.defaultProps = {
  type: BUTTON_TYPE.PAGE,
  className: '',
  excludeStatusFilters: [],
  filter: []
};

export default StatusFilter;
