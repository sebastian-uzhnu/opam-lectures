import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

type Term = {
  range: string;
  title: string;
  body: string;
  topics: string[];
  to: string;
};

const TERMS: Term[] = [
  {
    range: 'Теми 1–20',
    title: 'Семестр 1 — консоль і основи',
    body: 'Від блок-схеми до консольного застосунку на ООП. Практика завершується невеликим власним проєктом.',
    topics: ['Алгоритми', 'C#', 'Цикли', 'Масиви', 'Файли', 'Класи', 'Git'],
    to: '/docs/algorithms-and-flowcharts',
  },
  {
    range: 'Теми 21–35',
    title: 'Семестр 2 — інтерфейс і дані',
    body: 'Графічний інтерфейс на WPF, робота з даними та мережею. Наголос на бізнес-логіці застосунків.',
    topics: ['WPF', 'XAML', 'MVVM', 'LINQ', 'EF Core', 'Асинхронність'],
    to: '/docs/wpf-basics-xaml',
  },
];

function Hero() {
  return (
    <header className={styles.hero}>
      <div className="container">
        <div className={styles.heroInner}>
          <p className={styles.heroMeta}>35 тем · два семестри</p>
          <Heading as="h1" className={styles.heroTitle}>
            Основи програмування та алгоритмічні мови
          </Heading>
          <p className={styles.heroSubtitle}>
            Конспект лекцій курсу: від першого алгоритму до застосунку з
            графічним інтерфейсом і базою даних на C# та .NET.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} to="/docs/intro">
              Почати з вступу
            </Link>
            <Link
              className={styles.secondaryAction}
              to="/docs/algorithms-and-flowcharts">
              Перейти до тем
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Semesters() {
  return (
    <section className={styles.semesters}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Структура курсу
        </Heading>
        <p className={styles.sectionLead}>
          Теми йдуть послідовно: кожна спирається на попередню. Якщо щось
          незрозуміло — поверніться на тему назад.
        </p>
        <div className={styles.termGrid}>
          {TERMS.map((term) => (
            <Link key={term.range} className={styles.term} to={term.to}>
              <span className={styles.termRange}>{term.range}</span>
              <span className={styles.termTitle}>{term.title}</span>
              <span className={styles.termBody}>{term.body}</span>
              <span className={styles.termTopics}>
                {term.topics.map((topic) => (
                  <span key={topic} className={styles.chip}>
                    {topic}
                  </span>
                ))}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="Конспект лекцій з основ програмування та алгоритмічних мов: C#, .NET, алгоритми, ООП, WPF та робота з даними.">
      <Hero />
      <main>
        <Semesters />
      </main>
    </Layout>
  );
}
