import { useEffect, useState } from 'react';
import * as S from './AmountEditor.styled';

// Util
import validateInputPositiveFloat from 'utilities/validateInputPositiveFloat';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Elememts
import FormErrors from 'elements/inputs/FormErrors';
import PlusButton from 'elements/buttons/PlusButton';
import XButton from 'elements/buttons/XButton';

function AmountEditor() {
  const { elementContent = { options: {} }, setElementContent, page, updatedPage } = useEditInterfaceContext();
  const [frequencies, setFrequencies] = useState([]);
  const [newAmounts, setNewAmounts] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const updatedFreqs = updatedPage?.elements?.find((el) => el.type === 'DFrequency');
    if (updatedFreqs) {
      setFrequencies(updatedFreqs?.content);
    } else {
      const pageFreqs = page?.elements?.find((el) => el.type === 'DFrequency');
      setFrequencies(pageFreqs?.content);
    }
  }, [page, updatedPage]);

  const handleNewAmountsChange = (frequency, value) => {
    if (validateInputPositiveFloat(value)) setNewAmounts({ ...newAmounts, [frequency]: value });
  };

  const addAmount = ({ value: freq }) => {
    const newAmount = parseFloat(newAmounts[freq]);
    if (!newAmount) {
      setErrors({
        ...errors,
        [freq]: 'Please enter an amount greater than zero'
      });
      return;
    }
    const currentAmounts = elementContent.options[freq].map((a) => parseFloat(a)) || [];
    const amounts = [...currentAmounts];
    amounts.push(newAmount);
    if (currentAmounts.includes(newAmount)) {
      setErrors({
        ...errors,
        [freq]: 'Cannot duplicate amounts'
      });
      return;
    }
    setElementContent({
      ...elementContent,
      options: {
        ...elementContent.options,
        [freq]: amounts
      }
    });
    setNewAmounts({ ...newAmounts, [freq]: '' });
    setErrors({});
  };

  const removeAmount = (e, freq, amount) => {
    e.stopPropagation();
    const amountsWithout = [...elementContent.options[freq].filter((a) => a !== amount)];
    if (amountsWithout.length === 0) return;
    setElementContent({
      ...elementContent,
      options: {
        ...elementContent.options,
        [freq]: amountsWithout
      }
    });
  };

  const toggleAllowOther = (_, { checked }) => setElementContent({ ...elementContent, allowOther: checked });

  const handleKeyUp = (e, freq) => {
    if (e.key === 'Enter') {
      addAmount(freq);
    }
  };

  const makeAmountDefault = (freq, amount) => {
    setElementContent({
      ...elementContent,
      defaults: {
        ...(elementContent?.defaults || {}),
        [freq]: amount
      }
    });
  };

  return (
    <S.AmountEditor data-testid="amount-editor">
      <S.HelpTexts>
        <S.HelpText>Click an amount to set a default value</S.HelpText>
        <S.HelpText>Highlighted amounts will be selected by default on live donation pages</S.HelpText>
      </S.HelpTexts>
      <S.FrequenciesList>
        {frequencies ? (
          frequencies.map((freq) => {
            const defaults = elementContent?.defaults || {};
            return (
              <S.FreqGroup key={freq.value}>
                <S.FreqHeading>{freq.displayName}</S.FreqHeading>
                <S.AmountsList>
                  {elementContent?.options[freq.value]
                    ?.sort((a, b) => a - b)
                    .map((amount, i) => {
                      return (
                        <S.AmountItem
                          key={amount + i}
                          onClick={() => makeAmountDefault(freq.value, amount)}
                          isDefault={amountIsDefault(amount, freq.value, defaults)}
                        >
                          {amount}
                          <XButton onClick={(e) => removeAmount(e, freq.value, amount)} />
                        </S.AmountItem>
                      );
                    })}
                </S.AmountsList>
                <S.AmountInputGroup>
                  <S.AmountInput
                    value={newAmounts[freq.value] || ''}
                    onChange={(e) => handleNewAmountsChange(freq.value, e.target.value)}
                    min="0"
                    onKeyUp={(e) => handleKeyUp(e, freq)}
                    data-testid="amount-input"
                  />
                  <PlusButton onClick={() => addAmount(freq)} data-testid="add-button" />
                </S.AmountInputGroup>
                <FormErrors errors={errors[freq.value]} />
              </S.FreqGroup>
            );
          })
        ) : (
          <S.NoFreqs>Add a Frequency element to your page to modify donation amounts</S.NoFreqs>
        )}
        <S.Toggles>
          <S.ToggleWrapper>
            <S.Toggle
              label='Include "other" option'
              checked={elementContent?.allowOther}
              onChange={toggleAllowOther}
              toggle
            />
          </S.ToggleWrapper>
        </S.Toggles>
      </S.FrequenciesList>
    </S.AmountEditor>
  );
}

AmountEditor.for = 'DAmount';

export default AmountEditor;

function amountIsDefault(amount, frequency, defaults) {
  const defaultAmount = defaults[frequency];
  if (defaultAmount) return parseFloat(amount) === parseFloat(defaultAmount);
}
