import OffscreenText from './OffscreenText';

function OffscreenTextDemo({ text }) {
  return (
    <>
      <OffscreenText>{text}</OffscreenText>
      <p>Turn on assistive technology like VoiceOver to hear the text.</p>
    </>
  );
}

export default {
  component: OffscreenTextDemo,
  title: 'Base/OffscreenText'
};

export const Default = OffscreenTextDemo.bind({});

Default.args = { text: 'This text is only perceivable by assistive technology.' };
