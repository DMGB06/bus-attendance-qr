
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="stage">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bgimg" src="/fondo.jpg" alt="" aria-hidden="true" fetchPriority="high" />
      <div className="veil" />
      <section className="card">
        <div className="band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/escudo.png" alt="Escudo de la Municipalidad de Cerro Azul" width={190} height={169} />
        </div>
        <div className="body">
          <div className="title">
            <h1>CerroBus</h1>
            <p>Panel de administración</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert" role="alert">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.25" /><path d="M12 7.5v5.5M12 16.4v.1" /></svg>
      <span>{children}</span>
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert info" role="status">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.25" /><path d="M12 7v5.25l3.25 2" /></svg>
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending && <span className="spin" aria-hidden="true" />}
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}
