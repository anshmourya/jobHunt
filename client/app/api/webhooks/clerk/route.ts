import { headers } from 'next/headers';

export async function POST(req: Request) {
  // Get Hook0 webhook URL from environment variables
  const HOOK0_WEBHOOK_URL = process.env.HOOK0_WEBHOOK_URL;
  
  if (!HOOK0_WEBHOOK_URL) {
    console.error('HOOK0_WEBHOOK_URL is not set in environment variables');
    return new Response('Server configuration error', { status: 500 });
  }

  // Get the headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id") ?? '';
  const svix_timestamp = headerPayload.get("svix-timestamp") ?? '';
  const svix_signature = headerPayload.get("svix-signature") ?? '';

  // Get the raw body as text
  const payload = await req.text();

  // Forward the webhook to Hook0
  try {
    const webhookType = headerPayload.get('webhook-type') ?? 'unknown';
    
    const response = await fetch(HOOK0_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Clerk-Event': webhookType,
        'X-Clerk-Webhook-Signature': svix_signature,
        'X-Clerk-Webhook-Timestamp': svix_timestamp,
        'X-Clerk-Webhook-Id': svix_id
      },
      body: payload // Forward the raw payload
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to forward webhook to Hook0:', errorText);
      return new Response(`Failed to forward webhook: ${errorText}`, { 
        status: response.status 
      });
    }

    return new Response('Webhook forwarded to Hook0', { status: 200 });
  } catch (error) {
    console.error('Error forwarding webhook to Hook0:', error);
    return new Response('Error occurred while processing webhook', {
      status: 500
    });
  }
}
