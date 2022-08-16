import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './TributeRadio.stories';

const { Default } = composeStories(stories);


it.each`
    inMemoryDisplay | inHonorDisplay
    ${true}         | ${true}
    ${true}         | ${false}
    ${false}        | ${true}
`('has right behavior given configuration: inMemoryDisplay: $inMemoryDisplay | inHonorDisplay: $inHonorDisplay', async ({ inMemoryDisplay, inHonorDisplay}) => {
    render(<Default inHonorDisplay={inHonorDisplay} inMemoryDisplay={inMemoryDisplay} />);
    
    const noOption = screen.getByRole('radio', { name: Default.args.noLabel});
    expect(noOption).toBeInTheDocument();
    expect(noOption.value).toBe(Default.args.noValue);
    expect(noOption.checked).toBe(true);
    [
        { expected: inMemoryDisplay, value: Default.args.inMemoryOfValue, label: Default.args.inMemoryOfLabel, defaultChecked: false},
        { expected: inHonorDisplay, value: Default.args.inHonorOfValue, label: Default.args.inHonorOfLabel, defaultChecked: false },
    ].filter(({expected}) => expected).forEach(({value, label, defaultChecked}) => {
        const option = screen.getByRole('radio', { name: label });
        expect(option).toBeInTheDocument();
        expect(option.value).toBe(value);
        expect(option.checked).toBe(false);
        fireEvent.click(option);
        expect(option.checked).toBe(true);
    });
});
