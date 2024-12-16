import { Meta, StoryFn } from '@storybook/react';
import RichTextDisplay from './RichTextDisplay';

export default {
  component: RichTextDisplay,
  title: 'Base/RichTextDisplay'
} as Meta<typeof RichTextDisplay>;

const Template: StoryFn<typeof RichTextDisplay> = (props) => <RichTextDisplay {...props} />;

// Generated this from the RichTextEditor story.

export const Default = Template.bind({});
Default.args = {
  html: `<p><strong>Bold</strong></p>
<p><em>Italic</em></p>
<p><u>Underline</u></p>
<p><del>Strikethrough</del></p>
<h2>H2</h2>
<h3>H3</h3>
<h4>H4</h4>
<blockquote>Blockquote</blockquote>
<p>
  <span class="nre-draftjs-font-size-13">13</span>,
  <span class="nre-draftjs-font-size-14">14</span>,
  <span class="nre-draftjs-font-size-15">15</span>,
  <span class="nre-draftjs-font-size-16">16</span>,
  <span class="nre-draftjs-font-size-24">24</span>
</p>
<ul>
  <li>unordered</li>
  <li>two</li>
</ul>
<ol>
  <li>ordered</li>
  <li>two</li>
</ol>
<p><a href="https://fundjournalism.org">link</a>&nbsp;</p>
<p class="nre-draftjs-text-align-left">left</p>
<p class="nre-draftjs-text-align-center">center</p>
<p class="nre-draftjs-text-align-right">right</p>`
};
