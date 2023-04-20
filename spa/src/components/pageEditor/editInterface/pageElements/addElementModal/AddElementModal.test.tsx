import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import AddElementModal, { AddElementModalProp, defaultContent, defaultRequiredFields } from './AddElementModal';
import userEvent from '@testing-library/user-event';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { ContributionPage, ContributionPageElement } from 'hooks/useContributionPage';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterfaceContextProvider';
import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';

jest.mock('components/pageEditor/editInterface/EditInterfaceContextProvider');
jest.mock('elements/modal/Modal');
jest.mock('components/pageEditor/editInterface/pageElements/PageItem');
jest.mock('hooks/useEditablePage', () => ({
  useEditablePageContext: jest.fn()
}));

const dynamicElements = {
  ...dynamicPageElements,
  ...dynamicSidebarElements
};

const page = {
  plan: {
    sidebar_elements: ['DRichText', 'DImage'],
    page_elements: ['DAmount', 'DDonorAddress', 'DDonorInfo', 'DFrequency', 'DPayment', 'DReason', 'DRichText']
  }
} as any as ContributionPage;

const elements = page.plan.page_elements.map((element) => ({
  type: element
})) as ContributionPageElement[];

const sidebarElements = page.plan.sidebar_elements.map((element) => ({
  type: element
})) as ContributionPageElement[];

describe('AddElementModal', () => {
  const useEditInterfaceContextMock = jest.mocked(useEditInterfaceContext);
  const useEditablePageContextMock = jest.mocked(useEditablePageContext);

  function tree(props?: Partial<AddElementModalProp>) {
    return render(<AddElementModal addElementModalOpen setAddElementModalOpen={jest.fn()} {...props} />);
  }

  beforeEach(() => {
    useEditInterfaceContextMock.mockReturnValue({
      elements,
      sidebarElements,
      setElements: jest.fn(),
      setSidebarElements: jest.fn()
    } as any);
    useEditablePageContextMock.mockReturnValue({
      page,
      deletePage: jest.fn(),
      isError: false,
      isLoading: false,
      setPageChanges: jest.fn(),
      pageChanges: page
    });
  });

  it('renders nothing if addElementModalOpen = false', () => {
    tree({ addElementModalOpen: false });
    expect(screen.getByTestId('modal-closed')).toBeInTheDocument();
    expect(screen.queryByTestId('modal-open')).not.toBeInTheDocument();
  });

  it('renders modal & content if addElementModalOpen = true', () => {
    tree();
    expect(screen.getByTestId('modal-open')).toBeInTheDocument();
    expect(screen.getByTestId('add-page-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('modal-closed')).not.toBeInTheDocument();
  });

  it('calls setAddElementModalOpen if modal onClose is clicked', () => {
    const setAddElementModalOpen = jest.fn();
    tree({ setAddElementModalOpen });
    expect(setAddElementModalOpen).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(setAddElementModalOpen).toBeCalledTimes(1);
    expect(setAddElementModalOpen).toBeCalledWith(false);
  });

  describe.each([
    ['element', elements, undefined],
    ['sidebar element', sidebarElements, { destination: 'sidebar' }]
  ])('%ss', (name, elementList, props) => {
    it(`renders the correct number of ${name}s`, () => {
      tree(props);
      expect(screen.getAllByTestId('page-item-element')).toHaveLength(elementList.length);
    });

    describe.each(elementList)(`${name}: %s`, (element) => {
      it(`renders the correct ${name}`, () => {
        tree(props);
        expect.assertions(1);
        if (dynamicElements[element.type].unique) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(screen.getByTestId(`onClick-${element.type}`)).toBeDisabled();
        } else {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(screen.getByTestId(`onClick-${element.type}`)).toBeEnabled();
        }
      });

      it(`updates set${name === 'sidebar element' ? 'Sidebar' : ''}Elements correctly`, () => {
        const setElements = jest.fn();
        const setSidebarElements = jest.fn();
        const setAddElementModalOpen = jest.fn();

        useEditInterfaceContextMock.mockReturnValue({
          elements: ['mock-element'],
          sidebarElements: ['mock-sidebar element'],
          setElements,
          setSidebarElements
        } as any);
        tree({ ...props, setAddElementModalOpen });

        expect(setAddElementModalOpen).not.toBeCalled();

        const currentFunc = name === 'sidebar element' ? setSidebarElements : setElements;
        expect(currentFunc).not.toBeCalled();
        userEvent.click(screen.getByTestId(`onClick-${element.type}`));
        expect(currentFunc).toBeCalledTimes(1);
        expect(currentFunc).toBeCalledWith([
          `mock-${name}`,
          expect.objectContaining({
            type: element.type,
            uuid: expect.any(String),
            content: defaultContent[element.type] ?? undefined,
            requiredFields: defaultRequiredFields[element.type] ?? []
          })
        ]);

        expect(setAddElementModalOpen).toBeCalledTimes(1);
        expect(setAddElementModalOpen).toBeCalledWith(false);
      });

      it('is accessible', async () => {
        const { container } = tree(props);

        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });
});
