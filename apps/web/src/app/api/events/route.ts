import { z } from 'zod';
import { EVENT_TYPES } from '@ln/types';
import { guard, parseBody, requireUser } from '@/server/http';
import { recordEvent } from '@/server/modules/events';

export const dynamic = 'force-dynamic';

const schema = z.object({
  eventType: z.enum(EVENT_TYPES),
  payload: z.record(z.unknown()).default({}),
});

export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = parseBody(schema, body);
    recordEvent(user.id, parsed.eventType, parsed.payload);
    return { recorded: true };
  });
}
