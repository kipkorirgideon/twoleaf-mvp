import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cx } from '../cx';
import { useFieldId } from './TextField';

/**
 * Addition for the MVP (not in bundle.js): a labelled <select> with the same
 * structure and `tl-field` classes as TextField. bundle.css already styles
 * `.tl-field select`.
 */
export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  /** The <option> elements. */
  children?: ReactNode;
}

export function SelectField({ label, hint, error, className, id: idProp, children, ...rest }: SelectFieldProps) {
  const id = useFieldId(idProp);
  const hintId = `${id}-hint`;
  return (
    <div className={cx('tl-field', error && 'tl-field-error', className)}>
      <label htmlFor={id}>{label}</label>
      <select id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error || hint ? hintId : undefined} {...rest}>
        {children}
      </select>
      {error || hint ? (
        <span id={hintId} className="tl-field-hint">
          {error || hint}
        </span>
      ) : null}
    </div>
  );
}
