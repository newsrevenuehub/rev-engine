import { ComponentMeta, ComponentStory } from '@storybook/react';
import ImageUpload from './ImageUpload';

export default {
  component: ImageUpload,
  title: 'Base/ImageUpload'
} as ComponentMeta<typeof ImageUpload>;

const sampleImageSrc = `
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
    <defs>
      <radialGradient id="a"><stop offset="0%" stop-color="green"/><stop offset="200%" stop-color="#00f"/>
      </radialGradient>
    </defs>
    <path fill="url(#a)" d="M0 0h100v100H0z"/>
  </svg>`;

const sampleImageUri = `data:image/svg+xml;base64,${window.btoa(sampleImageSrc)}`;
const sampleImageBlob = new Blob([sampleImageSrc], { type: 'image/svg+xml' });
const sampleImage = new File([sampleImageBlob], 'uploaded-file.svg', { type: 'image/svg+xml' });

const Template: ComponentStory<typeof ImageUpload> = (props) => <ImageUpload {...props} />;

export const Empty = Template.bind({});
Empty.args = { prompt: 'Choose an image', label: 'Main image' };

export const WithLabel = Template.bind({});
WithLabel.args = { prompt: 'Choose an image', label: 'Main image', showLabel: true };

export const WithThumbnailOnly = Template.bind({});
WithThumbnailOnly.args = {
  thumbnailUrl: sampleImageUri,
  label: 'Main image'
};

export const WithImage = Template.bind({});
WithImage.args = {
  thumbnailUrl: sampleImageUri,
  value: sampleImage,
  label: 'Main image'
};
