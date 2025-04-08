import { useCreateMyUser } from "@/api/MyUserApi";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function AuthCallbackPage() {
  const { user } = useAuth0();
  const { createUser } = useCreateMyUser();
  const navigate = useNavigate();

  // useRef to keep track of whether the user has already been created to avoid duplicate calls
  const hasCreatedUser = useRef(false);

  useEffect(() => {
    // Check if the user has already been created to avoid duplicate calls
    if (user?.sub && user?.email && !hasCreatedUser.current) {
      createUser({ auth0Id: user.sub, email: user.email });
      hasCreatedUser.current = true; // Set the ref to true to prevent further calls
    }
    navigate("/");
  }, [createUser, navigate, user]);

  return <div>Loading...</div>;
}

export default AuthCallbackPage;
