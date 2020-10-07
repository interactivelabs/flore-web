import { useSession } from '../lib/auth/MsalAuth/client';

export const MenuITems = (): JSX.Element => {
  const { isAuthenticated, isReady } = useSession();
  if (!isReady) {
    return <div>Loading Auth</div>;
  }
  if (!isAuthenticated) {
    return <div>No Access</div>;
  }
  return (
    <div className="container">
      <main>
        <h1 className="title">Menu Items</h1>
      </main>
    </div>
  );
};

export default MenuITems;
