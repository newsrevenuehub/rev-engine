import { ComponentMeta, Story } from '@storybook/react';
import { FormControlLabel } from '../FormControlLabel';
import { Radio } from './Radio';

export default {
  args: {
    checked: true,
    disabled: false
  },
  argTypes: {
    checked: {
      control: 'boolean'
    },
    disabled: {
      control: 'boolean'
    }
  },
  component: Radio,
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based radio button. See [the API](https://v4.mui.com/api/radio/) for more details.'
      }
    }
  },
  title: 'Base/Radio'
} as ComponentMeta<typeof Radio>;

interface TemplateProps {
  checked?: boolean;
  disabled?: boolean;
}

const Template: Story<TemplateProps> = (props: TemplateProps) => (
  <>
    <FormControlLabel control={<Radio checked={props.checked} />} disabled={props.disabled} label="Radio Label" />
    <FormControlLabel control={<Radio checked={props.checked} />} disabled label="Disabled Radio Label" />
  </>
);

export const Default = Template.bind({});

const LineWrapTemplate: Story<TemplateProps> = (props: TemplateProps) => (
  <div style={{ width: '150px' }}>
    <FormControlLabel
      control={<Radio checked={props.checked} />}
      disabled={props.disabled}
      label="This is a label that should wrap onto multiple lines"
    />
  </div>
);

export const LineWrap = LineWrapTemplate.bind({});
