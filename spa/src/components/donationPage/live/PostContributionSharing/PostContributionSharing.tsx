import { Facebook, MailOutline, Twitter } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { RevenueProgramForContributionPage } from 'hooks/useContributionPage';
import { SocialShareList, Root, Text, SocialShareLink, SocialShareItem } from './PostContributionSharing.styled';

const PostContributionSharingPropTypes = {
  donationPageUrl: PropTypes.string.isRequired,
  revenueProgram: PropTypes.object.isRequired
};

export interface PostContributionSharingProps extends InferProps<typeof PostContributionSharingPropTypes> {
  revenueProgram: RevenueProgramForContributionPage;
}

export function PostContributionSharing({ donationPageUrl, revenueProgram }: PostContributionSharingProps) {
  const emailUrl = () => {
    const subject = `You should really check out ${revenueProgram.name}`;
    const body = [
      `I just gave to ${revenueProgram.name}, and I think you should too: ${revenueProgram.website_url}`,
      ' ',
      `If you're not familiar with ${revenueProgram.name}'s work, you can sign up for their newsletter here: ${revenueProgram.website_url}`,
      ' ',
      'Sincerely,',
      ' ',
      ' ',
      ' ',
      `Contribute today: ${donationPageUrl}`
    ].join('%0D%0A');
    return `mailto:?subject=${subject}&body=${body}`;
  };
  const facebookUrl = () => {
    const baseUrl = 'https://www.facebook.com/sharer/sharer.php?';
    const search = `u=${donationPageUrl}`;
    return baseUrl + search;
  };
  const twitterUrl = () => {
    const baseUrl = 'https://twitter.com/intent/tweet?';
    const rpHandle = revenueProgram.twitter_handle ? `@${revenueProgram.twitter_handle}` : revenueProgram.name;
    const message = `I support ${rpHandle}. You should too. ${donationPageUrl} @fundjournalism`;
    return baseUrl + `text=${message}`;
  };

  return (
    <Root>
      <Text>
        <strong>Share your support on social media:</strong>
      </Text>
      <SocialShareList>
        <SocialShareItem>
          <SocialShareLink href={facebookUrl()} target="_blank" rel="noreferrer">
            <Facebook />
            Share
          </SocialShareLink>
        </SocialShareItem>
        <SocialShareItem>
          <SocialShareLink href={twitterUrl()} target="_blank" rel="noreferrer">
            <Twitter />
            Tweet
          </SocialShareLink>
        </SocialShareItem>
        <SocialShareItem>
          <SocialShareLink href={emailUrl()} target="_blank" rel="noreferrer">
            <MailOutline />
            Email
          </SocialShareLink>
        </SocialShareItem>
      </SocialShareList>
    </Root>
  );
}

PostContributionSharing.propTypes = PostContributionSharingPropTypes;
export default PostContributionSharing;
