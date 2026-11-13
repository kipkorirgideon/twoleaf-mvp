/**
 * Payments: monthly kilos × rate per centre (last 6 months) and the FY bonus per
 * factory with its breakdown. TwoLeaf never pays anyone, so there is no Pay button.
 */
import { useQuery } from '../../api';
import { Badge, Card, Icon } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKg, formatKsh, formatKshPerKg, formatNumber } from '../../lib/format';
import { useLocalFormat, useT, type MessageKey } from '../../lib/i18n';
import type { BonusLine } from '../../types';
import { useFarmerProfile, useFarmerSession } from './session';

function lineValue(line: BonusLine): string {
  switch (line.kind) {
    case 'kg':
      return formatKg(line.value, 0);
    case 'money':
      return formatKsh(line.value, { decimals: 0 });
    case 'money_per_kg':
      return formatKshPerKg(line.value);
    default: {
      const never: never = line.kind;
      return String(never);
    }
  }
}

const LINE_KEY: Record<BonusLine['key'], MessageKey> = {
  made_tea_sold: 'bonusLine.made_tea_sold',
  avg_auction_price: 'bonusLine.avg_auction_price',
  auction_income: 'bonusLine.auction_income',
  green_leaf_received: 'bonusLine.green_leaf_received',
  processing_costs: 'bonusLine.processing_costs',
  management_fee_levies: 'bonusLine.management_fee_levies',
  monthly_payments: 'bonusLine.monthly_payments',
  left_for_second_payment: 'bonusLine.left_for_second_payment',
  bonus_per_kg: 'bonusLine.bonus_per_kg',
};

export function FarmerPaymentsPage() {
  const t = useT();
  const f = useLocalFormat();
  const { farmerUuid } = useFarmerSession();
  const profile = useFarmerProfile();
  const q = useQuery((api) => api.getFarmerPayments(farmerUuid), [farmerUuid]);
  const data = q.data;
  const refOf = (membershipUuid: string, centreCode: string): string =>
    profile?.memberships.find((m) => m.membershipUuid === membershipUuid)?.farmerRef ?? centreCode;
  const factoryOf = (membershipUuid: string): string => profile?.memberships.find((m) => m.membershipUuid === membershipUuid)?.factory.shortName ?? '';
  const months = data ? [...data.months].sort((a, b) => (a.month < b.month ? 1 : -1)) : [];

  return (
    <PhoneScreen title={t('tab.payments')}>
      <p className="fm-muted">{t('payments.intro')}</p>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !data ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {data && months.length === 0 && data.bonuses.length === 0 ? (
        <Card>
          <div className="fm-empty">
            <Icon name="receipt" />
            <span>{t('payments.empty')}</span>
          </div>
        </Card>
      ) : null}

      {data && months.length > 0 ? (
        <>
          <h2 className="fm-section-title">{t('payments.monthly')}</h2>
          {months.map((m) => (
            <Card key={m.month} title={f.month(m.month)}>
              {m.payments.length === 0 ? <p className="fm-small">{t('payments.noDeliveries')}</p> : null}
              {m.payments.map((p) => (
                <div key={p.membershipUuid} className="fm-pay-line">
                  <div className="fm-row">
                    <span>
                      <span className="fm-ref">{refOf(p.membershipUuid, p.centreCode)}</span> <span className="fm-small">{factoryOf(p.membershipUuid)}</span>
                    </span>
                    <Badge tone={p.status === 'paid' ? 'success' : 'info'}>
                      {p.status === 'paid' ? t('home.paidOn', { date: f.dateShort(p.payDate) }) : t('home.toBePaidOn', { date: f.dateShort(p.payDate) })}
                    </Badge>
                  </div>
                  <span className="fm-pay-calc">
                    {formatKg(p.kg)} × {formatKshPerKg(p.rateCentsPerKg)} =
                  </span>
                  <span className="fm-pay-amount">{formatKsh(p.amountCents)}</span>
                </div>
              ))}
              {m.payments.length > 1 ? (
                <div className="fm-pay-total">
                  <span>{t('common.total')}</span>
                  <span>{formatKsh(m.totalCents)}</span>
                </div>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
      {data && data.bonuses.length > 0 ? (
        <>
          <h2 className="fm-section-title">{t('payments.bonusSection')}</h2>
          {data.bonuses.map((b) => {
            const lines = b.computation?.lines ?? [];
            return (
              <Card
                key={b.factory.uuid}
                className="fm-stack"
                title={t('payments.bonusTitle', { fy: b.fy })}
                subtitle={b.factory.name}
                action={<Badge tone={b.status === 'paid' ? 'success' : 'info'}>{t(b.status === 'paid' ? 'paymentStatus.paid' : 'paymentStatus.due')}</Badge>}
              >
                <p className="fm-sentence">
                  {t('payments.bonusSentence', {
                    factory: b.factory.shortName,
                    price: formatKsh(b.avgAuctionPriceCentsPerKg, { decimals: 0 }),
                    rate: formatKsh(b.ratePerKgCents),
                    kg: formatNumber(b.kg, 1),
                    amount: formatKsh(b.amountCents),
                  })}
                </p>
                <p className="fm-small">{b.status === 'paid' ? t('payments.bonusPaidOn', { date: f.date(b.paidOn) }) : t('payments.bonusDueOn', { date: f.date(b.paidOn) })}</p>
                <details className="fm-details">
                  <summary>{t('payments.breakdown', { factory: b.factory.shortName })}</summary>
                  <div className="fm-details-body">
                    {b.computation ? (
                      <>
                        <p className="fm-small">{t('payments.formula', { version: b.computation.formulaVersion })}</p>
                        {lines.map((l) => (
                          <div key={l.key} className={l.key === 'bonus_per_kg' || l.key === 'left_for_second_payment' ? 'fm-bonus-line is-result' : 'fm-bonus-line'}>
                            <div className="fm-bonus-line-head">
                              <span>{t(LINE_KEY[l.key])}</span>
                              <b>{lineValue(l)}</b>
                            </div>
                            {l.key === 'left_for_second_payment' ? (
                              <span className="fm-bonus-formula">{t('payments.leftFormula')}</span>
                            ) : l.formula ? (
                              <span className="fm-bonus-formula">{l.formula}</span>
                            ) : null}
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="fm-small">{t('payments.noBreakdown')}</p>
                    )}
                  </div>
                </details>
              </Card>
            );
          })}
        </>
      ) : null}

    </PhoneScreen>
  );
}
