import type { Consents } from '@/lib/auth-client';

interface AuthTermsProps {
  value: Consents;
  onChange(value: Consents): void;
  disabled: boolean;
}

const statements: { key: keyof Consents; label: string }[] = [
  { key: 'peerSupport', label: 'I understand this is peer support and does not replace professional care.' },
  { key: 'emergency', label: 'I understand this is not an emergency service. In danger, I will call 112 or Tele-MANAS 14416.' },
  { key: 'ageAndTerms', label: 'I am 18+ (or have permission) and agree to the terms and data storage described above.' },
];

export function AuthTerms({ value, onChange, disabled }: AuthTermsProps) {
  return (
    <div className="flex flex-col gap-3 text-left">
      <details className="ss-auth-terms rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <summary className="cursor-pointer text-xs font-medium text-white/80">Terms & privacy</summary>
        <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-[#a1a1aa]">
          <p>Safe Space offers coping tools, a journal and peer support. It cannot diagnose or treat conditions and is not a licensed therapist, doctor or crisis service.</p>
          <p>In an emergency, call 112. Tele-MANAS is available at 14416.</p>
          <p>Your account name, email, password hash, consent and sessions are stored on the server. Journal entries, contacts and coping plans stay in this browser under your account. They are not encrypted; clearing browser data removes them.</p>
          <p>Chat messages may be processed when an AI integration is available. Use the app kindly and lawfully, and reach out to trusted people and professionals when needed.</p>
          <p>You must be 18 or older, or have a parent or guardian's permission.</p>
        </div>
      </details>
      {statements.map(({ key, label }) => (
        <label key={key} className="ss-auth-consent flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-[#a1a1aa]">
          <input type="checkbox" checked={value[key]} disabled={disabled}
            onChange={(event) => onChange({ ...value, [key]: event.target.checked })} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}
