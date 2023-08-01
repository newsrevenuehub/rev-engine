import { ComponentMeta, ComponentStory } from '@storybook/react';
import DonationPageHeader from './DonationPageHeader';
import { revEngineTheme } from 'styles/themes';
import { ThemeProvider } from 'styled-components';

const sampleImageSrc = `
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
    <defs>
      <radialGradient id="a"><stop offset="0%" stop-color="green"/><stop offset="200%" stop-color="#00f"/>
      </radialGradient>
    </defs>
    <path fill="url(#a)" d="M0 0h100v100H0z"/>
  </svg>`;
const sampleImageUri = `data:image/svg+xml;base64,${window.btoa(sampleImageSrc)}`;
const sampleImageFile = new File([sampleImageSrc], 'image.svg', { type: 'image/svg+xml' });

export default {
  component: DonationPageHeader,
  title: 'Donation Page/DonationPageHeader'
} as ComponentMeta<typeof DonationPageHeader>;

const Template: ComponentStory<typeof DonationPageHeader> = (props) => (
  <ThemeProvider theme={{ ...revEngineTheme, colors: { ...revEngineTheme.colors, cstm_mainHeader: 'yellow' } }}>
    <DonationPageHeader {...props} />
  </ThemeProvider>
);

const UnstyledTemplate: ComponentStory<typeof DonationPageHeader> = (props) => <DonationPageHeader {...props} />;

export const Default = Template.bind({});
Default.args = {
  page: {
    header_bg_image: sampleImageUri,
    header_link: 'https://fundjournalism.org',
    header_logo: sampleImageUri,
    header_logo_alt_text: 'News Revenue Hub'
  } as any
};

export const FileObjectsAsImages = Template.bind({});
FileObjectsAsImages.args = {
  page: {
    header_bg_image: sampleImageFile,
    header_link: 'https://fundjournalism.org',
    header_logo: sampleImageFile,
    header_logo_alt_text: 'News Revenue Hub'
  } as any
};

export const LogoOnly = Template.bind({});
LogoOnly.args = {
  page: {
    header_link: 'https://fundjournalism.org',
    header_logo: sampleImageUri,
    header_logo_alt_text: 'News Revenue Hub'
  } as any
};

export const LogoOnlyUnstyled = UnstyledTemplate.bind({});
LogoOnlyUnstyled.args = {
  page: {
    header_link: 'https://fundjournalism.org',
    header_logo: sampleImageUri,
    header_logo_alt_text: 'News Revenue Hub'
  } as any
};
