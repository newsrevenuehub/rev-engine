import { useEffect, useState } from 'react';
import * as S from './AmountEditor.styled';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Elememts
import PlusButton from 'elements/buttons/PlusButton';
import XButton from 'elements/buttons/XButton';

function AmountEditor() {
  const { elementContent = { options: {} }, setElementContent, page, updatedPage } = useEditInterfaceContext();
  const [frequencies, setFrequencies] = useState([]);
  const [newAmounts, setNewAmounts] = useState({});

  useEffect(() => {
    const updatedFreqs = updatedPage?.elements?.find((el) => el.type === 'DFrequency');
    if (updatedFreqs) {
      setFrequencies(updatedFreqs?.content);
    } else {
      const pageFreqs = page?.elements?.find((el) => el.type === 'DFrequency');
      setFrequencies(pageFreqs?.content);
    }
  }, [page, updatedPage]);

  const addAmount = ({ value: freq }) => {
    const newAmount = newAmounts[freq];
    if (!newAmount) return;
    const currentAmounts = elementContent.options[freq] || [];
    const amounts = [...currentAmounts];
    amounts.push(newAmount);
    if (currentAmounts.includes(newAmounts[freq])) return;
    setElementContent({
      ...elementContent,
      options: {
        ...elementContent.options,
        [freq]: amounts
      }
    });
    setNewAmounts({ ...newAmounts, [freq]: '' });
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
      <S.HelpText>Highlighted amounts will be selected by default</S.HelpText>
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
                    type="number"
                    value={newAmounts[freq.value] || ''}
                    onChange={(e) => setNewAmounts({ ...newAmounts, [freq.value]: e.target.value })}
                    min="0"
                    onKeyUp={(e) => handleKeyUp(e, freq)}
                    data-testid="amount-input"
                  />
                  <PlusButton onClick={() => addAmount(freq)} data-testid="add-button" />
                </S.AmountInputGroup>
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
