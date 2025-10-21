import { upsertAgentProfile } from "../actions";

export default function AgentSetupPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Profil agent</h1>
      <p className="text-sm text-muted-foreground">Completează profilul public.</p>

      <form action={upsertAgentProfile} className="mt-4 grid gap-3">
        <input name="fullName" className="input" placeholder="Nume complet" required />
        <input name="agencyName" className="input" placeholder="Agenție (opțional)" />
        <input name="phone" className="input" placeholder="Telefon" />
        <input name="websiteUrl" className="input" placeholder="Website (opțional)" />
        <input name="avatarUrl" className="input" placeholder="Avatar URL (opțional)" />
        <input name="licenseId" className="input" placeholder="Licență (opțional)" />
        <button className="btn">Salvează</button>
      </form>
    </div>
  );
}
