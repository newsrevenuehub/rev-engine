import { Wrapper, FiveHundred, Description, Content } from './LiveErrorFallback.styled';

function LiveErrorFallback() {
  return (
    <Wrapper data-testid="500-something-wrong">
      <Content>
        <FiveHundred>500</FiveHundred>
        <Description>Something went really wrong. Use your browser's back button and try again.</Description>
      </Content>
    </Wrapper>
  );
}

export default LiveErrorFallback;
