import { axe } from 'jest-axe';
import Mailcheck from 'mailcheck';
import { fireEvent, render, screen } from 'test-utils';
import EmailTextField, { EmailTextFieldProps } from './EmailTextField';

jest.mock('mailcheck');

function tree(props?: Partial<EmailTextFieldProps>) {
  return render(<EmailTextField id="test-id" label="test" onAcceptSuggestedValue={jest.fn()} {...props} />);
}

describe('EmailTextField', () => {
  const runMock = jest.mocked(Mailcheck.run);

  beforeEach(() => {
    runMock.mockImplementation((options: any) => {
      if (options.email === 'ok') {
        options.empty();
      } else {
        options.suggested({ full: 'suggestion@fundjournalism.org' });
      }

      return undefined;
    });
  });

  it('displays a text input', () => {
    tree();
    expect(screen.getByRole('textbox')).toBeVisible();
  });

  it("doesn't show a suggestion if there are no suggestions from mailcheck, even after losing focus", () => {
    tree({ value: 'ok' });
    expect(screen.queryByText('Did you mean', { exact: false })).not.toBeInTheDocument();
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.queryByText('Did you mean', { exact: false })).not.toBeInTheDocument();
  });

  describe("When there's a suggested change from mailcheck", () => {
    it('shows the suggestion after the field loses focus', () => {
      tree({ value: 'typo' });
      expect(screen.queryByText('Did you mean', { exact: false })).not.toBeInTheDocument();
      fireEvent.blur(screen.getByRole('textbox'));
      expect(screen.getByText('Did you mean', { exact: false })).toBeInTheDocument();
    });

    it('calls onAcceptSuggestedValue and hides the suggestion if the user accepts the suggestion', () => {
      const onAcceptSuggestedValue = jest.fn();

      tree({ onAcceptSuggestedValue, value: 'typo' });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(onAcceptSuggestedValue).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
      expect(onAcceptSuggestedValue.mock.calls).toEqual([['suggestion@fundjournalism.org']]);
      expect(screen.queryByText('Did you mean', { exact: false })).not.toBeInTheDocument();
    });

    it("doesn't call onAcceptSuggestedValue but still hides the suggestion if the user declines it", () => {
      const onAcceptSuggestedValue = jest.fn();

      tree({ onAcceptSuggestedValue, value: 'typo' });
      fireEvent.blur(screen.getByRole('textbox'));
      fireEvent.click(screen.getByRole('button', { name: 'No' }));
      expect(screen.queryByText('Did you mean', { exact: false })).not.toBeInTheDocument();
      expect(onAcceptSuggestedValue).not.toBeCalled();
    });

    it('is accessible', async () => {
      const { container } = tree({ value: 'typo' });

      fireEvent.blur(screen.getByRole('textbox'));
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
