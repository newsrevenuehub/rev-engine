import { EditablePageContextProvider } from 'hooks/useEditablePage';
import { useParams } from 'react-router-dom';
import PageEditor from './PageEditor';
import PageEditorTopbar from './PageEditorTopbar';

interface PageEditorRouteParams {
  pageId: string;
}

/**
 * Wrapper component that sets up a shared context based on the route params
 * that other components, including <PageEditor>, can use.
 */
export function PageEditorRoute() {
  const { pageId } = useParams<PageEditorRouteParams>();

  return (
    <EditablePageContextProvider pageId={parseInt(pageId)}>
      <PageEditorTopbar />
      <PageEditor />
    </EditablePageContextProvider>
  );
}

export default PageEditorRoute;
