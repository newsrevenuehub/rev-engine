import * as S from './Footer.styled';

function Footer({ rpName }) {
  return (
    <S.Footer data-testid="donation-page-footer">
      <S.Content>
        <a href="https://fundjournalism.org/" target="_blank" rel="noopener noreferrer">
          What is fundjournalism.org?
        </a>
        <p>
          &copy; {new Date().getFullYear()} {rpName}
        </p>
      </S.Content>
    </S.Footer>
  );
}

export default Footer;
