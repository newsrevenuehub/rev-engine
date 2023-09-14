import * as Sentry from '@sentry/react';
import { useCallback } from 'react';

export function useAmountAuditing() {
  const auditPaymentCreation = useCallback((amount: number) => {
    if (amount < 2) {
      Sentry.captureException(new Error(`Payment of $${amount} about to be created.`));
    }
  }, []);
  const auditAmountChange = useCallback((amount: number) => {
    Sentry.addBreadcrumb({
      category: 'rev-engine',
      level: 'debug',
      message: `Contribution amount changed to ${amount}`
    });
  }, []);
  const auditFrequencyChange = useCallback((frequency: any) => {
    Sentry.addBreadcrumb({
      category: 'rev-engine',
      level: 'debug',
      message: `Contribution frequency changed to ${frequency}`
    });
  }, []);
  const auditPayFeesChange = useCallback((paysFees: boolean) => {
    Sentry.addBreadcrumb({
      category: 'rev-engine',
      level: 'debug',
      message: `Pays fees changed to ${paysFees}`
    });
  }, []);

  return { auditPaymentCreation, auditAmountChange, auditFrequencyChange, auditPayFeesChange };
}
