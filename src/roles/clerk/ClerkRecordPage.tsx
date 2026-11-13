/**
 * Record delivery (spec section 9): six steps with a progress indicator and Back on each.
 * The draft lives in <ClerkApp> (RecordDraftContext), so it survives switching tabs.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../design-system';
import { PhoneScreen } from '../../layouts/PhoneLayout';
import { RECORD_STEPS, effectiveStep, useRecordDraft, type RecordStep } from './ClerkContext';
import { ConfirmStep, FarmerStep, LeafSampleStep, PluckerStep, ReceiptStep, WeighStep } from './RecordSteps';
import { CLERK_BASE } from './session';

function stepLabel(step: RecordStep): string {
  return RECORD_STEPS.find((s) => s.step === step)?.label ?? '';
}

export function ClerkRecordPage() {
  const { draft, update, reset } = useRecordDraft();
  const navigate = useNavigate();
  const step = effectiveStep(draft);

  // Leaving the page while the receipt shows starts a fresh delivery next time.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(
    () => () => {
      if (stepRef.current === 6) reset();
    },
    [reset],
  );

  // Move focus to the step heading when the step changes (not on first render),
  // so keyboard and screen-reader users land at the top of the new step.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const prev = (step - 1) as RecordStep;
  const back: string | (() => void) =
    step === 1
      ? CLERK_BASE
      : step === 6
        ? () => {
            reset();
            navigate(CLERK_BASE);
          }
        : () => update({ step: prev });
  const backLabel = step === 1 || step === 6 ? 'Back to Home' : `Back to ${stepLabel(prev).toLowerCase()}`;

  return (
    <PhoneScreen title={step === 6 ? 'Receipt' : 'Record delivery'} back={back} backLabel={backLabel}>
      <div className="clerk-progress">
        <p className="clerk-progress-text" aria-hidden="true">
          Step {step} of {RECORD_STEPS.length}: <strong>{stepLabel(step)}</strong>
        </p>
        <ol aria-hidden="true">
          {RECORD_STEPS.map((s) => (
            <li key={s.step} data-state={s.step < step ? 'done' : s.step === step ? 'current' : 'todo'} />
          ))}
        </ol>
      </div>

      <h2 className="h3" ref={headingRef} tabIndex={-1}>
        <span className="visually-hidden">
          Step {step} of {RECORD_STEPS.length}:{' '}
        </span>
        {step === 6 && draft.saved && !draft.saved.synced ? 'Saved on this device' : STEP_HEADINGS[step]}
      </h2>

      {step === 1 ? <FarmerStep /> : null}
      {step === 2 ? <PluckerStep /> : null}
      {step === 3 ? <WeighStep /> : null}
      {step === 4 ? <LeafSampleStep /> : null}
      {step === 5 ? <ConfirmStep /> : null}
      {step === 6 ? <ReceiptStep /> : null}

      {step > 1 && step < 6 ? (
        <Button variant="ghost" icon="x" fullWidth onClick={reset}>
          Start over
        </Button>
      ) : null}
    </PhoneScreen>
  );
}

const STEP_HEADINGS: Record<RecordStep, string> = {
  1: 'Who is delivering?',
  2: 'Who picked this leaf?',
  3: 'Weigh the leaf',
  4: 'Score a leaf sample',
  5: 'Check and save',
  6: 'Delivery saved',
};
