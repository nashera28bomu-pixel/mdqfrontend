import { useState, type FormEvent } from "react";
import { Alert } from "../../components/ui/Feedback";
import { Button } from "../../components/ui/Button";
import { PasswordField, TextField } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { Link, useNavigate, useSearchParams } from "../../lib/router";
import { errorMessage, request } from "../../lib/api";
import { ALLOWED_EMAIL_DOMAINS, SHARED_CAT_PARAM_PATTERN } from "../../lib/config";
import { usePageMeta } from "../../lib/meta";
import {
  PASSWORD_MAX,
  PASSWORD_REQUIREMENTS,
  PASSWORD_SYMBOLS,
  checkPassword,
  checkStudentEmail,
  checkWhatsApp,
  signupSchema,
  validate,
  type FieldErrors,
} from "../../lib/validation";
import { AuthCard } from "./AuthParts";

type Field = "email" | "whatsapp" | "password" | "confirm";

export default function SignupPage() {
  usePageMeta({ title: "Create your account | MDQ", path: "/signup", description: "Create your MDQ account with your student email and get a free CAT and a free full exam." });
  const params = useSearchParams();
  const navigate = useNavigate();
  const sharedCat = params.get("sharedCat");
  const validShared = sharedCat && SHARED_CAT_PARAM_PATTERN.test(sharedCat) ? sharedCat : null;

  const [values, setValues] = useState({ email: "", whatsapp: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);

  const set = (key: Field) => (event: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: event.target.value }));
  const checks = checkPassword(values.password.trim());

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const check = validate<Field>(signupSchema, values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    // Payload identical to the original signup.js: { studentEmail, whatsAppNumber, password }.
    const payload = {
      studentEmail: checkStudentEmail(values.email).clean,
      whatsAppNumber: checkWhatsApp(values.whatsapp).clean,
      password: values.password.trim(),
    };
    setBusy(true);
    try {
      const result = await request<{ error?: string; emailStatus?: string }>("/signup", { method: "POST", json: payload });
      if (!result.ok) {
        setFormError(result.data.error || "Could not create your account.");
        return;
      }
      const query = new URLSearchParams({ email: payload.studentEmail, created: "1" });
      if (validShared) query.set("sharedCat", validShared);
      query.set("emailStatus", result.data.emailStatus || "sending");
      navigate(`/verify-email?${query.toString()}`);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      icon="shieldCheck"
      title="Create your account"
      subtitle="Use your student email. After you verify it, your first CAT and full exam are free."
      footer={
        <p>
          Already have an account? <Link to={validShared ? `/login?sharedCat=${encodeURIComponent(validShared)}` : "/login"}>Log in</Link>
        </p>
      }
    >
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <form className="form" onSubmit={onSubmit} noValidate>
        <TextField
          label="Student email"
          type="email"
          name="email"
          icon="mail"
          autoComplete="email"
          placeholder="name@students.jkuat.ac.ke"
          value={values.email}
          onChange={set("email")}
          onBlur={() => {
            if (values.email.trim() && !checkStudentEmail(values.email).valid) setErrors((e) => ({ ...e, email: "You must use your student email" }));
            else setErrors((e) => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          hint={
            <>
              Only supported university emails are accepted.{" "}
              <button type="button" className="link-btn" onClick={() => setDomainsOpen((o) => !o)} aria-expanded={domainsOpen} aria-controls="domain-list">
                {domainsOpen ? "Hide list" : "See the list"}
              </button>
            </>
          }
          required
        />
        {domainsOpen ? (
          <ul id="domain-list" className="domain-list" aria-label="Accepted email domains">
            {ALLOWED_EMAIL_DOMAINS.map((domain) => (
              <li key={domain}>@{domain}</li>
            ))}
          </ul>
        ) : null}
        <TextField
          label="WhatsApp number"
          type="tel"
          name="whatsappnumber"
          icon="phone"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0712345678"
          maxLength={14}
          value={values.whatsapp}
          onChange={set("whatsapp")}
          error={errors.whatsapp}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={values.password}
          onChange={set("password")}
          error={errors.password}
          required
        />
        <ul className="reqs" aria-label="Password requirements">
          {PASSWORD_REQUIREMENTS.map((req) => {
            const met = checks[req.key];
            return (
              <li key={req.key} className={met ? "is-met" : ""}>
                <Icon name={met ? "checkCircle" : "circle"} size={15} />
                <span>{req.label}</span>
                <span className="sr-only">{met ? " (met)" : " (not met yet)"}</span>
              </li>
            );
          })}
        </ul>
        <p className="field__hint">Special characters: {PASSWORD_SYMBOLS}</p>
        <PasswordField
          label="Confirm password"
          name="cpassword"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={values.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
          required
        />
        <Button type="submit" size="lg" block loading={busy} iconRight="arrowRight">
          {busy ? "Creating your account…" : "Create account"}
        </Button>
        <p className="legal-note">
          By creating an account you agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy-policy">Privacy Policy</Link>.
        </p>
      </form>
    </AuthCard>
  );
}
