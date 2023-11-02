import PropTypes, { InferProps } from 'prop-types';

import SvgIcon from 'assets/icons/SvgIcon';
import logo from 'assets/images/nre-logo-blue.svg';
import logo2 from 'assets/images/nre-logo-yellow.svg';
import { ICONS } from 'assets/icons/SvgIcon';
import {
  LeftbarWrapper,
  Logo,
  Heading,
  Divider,
  AdvantagesWrapper,
  Advantage,
  AdvContent,
  AdvHeading,
  AdvSubHeading
} from './Leftbar.styled';

const content = {
  heading: 'We’ve helped raise millions for our clients',
  advantages: [
    {
      svg: ICONS.ACCOUNT_ACC_BALANCE,
      heading: 'Save time, money, and democracy',
      subheading: (
        <>
          Sustain your newsroom through <i>voluntary</i> contributions
        </>
      )
    },
    {
      svg: ICONS.ACCOUNT_NEWSROOM,
      heading: 'For newsrooms, by newsrooms',
      subheading: (
        <>
          An <i>affordable</i>, DIY contributions management software
        </>
      )
    },
    {
      svg: ICONS.ACCOUNT_CART,
      heading: 'No CRM required',
      subheading: (
        <>
          Create a checkout page in <i>minutes</i>
        </>
      )
    },
    {
      svg: ICONS.ACCOUNT_UNFOLD_MORE,
      heading: 'Strategic integrations',
      subheading: (
        <>
          <i>Real-time</i> payment notifications & payment processing
        </>
      )
    }
  ]
};

export type LeftbarProps = InferProps<typeof LeftbarPropTypes>;

function Leftbar({ isCreateAccountPage }: LeftbarProps) {
  return (
    <LeftbarWrapper isCreateAccountPage={isCreateAccountPage}>
      <Logo
        data-testid={isCreateAccountPage ? 'logo' : 'logo2'}
        src={isCreateAccountPage ? logo : logo2}
        alt="News Revenue Engine"
      />
      <Heading>{content.heading}</Heading>
      <Divider isCreateAccountPage={isCreateAccountPage} />
      <AdvantagesWrapper data-testid="advantages">
        {content.advantages.map((advantage) => {
          return (
            <Advantage key={advantage.heading}>
              <span>
                <SvgIcon icon={advantage.svg} />
              </span>
              <AdvContent>
                <AdvHeading>{advantage.heading}</AdvHeading>
                <AdvSubHeading>{advantage.subheading}</AdvSubHeading>
              </AdvContent>
            </Advantage>
          );
        })}
      </AdvantagesWrapper>
    </LeftbarWrapper>
  );
}

const LeftbarPropTypes = {
  isCreateAccountPage: PropTypes.bool
};

Leftbar.propTypes = LeftbarPropTypes;

export default Leftbar;
