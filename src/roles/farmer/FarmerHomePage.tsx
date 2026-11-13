import { useState } from 'react';
import { useQuery } from '../../api';
import { Alert, Badge, Card, SelectField, StatCard } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKsh, formatNumber, formatPct } from '../../lib/format';
import { periodKey, useLocalFormat, useT } from '../../lib/i18n';
import type { FarmerPeriod } from '../../types';
import { FineLeafMeter } from './FineLeafMeter';
import { KilosChart } from './KilosChart';
import { useFarmerSession } from './session';

const PERIODS: FarmerPeriod[] = ['this_month', '3_months', '6_months', '9_months', 'this_year', 'last_year'];

function isPeriod(v: string): v is FarmerPeriod {
  return (PERIODS as string[]).includes(v);
}

/** Farmer Home: combined totals for a period, one card per buying centre, 6-month chart, quality tip. */
export function FarmerHomePage() {
  const t = useT();
  const f = useLocalFormat();
  const { farmerUuid } = useFarmerSession();
  const [period, setPeriod] = useState<FarmerPeriod>('this_month');
  const q = useQuery((api) => api.getFarmerHome(farmerUuid, period), [farmerUuid, period]);
  const home = q.data;

  return (
    <PhoneScreen title={t('tab.home')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !home ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {home ? (
        <>
          <h2 className="fm-greeting">{t('greeting', { name: home.farmer.name.split(' ')[0] ?? home.farmer.name })}</h2>

          <SelectField
            label={t('common.period')}
            value={period}
            onChange={(e) => {
              if (isPeriod(e.target.value)) setPeriod(e.target.value);
            }}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {t(periodKey(p))}
              </option>
            ))}
          </SelectField>

          <section className="fm-stack" aria-labelledby="fm-totals" aria-busy={q.loading}>
            <h3 id="fm-totals" className="fm-section-title">
              {t('home.totals')} · {f.date(home.periodFrom)} – {f.date(home.periodTo)}
            </h3>
            <div className="phone-stats">
              <StatCard label={t('common.kilos')} value={formatNumber(home.totals.kg, 1)} unit={t('common.kg')} />
              <StatCard label={t('common.fineLeaf')} value={home.totals.fineLeafPct === null ? '–' : formatPct(home.totals.fineLeafPct)} />
              <StatCard label={t('common.paid')} value={formatKsh(home.totals.paidCents, { decimals: 0 })} />
              <StatCard label={t('common.toBePaid')} value={formatKsh(home.totals.dueCents, { decimals: 0 })} />
            </div>
            <p className="fm-small">{home.totals.deliveries === 0 ? t('home.noDeliveries') : t('home.deliveriesCount', { count: formatNumber(home.totals.deliveries) })}</p>
          </section>

          {home.belowTarget && home.totals.fineLeafPct !== null ? (
            <Alert tone="warning" title={t('home.tipTitle')}>
              {t('home.tipBody', { pct: formatNumber(home.totals.fineLeafPct), target: home.target })}
            </Alert>
          ) : null}

          <h3 className="fm-section-title">{t('home.byCentre')}</h3>
          {home.centres.map((c) => (
            <Card key={c.membershipUuid} className="fm-stack">
              <div className="fm-centre-head">
                <span className="fm-centre-name">{c.factory.name}</span>
                <span className="fm-small">
                  {c.centre.name} · <span className="fm-ref">{c.farmerRef}</span>
                </span>
              </div>
              <span className="fm-centre-kg">
                {formatNumber(c.kg, 1)}
                <span>{t('common.kg')}</span>
              </span>
              {c.fineLeafPct !== null ? <FineLeafMeter value={c.fineLeafPct} target={home.target} label={t('common.leafQuality')} /> : null}
              <div className="fm-row">
                <span className="fm-small">{t('home.thisMonthPay', { amount: formatKsh(c.thisMonth.amountCents) })}</span>
                <Badge tone={c.thisMonth.status === 'paid' ? 'success' : 'info'}>
                  {c.thisMonth.status === 'paid' ? t('home.paidOn', { date: f.dateShort(c.thisMonth.payDate) }) : t('home.toBePaidOn', { date: f.dateShort(c.thisMonth.payDate) })}
                </Badge>
              </div>
            </Card>
          ))}

          <Card title={t('home.chartTitle')}>
            <KilosChart points={home.trend} />
          </Card>
        </>
      ) : null}
    </PhoneScreen>
  );
}
