import { SRD_ATTRIBUTION } from '../../content/srd/attribution';
import { useI18n } from '../../i18n/i18n';
import { hrefFor } from '../router';

/** Spec §6: the attribution the SRD 5.2.1 asks for, verbatim, and no other attribution to Wizards. */
export function CreditsScreen() {
  const { t } = useI18n();
  return (
    <main className="screen">
      <header className="screen-header">
        <a className="button" href={hrefFor({ name: 'settings' })}>
          {t('nav.back')}
        </a>
        <h1>{t('credits.title')}</h1>
      </header>
      <section className="card">
        <p lang="en">{SRD_ATTRIBUTION}</p>
      </section>
      <section className="card">
        <p>{t('credits.skeletons')}</p>
      </section>
    </main>
  );
}
