import type { JSX } from "react";
import { Col, Container, Image, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function Header(props: HeaderProps): JSX.Element {
  const title = props.title;

  // Navigation utility
  const navigate = useNavigate();

  return (
    <>
      {/* Header */}
      <Container>
        <Row className="mb-3">
          <Col>
            <strong className="text-24">{title}</strong>
          </Col>
          <Col className="text-end">
            <Image
              src="images/icons/student.svg"
              alt="Student icon"
              className="cursor-pointer"
              onClick={() => navigate("/student")}
            />
          </Col>
        </Row>
      </Container>
    </>
  );
}

interface HeaderProps {
  title: string;
}
