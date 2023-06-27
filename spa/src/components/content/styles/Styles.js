import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAlert } from 'react-alert';
import orderBy from 'lodash.orderby';

// Children
import { Content } from 'components/content/pages/Pages.styled';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import Hero from 'components/common/Hero';
import { NewButton } from 'components/common/Button/NewButton';
import { StyleButton } from 'components/common/Button/StyleButton';
import { GENERIC_ERROR } from 'constants/textConstants';
import axios from 'ajax/axios';
import { LIST_STYLES } from 'ajax/endpoints';
import GlobalLoading from 'elements/GlobalLoading';
import useUser from 'hooks/useUser';
import { USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';
import { isStringInStringCaseInsensitive } from 'utilities/isStringInString';

export const filterStyles = (stylesRaw, qry) => {
  return qry
    ? orderBy(
        stylesRaw.filter((style) => {
          return (
            isStringInStringCaseInsensitive(style.name, qry) ||
            (style.revenue_program &&
              (isStringInStringCaseInsensitive(style.revenue_program.slug, qry) ||
                isStringInStringCaseInsensitive(style.revenue_program.name, qry)))
          );
        }),
        'name'
      )
    : orderBy(stylesRaw, 'name');
};

async function fetchStyles() {
  const { data } = await axios.get(LIST_STYLES);

  return data;
}

function Styles({ setShowEditStylesModal, setStyleToEdit }) {
  const { user, isLoading: userLoading } = useUser();
  const alert = useAlert();
  const [styleSearchQuery, setStyleSearchQuery] = useState('');

  const { data: styles, isLoading: stylesLoading } = useQuery(['styles'], fetchStyles, {
    initialData: [],
    onError: () => alert.error(GENERIC_ERROR)
  });

  const handleStyleSelect = (style) => {
    setStyleToEdit(style);
    setShowEditStylesModal(true);
  };

  const stylesFiltered = filterStyles(styles, styleSearchQuery);

  const addStyleButtonShouldBeDisabled = () => {
    if ([USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE].includes(user?.role_type?.[0])) {
      return false;
    }
    const stylesLimit = user?.organizations?.[0]?.plan?.style_limit ?? 0;
    return styles.length + 1 > stylesLimit;
  };

  const isLoading = userLoading || stylesLoading;

  return (
    <GenericErrorBoundary>
      {isLoading && <GlobalLoading />}
      <Hero
        title="Customize"
        subtitle="Create custom styles and branding elements to help streamline the creation of new contribution pages. Create a new style by selecting the ‘New Style’ button below."
        placeholder="Styles"
        onChange={setStyleSearchQuery}
      />
      <Content data-testid="styles-list">
        <NewButton
          ariaLabel="New Style"
          disabled={addStyleButtonShouldBeDisabled()}
          label="New Style"
          onClick={() => setShowEditStylesModal(true)}
          previewHeight={70}
          data-testid="new-style-button"
        />
        {/* TODO: [DEV-2559] Make styles be pre-selected and disabled */}
        {!!styles.length &&
          stylesFiltered.map((style, index) => (
            <StyleButton
              key={`${style.id}${styles.name}${index}`}
              name={style.name}
              style={style}
              onClick={() => handleStyleSelect(style)}
            />
          ))}
      </Content>
    </GenericErrorBoundary>
  );
}

export default Styles;
