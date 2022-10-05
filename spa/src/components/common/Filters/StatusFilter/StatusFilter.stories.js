import { PAYMENT_STATUS, PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS } from 'constants/paymentStatus';
import StatusFilter from './StatusFilter';

export default {
  title: 'Common/Filter/StatusFilter',
  component: StatusFilter
};

export const Default = StatusFilter.bind({});

export const Selected = StatusFilter.bind({});
Selected.args = {
  filter: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED]
};

export const ExcludingStatus = StatusFilter.bind({});
ExcludingStatus.args = {
  excludeStatusFilters: PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS
};
