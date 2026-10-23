import { useQuery } from '../../api';
import { Card, IdTag, ThemeToggle } from '../../design-system';
import { LangToggle, PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { useT } from '../../lib/i18n';
import { usePluckerSession } from './session';

/** Phase 3 placeholder for Me (phase 6). */
export function PluckerMePage() {
  const t = useT();
  const { pluckerUuid } = usePluckerSession();
  const q = useQuery((api) => api.getPluckerProfile(pluckerUuid), [pluckerUuid]);
  const p = q.data;
  return (
    <PhoneScreen title={t('tab.me')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} rows={2} /> : null}
      {q.error && !p ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {p ? (
        <>
          <Card title={p.name} subtitle={t('common.twoLeafId')}>
            <IdTag value={p.readableId} />
          </Card>
          <Card title={t('common.farmersWorkedFor')}>
            <ul className="phone-muted">
              {p.farmers.map((f) => (
                <li key={f.uuid}>{f.name}</li>
              ))}
            </ul>
          </Card>
          <Card title={t('shell.language')}>
            <LangToggle />
          </Card>
          <Card title={t('common.theme')}>
            <ThemeToggle />
          </Card>
          <p className="phone-muted">{t('shell.comingSoon')}</p>
        </>
      ) : null}
    </PhoneScreen>
  );
}
