import { render, screen } from 'test-utils';
import PageSetup from './PageSetup';

jest.mock('components/pageEditor/editInterface/EditInterface', () => {
  const originalModule = jest.requireActual('components/pageEditor/editInterface/EditInterface');
  return {
    __esModule: true,
    ...originalModule,
    useEditInterfaceContext: () => ({
      setPageContent: () => {}
    })
  };
});

jest.mock('elements/inputs/ImageWithPreview', () => {
  return () => <></>;
});
// This would not be my preferred way of handling this, but the two
// test scenarios need different values returned by the mock implementation,
// and trying suggestions found online
// (resetModules before tests, wrap in isolateModules, etc.) did not help, and
// were leading to cryptic error messages.
let mockThankYouRedirectEnabled = false;
jest.mock('components/pageEditor/PageEditor', () => {
  const originalModule = jest.requireActual('components/pageEditor/PageEditor');
  return {
    __esModule: true,
    ...originalModule,
    usePageEditorContext: () => ({
      errors: [],
      page: {
        plan: {
          label: 'Free',
          custom_thank_you_page_enabled: mockThankYouRedirectEnabled
        }
      }
    })
  };
});

it('should disable thank you page URL input and have tooltip if not enabled by plan', async () => {
  render(<PageSetup />);
  const thankYouInput = screen.queryByLabelText('Thank You page link');
  expect(thankYouInput).not.toBeInTheDocument();
});

it('should not disable thank you page URL when feature enabled by plan', async () => {
  mockThankYouRedirectEnabled = true;
  render(<PageSetup />);
  screen.getByLabelText('Thank You page link');
});
