import * as S from './GenericErrorFallback.styled';

function GenericErrorFallback() {
  const handleReload = () => {
    window.location.reload();
  };

  /* eslint-disable jsx-a11y/no-static-element-interactions  */
  /* eslint-disable jsx-a11y/click-events-have-key-events */
  return (
    <S.GenericErrorFallback>
      <p>
        Something went wrong loading this part of the page. <span onClick={handleReload}>Reload?</span>
      </p>
    </S.GenericErrorFallback>
  );
}

export default GenericErrorFallback;
