import { z } from 'zod';

const Body = z.object({ toRef: z.string(), text: z.string().max(600) });

// OWNER: Person 4. Sends a labeled drill text to a consenting teammate's phone.
export default defineEventHandler(async (event) => {
  const { toRef, text } = await parseBody(event, Body);
  return { ok: true, ...(await sendDrillSms(resolveDemoPhone(toRef), text)) };
});
