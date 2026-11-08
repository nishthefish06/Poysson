import { z } from 'zod';
import { AttackType, Difficulty, ScenarioDraft, describeIssues } from '@hackutd2026/shared';

const Body = z.object({
  attackType: AttackType,
  difficulty: Difficulty,
  focus: z.string().max(500).optional(),
});

const PROMPT = `You write practice scenarios for a cybersecurity TRAINING app for customer-care employees at a mobile carrier.
Everything is fictional: invented brands, domains ending in ".example", phone numbers like +1 (555) 01xx-xxxx. No real brands or people.
Reply with ONLY a JSON object in exactly this shape:
{
  "attackType": string, "difficulty": "easy"|"medium"|"hard",
  "title": string (<=200), "summary": string (<=1000), "briefing": string (<=8000, start with "SYNTHETIC DRILL."),
  "content": { "steps": [ {
      "id": string (<=32, unique), "channel": "sms"|"email"|"call"|"chat"|"popup"|"system"|"social"|"web",
      "from": string, "subject": string ("" if none), "body": string (<=4000),
      "links": [{"label": string, "url": string}] (optional),
      "form": {"fields": [{"name": string, "label": string, "kind": "text"|"password"}], "submitLabel": string} (optional, web/popup; omit the key otherwise, never null)
  } ] (2 to 6 steps, mix malicious and benign) },
  "rubric": {
    "stepFlags": [ {"stepId": string, "isMalicious": boolean, "redFlags": [string]} ] (one per step),
    "expectedActions": [string] (what a well-trained employee does),
    "scoring": [ {"criterion": string, "points": integer} ] (points MUST add up to exactly 100)
  }
}`;

/**
 * OWNER: Person 4. AI draft of a practice scenario for an admin to review, edit and save.
 * Uses Nemotron when configured; otherwise returns a valid example so the admin page still works.
 * TODO (Person 1/4): only admins should reach this route.
 */
export default defineEventHandler(async (event) => {
  const { attackType, difficulty, focus } = await parseBody(event, Body);

  if (nemotronEnabled()) {
    try {
      const draft = await chatJson(
        z.preprocess((raw) => cleanScenarioDraft(raw, attackType, difficulty), ScenarioDraft),
        PROMPT,
        `attackType: ${attackType}\ndifficulty: ${difficulty}\nfocus: ${focus || '(none)'}\nJSON only.`,
        { temperature: 0.7, maxTokens: 3000 }
      );
      return draft;
    } catch (e) {
      throw createError({
        statusCode: 502,
        statusMessage: e instanceof Error ? e.message : 'generation failed',
      });
    }
  }

  const result = ScenarioDraft.safeParse({
    attackType,
    difficulty,
    title: 'Password expiry email (example: set NVIDIA_API_KEY + NEMOTRON_MODEL for AI drafts)',
    summary: 'An "IT" email says your password expires in an hour.',
    briefing: 'SYNTHETIC DRILL. Work through your inbox as you normally would.',
    content: {
      steps: [
        {
          id: 'e1',
          channel: 'email',
          from: 'IT Service Desk <it-support@corp-heIpdesk.example>',
          subject: 'Action required: password expires in 60 minutes',
          body: 'Your password expires soon. Keep your current password to avoid losing access.',
          links: [{ label: 'Keep my password', url: 'http://corp-heIpdesk.example/keep' }],
        },
      ],
    },
    rubric: {
      stepFlags: [{ stepId: 'e1', isMalicious: true, redFlags: ['lookalike domain', 'urgency'] }],
      expectedActions: ['Report as phishing', 'Do not click the link'],
      scoring: [
        { criterion: 'Reported the email', points: 60 },
        { criterion: 'Did not click', points: 40 },
      ],
    },
  });
  if (!result.success) throw createError({ statusCode: 500, statusMessage: describeIssues(result.error) });
  return result.data;
});
