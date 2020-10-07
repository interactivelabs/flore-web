import Head from 'next/head';
import { useSession } from '../lib/auth/MsalAuth/client';

export const Index = (): JSX.Element => {
  const { signIn, signOut, isAuthenticated, isReady } = useSession();
  return (
    <div className="container">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1 className="title">
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>
        {isReady &&
          (!isAuthenticated ? (
            <button onClick={signIn}>Sign In</button>
          ) : (
            <button onClick={signOut}>Sign Out</button>
          ))}
      </main>
    </div>
  );
};

export default Index;
