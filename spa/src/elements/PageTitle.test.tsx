import { Helmet } from 'react-helmet';
import { render } from 'test-utils';

import PageTitle, { PageTitleProps } from './PageTitle';

describe('Page Title component', () => {
  function tree(props?: Partial<PageTitleProps>) {
    return render(<PageTitle {...props} />);
  }

  test('should render default document header', async () => {
    tree();
    const helmet = Helmet.peek();
    expect(helmet.title).toBe('RevEngine');
  });

  test('should render custom document header is updated', async () => {
    tree({ title: 'Contributions' });
    let helmet = Helmet.peek();
    expect(helmet.title).toBe('Contributions | RevEngine');

    tree({ title: 'Edit' });
    helmet = Helmet.peek();
    expect(helmet.title).toBe('Edit | RevEngine');
  });

  test('should not render "RevEngine" if hideRevEngine = true', async () => {
    tree({ hideRevEngine: true, title: 'mock-title' });
    let helmet = Helmet.peek();
    expect(helmet.title).toBe('mock-title');
  });

  test('document header is the innermost title', async () => {
    render(
      <div>
        <PageTitle title="Outer" />
        <div>
          <PageTitle title="Inner" />
        </div>
      </div>
    );

    const helmet = Helmet.peek();
    expect(helmet.title).toBe('Inner | RevEngine');
  });
});
