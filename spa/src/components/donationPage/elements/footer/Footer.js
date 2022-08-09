import * as S from './Footer.styled';

function Footer({ page }) {
  return (
    <S.Footer data-testid="donation-page-footer">
      <S.Content>
        <a href="https://fundjournalism.org/" target="_blank" rel="noopener noreferrer">
          What is fundjournalism.org?
        </a>
        <p>
          &copy; {new Date().getFullYear()} {page?.revenue_program.name}
        </p>
      </S.Content>
    </S.Footer>
  );
}

export default Footer;
