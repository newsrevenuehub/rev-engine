import { Meta, StoryFn } from '@storybook/react';
import ImageUpload from './ImageUpload';
import OffscreenText from '../OffscreenText/OffscreenText';

export default {
  component: ImageUpload,
  title: 'Base/ImageUpload'
} as Meta<typeof ImageUpload>;

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

const Template: StoryFn<typeof ImageUpload> = (props) => <ImageUpload {...props} />;

export const Empty = Template.bind({});
Empty.args = {
  id: 'empty',
  prompt: 'Choose an image',
  label: (
    <OffscreenText>
      <label htmlFor="empty">Main image</label>
    </OffscreenText>
  )
};

export const WithLabel = Template.bind({});
WithLabel.args = { id: 'with-label', prompt: 'Choose an image', label: <label htmlFor="withLabel">Main image</label> };

export const WithThumbnailOnly = Template.bind({});
WithThumbnailOnly.args = {
  id: 'with-thumbnail-only',
  thumbnailUrl: sampleImageUri,
  label: (
    <OffscreenText>
      <label htmlFor="with-thumbnail-only">Main image</label>
    </OffscreenText>
  )
};

export const WithImage = Template.bind({});
WithImage.args = {
  id: 'with-image',
  thumbnailUrl: sampleImageUri,
  value: sampleImage,
  label: (
    <OffscreenText>
      <label htmlFor="with-image">Main image</label>
    </OffscreenText>
  )
};
