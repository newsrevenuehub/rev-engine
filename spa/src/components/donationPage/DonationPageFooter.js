import * as S from './DonationPageFooter.styled';

function DonationPageFooter({ page }) {
  return (
    <S.DonationPageFooter data-testid="donation-page-footer">
      <S.Content>
        <a href="https://fundjournalism.org/" target="_blank" rel="noopener noreferrer">
          What is fundjournalism.org?
        </a>
        <p>
          &copy; {new Date().getFullYear()} {page?.organization_name}
        </p>
      </S.Content>
    </S.DonationPageFooter>
  );
}

export default DonationPageFooter;
