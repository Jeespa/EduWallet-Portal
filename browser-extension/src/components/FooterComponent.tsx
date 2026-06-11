import "../styles/FooterStyle.css";
import type { JSX } from "react";
import { Col, Container, Image, Row } from "react-bootstrap";
import { NavigateFunction, useLocation, useNavigate } from "react-router-dom";

/**
 * Footer component renders the footer navigation menu.
 * @author Diego Da Giau
 * @returns {JSX.Element} The rendered footer component.
 */
export default function Footer(): JSX.Element {
  const location = useLocation();
  const menuOption = location.pathname.substring(1);

  const navigate: NavigateFunction = useNavigate();
  const changeMenu = (option: string) => {
    navigate("/" + option);
  };

  return (
    <>
      <footer className="container-fluid py-2">
        <Row>
          {/* Wallet menu option */}
          <Col>
            <Container
              className={
                "text-center" +
                " " +
                (menuOption === "wallet" ? "selected-option" : "not-selected-option")
              }
              onClick={() => changeMenu("wallet")}
            >
              <Row>
                <Col>
                  <Image src="images/icons/wallet.svg" />
                </Col>
              </Row>
              <Row>
                <Col>Wallet</Col>
              </Row>
            </Container>
          </Col>
          {/* Permissions menu option */}
          <Col>
            <Container
              className={
                "text-center" +
                " " +
                (menuOption === "permissions" ? "selected-option" : "not-selected-option")
              }
              onClick={() => changeMenu("permissions")}
            >
              <Row>
                <Col>
                  <Image src="images/icons/permissions.svg" />
                </Col>
              </Row>
              <Row>
                <Col>Permissions</Col>
              </Row>
            </Container>
          </Col>
        </Row>
      </footer>
    </>
  );
}
