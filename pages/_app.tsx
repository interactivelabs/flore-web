import { Provider as SessionProvider } from '../lib/MsalAuth/client';
import { getMsalAuthConfig } from '../lib/getMsalAuthConfig';
import { AppPropsType } from 'next/dist/next-server/lib/utils';

const App = ({ Component, pageProps }: AppPropsType): JSX.Element => {
  const options = getMsalAuthConfig();
  return (
    <SessionProvider options={options}>
      <Component {...pageProps} />
    </SessionProvider>
  );
};

export default App;
