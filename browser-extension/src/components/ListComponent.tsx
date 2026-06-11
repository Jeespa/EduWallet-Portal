import type { JSX } from "react";
import "../styles/ListComponentStyle.css";
import { Col, Container, Row } from "react-bootstrap";
import { formatCamelCaseString } from "../utils/utils";
import React from "react";

/**
 * List component renders a list of key-value pairs from an object.
 * @author Diego Da Giau
 * @param {ListProps} props - The properties passed to the component.
 * @returns {JSX.Element} The rendered list component.
 */
export default function List(props: ListProps): JSX.Element {
  const obj = props.object;
  const keys = Object.keys(obj);

  return (
    <>
      {keys.map((key, index) => (
        <React.Fragment key={`item-${index}`}>
          <Container className="list">
            <Row>
              <Col className="purple-text text-12 list-title">{formatCamelCaseString(key)}</Col>
            </Row>
            <Row>
              <Col className="text-15 list-content">{obj[key]}</Col>
            </Row>
          </Container>
          {index < keys.length - 1 && <hr className="my-2" />}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Properties for the List component.
 * @author Diego Da Giau
 */
interface ListProps {
  object: { [key: string]: any };
}
