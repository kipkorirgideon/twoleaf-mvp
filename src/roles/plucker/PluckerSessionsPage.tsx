import { useState } from 'react';
import { useQuery } from '../../api';
import { Badge, Button, Card, Icon, SelectField } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKg, formatNumber, formatPct } from '../../lib/format';
import { isUuid } from '../../lib/ids';
import { useLocalFormat, useT } from '../../lib/i18n';
import type { Uuid } from '../../types';
import { ENTRY_LABEL, ENTRY_TONE, entryKind } from '../farmer/entry';
import { usePluckerSession } from './session';

const PAGE = 30;

/** Picking sessions (date, farmer, centre, kg, fine leaf), filterable by farmer. */
export function PluckerSessionsPage() {
  const t = useT();
  const f = useLocalFormat();
  const { pluckerUuid } = usePluckerSession();
  const [farmer, setFarmer] = useState<Uuid | null>(null);
  const [shown, setShown] = useState(PAGE);
  const profileQ = useQuery((api) => api.getPluckerProfile(pluckerUuid), [pluckerUuid], { live: false });
  const q = useQuery((api) => api.listPluckerSessions(pluckerUuid, farmer ? { farmerUuid: farmer } : {}), [pluckerUuid, farmer]);
  const rows = q.data;

  return (
    <PhoneScreen title={t('tab.sessions')}>
      <SelectField
        label={t('common.farmer')}
        value={farmer ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setFarmer(v && isUuid(v) ? v : null);
          setShown(PAGE);
        }}
      >
        <option value="">{t('common.allFarmers')}</option>
        {(profileQ.data?.farmers ?? []).map((fm) => (
          <option key={fm.uuid} value={fm.uuid}>
            {fm.name}
          </option>
        ))}
      </SelectField>

      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !rows ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {rows && rows.length === 0 ? (
        <Card>
          <div className="fm-empty">
            <Icon name="leaf" />
            <span>{t('plucker.sessionsEmpty')}</span>
          </div>
        </Card>
      ) : null}
      {rows && rows.length > 0 ? (
        <>
          <p className="fm-small" aria-live="polite">
            {t('plucker.sessionsCount', { count: formatNumber(rows.length) })}
          </p>
          <ul className="fm-list">
            {rows.slice(0, shown).map((r) => {
              const kind = entryKind({ status: r.status, correctionOf: null });
              return (
                <li key={r.deliveryUuid} className="fm-item">
                  <span className="fm-item-main">
                    <span className="fm-item-title">{r.farmerName}</span>
                    <span className="fm-item-sub">
                      {f.date(r.recordedAt)} · <span className="fm-ref">{r.centre.code}</span> · {t('common.fineLeaf')} {formatPct(r.fineLeafPct)}
                    </span>
                  </span>
                  <span className="fm-item-side">
                    <span className={r.kg < 0 ? 'fm-item-kg is-negative' : 'fm-item-kg'}>{formatKg(r.kg)}</span>
                    {kind !== 'recorded' ? <Badge tone={ENTRY_TONE[kind]}>{t(ENTRY_LABEL[kind])}</Badge> : null}
                  </span>
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
