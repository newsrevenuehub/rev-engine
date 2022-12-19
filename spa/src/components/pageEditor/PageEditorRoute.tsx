import { EditablePageContextProvider } from 'hooks/useEditablePage';
import { useParams } from 'react-router-dom';
import PageEditor from './PageEditor';
import PageEditorTopbar from './PageEditorTopbar';

interface PageEditorRouteParams {
  pageSlug: string;
  revProgramSlug: string;
}

/**
 * Wrapper component that sets up a shared context based on the route params
 * that other components, including <PageEditor>, can use.
 */
export function PageEditorRoute() {
  const { pageSlug, revProgramSlug } = useParams<PageEditorRouteParams>();

  return (
    <EditablePageContextProvider pageSlug={pageSlug} revenueProgramSlug={revProgramSlug}>
      <PageEditorTopbar />
      <PageEditor />
    </EditablePageContextProvider>
  );
}

export default PageEditorRoute;
