import { ComponentMeta, Story } from '@storybook/react';
import { FormControlLabel } from '../FormControlLabel';
import { Checkbox } from './Checkbox';

export default {
  argTypes: {
    checked: {
      control: 'boolean',
      defaultValue: true
    },
    disabled: {
      control: 'boolean',
      defaultValue: false
    },
    indeterminate: {
      control: 'boolean',
      defaultValue: false
    }
  },
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based checkbox. See [the API](https://v4.mui.com/api/checkbox/) for more details.'
      }
    }
  },
  title: 'Base/Checkbox'
} as ComponentMeta<typeof Checkbox>;

interface TemplateProps {
  checked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
}

const Template: Story<TemplateProps> = (props: TemplateProps) => (
  <FormControlLabel
    control={<Checkbox checked={props.checked} indeterminate={props.indeterminate} />}
    disabled={props.disabled}
    label="Checkbox Label"
  />
);

export const Default = Template.bind({});

const LineWrapTemplate: Story<TemplateProps> = (props: TemplateProps) => (
  <div style={{ width: '150px' }}>
    <FormControlLabel
      control={<Checkbox checked={props.checked} indeterminate={props.indeterminate} />}
      disabled={props.disabled}
      label="This is a label that should wrap onto multiple lines"
    />
  </div>
);

export const LineWrap = LineWrapTemplate.bind({});
