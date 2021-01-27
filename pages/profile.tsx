import { useSession } from '../lib/auth/MsalAuth/client';

export const Profile = (): JSX.Element => {
  const { isAuthenticated, isReady } = useSession();
  if (!isReady) {
    return <div>Loading Auth</div>;
  }
  if (!isAuthenticated) {
    return <div>No Access</div>;
  }
  return (
    <div className="container mx-auto">
      <main>
        <h1 className="title">Profile</h1>
      </main>
    </div>
  );
};

export default Profile;
