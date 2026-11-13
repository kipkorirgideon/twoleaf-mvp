import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '../../api';
import { Badge, Button, Card, Icon, SelectField } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKg, formatNumber, formatPct } from '../../lib/format';
import { isUuid } from '../../lib/ids';
import { useLocalFormat, useT } from '../../lib/i18n';
import type { Uuid } from '../../types';
import { ENTRY_LABEL, ENTRY_TONE, entryKind } from './entry';
import { FARMER_BASE, useFarmerProfile, useFarmerSession } from './session';

const PAGE = 30;

/** All of this farmer's ledger entries, newest first, filterable by buying centre. */
export function FarmerDeliveriesPage() {
  const t = useT();
  const f = useLocalFormat();
  const { farmerUuid } = useFarmerSession();
  const profile = useFarmerProfile();
  const [membership, setMembership] = useState<Uuid | null>(null);
  const [shown, setShown] = useState(PAGE);
  const q = useQuery((api) => api.listFarmerDeliveries(farmerUuid, membership ? { membershipUuid: membership } : {}), [farmerUuid, membership]);
  const rows = q.data;

  return (
    <PhoneScreen title={t('tab.deliveries')}>
      <SelectField
        label={t('common.buyingCentre')}
        value={membership ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setMembership(v && isUuid(v) ? v : null);
          setShown(PAGE);
        }}
      >
        <option value="">{t('common.allCentres')}</option>
        {(profile?.memberships ?? []).map((m) => (
          <option key={m.membershipUuid} value={m.membershipUuid}>
            {m.farmerRef} · {m.factory.shortName}
          </option>
        ))}
      </SelectField>

      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !rows ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {rows && rows.length === 0 ? (
        <Card>
          <div className="fm-empty">
            <Icon name="leaf" />
            <span>{t('deliveries.empty')}</span>
          </div>
        </Card>
      ) : null}
      {rows && rows.length > 0 ? (
        <>
          <p className="fm-small" aria-live="polite">
            {t('deliveries.count', { count: formatNumber(rows.length) })}
          </p>
          <ul className="fm-list">
            {rows.slice(0, shown).map((r) => {
              const kind = entryKind(r);
              return (
                <li key={r.uuid}>
                  <Link className="fm-item" to={`${FARMER_BASE}/deliveries/${r.uuid}`}>
                    <span className="fm-item-main">
                      <span className="fm-item-title">
                        {f.date(r.recordedAt)} · {f.time(r.recordedAt)}
                      </span>
                      <span className="fm-item-sub">
                        <span className="fm-ref">{r.centre.code}</span> {r.centre.name} · {t('common.fineLeaf')} {formatPct(r.fineLeafPct)}
                      </span>
                    </span>
                    <span className="fm-item-side">
                      <span className={r.kg < 0 ? 'fm-item-kg is-negative' : 'fm-item-kg'}>{formatKg(r.kg)}</span>
                      <Badge tone={ENTRY_TONE[kind]}>{t(ENTRY_LABEL[kind])}</Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {rows.length > shown ? (
            <Button variant="secondary" fullWidth onClick={() => setShown((n) => n + PAGE)}>
              {t('shell.showMore')}
            </Button>
          ) : null}
        </>
      ) : null}
    </PhoneScreen>
  );
}
