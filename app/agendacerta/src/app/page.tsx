import Link from "next/link";

export default function HomePage() {
  return (
    <main className="card">
      <h1>AgendaCerta</h1>
      <p className="lead">
        Demo do MVP: painel da clínica + simulação de confirmação no WhatsApp
        (SIM / NÃO / REMARCAR). Sem integração Meta nesta fatia.
      </p>
      <div className="home-grid">
        <Link href="/painel" className="home-link">
          <strong>Painel da clínica</strong>
          <span>Lista vagas seed e status de confirmação.</span>
        </Link>
        <Link href="/mock-whatsapp" className="home-link">
          <strong>Mock WhatsApp</strong>
          <span>Simula a resposta do paciente e atualiza o status.</span>
        </Link>
      </div>
    </main>
  );
}
