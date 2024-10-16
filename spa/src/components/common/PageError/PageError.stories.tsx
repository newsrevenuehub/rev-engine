import { Meta, StoryFn } from '@storybook/react';
import PageError, { PageErrorProps } from './PageError';
import { FUNDJOURNALISM_404_REDIRECT } from 'constants/helperUrls';

export default {
  component: PageError,
  title: 'Common/PageError'
} as Meta<typeof PageError>;

const Template: StoryFn<typeof PageError> = (props: PageErrorProps) => <PageError {...props} />;

export const Default = Template.bind({});
Default.args = {
  header: 'Ops!',
  description: 'Something went wrong. Please try again later.'
};

export const NotFound = Template.bind({});
NotFound.args = {
  header: '404',
  description: (
    <>
      <p>The page you requested can't be found.</p>
      <p>
        If you're trying to make a contribution please visit <a href={FUNDJOURNALISM_404_REDIRECT}>this page</a>.
      </p>
    </>
  )
};

export const NoHeader = Template.bind({});
NoHeader.args = {};
