import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../cx';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  /** Shown instead of the hint, in the danger colour, and marks the input invalid. */
  error?: string;
}

/** Stable, CSS-safe id for label/hint wiring (bundle.js used a counter: `tl-f-N`). */
export function useFieldId(id?: string): string {
  const auto = useId().replace(/:/g, '');
  return id || `tl-f-${auto}`;
}

export function TextField({ label, hint, error, className, id: idProp, ...rest }: TextFieldProps) {
  const id = useFieldId(idProp);
  const hintId = `${id}-hint`;
  return (
    <div className={cx('tl-field', error && 'tl-field-error', className)}>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error || hint ? hintId : undefined} {...rest} />
      {error || hint ? (
        <span id={hintId} className="tl-field-hint">
          {error || hint}
        </span>
      ) : null}
    </div>
  );
}
