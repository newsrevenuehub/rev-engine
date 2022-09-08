import { useEffect, useState } from 'react';
import orderBy from 'lodash.orderby';

// Children
import { Content } from 'components/content/pages/Pages.styled';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import Hero from 'components/common/Hero';
import NewButton from 'components/common/Button/NewButton';
import { BUTTON_TYPE } from 'constants/buttonConstants';
import EditButton from 'components/common/Button/EditButton';

export const filterStyles = (stylesRaw, qry) => {
  return qry
    ? orderBy(
        stylesRaw.filter((style) => {
          return (
            style.name.toLowerCase().indexOf(qry) !== -1 ||
            (style.revenue_program &&
              (style.revenue_program.slug.toLowerCase().indexOf(qry) !== -1 ||
                style.revenue_program.name.toLowerCase().indexOf(qry) !== -1))
          );
        }),
        'name'
      )
    : orderBy(stylesRaw, 'name');
};

function Styles({ setShowEditStylesModal, setStyleToEdit, fetchStyles, styles }) {
  const [styleSearchQuery, setStyleSearchQuery] = useState([]);

  // Fetch styles
  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const handleStyleSelect = (style) => {
    setStyleToEdit(style);
    setShowEditStylesModal(true);
  };

  const stylesFiltered = filterStyles(styles, styleSearchQuery);

  return (
    <GenericErrorBoundary>
      <Hero
        title="Customize"
        subtitle="Create custom styles and branding elements to help streamline the creation of new contribution pages. Create a new style by selecting the ‘New Style’ button below."
        placeholder="Styles"
        onChange={setStyleSearchQuery}
      />
      <Content data-testid="styles-list">
        <NewButton type={BUTTON_TYPE.STYLE} onClick={() => setShowEditStylesModal(true)} />
        {!!styles.length &&
          stylesFiltered.map((style) => (
            <EditButton
              key={style.id}
              name={style.name}
              style={style}
              type={BUTTON_TYPE.STYLE}
              onClick={() => handleStyleSelect(style)}
            />
          ))}
      </Content>
    </GenericErrorBoundary>
  );
}

export default Styles;
