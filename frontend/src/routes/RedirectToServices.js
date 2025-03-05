import { useParams, Navigate } from "react-router-dom";

const RedirectToServices = () => {
  const { lang } = useParams();
  return <Navigate to={`/${lang}/services`} replace />;
};

export default RedirectToServices;
