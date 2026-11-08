import { z } from 'zod';
import { AttackType, Difficulty, ScenarioDraft, describeIssues } from '@hackutd2026/shared';

const Body = z.object({
  attackType: AttackType,
  difficulty: Difficulty,
  focus: z.string().max(500).optional(),
});

/**
 * OWNER: Person 4. Draft a practice scenario with AI for an admin to review and save.
 * TODO: prompt Nemotron/Gemini with the ScenarioDraft shape (+ fictional brands only, rubric
 * points must total 100), parse JSON, validate with ScenarioDraft. Stub returns a valid example.
 * TODO (Person 1/4): only admins should reach this route.
 */
export default defineEventHandler(async (event) => {
  const { attackType, difficulty } = await parseBody(event, Body);
  const result = ScenarioDraft.safeParse({
    attackType,
    difficulty,
    title: 'Password expiry email (AI stub)',
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
  if (!result.success) throw createError({ statusCode: 502, statusMessage: describeIssues(result.error) });
  return result.data;
});
