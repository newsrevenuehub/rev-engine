import { Helmet } from 'react-helmet';
import { render } from 'test-utils';

import PageTitle from './PageTitle';

describe('Page Title component', () => {
  test('default document header', async () => {
    render(<PageTitle />);
    const helmet = Helmet.peek();
    expect(helmet.title).toBe('RevEngine');
  });

  test('custom document header is updated', async () => {
    render(<PageTitle title="Contributions" />);
    let helmet = Helmet.peek();
    expect(helmet.title).toBe('Contributions | RevEngine');

    render(<PageTitle title="Edit" />);
    helmet = Helmet.peek();
    expect(helmet.title).toBe('Edit | RevEngine');
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
