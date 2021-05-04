import { useRef } from "react";
import * as S from "./Dashboard.styled";
import LogoutButton from "components/authentication/LogoutButton";

// Deps
import { loadStripe } from "@stripe/stripe-js";

// TEMP
import TemporaryStripeCheckoutTest from "./TemporaryStripeCheckoutTest";

function Dashboard(props) {
  const stripeRef = useRef(
    loadStripe(
      "pk_test_51InNlfFhyXrQfcca6Sfm65ldMRYwBGPyNRRR6GUkpeOpnFPyJCKw3nMjG51gOrVy2eYcz4ej44uMAgJC0FR9K8nN00pEZYwGum"
    )
  );

  return (
    <S.Dashboard>
      <p>Dashboard</p>
      <LogoutButton />
      <TemporaryStripeCheckoutTest stripe={stripeRef.current} />
    </S.Dashboard>
  );
}

export default Dashboard;
