import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { EditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import RichTextElementEditor from './RichTextElementEditor';
import userEvent from '@testing-library/user-event';

jest.mock('components/base/RichTextEditor/RichTextEditor');
jest.mock('utilities/draftJs');

describe('RichTextElementEditor', () => {
  // We don't have a type definition for this yet (and it's a big context).

  function tree(context?: any) {
    return render(
      <EditInterfaceContext.Provider value={{ elementContent: 'mock-content', ...context }}>
        <RichTextElementEditor />
      </EditInterfaceContext.Provider>
    );
  }

  // See the mock for utilities/draftJs for where these mock values are coming
  // from.

  it('displays a rich text editor for the element content in context', () => {
    const elementContent = '<b>test</b>';

    tree({ elementContent });
    expect(screen.getByTestId('mock-rich-text-editor').dataset.editorState).toEqual(
      JSON.stringify({ mockEditorState: elementContent })
    );
  });

  it('sets the element content in context when a change occurs in the rich text editor', () => {
    const setElementContent = jest.fn();

    tree({ setElementContent });
    expect(setElementContent).not.toBeCalled();
    userEvent.click(screen.getByText('onEditorStateChange'));
    expect(setElementContent.mock.calls).toEqual([[JSON.stringify({ mockEditorStateChange: true })]]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
