import { render, screen } from 'test-utils';
import { EditInterfaceContext } from '../EditInterface';
import PageSettings from './PageSettings';
import { PageEditorContext } from 'components/pageEditor/PageEditor';

// This component uses URL.revokeObjectURL() which jsdom doesn't seem to
// support.
jest.mock('elements/inputs/ImageWithPreview', () => () => null);

function tree(page) {
  return render(
    <EditInterfaceContext.Provider value={{ setPageContent: jest.fn() }}>
      <PageEditorContext.Provider
        value={{
          errors: [],
          page: {
            header_link: 'mock-header-link',
            heading: 'mock-heading',
            plan: { label: 'free' },
            post_thank_you_redirect: 'mock-post-thank-you-redirect',
            label: 'Free',
            thank_you_redirect: 'mock-thank-you-redirect',
            ...page
          }
        }}
      >
        <PageSettings />
      </PageEditorContext.Provider>
    </EditInterfaceContext.Provider>
  );
}

it('should disable thank you page URL input and have tooltip if not enabled by plan', () => {
  tree({ plan: { custom_thank_you_page_enabled: false, label: 'free' } });
  expect(screen.queryByLabelText('Thank You page link')).not.toBeInTheDocument();
});

it('should not disable thank you page URL when feature enabled by plan', () => {
  tree({ plan: { custom_thank_you_page_enabled: true, label: 'free' } });
  expect(screen.getByLabelText('Thank You page link')).toBeInTheDocument();
});
