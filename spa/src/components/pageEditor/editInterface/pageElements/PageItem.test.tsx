import userEvent from '@testing-library/user-event';
import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import { ContributionPageElement, PageElementType } from 'hooks/useContributionPage';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PageItem, { PageItemProps } from './PageItem';

const dynamicElements = {
  ...dynamicPageElements,
  ...dynamicSidebarElements
} as Record<PageElementType, Pick<ContributionPageElement, 'type' | 'displayName' | 'description' | 'required'>>;

describe('PageItem', () => {
  function tree(props?: Partial<PageItemProps>) {
    return render(<PageItem element={{ type: 'DRichText' }} {...props} />);
  }

  it('does not render buttons if isStatic = true', () => {
    tree({ isStatic: true });
    expect(screen.queryByLabelText('Edit DRichText block')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove DRichText block')).not.toBeInTheDocument();
  });

  it('disables item if disabled = true', () => {
    tree({ disabled: true });
    expect(screen.getByTestId('page-item-DRichText')).toHaveStyle({ cursor: 'not-allowed' });
  });

  describe.each(Object.entries(dynamicElements))('%s', (key, element) => {
    it(`renders element`, () => {
      tree({ element });
      expect(screen.getByTestId(`page-item-${element.type}`)).toBeInTheDocument();
    });

    it('calls onClick when item is clicked', () => {
      const onClick = jest.fn();
      tree({ element, onClick });
      expect(onClick).not.toHaveBeenCalled();
      userEvent.click(screen.getByTestId(`page-item-${element.type}`));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders displayName', () => {
      tree({ element });
      expect(element.displayName).not.toEqual(undefined);
      expect(screen.getByText(element.displayName!)).toBeInTheDocument();
    });

    it('renders description if showDescription prop is true', () => {
      tree({ element, showDescription: true });
      expect(element.description).not.toEqual(undefined);
      expect(screen.getByText(element.description!)).toBeInTheDocument();
    });

    it("doesn't render description if showDescription prop is false", () => {
      tree({ element, showDescription: false });
      expect(element.description).not.toEqual(undefined);
      expect(screen.queryByText(element.description!)).not.toBeInTheDocument();
    });

    it('renders edit icon', () => {
      tree({ element, handleItemEdit: jest.fn() });
      expect(screen.getByRole('button', { name: `Edit ${element.displayName}` })).toBeEnabled();
    });

    it('calls handleItemEdit when edit icon is clicked', () => {
      const handleItemEdit = jest.fn();
      tree({ element, handleItemEdit });
      expect(handleItemEdit).not.toHaveBeenCalled();
      userEvent.click(screen.getByRole('button', { name: `Edit ${element.displayName}` }));
      expect(handleItemEdit).toHaveBeenCalledTimes(1);
    });

    it('renders delete icon only if required = False', () => {
      tree({ element, handleItemDelete: jest.fn() });
      expect.assertions(1);
      if (element.required) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(screen.queryByRole('button', { name: `Remove ${element.displayName}` })).not.toBeInTheDocument();
      } else {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(screen.getByRole('button', { name: `Remove ${element.displayName}` })).toBeEnabled();
      }
    });

    it('calls handleItemDelete when delete icon is clicked', () => {
      const handleItemDelete = jest.fn();
      tree({ element, handleItemDelete });
      let calledTimes = -1;
      expect(handleItemDelete).not.toHaveBeenCalled();
      if (!element.required) {
        userEvent.click(screen.getByRole('button', { name: `Remove ${element.displayName}` }));
        calledTimes = 1;
      } else {
        calledTimes = 0;
      }
      expect(handleItemDelete).toHaveBeenCalledTimes(calledTimes);
    });

    it('is accessible', async () => {
      const { container } = tree({ element });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
