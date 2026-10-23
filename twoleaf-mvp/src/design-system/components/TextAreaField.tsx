import type { TextareaHTMLAttributes } from 'react';
import { cx } from '../cx';
import { useFieldId } from './TextField';

/**
 * Addition for the MVP (not in bundle.js): a labelled <textarea> for notes and
 * reasons, with the same structure and `tl-field` classes as TextField.
 */
export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextAreaField({ label, hint, error, className, id: idProp, rows = 3, ...rest }: TextAreaFieldProps) {
  const id = useFieldId(idProp);
  const hintId = `${id}-hint`;
  return (
    <div className={cx('tl-field', error && 'tl-field-error', className)}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={rows} aria-invalid={error ? 'true' : undefined} aria-describedby={error || hint ? hintId : undefined} {...rest} />
      {error || hint ? (
        <span id={hintId} className="tl-field-hint">
          {error || hint}
        </span>
      ) : null}
    </div>
  );
}
