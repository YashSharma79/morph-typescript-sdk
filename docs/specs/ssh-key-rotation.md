# SSH Key Rotation Feature Specification

## 1. Feature Name
SSH Key Rotation for Instance

## 2. Description
This feature allows users to rotate the ephemeral SSH key associated with a specific instance. Upon rotation, a new SSH key pair (private and public) and a new password are generated and returned, invalidating the previous key. This enhances security by providing a mechanism to regularly update access credentials.

## 3. API Endpoint
- **Path:** `/instance/{instance_id}/ssh/key`
- **Method:** `POST`

## 4. Request
- **URL Parameters:**
    - `instance_id` (string, required): The unique identifier of the instance for which the SSH key is to be rotated.
- **Headers:**
    - `Authorization`: Bearer token for authentication.
    - `Content-Type`: `application/json` (though no request body is sent, this is standard for POST requests).
- **Body:** None.

## 5. Response
- **Status Code:** `200 OK`
- **Body:** Returns an `InstanceSshKey` object.

### InstanceSshKey Object Structure:
```typescript
interface InstanceSshKey {
  object: "instance_ssh_key";
  private_key: string;
  public_key: string;
  password: string;
}
```

## 6. Error Handling
- `404 Not Found`: If the specified `instance_id` does not correspond to an existing instance.
- `401 Unauthorized`: If the authentication token is missing or invalid.
- `403 Forbidden`: If the authenticated user does not have permission to rotate the SSH key for the specified instance.
- `500 Internal Server Error`: For any unexpected server-side errors during key generation or rotation.

## 7. SDK Implementation Details

### Class: `Instance`
The `Instance` class in the SDK will be extended with the following methods:

#### 7.1. `sshKeyRotate()` (Synchronous)
- **Signature:** `sshKeyRotate(): Promise<InstanceSshKey>`
- **Description:** Initiates a synchronous request to rotate the SSH key for the current instance.
- **Behavior:**
    - Makes a `POST` request to `/instance/{this.id}/ssh/key`.
    - Returns a `Promise` that resolves with the `InstanceSshKey` object on success.
    - Throws an `ApiError` or `ValueError` (if instance not associated with API client) on failure.

#### 7.2. `sshKeyRotateAsync()` (Asynchronous)
- **Signature:** `sshKeyRotateAsync(): Promise<InstanceSshKey>`
- **Description:** Initiates an asynchronous request to rotate the SSH key for the current instance.
- **Behavior:**
    - Makes an asynchronous `POST` request to `/instance/{this.id}/ssh/key`.
    - Returns a `Promise` that resolves with the `InstanceSshKey` object on success.
    - Throws an `ApiError` or `ValueError` (if instance not associated with API client) on failure.

## 8. Test Cases
- **Unit Tests:**
    - Verify that `sshKeyRotate` and `sshKeyRotateAsync` correctly construct the API request (URL, method).
    - Mock API responses to ensure correct parsing of `InstanceSshKey` object.
    - Test error handling for various API error codes (401, 403, 404, 500).
- **Integration Tests (if applicable):**
    - Create a test instance.
    - Call `sshKeyRotate` and `sshKeyRotateAsync` and verify that the returned `private_key`, `public_key`, and `password` are non-empty.
    - Verify that subsequent calls to `sshKeyRotate` or `sshKeyRotateAsync` return different keys, ensuring actual rotation.
    - (Optional) Attempt to establish an SSH connection with the new key to confirm its validity.
