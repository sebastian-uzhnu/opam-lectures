import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';
import HomepageFeatures from "@site/src/components/HomepageFeatures";

function HomepageHeader() {
    const {siteConfig} = useDocusaurusContext();
    return (
        <header className={clsx('hero hero--primary', styles.heroBanner)}>
            <div className="container">
                <Heading as="h1" className="hero__title">
                    Лекції з ОПАМ
                </Heading>
                <p className="hero__subtitle">{siteConfig.tagline}</p>
                <div className={styles.buttons}>
                    <Link
                        className="button button--secondary button--lg"
                        to="/docs/intro">
                        Перейти до лекцій&nbsp;&nbsp;📚
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default function Home(): ReactNode {
    const {siteConfig} = useDocusaurusContext();

    return (
        <Layout
            title={siteConfig.title}
            description="Лекції з основ програмування та алгоритмів - навчальні матеріали для студентів">
            <HomepageHeader/>
            <main>
                <HomepageFeatures/>
            </main>
        </Layout>
    );
}
