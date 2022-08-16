import { fireEvent, render, screen, within } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';
import userEvent from '@testing-library/user-event'

import * as stories from './Reason.stories';
import TributeRadio from './TributeRadio';

const { Default } = composeStories(stories);

test('has a legend heading', () => {
  render(<Default />);
  expect(screen.getByText(Default.args.legendHeading)).toBeInTheDocument();
});


test('when contribution reason configured to display but no preset options', async () => {
    render(<Default reasonPromptDisplay={true} reasonPromptOptions={[]} />);
    expect(screen.getByText(Default.args.reasonPromptLabelText)).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: Default.args.reasonPromptOtherInputLabelText});
    expect(input.placeholder).toBe(Default.args.reasonPromptOtherInputPlaceholder);
    expect(input.value).toBeFalsy();
    const newValue = 'I want to support good news.';
    fireEvent.change(input, {target: { value: newValue}});
    expect(input.value).toBe(newValue);
    const submit = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submit);
    await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
});

test('when user chooses other for reason, provides reason, then changes mind', async () => {
    const user = userEvent.setup();
    render(<Default reasonPromptDisplay={true} />);
    expect(Default.args.reasonPromptOptions.length).toBeGreaterThan(0);
    const select = screen.getByRole('combobox', { name: Default.args.reasonPromptLabelText });
    await user.selectOptions(select, Default.args.reasonPromptOtherOptionLabelText);
    const textbox = screen.getByRole('textbox', { name: Default.args.reasonPromptOtherInputLabelText});
    fireEvent.change(textbox, {target: {value: "Some text"}});
    await user.selectOptions(select, Default.args.reasonPromptOptions[0].labelText);
    await user.selectOptions(select, Default.args.reasonPromptOtherOptionLabelText);
    expect(textbox.value).toBe("");
});

test('when contribution reason is required and no preset options', () => {
    render(<Default reasonPromptDisplay={true} reasonPromptRequired={true} reasonPromptOptions={[]} />);
    const input = screen.getByRole('textbox', { name: Default.args.reasonPromptOtherInputLabelText});
    expect(input.required).toBeTruthy();
});

test('when contribution reason enabled and there are preset options', () => {
    expect(Default.args.reasonPromptOptions.length).toBeGreaterThan(0);
    render(<Default reasonPromptDisplay={true} reasonPromptRequired={true} />);
    const expectedOptions = [
        {labelText: Default.args.reasonPromptOtherOptionLabelText, value: Default.args.reasonPromptOtherOptionValue},
        ...Default.args.reasonPromptOptions
    ];
    const select = screen.getByRole('combobox', { name: Default.args.reasonPromptLabelText});
    expectedOptions.forEach( ({ labelText, value}) => {
        const option = within(select).getByRole('option', {name: labelText});
        expect(option.value).toBe(value);
        expect(option.selected).toBe(false);       
    });
});


test('when configured to display "in memory" of option', () => {
    render(<Default inMemoryDisplay={true} />);
    expect(screen.getByText(TributeRadio.defaultProps.helperText)).toBeInTheDocument();
    const noOption = screen.getByRole('radio', {name: TributeRadio.defaultProps.noLabel});
    expect(noOption).toBeChecked();
    const inMemoryOption = screen.getByRole('radio', {name: TributeRadio.defaultProps.inMemoryOfLabel});
    expect(inMemoryOption).not.toBeChecked();
    fireEvent.click(inMemoryOption);
    expect(inMemoryOption).toBeChecked();
});


test('when configured to display "in honor" of option', () => {
    render(<Default inHonorDisplay={true} />);
    expect(screen.getByText(TributeRadio.defaultProps.helperText)).toBeInTheDocument();
    const noOption = screen.getByRole('radio', {name: TributeRadio.defaultProps.noLabel});
    expect(noOption).toBeChecked();
    const inHonorOption = screen.getByRole('radio', {name: TributeRadio.defaultProps.inHonorOfLabel});
    expect(inHonorOption).not.toBeChecked();
    fireEvent.click(inHonorOption);
    expect(inHonorOption).toBeChecked();
});

test('when user chooses "in memory" for tribute, provides tributee, then changes mind', async () => {
    const user = userEvent.setup();
    render(<Default inMemoryDisplay={true} />);
    const noOption = screen.getByRole('radio', { name: TributeRadio.defaultProps.noLabel });
    const inMemoryOption = screen.getByRole('radio', { name: TributeRadio.defaultProps.inMemoryOfLabel });
    await user.click(inMemoryOption);
    const textbox = screen.getByRole('textbox', {name: Default.args.inMemoryPlaceholder, exact: false});
    fireEvent.change(textbox, {target: {value: 'Johnny Memory'}});
    await user.click(noOption)
    await user.click(inMemoryOption);
    expect(textbox.value).toBe('');
});

test('when user chooses "in honor" for tribute, provides tributee, then changes mind', async () => {
    const user = userEvent.setup();
    render(<Default inHonorDisplay={true} />);
    const noOption = screen.getByRole('radio', { name: TributeRadio.defaultProps.noLabel });
    const inHonorOption = screen.getByRole('radio', { name: TributeRadio.defaultProps.inHonorOfLabel });
    await user.click(inHonorOption);
    const textbox = screen.getByRole('textbox', {name: Default.args.inHonorPlaceholder, exact: false});
    fireEvent.change(textbox, {target: {value: 'Johnny Memory'}});
    await user.click(noOption)
    await user.click(inHonorOption);
    expect(textbox.value).toBe('');
});

test('submits expected data', async () => {
    const user = userEvent.setup();
    expect(Default.args.reasonPromptOptions.length).toBeGreaterThan(0);
    render(<Default inHonorDisplay={true} inMemoryDisplay={true} />);
    
    // choose "other" for reason and provide text in textbox
    const select = screen.getByRole('combobox', { name: Default.args.reasonPromptLabelText });
    await user.selectOptions(select, Default.args.reasonPromptOtherOptionLabelText);
    const otherTextbox = screen.getByRole('textbox', { name: Default.args.reasonPromptOtherInputLabelText});
    const reasonText = "my reason";
    fireEvent.change(otherTextbox, {target: {value: reasonText}});

    // user chooses "in memory" option and provides info about tributee
    const inMemoryOption = screen.getByRole('radio', { name: TributeRadio.defaultProps.inMemoryOfLabel });
    await user.click(inMemoryOption);
    const tributeTextbox = screen.getByRole('textbox', {name: Default.args.inMemoryPlaceholder, exact: false});
    const memoree = "Johnny Mnemonic"
    fireEvent.change(tributeTextbox, {target: {value: memoree}});

    const button = screen.getByRole('button', { name: 'Submit' });
    user.click(button);
    await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
    await screen.findByText(JSON.stringify({
        [Default.args.reasonPromptName]: Default.args.reasonPromptOtherOptionValue,
        [TributeRadio.defaultProps.name]: TributeRadio.defaultProps.inMemoryOfValue, 
        [Default.args.inMemoryName]: memoree, 
        [Default.args.inHonorName]: '',
        [Default.args.reasonPromptOtherInputName]: reasonText
    }), { exact: false });
});

