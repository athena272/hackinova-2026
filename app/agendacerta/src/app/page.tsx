"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutDashboard, MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <motion.section
      className="home-hero"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="home-hero-copy">
        <p className="hero-brand">AgendaCerta</p>
        <h1 className="hero-headline">
          Confirme a agenda no WhatsApp. Liberte a vaga a tempo.
        </h1>
        <p className="hero-support">
          Demo do MVP para clínicas: painel de status e confirmação em 1 toque,
          sem Meta API nesta fatia.
        </p>
        <div className="hero-ctas">
          <Link href="/painel" className="cta cta-primary">
            <LayoutDashboard size={18} aria-hidden />
            Abrir painel
          </Link>
          <Link href="/mock-whatsapp" className="cta cta-secondary">
            <MessageCircle size={18} aria-hidden />
            Simular WhatsApp
          </Link>
        </div>
      </div>
      <div className="home-hero-media">
        <Image
          src="/hero-clinica.png"
          alt="Recepção de clínica com celular mostrando confirmação de consulta"
          fill
          priority
          sizes="(max-width: 860px) 100vw, 50vw"
        />
      </div>
    </motion.section>
  );
}
