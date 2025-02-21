import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import { DonationPageContext, UsePageProps } from 'components/donationPage/DonationPage';
import { ReasonElement } from 'hooks/useContributionPage';
import DReason, { DReasonProps } from './DReason';

jest.mock('./ReasonFields');
jest.mock('./TributeFields');

const mockElement: ReasonElement = {
  type: 'DReason',
  uuid: 'uuid',
  content: {
    askHonoree: true,
    askInMemoryOf: true,
    askReason: true,
    reasons: ['reason 1', 'reason 2']
  },
  requiredFields: []
};

function tree(props?: Partial<DReasonProps>, pageContext?: Partial<UsePageProps>) {
  return render(
    <DonationPageContext.Provider
      value={
        {
          errors: {},
          page: {},
          ...pageContext
        } as any
      }
    >
      <ul>
        <DReason element={mockElement} {...props} />
      </ul>
    </DonationPageContext.Provider>
  );
}

describe('DReason', () => {
  describe('Reason for giving fields', () => {
    it('shows them if the element has askReason set to true', () => {
      tree();
      expect(screen.getByTestId('mock-reason-fields')).toBeInTheDocument();
    });

    it('hides them if the element has askReason set to false', () => {
      tree({ element: { ...mockElement, content: { ...mockElement.content, askReason: false } } });
      expect(screen.queryByTestId('mock-reason-fields')).not.toBeInTheDocument();
    });

    it('passes through preset reasons', () => {
      tree();
      expect(screen.getByTestId('mock-reason-fields').dataset.options).toBe(
        JSON.stringify(mockElement.content.reasons)
      );
    });

    it('passes through reason_for_giving errors', () => {
      tree({}, { errors: { reason_for_giving: 'mock-error' } });
      expect(screen.getByTestId('mock-reason-fields').dataset.error).toBe('mock-error');
    });

    it.each([['true', ['reason_for_giving'], ['false', []]]])(
      'makes it required if required is %s',
      (required, requiredFields) => {
        tree({ element: { ...mockElement, requiredFields } });
        expect(screen.getByTestId('mock-reason-fields').dataset.required).toBe(required);
      }
    );

    it('handles state for chosen option', () => {
      tree();
      expect(screen.getByTestId('mock-reason-fields').dataset.selectedOption).toBe('');
      fireEvent.click(screen.getByText('onChangeOption'));
      expect(screen.getByTestId('mock-reason-fields').dataset.selectedOption).toBe('mock-change');
    });

    it('handles state for entered text', () => {
      tree();
      expect(screen.getByTestId('mock-reason-fields').dataset.text).toBe('');
      fireEvent.click(screen.getByText('onChangeText'));
      expect(screen.getByTestId('mock-reason-fields').dataset.text).toBe('mock-change');
    });
  });

  describe('Tribute fields', () => {
    it.each([[{ askHonoree: true }], [{ askInMemoryOf: true }], [{ askHonoree: true, askInMemoryOf: true }]])(
      'shows them if element content is %s',
      (content) => {
        tree({ element: { ...mockElement, content: { ...mockElement.content, ...content } } });
        expect(screen.getByTestId('mock-tribute-fields')).toBeInTheDocument();
      }
    );

    it('hides them if neither property is set', () => {
      tree({
        element: { ...mockElement, content: { ...mockElement.content, askHonoree: false, askInMemoryOf: false } }
      });
      expect(screen.queryByTestId('mock-tribute-fields')).not.toBeInTheDocument();
    });

    it.each([['honoree', 'inMemoryOf']])('passes through errors when tribute type is %s', (tributeType) => {
      tree({}, { errors: { [tributeType === 'honoree' ? 'honoree' : 'in_memory_of']: 'mock-error' } });
      expect(screen.getByTestId('mock-tribute-fields').dataset.error).toBe(undefined);
      fireEvent.click(screen.getByText(`onChangeTributeType ${tributeType}`));
      expect(screen.getByTestId('mock-tribute-fields').dataset.error).toBe('mock-error');
    });

    it.each([
      [{ askHonoree: true, askInMemoryOf: false }],
      [{ askHonoree: false, askInMemoryOf: true }],
      [{ askHonoree: true, askInMemoryOf: true }]
    ])('passes through element content %s', (content) => {
      tree({ element: { ...mockElement, content: { ...mockElement.content, ...content } } });
      expect(screen.getByTestId('mock-tribute-fields').dataset.askHonoree).toBe(content.askHonoree.toString());
      expect(screen.getByTestId('mock-tribute-fields').dataset.askInMemoryOf).toBe(content.askInMemoryOf.toString());
    });

    it('handles state for tribute type', () => {
      tree();
      expect(screen.getByTestId('mock-tribute-fields').dataset.tributeType).toBeUndefined();
      fireEvent.click(screen.getByText('onChangeTributeType honoree'));
      expect(screen.getByTestId('mock-tribute-fields').dataset.tributeType).toBe('honoree');
      fireEvent.click(screen.getByText('onChangeTributeType inMemoryOf'));
      expect(screen.getByTestId('mock-tribute-fields').dataset.tributeType).toBe('inMemoryOf');
    });

    it('handles state for tribute name', () => {
      tree();
      expect(screen.getByTestId('mock-tribute-fields').dataset.tributeName).toBe('');
      fireEvent.click(screen.getByText('onChangeTributeName'));
      expect(screen.getByTestId('mock-tribute-fields').dataset.tributeName).toBe('mock-change');
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
