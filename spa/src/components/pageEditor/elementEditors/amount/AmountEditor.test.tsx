import userEvent from '@testing-library/user-event';
import { AmountElement } from 'hooks/useContributionPage';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { ContributionIntervalList } from 'utilities/getPageContributionIntervals';
import AmountEditor, { AmountEditorProps } from './AmountEditor';

jest.mock('./AmountInterval');

const contributionIntervals: ContributionIntervalList = [
  {
    interval: 'one_time',
    displayName: 'One Time'
  },
  {
    interval: 'month',
    displayName: 'Monthly'
  }
];

const elementContent: AmountElement['content'] = {
  defaults: {
    one_time: 3,
    month: 20
  },
  options: {
    one_time: [1, 2, 3],
    month: [10, 20, 30]
  }
};

function tree(props?: Partial<AmountEditorProps>) {
  return render(
    <AmountEditor
      contributionIntervals={contributionIntervals}
      elementContent={elementContent}
      elementRequiredFields={[]}
      onChangeElementContent={jest.fn()}
      onChangeElementRequiredFields={jest.fn()}
      {...props}
    />
  );
}

describe('AmountEditor', () => {
  it('displays an explanation', () => {
    tree();
    expect(
      screen.getByText(
        'Highlighted amounts will be selected by default on live donation pages. Click an amount to highlight.'
      )
    ).toBeVisible();
  });

  it('displays a tip', () => {
    tree();
    expect(screen.getByText("Tip: We've pre-selected the most common contribution amounts.")).toBeVisible();
  });

  it('displays <AmountInterval>s for each interval in element content', () => {
    expect.assertions(contributionIntervals.length * 3);
    tree();

    for (const interval of contributionIntervals) {
      const amountInterval = screen.getByTestId(`mock-amount-interval-${interval.interval}`);

      expect(amountInterval).toBeInTheDocument();
      expect(amountInterval.dataset.defaultOption).toBe(elementContent.defaults[interval.interval]?.toString());
      expect(amountInterval.dataset.options).toBe(JSON.stringify(elementContent.options[interval.interval]));
    }
  });

  it('converts string amounts to numbers', () => {
    // These values are designed so that when conversion occurs, they lose the
    // `.0` part.
    const stringElementContent = {
      defaults: {
        one_time: '1.0'
      },
      options: {
        one_time: ['1.0', '2.0', '3.0']
      }
    };

    tree({ elementContent: stringElementContent as any });

    const amountInterval = screen.getByTestId('mock-amount-interval-one_time');

    expect(amountInterval.dataset.defaultOption).toBe('1');
    expect(amountInterval.dataset.options).toBe(JSON.stringify([1, 2, 3]));
  });

  it('calls onChangeElementContent when a new amount is added in a child <AmountInterval>', () => {
    const onChangeElementContent = jest.fn();

    tree({
      onChangeElementContent,
      contributionIntervals: [{ interval: 'one_time', displayName: 'One time' }]
    });
    expect(onChangeElementContent).not.toBeCalled();
    userEvent.click(screen.getByText('onAddAmount'));
    expect(onChangeElementContent.mock.calls).toEqual([
      [
        {
          ...elementContent,
          options: { ...elementContent.options, one_time: [1, 1.23, 2, 3] }
        }
      ]
    ]);
  });

  it('keeps amounts sorted in ascending order when adding an amount', () => {
    const onChangeElementContent = jest.fn();

    tree({
      elementContent: {
        ...elementContent,
        options: {
          ...elementContent.options,
          one_time: [0.1, 0.25, 2, 3]
        }
      },
      onChangeElementContent,
      contributionIntervals: [{ interval: 'one_time', displayName: 'One time' }]
    });
    expect(onChangeElementContent).not.toBeCalled();
    userEvent.click(screen.getByText('onAddAmount'));
    expect(onChangeElementContent.mock.calls).toEqual([
      [
        {
          ...elementContent,
          options: { ...elementContent.options, one_time: [0.1, 0.25, 1.23, 2, 3] }
        }
      ]
    ]);
  });

  it('calls onChangeElementContent when an amount is removed from a child <AmountInterval>', () => {
    const onChangeElementContent = jest.fn();

    tree({
      onChangeElementContent,
      contributionIntervals: [{ interval: 'one_time', displayName: 'One time' }]
    });
    expect(onChangeElementContent).not.toBeCalled();
    userEvent.click(screen.getByText('onRemoveAmount'));
    expect(onChangeElementContent.mock.calls).toEqual([
      [
        {
          ...elementContent,
          options: { ...elementContent.options, one_time: elementContent.options.one_time!.slice(1) }
        }
      ]
    ]);
  });

  it('calls onChangeElement when an amount is set as default', () => {
    const onChangeElementContent = jest.fn();

    tree({
      onChangeElementContent,
      contributionIntervals: [{ interval: 'one_time', displayName: 'One time' }]
    });
    expect(onChangeElementContent).not.toBeCalled();
    userEvent.click(screen.getByText('onSetDefaultAmount'));
    expect(onChangeElementContent.mock.calls).toEqual([
      [
        {
          ...elementContent,
          defaults: { ...elementContent.defaults, one_time: elementContent.options.one_time![0] }
        }
      ]
    ]);
  });

  describe('The allow other checkbox', () => {
    it('is checked if the value is set in the element content', () => {
      tree({ elementContent: { ...elementContent, allowOther: true } });
      expect(screen.getByRole('checkbox', { name: 'Include "other" as an option for all frequencies' })).toBeChecked();
    });

    it('is unchecked if the value is set in the element content', () => {
      tree({ elementContent: { ...elementContent, allowOther: false } });
      expect(
        screen.getByRole('checkbox', { name: 'Include "other" as an option for all frequencies' })
      ).not.toBeChecked();
    });

    it('updates element content when changed', () => {
      const onChangeElementContent = jest.fn();

      tree({ elementContent: { ...elementContent, allowOther: false }, onChangeElementContent });
      userEvent.click(screen.getByRole('checkbox', { name: 'Include "other" as an option for all frequencies' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, allowOther: true }]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
