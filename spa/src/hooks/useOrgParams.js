import { useParams } from 'react-router-dom';

function useOrgParams() {
  const { orgSlug, revProgramSlug } = useParams();
  return Object.freeze({ orgSlug, revProgramSlug });
}

export default useOrgParams;
