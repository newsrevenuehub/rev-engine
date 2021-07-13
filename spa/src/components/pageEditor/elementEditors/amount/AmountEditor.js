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

  const removeAmount = ({ value: freq }, amount) => {
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

  const toggleAllowOther = (e) => {
    const allowOther = e.target.checked;
    setElementContent({ ...elementContent, allowOther });
  };

  const toggleOfferPayFees = (e) => {
    const offerPayFees = e.target.checked;
    setElementContent({ ...elementContent, offerPayFees });
  };

  const handleKeyUp = (e, freq) => {
    if (e.key === 'Enter') {
      addAmount(freq);
    }
  };

  return (
    <S.AmountEditor data-testid="amount-editor">
      {frequencies ? (
        frequencies.map((freq) => (
          <S.FreqGroup key={freq.value}>
            <S.FreqHeading>{freq.displayName}</S.FreqHeading>
            <S.AmountsList>
              {elementContent?.options[freq.value]
                ?.sort((a, b) => a - b)
                .map((amount, i) => (
                  <S.AmountItem key={amount + i}>
                    {amount}
                    <XButton onClick={() => removeAmount(freq, amount)} />
                  </S.AmountItem>
                ))}
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
        ))
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

        <S.ToggleWrapper>
          <S.Toggle
            label="Offer option to pay payment provider fees"
            checked={elementContent?.offerPayFees}
            onChange={toggleOfferPayFees}
            toggle
          />
        </S.ToggleWrapper>
      </S.Toggles>
    </S.AmountEditor>
  );
}

AmountEditor.for = 'DAmount';

export default AmountEditor;
