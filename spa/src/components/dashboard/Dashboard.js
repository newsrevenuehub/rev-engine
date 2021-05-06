import * as S from "./Dashboard.styled";
import LogoutButton from "components/authentication/LogoutButton";

// TEMP
import { Link } from "react-router-dom";

function Dashboard(props) {
  return (
    <S.Dashboard>
      <p>Dashboard</p>
      <LogoutButton />
      <Link to="/temp-pretend-payment">Make pretend payment</Link>
    </S.Dashboard>
  );
}

export default Dashboard;
