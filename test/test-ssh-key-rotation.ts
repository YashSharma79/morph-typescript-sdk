import { MorphCloudClient } from '../src/index';

(async () => {
  const apiKey = process.env.MORPH_API_KEY;
  if (!apiKey) { console.error('MORPH_API_KEY must be set'); process.exit(1); }
  const baseUrl = process.env.MORPH_BASE_URL;
  const client = new MorphCloudClient({ apiKey, baseUrl });

  console.log('Retrieving images');
  const images = await client.images.list();
  if (images.length === 0) { console.error('No images available'); process.exit(1); }
  const baseImage = images.find(img => img.id.toLowerCase().includes('ubuntu')) || images[0];
  console.log(`Using base image: ${baseImage.id}`);

  console.log('Creating snapshot');
  const snapshot = await client.snapshots.create({ imageId: baseImage.id, vcpus: 1, memory: 512, diskSize: 8192 });
  console.log(`Created snapshot: ${snapshot.id}`);

  console.log('Starting instance');
  const instance = await client.instances.start({ snapshotId: snapshot.id });
  console.log(`Created instance: ${instance.id}`);

  console.log('Waiting for instance to be ready');
  await instance.waitUntilReady(300);
  console.log('Instance is ready');

  console.log('Testing GET SSH key endpoint');
  const key = await client.GET(`/instance/${instance.id}/ssh/key`);
  if (key.object !== 'instance_ssh_key' || !key.private_key || !key.public_key || !key.password) {
    console.error('Failed to retrieve SSH key', key);
    process.exit(1);
  }
  console.log('GET SSH key succeeded');

  console.log('Testing rotate SSH key endpoint');
  const newKey = await client.POST(`/instance/${instance.id}/ssh/key`);
  if (newKey.object !== 'instance_ssh_key' || !newKey.private_key || !newKey.public_key || !newKey.password || newKey.public_key === key.public_key) {
    console.error('SSH key rotation validation failed', { key, newKey });
    process.exit(1);
  }
  console.log('SSH key rotated successfully');

  console.log('Testing SSH connection before rotation');
  let sshClient = await instance.ssh();
  let result = await sshClient.execCommand("echo pre-rotation test");
  if (result.code !== 0 || !result.stdout.includes('pre-rotation test')) {
    console.error('SSH connection failed before rotation', result);
    process.exit(1);
  }
  sshClient.dispose();
  console.log('SSH connection before rotation succeeded');

  console.log('Rotating SSH key again');
  await client.POST(`/instance/${instance.id}/ssh/key`);
  await new Promise(res => setTimeout(res, 2000));
  console.log('Testing SSH connection after rotation');
  sshClient = await instance.ssh();
  result = await sshClient.execCommand("echo post-rotation test");
  if (result.code !== 0 || !result.stdout.includes('post-rotation test')) {
    console.error('SSH connection failed after rotation', result);
    process.exit(1);
  }
  sshClient.dispose();
  console.log('SSH connection after rotation succeeded');

  console.log('Testing key uniqueness across multiple rotations');
  const keys = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const k = await client.POST(`/instance/${instance.id}/ssh/key`);
    keys.add(k.public_key);
  }
  if (keys.size !== 3) {
    console.error(`Expected 3 unique keys, got ${keys.size}`);
    process.exit(1);
  }
  console.log('Key uniqueness test succeeded');

  console.log('Cleaning up resources');
  await instance.stop();
  await snapshot.delete();

  console.log('SSH key rotation integration tests passed');
  process.exit(0);
})();
