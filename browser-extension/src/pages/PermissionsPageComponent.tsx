import "../styles/PermissionPageStyle.css";

import { useEffect, useState } from "react";
import type { JSX } from "react";
import Header from "../components/HeaderComponent";
import { PermissionType, type Permission } from "../models/permissions";
import { Col, Container, Row, Modal, Button } from "react-bootstrap";
import { usePermissions } from "../providers/PermissionsProvider";
import { useUniversities } from "../providers/UniversitiesProvider";
import UniversityModel from "../models/university";

/**
 * Main permissions page component for managing university access permissions.
 * Displays all permission requests and granted permissions organized by category.
 * @author Diego Da Giau
 * @returns {JSX.Element} The permissions page component
 */
export default function PermissionsPage(): JSX.Element {
  // Get permissions data and functions from context
  const { requests, read, write, updatePermissions, loadPermissions } =
    usePermissions();

  // Local state for the password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<
    Permission | null
  >(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  /**
   * When user clicks on a permission, open the password modal
   * and remember which permission they’re acting on.
   */
  const handleClick = (permission: Permission): void => {
    setSelectedPermission(permission);
    setPasswordInput("");
    setModalError(null);
    setShowPasswordModal(true);
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setSelectedPermission(null);
    setPasswordInput("");
    setModalError(null);
  };

  const handleConfirm = async () => {
    if (!selectedPermission) return;

    try {
      // This will trigger the AA flow via gateway + show toast on failure
      await updatePermissions(selectedPermission, passwordInput);

      // On success, just close the modal and clear state
      handleCloseModal();
    } catch (err: any) {
      // In practice updatePermissions already shows an error message,
      // but we keep this in case it ever throws.
      setModalError(err?.message ?? "Failed to update permission");
    }
  };

  // Load permissions data when component mounts
  useEffect(() => {
    loadPermissions();
  }, []);

  return (
    <>
      {/* Header */}
      <Header title="Permissions" />

      {/* Body */}
      <div className="main-content permissions-list">
        <Container className="my-2">
          <PermissionsByCategory
            permissions={requests}
            title="Requests"
            handleClick={handleClick}
          />
        </Container>
        <Container className="my-2">
          <PermissionsByCategory
            permissions={read}
            title="Read"
            handleClick={handleClick}
          />
        </Container>
        <Container className="my-2">
          <PermissionsByCategory
            permissions={write}
            title="Write"
            handleClick={handleClick}
          />
        </Container>
      </div>

      {/* Password modal */}
      <Modal show={showPasswordModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedPermission?.request
              ? selectedPermission.type === PermissionType.Read
                ? "Approve read access"
                : "Approve write access"
              : "Confirm revoke access"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Please re-enter your password to confirm this action.</p>
          <input
            type="password"
            className="form-control"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
          />
          {modalError && (
            <div className="text-danger mt-2">{modalError}</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button
            variant={selectedPermission?.request ? "primary" : "danger"}
            onClick={handleConfirm}
            disabled={!passwordInput}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

/**
 * Interface for PermissionsByCategory component props.
 * @author Diego Da Giau
 */
interface PermissionsByCategoryProps {
  /** Array of permissions in this category */
  permissions: Permission[];
  /** Display title for the category */
  title: string;
  /** Callback function for permission action buttons */
  handleClick: (permission: Permission) => void;
}

/**
 * Component that displays a category of permissions with a title.
 * Shows all permissions in the category or an empty message if none exist.
 * @author Diego Da Giau
 * @param {PermissionsByCategoryProps} props - Component properties
 * @returns {JSX.Element} The permissions category component
 */
function PermissionsByCategory(props: PermissionsByCategoryProps): JSX.Element {
  const permissions = props.permissions;
  const title = props.title;
  const handleClick = props.handleClick;

  // Get universities data from context to display university names
  const universities = useUniversities().universities;

  return (
    <>
      <Row>
        <Col className="category-title">{title}</Col>
      </Row>
      {permissions.length > 0 ? (
        permissions.map((p) => (
          <PermissionRow
            key={p.university}
            permission={p}
            handleClick={handleClick}
            university={universities.find(
              (u) => u.accountAddress === p.university
            )}
          />
        ))
      ) : (
        <EmptyCategory />
      )}
    </>
  );
}

/**
 * Component displayed when a permissions category has no permissions.
 * @author Diego Da Giau
 * @returns {JSX.Element} The empty category component
 */
function EmptyCategory(): JSX.Element {
  return (
    <Row>
      <Col className="text-14">No permissions for this category</Col>
    </Row>
  );
}

/**
 * Interface for Permission component props.
 * @author Diego Da Giau
 */
interface PermissionRowProps {
  /** The permission object containing details about the permission */
  permission: Permission;
  /** The university model associated with this permission (or undefined if not found) */
  university: UniversityModel | undefined;
  /** Callback function for when the permission action button is clicked */
  handleClick: (permission: Permission) => void;
}

/**
 * Component that displays a single permission with university name and action button.
 * Button text/style changes based on whether it's a request or granted permission.
 * @author Diego Da Giau
 * @param {PermissionRowProps} props - Component properties
 * @returns {JSX.Element} The individual permission component
 */
function PermissionRow(props: PermissionRowProps): JSX.Element {
  const { permission, university, handleClick } = props;

  let label = "";
  if (permission.request && permission.type === PermissionType.Read) {
    label = "Read";
  } else if (permission.request && permission.type === PermissionType.Write) {
    label = "Write";
  } else {
    label = "Revoke";
  }

  return (
    <Row className="align-items-center mb-1">
      <Col xs={9} className="text-14">
        {university ? university.name : "Unknown university"}
      </Col>
      <Col>
        <button
          className={
            "permission-button" +
            " " +
            (permission.request ? "request" : "revoke")
          }
          onClick={() => handleClick(permission)}
        >
          {label}
        </button>
      </Col>
    </Row>
  );
}
