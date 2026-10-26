import { useQuery } from '../../api';
import { Card, IdTag } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { useLocalFormat, useT } from '../../lib/i18n';
import { QrCard } from '../farmer/QrCard';
import { SettingsCard } from '../farmer/SettingsCard';
import { usePluckerSession } from './session';

/** Me: name, ID, phone, linked farmers, QR card, settings, Powered by. */
export function PluckerMePage() {
  const t = useT();
  const f = useLocalFormat();
  const { pluckerUuid } = usePluckerSession();
  const q = useQuery((api) => api.getPluckerProfile(pluckerUuid), [pluckerUuid]);
  const p = q.data;
  return (
    <PhoneScreen title={t('tab.me')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} rows={2} /> : null}
      {q.error && !p ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {p ? (
        <>
          <Card className="fm-stack">
            <p className="fm-greeting">{p.name}</p>
            <div className="fm-centre-head">
              <span className="fm-small">{t('common.twoLeafId')}</span>
              <IdTag value={p.readableId} copyable={false} />
            </div>
            <dl className="fm-dl">
              <dt>{t('common.phone')}</dt>
              <dd>{p.phone}</dd>
            </dl>
            <p className="fm-small">{t('me.joinedOn', { date: f.date(p.joinedOn) })}</p>
          </Card>
          <Card titleLevel={2} title={t('me.linkedFarmers')}>
            <ul className="fm-members">
              {p.farmers.map((fm) => (
                <li key={fm.uuid}>
                  <strong>{fm.name}</strong>
                  <IdTag value={fm.readableId} copyable={false} />
                </li>
              ))}
            </ul>
          </Card>
          <h2 className="fm-section-title">{t('common.myQrCard')}</h2>
          <QrCard name={p.name} readableId={p.readableId} seed={p.qrSeed} />
          <p className="fm-small">{t('me.qrHelp')}</p>
          <SettingsCard />
        </>
      ) : null}
    </PhoneScreen>
  );
}
