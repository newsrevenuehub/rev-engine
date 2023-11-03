import * as S from './GenericErrorFallback.styled';

function GenericErrorFallback() {
  const handleReload = () => {
    window.location.reload();
  };
  return (
    <S.GenericErrorFallback>
      <p>
        Something went wrong loading this part of the page. <span onClick={handleReload}>Reload?</span>
      </p>
    </S.GenericErrorFallback>
  );
}

export default GenericErrorFallback;
