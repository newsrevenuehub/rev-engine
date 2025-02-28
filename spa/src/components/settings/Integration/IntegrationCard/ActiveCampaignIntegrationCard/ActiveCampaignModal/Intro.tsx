import AccountTree from '@material-design-icons/svg/outlined/account_tree.svg?react';
import Diversity from '@material-design-icons/svg/outlined/diversity_2.svg?react';
import MailCheck from '@material-design-icons/svg/outlined/mark_email_read.svg?react';
import IconList from 'components/common/IconList/IconList';

/**
 * Content that is shown when the modal first opens, regardless of organization plan.
 */
export const Intro = () => (
  <div data-testid="intro">
    <p>The RevEngine to ActiveCampaign integration helps you take your email campaigns to the next level:</p>
    <IconList
      list={[
        { icon: <MailCheck />, text: 'Sync contributor data to email contacts' },
        { icon: <Diversity />, text: 'Sync contribution details to email contacts' },
        { icon: <AccountTree />, text: 'Create custom segments created for contributors' }
      ]}
    />
  </div>
);

export default Intro;
