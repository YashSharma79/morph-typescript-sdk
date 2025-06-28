import { MorphCloudClient, Instance } from '../src/index';
import { expect, beforeAll, afterAll, describe, it } from 'bun:test';

// Mock environment variables for testing
process.env.MORPH_API_KEY = process.env.MORPH_API_KEY || 'test_api_key';
process.env.MORPH_BASE_URL = process.env.MORPH_BASE_URL || 'http://localhost:3000';

// Mock the fetch function to simulate API responses
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url: string;
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  } else {
    url = ''; // Fallback for unexpected input type
  }
  const method = init?.method || 'GET';

  if (url.includes('/instance/') && url.includes('/ssh/key') && method === 'POST') {
    return new Response(JSON.stringify({
      object: 'instance_ssh_key',
      private_key: `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAKCAQEA...${Math.random()}...\n-----END RSA PRIVATE KEY-----`,
      public_key: `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...${Math.random()}... test@example.com`,
      password: `test_password_${Math.random()}`,
    }), { status: 200 });
  }

  // Default mock response for other requests (e.g., instance get/stop)
  if (url.includes('/instance/') && method === 'GET') {
    const instanceId = url.split('/instance/')[1].split('/')[0];
    return new Response(JSON.stringify({
      id: instanceId,
      object: 'instance',
      created: Date.now(),
      status: 'ready',
      spec: { vcpus: 1, memory: 512, disk_size: 8192 },
      refs: { snapshot_id: 'mock_snapshot_id', image_id: 'mock_image_id' },
      networking: { http_services: [] },
      metadata: {},
    }), { status: 200 });
  }

  if (url.includes('/instance/') && method === 'DELETE') {
    return new Response(null, { status: 200 });
  }

  return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
};

describe('SSH Key Rotation', () => {
  let client: MorphCloudClient;
  let instance: Instance;

  beforeAll(async () => {
    client = new MorphCloudClient();
    // Mock an instance for testing
    instance = new Instance({
      id: 'test_instance_id',
      object: 'instance',
      created: Date.now(),
      status: 'ready',
      spec: { vcpus: 1, memory: 512, disk_size: 8192 },
      refs: { snapshot_id: 'mock_snapshot_id', image_id: 'mock_image_id' },
      networking: { http_services: [] },
      metadata: {},
    }, client);
  });

  it('should rotate SSH key synchronously', async () => {
    const newKey = await instance.sshKeyRotate();
    expect(newKey).toBeDefined();
    expect(newKey.object).toBe('instance_ssh_key');
    expect(newKey.private_key).toBeString();
    expect(newKey.public_key).toBeString();
    expect(newKey.password).toBeString();
    expect(newKey.private_key.length).toBeGreaterThan(0);
    expect(newKey.public_key.length).toBeGreaterThan(0);
    expect(newKey.password.length).toBeGreaterThan(0);
  });

  it('should rotate SSH key asynchronously', async () => {
    const newKey = await instance.sshKeyRotateAsync();
    expect(newKey).toBeDefined();
    expect(newKey.object).toBe('instance_ssh_key');
    expect(newKey.private_key).toBeString();
    expect(newKey.public_key).toBeString();
    expect(newKey.password).toBeString();
    expect(newKey.private_key.length).toBeGreaterThan(0);
    expect(newKey.public_key.length).toBeGreaterThan(0);
    expect(newKey.password.length).toBeGreaterThan(0);
  });

  it('should return different keys on successive rotations', async () => {
    const key1 = await instance.sshKeyRotate();
    const key2 = await instance.sshKeyRotate();
    expect(key1.public_key).not.toBe(key2.public_key);
    expect(key1.private_key).not.toBe(key2.private_key);
    expect(key1.password).not.toBe(key2.password);
  });

  it('should throw error if instance not associated with client', async () => {
    const unassociatedInstance = new Instance({
      id: 'unassociated_instance',
      object: 'instance',
      created: Date.now(),
      status: 'ready',
      spec: { vcpus: 1, memory: 512, disk_size: 8192 },
      refs: { snapshot_id: 'mock_snapshot_id', image_id: 'mock_image_id' },
      networking: { http_services: [] },
      metadata: {},
    }, null as any); // Pass null for client to simulate unassociated instance

    await expect(unassociatedInstance.sshKeyRotate()).rejects.toThrow(
      'Instance object is not associated with an API client'
    );
    await expect(unassociatedInstance.sshKeyRotateAsync()).rejects.toThrow(
      'Instance object is not associated with an API client'
    );
  });
});
