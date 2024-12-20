import { AccountBalanceOutlined, AddShoppingCartOutlined, CodeOutlined } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import Newsroom from 'assets/icons/newsroom.svg?react';
import logo from 'assets/images/nre-logo-blue.svg';
import logo2 from 'assets/images/nre-logo-yellow.svg';
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
      heading: 'Save time, money, and democracy',
      icon: AccountBalanceOutlined,
      subheading: (
        <>
          Sustain your newsroom through <i>voluntary</i> contributions
        </>
      )
    },
    {
      heading: 'For newsrooms, by newsrooms',
      icon: Newsroom,
      subheading: (
        <>
          An <i>affordable</i>, DIY contributions management software
        </>
      )
    },
    {
      heading: 'No CRM required',
      icon: AddShoppingCartOutlined,
      subheading: (
        <>
          Create a checkout page in <i>minutes</i>
        </>
      )
    },
    {
      heading: 'Strategic integrations',
      icon: CodeOutlined,
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
          const Icon = advantage.icon;

          return (
            <Advantage key={advantage.heading}>
              <span>
                <Icon />
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
