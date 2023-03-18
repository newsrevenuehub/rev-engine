import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useMemo, useState } from 'react';
import { editorStateToHtml, htmlToEditorState } from 'utilities/draftJs';
import RichTextEditor from './RichTextEditor';

export default {
  component: RichTextEditor,
  title: 'Base/RichTextEditor'
} as ComponentMeta<typeof RichTextEditor>;

const Template: ComponentStory<typeof RichTextEditor> = (props) => {
  return <RichTextEditor {...props} />;
};

export const Default = Template.bind({});

const TemplateWithHtml: ComponentStory<typeof RichTextEditor> = (props) => {
  const [html, setHtml] = useState('');

  return (
    <>
      <RichTextEditor {...props} onEditorStateChange={(state) => setHtml(editorStateToHtml(state))} />
      <pre>{html}</pre>
    </>
  );
};

export const WithCodePreview = TemplateWithHtml.bind({});

const RoundtripTemplate: ComponentStory<typeof RichTextEditor> = (props) => {
  const [html, setHtml] = useState('');
  const roundtrippedState = useMemo(() => htmlToEditorState(html), [html]);

  return (
    <>
      <p>
        The contents of the bottom editor show the result of converting the top one to HTML, then creating a DraftJS
        editor state from the result. They should look identical.
      </p>
      <RichTextEditor {...props} onEditorStateChange={(state) => setHtml(editorStateToHtml(state))} />
      <RichTextEditor {...props} editorState={roundtrippedState} />
    </>
  );
};

export const Roundtrip = RoundtripTemplate.bind({});
