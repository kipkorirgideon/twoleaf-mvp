/** Me: name, TwoLeaf ID, phone, memberships with farmer numbers, QR card, settings, Powered by. */
import { useQuery } from '../../api';
import { Card, IdTag } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { useLocalFormat, useT } from '../../lib/i18n';
import { QrCard } from './QrCard';
import { SettingsCard } from './SettingsCard';
import { useFarmerSession } from './session';

export function FarmerMePage() {
  const t = useT();
  const f = useLocalFormat();
  const { farmerUuid } = useFarmerSession();
  const q = useQuery((api) => api.getFarmerProfile(farmerUuid), [farmerUuid]);
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

          <Card titleLevel={2} title={t('me.memberships')}>
            <ul className="fm-members">
              {p.memberships.map((m) => (
                <li key={m.membershipUuid}>
                  <strong>{m.factory.name}</strong>
                  <span className="fm-small">
                    {m.centre.name} · {t('common.farmerNumber')} <span className="fm-ref">{m.farmerRef}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {p.pluckers.length > 0 ? (
            <Card titleLevel={2} title={t('me.pluckers')}>
              <ul className="fm-members">
                {p.pluckers.map((pl) => (
                  <li key={pl.uuid}>
                    <strong>{pl.name}</strong>
                    <IdTag value={pl.readableId} copyable={false} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <h2 className="fm-section-title">{t('common.myQrCard')}</h2>
          <QrCard name={p.name} readableId={p.readableId} refs={p.memberships.map((m) => m.farmerRef)} seed={p.qrSeed} />
          <p className="fm-small">{t('me.qrHelp')}</p>

          <SettingsCard />
        </>
      ) : null}
    </PhoneScreen>
  );
}
