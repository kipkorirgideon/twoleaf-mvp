import { Link } from 'react-router-dom';
import { Badge, Icon, Skeleton, twoleafLogoDarkUrl, twoleafLogoUrl, useTheme, type IconName } from '../design-system';
import { useQuery } from '../api';
import type { Role, Session } from '../types';
import './RolePicker.css';

interface RoleCard {
  role: Role;
  to: string;
  icon: IconName;
  title: string;
  /** Fallback when the session cannot be loaded. */
  person: string;
  what: string;
  surface: 'Web' | 'Mobile';
}

const CARDS: RoleCard[] = [
  {
    role: 'county',
    to: '/county',
    icon: 'map',
    title: 'Kericho County Government',
    person: 'County officer',
    what: 'Sees all six factories in aggregate: kilos, quality, disputes and audit status.',
    surface: 'Web',
  },
  {
    role: 'factory',
    to: '/factory',
    icon: 'leaf',
    title: 'Tegat Tea Factory',
    person: 'Factory unit manager',
    what: 'Runs deliveries, farmers, quality, bonus, disputes and the audit chain.',
    surface: 'Web',
  },
  {
    role: 'clerk',
    to: '/clerk',
    icon: 'scale',
    title: 'Buying centre clerk',
    person: 'Geoffrey Kirui at TG-043 Kapsoit',
    what: 'Records deliveries with the scale and leaf photo, online or offline.',
    surface: 'Mobile',
  },
  {
    role: 'farmer',
    to: '/farmer',
    icon: 'users',
    title: 'Farmer',
    person: 'Kipkoech Ngetich',
    what: 'Checks deliveries, payments and bonus at both centres, and reports problems.',
    surface: 'Mobile',
  },
  {
    role: 'plucker',
    to: '/plucker',
    icon: 'receipt',
    title: 'Plucker',
    person: 'Faith Chebet',
    what: 'Sees her picking sessions and quality tips across the farmers she works for.',
    surface: 'Mobile',
  },
];

const ROLES: Role[] = CARDS.map((c) => c.role);

function personLine(card: RoleCard, session: Session | undefined): string {
  if (!session) return card.person;
  switch (card.role) {
    case 'county':
    case 'factory':
      return `${session.personName}, ${session.personTitle.toLowerCase()}`;
    case 'clerk':
      // The session has no centre name; the card's line already names the centre.
      return card.person;
    default:
      return session.personName;
  }
}

/** Welcome screen at `/`: pick one of the five demo roles. */
export function RolePicker() {
  const [theme] = useTheme();
  const sessions = useQuery((api) => Promise.all(ROLES.map((r) => api.getSession(r))), [], { live: false });

  return (
    <main className="role-picker">
      <div className="role-picker-intro">
        <img
          className="role-picker-logo"
          src={theme === 'dark' ? twoleafLogoDarkUrl : twoleafLogoUrl}
          alt="TwoLeaf"
          width={220}
          height={64}
        />
        <h1 className="h1">Choose a role to explore</h1>
        <p className="body-lg text-muted">
          See how TwoLeaf records tea deliveries, leaf quality and bonus payments for Kericho County, from the buying centre scale to the county
          dashboard.
        </p>
      </div>

      <ul className="role-picker-grid" aria-label="Demo roles">
        {CARDS.map((card, i) => {
          const session = sessions.data?.[i];
          return (
            <li key={card.role}>
              <Link className="role-card" to={card.to}>
                <span className="role-card-top">
                  <span className="role-card-icon" aria-hidden="true">
                    <Icon name={card.icon} />
                  </span>
                  <Badge tone={card.surface === 'Web' ? 'info' : 'neutral'}>{card.surface}</Badge>
                </span>
                <span className="role-card-title">{card.title}</span>
                <span className="role-card-person">
                  {sessions.initialLoading ? <Skeleton width="70%" /> : personLine(card, session)}
                </span>
                <span className="role-card-what">{card.what}</span>
                <span className="role-card-go">
                  Open
                  <Icon name="chevron-right" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
