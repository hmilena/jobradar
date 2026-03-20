import clsx from 'clsx';
import {useMemo} from 'react';

type Props = {
  className?: string;
  displayLinks?: boolean;
};

const LINKS = [
  {
    label: 'RemoteOK',
    href: 'https://remoteok.com',
  },
  {
    label: 'WeWorkRemotely',
    href: 'https://weworkremotely.com',
  },
];

export function Footer({className, displayLinks = false}: Props) {
  const externalLinkClass = 'underline underline-offset-2 hover:text-slate-600 transition-colors';
  const links = LINKS.map(link =>
    useMemo(
      () => (
        <a
          key={link.href}
          href={link.href}
          className='underline underline-offset-2 hover:text-slate-600 transition-colors'
          target='_blank'
          rel='noopener noreferrer'
        >
          {link.label}
        </a>
      ),
      [link.href, link.label],
    ),
  );
  return (
    <footer className={clsx('border-t border-slate-200 bg-white py-8', className)}>
      <div className='mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400'>
        <div className='font-medium text-slate-500'>
          JobRadar Portugal <span className='text-xs text-slate-400'>{' por '}</span>
          <a
            href='https://www.linkedin.com/in/hmilena/'
            className={clsx('text-xs text-slate-400', externalLinkClass)}
            target='_blank'
            rel='noopener noreferrer'
          >
            Mia
          </a>
        </div>
        {displayLinks && (
          <div className='flex flex-col items-center gap-2 text-sm text-slate-400 text-center'>
            <span>Vagas via</span>
            <div className='flex flex-wrap items-center justify-center gap-4'>{links}</div>
          </div>
        )}
        <div>
          Vagas atualizadas a cada 6 horas ·{' '}
          <a
            href='https://github.com/hmilena/jobradar'
            className='underline underline-offset-2 hover:text-slate-600 transition-colors'
            target='_blank'
            rel='noopener noreferrer'
          >
            Open Source
          </a>
        </div>
      </div>
    </footer>
  );
}
