/**
 * Real, publicly reported attacks on carrier and help-desk staff. Each round's attacker is handed one or
 * two of these as its playbook, adapted to the fictional company, so the lures follow what actually
 * happens to people in this job. Written in our own words; no real company or person appears in a title
 * or in what the model sees, only the public source the employee can look up afterwards.
 */
import type { ArenaMode } from '@hackutd2026/shared/arena';

export interface Incident {
  id: string;
  title: string; // what the reveal / debrief may call it
  year: number;
  source: { name: string; url: string };
  pattern: string; // what happened, in general terms
  play: string; // how the attacker should adapt it inside the simulation
  tells: string; // the signs the employee should be able to catch
  modes: ArenaMode[];
}

export const INCIDENTS: Incident[] = [
  {
    id: 'bribe-texts',
    title: 'Carrier staff offered cash per SIM swap by text',
    year: 2024,
    source: {
      name: 'BleepingComputer',
      url: 'https://www.bleepingcomputer.com/news/security/t-mobile-verizon-workers-get-texts-offering-300-for-sim-swaps/',
    },
    pattern:
      'Care and store employees at several carriers got texts from strangers who said they found the number in an employee directory and offered a few hundred dollars per SIM swap, asking to continue on an encrypted chat app. Another carrier\'s staff got a similar offer for resetting a customer email.',
    play:
      'Text their work phone as a stranger offering money per SIM change or per customer email change, claiming to have their number from the staff directory, and push to move the chat off-platform. If they bite, ask them to change a specific customer\'s SIM or email.',
    tells: 'unsolicited money offer, number "from the directory", move to another chat app, asks to change customer records',
    modes: ['bait'],
  },
  {
    id: 'insider-swaps',
    title: 'Store and care employees paid per SIM swap',
    year: 2024,
    source: {
      name: 'U.S. Department of Justice',
      url: 'https://www.justice.gov/usao-nj/pr/former-telecommunications-company-manager-admits-role-sim-swapping-scheme',
    },
    pattern:
      'Federal cases describe carrier store staff and managers who were sent a phone number, the account PIN and a new SIM number, and paid roughly $500 to $2,000 per swap; the swapped numbers were used to drain the customers\' bank and crypto accounts.',
    play:
      'Recruit gradually: a friendly outsider first asks a "small favor" about one customer line, then sends a phone number and a new SIM number and offers payment.',
    tells: 'payment for account changes, favors outside the normal ticket flow, someone else supplying the customer\'s PIN',
    modes: ['bait'],
  },
  {
    id: 'customer-pretext',
    title: 'Criminals posing as customers to get a SIM swap',
    year: 2022,
    source: { name: 'FBI IC3 PSA I-020822', url: 'https://www.ic3.gov/PSA/2022/PSA220208' },
    pattern:
      'The FBI reported that most SIM swaps come from social engineering: a criminal impersonates the customer and talks a carrier representative into moving the number to a SIM the criminal holds, then uses it to reset the victim\'s other accounts.',
    play:
      'Be a "customer" in the care chat queue who urgently needs their number moved to a new SIM (lost phone, travelling), cannot pass the account PIN, and offers other personal details or gets angry instead.',
    tells: 'fails the PIN, offers other details instead, urgency, pressure to skip verification',
    modes: ['bait', 'breach'],
  },
  {
    id: 'port-out',
    title: 'Port-out fraud: moving a number to another carrier',
    year: 2023,
    source: { name: 'FCC Fact Sheet, WC Docket 21-341', url: 'https://docs.fcc.gov/public/attachments/DOC-397990A1.pdf' },
    pattern:
      'In port-out fraud the criminal, posing as the customer, asks to transfer the number to a different carrier. The FCC\'s 2023 rules require secure customer authentication and a notice to the customer before a SIM change or port-out, and training for staff.',
    play:
      'Ask (as a customer, or as a "manager" relaying a VIP request) for the number transfer PIN or to approve a port-out right now, skipping the customer notice "because they are travelling".',
    tells: 'asks to skip the customer notice, transfer PIN requested by someone other than the verified customer',
    modes: ['bait', 'breach'],
  },
  {
    id: 'sso-smishing',
    title: 'Staff texted that their password expired, linking to a fake sign-in page',
    year: 2022,
    source: {
      name: 'Group-IB "0ktapus" research, via SecurityWeek',
      url: 'https://www.securityweek.com/twilio-cloudflare-attacked-part-campaign-hit-over-130-organizations',
    },
    pattern:
      'A 2022 campaign texted employees of 130+ companies, telecoms among them, posing as IT: their password had expired or their schedule had changed, with a link to a look-alike single sign-on page that captured passwords and one-time codes in real time.',
    play:
      'Text or email them as IT: password expiring or shift schedule changed, with a link to a look-alike company sign-in page that also asks for the one-time code.',
    tells: 'look-alike domain, sign-in link sent by text, asks for the one-time code, urgency',
    modes: ['bait'],
  },
  {
    id: 'helpdesk-vishing',
    title: 'Callers posing as the IT help desk',
    year: 2023,
    source: { name: 'CISA advisory AA23-320A', url: 'https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a' },
    pattern:
      'A group that has repeatedly targeted telecoms calls employees pretending to be IT or the help desk to get passwords or MFA codes or to have a remote-access tool installed, and floods them with MFA push prompts until one is approved.',
    play:
      'Call (as a voicemail or call transcript) or chat as the help desk: "we are migrating your sign-in, read me the code we just sent" or "approve the prompt on your phone", after a burst of sign-in prompts.',
    tells: 'IT asking for a code, prompts you did not start, caller who won\'t let you call back through the directory',
    modes: ['bait', 'breach'],
  },
  {
    id: 'helpdesk-reset',
    title: 'Attackers posing as employees to get MFA reset',
    year: 2023,
    source: { name: 'CISA advisory AA23-320A', url: 'https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a' },
    pattern:
      'The same advisory describes attackers who already hold a password calling the help desk as that employee to have the password or MFA device reset, then signing in quietly and adding their own device.',
    play:
      'Once inside, add your own sign-in device and a mail rule, then message them as a coworker or IT so the new device notification looks expected.',
    tells: 'new sign-in device you did not add, password-reset notices you did not request',
    modes: ['breach'],
  },
  {
    id: 'insider-malware',
    title: 'Call-center staff recruited to install "tools" on work PCs',
    year: 2021,
    source: {
      name: 'U.S. Department of Justice, via SecurityAffairs',
      url: 'https://securityaffairs.com/122382/cyber-crime/att-hacking-scheme-man-sentenced.html',
    },
    pattern:
      'A man was sentenced to 12 years for recruiting carrier call-center employees through social media, paying them to unlock phones and later to install custom tools and hardware on the company network so he could do it remotely.',
    play:
      'As a friendly contact or "vendor", offer money or a favor for running a small "helper tool" on their work computer or plugging in a device, framed as making the queue faster.',
    tells: 'software from outside IT, payment from a stranger, recruiting coworkers',
    modes: ['bait'],
  },
  {
    id: 'impersonate-coworker',
    title: 'Criminals impersonating employees and managers',
    year: 2024,
    source: { name: 'FBI IC3 PSA I-041124', url: 'https://ic3.gov/PSA/2024/PSA240411' },
    pattern:
      'The FBI warned that criminals impersonate employees to support staff, and use SIM swaps and call forwarding, to get into corporate accounts, and advised training help-desk and customer-support staff on these schemes.',
    play:
      'Message them as a supervisor or coworker who needs an urgent favor: approve a SIM change for a VIP, change a customer email, or send the customer export "for the audit", and discourage checking.',
    tells: 'manager asking you to skip a step, unusual channel, urgency, discourages verification',
    modes: ['bait', 'breach'],
  },
];
