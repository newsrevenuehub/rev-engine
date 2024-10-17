import PropTypes, { InferProps } from 'prop-types';
import AvatarMenu from 'components/common/AvatarMenu';
import { UserPropTypes } from 'constants/propTypes';
import { User } from 'hooks/useUser.types';
import { Root } from './DashboardTopbar.styled';

export interface DashboardTopbarProps extends InferProps<typeof DashboardTopbarPropTypes> {
  user?: User;
}

function DashboardTopbar({ user }: DashboardTopbarProps) {
  return (
    <Root>
      <AvatarMenu user={user} />
    </Root>
  );
}

const DashboardTopbarPropTypes = {
  user: PropTypes.shape(UserPropTypes)
};

DashboardTopbar.propTypes = DashboardTopbarPropTypes;

DashboardTopbar.defaultProps = {
  isEditPage: false,
  page: undefined
};

export default DashboardTopbar;
