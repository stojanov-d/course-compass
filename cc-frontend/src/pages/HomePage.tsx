import { useAuth } from '../hooks/useAuth';

const HomePage = () => {
  const { user, authRedirect, logout, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Course Compass</h1>
      {user ? (
        <div>
          <p>
            Welcome, {user.displayName || user.username}! Your role is:{' '}
            {user.role}.
          </p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <p>Please log in to review and discuss courses.</p>
          <button onClick={authRedirect}>Login with Discord</button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
