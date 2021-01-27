import { Provider as SessionProvider } from '../lib/auth/MsalAuth/client';
import { getMsalAuthConfig } from '../lib/auth/getMsalAuthConfig';
import { AppPropsType } from 'next/dist/next-server/lib/utils';

import '../styles/index.css';

const App = ({ Component, pageProps }: AppPropsType): JSX.Element => {
  const options = getMsalAuthConfig();
  return (
    <SessionProvider options={options}>
      <Component {...pageProps} />
    </SessionProvider>
  );
};

export default App;
