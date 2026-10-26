/** Language and theme settings plus the Powered by credit (farmer and plucker Me screens). */
import { Card, PoweredBy, ThemeToggle } from '../../design-system';
import { LangToggle } from '../../layouts/PhoneLayout';
import { useT } from '../../lib/i18n';

export function SettingsCard() {
  const t = useT();
  return (
    <>
      <Card titleLevel={2} title={t('shell.settings')} className="fm-stack">
        <div className="fm-setting">
          <span>{t('shell.language')}</span>
          <LangToggle />
        </div>
        <div className="fm-setting">
          <span>{t('common.theme')}</span>
          <ThemeToggle labels={{ light: t('theme.light'), dark: t('theme.dark') }} groupLabel={t('theme.group')} className="fm-theme" />
        </div>
      </Card>
      <div className="fm-powered">
        <PoweredBy />
      </div>
    </>
  );
}
