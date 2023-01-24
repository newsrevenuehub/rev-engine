import PropTypes, { InferProps } from 'prop-types';

import {
  Flex,
  Header,
  Content,
  Form,
  LineInput,
  HalfLineInputWrapper,
  AccentWrapper,
  AccentLineWrapper,
  Accent,
  Button
} from './ColorPickerPreview.styled';

export type ColorPickerPreviewProps = InferProps<typeof ColorPickerPreviewPropTypes>;

const ColorPickerPreview = ({
  className,
  headerColor,
  backgroundColor,
  panelBackgroundColor,
  buttonsColor,
  accentsColor,
  // Temporary
  inputBackgroundColor,
  inputBorderColor
}: ColorPickerPreviewProps) => (
  <Flex className={className!}>
    <Header $color={headerColor} data-testid="headerColor" />
    <Content $color={backgroundColor} data-testid="backgroundColor">
      <Form $color={panelBackgroundColor} data-testid="panelBackgroundColor">
        <LineInput $color={inputBackgroundColor} data-testid="inputBackgroundColor" $border={inputBorderColor} />
        <HalfLineInputWrapper>
          <LineInput $color={inputBackgroundColor} data-testid="inputBackgroundColor" $border={inputBorderColor} />
          <LineInput $color={inputBackgroundColor} data-testid="inputBackgroundColor" $border={inputBorderColor} />
        </HalfLineInputWrapper>
        <AccentWrapper>
          {[0, 0].map((_, index) => (
            <AccentLineWrapper key={index}>
              <Accent $color={accentsColor} data-testid="accentsColor" />
              <LineInput $color={inputBackgroundColor} data-testid="inputBackgroundColor" $border={inputBorderColor} />
            </AccentLineWrapper>
          ))}
        </AccentWrapper>
        <Button $color={buttonsColor} data-testid="buttonsColor" />
      </Form>
    </Content>
  </Flex>
);

const ColorPickerPreviewPropTypes = {
  className: PropTypes.string,
  headerColor: PropTypes.string.isRequired,
  backgroundColor: PropTypes.string.isRequired,
  panelBackgroundColor: PropTypes.string.isRequired,
  buttonsColor: PropTypes.string.isRequired,
  accentsColor: PropTypes.string.isRequired,
  // Temporary
  inputBackgroundColor: PropTypes.string,
  inputBorderColor: PropTypes.string
};

ColorPickerPreview.propTypes = ColorPickerPreviewPropTypes;

export default ColorPickerPreview;
