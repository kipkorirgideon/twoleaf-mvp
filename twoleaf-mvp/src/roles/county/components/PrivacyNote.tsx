import { Icon } from '../../../design-system';
import { PRIVACY_NOTE } from '../../../lib/labels';

/** "Farmer-level records stay with each factory." */
export function PrivacyNote({ text = PRIVACY_NOTE }: { text?: string }) {
  return (
    <p className="cty-privacy">
      <Icon name="lock" />
      {text}
    </p>
  );
}
