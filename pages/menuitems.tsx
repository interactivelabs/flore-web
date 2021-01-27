import { useEffect, useState } from 'react';
import { parameters } from '../lib/auth/getMsalAuthConfig';
import { useSession } from '../lib/auth/MsalAuth/client';

export const MenuITems = (): JSX.Element => {
  const [token, setToken] = useState('');
  const { isAuthenticated, isReady, getAccessToken } = useSession();
  useEffect(() => {
    const getToken = async () => {
      const t = await getAccessToken(parameters.scopes);
      setToken(t);
    };
    if (isReady) getToken();
  }, [isReady]);

  if (!isReady) {
    return <div>Loading Auth</div>;
  }
  if (!isAuthenticated) {
    return <div>No Access</div>;
  }

  return (
    <div className="container mx-auto">
      <main>
        <h1 className="title">Menu Items</h1>
        <div>Token {token}</div>
      </main>
    </div>
  );
};

export default MenuITems;
