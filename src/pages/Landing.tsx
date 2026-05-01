import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Package,
  ClipboardList,
  Wrench,
  ShieldCheck,
  BarChart3,
  Boxes,
  Zap,
  ArrowRight,
  Check,
  X,
  Music2,
  Lightbulb,
  Video,
  Radio,
  Sparkles,
  Quote,
} from "lucide-react";
import heroImg from "@/assets/landing-hero.jpg";
import dashboardImg from "@/assets/landing-dashboard.jpg";
import equipImg from "@/assets/landing-equipment.jpg";

const features = [
  {
    icon: Boxes,
    title: "Cadastro completo de equipamentos",
    desc: "Foto, número de patrimônio, série, marca, modelo, acessórios, conservação e especificações técnicas dinâmicas por categoria.",
  },
  {
    icon: ClipboardList,
    title: "Ordens de Serviço inteligentes",
    desc: "Crie OS por evento, vincule equipamentos, controle saída e retorno. Movimentações de estoque registradas automaticamente.",
  },
  {
    icon: Wrench,
    title: "Manutenção rastreável",
    desc: "Histórico de reparos, próxima revisão, equipamentos parados — tudo num só lugar para você nunca perder um equipamento por descuido.",
  },
  {
    icon: ShieldCheck,
    title: "Permissões por setor",
    desc: "Som, Luz, Vídeo e Streaming operam em silos seguros. Admins veem tudo, staff só o que importa para ele.",
  },
  {
    icon: BarChart3,
    title: "Dashboard em tempo real",
    desc: "KPIs, alertas de OS atrasadas, equipamentos em uso e disponibilidade num painel direto ao ponto.",
  },
  {
    icon: Zap,
    title: "Rápido e na nuvem",
    desc: "Acesse de qualquer lugar, em qualquer dispositivo. Backup automático, segurança de nível enterprise.",
  },
];

const setores = [
  { icon: Music2, label: "Som" },
  { icon: Lightbulb, label: "Luz" },
  { icon: Video, label: "Vídeo" },
  { icon: Radio, label: "Streaming" },
];

const comparison = [
  { item: "Localizar um equipamento", planilha: "5–15 min", sistema: "3 segundos" },
  { item: "Saber quem está com o item", planilha: "Ligar / perguntar", sistema: "Visível na OS" },
  { item: "Histórico de manutenção", planilha: "Perdido", sistema: "Completo e rastreável" },
  { item: "Equipamentos atrasados", planilha: "Você descobre tarde", sistema: "Alertas automáticos" },
  { item: "Múltiplos setores", planilha: "Conflito de versão", sistema: "Permissões nativas" },
  { item: "Acesso remoto", planilha: "Mandar print", sistema: "Qualquer lugar, qualquer hora" },
];

const testimonials = [
  {
    quote:
      "Antes a gente perdia tempo procurando microfone antes de cada culto. Hoje é um clique e a gente sabe onde está, com quem está e quando volta.",
    name: "Rafael M.",
    role: "Coordenador de Som — Igreja",
  },
  {
    quote:
      "Reduzimos em 70% o sumiço de cabos e acessórios em eventos. O controle de OS por evento mudou nossa operação.",
    name: "Luana P.",
    role: "Produtora de Eventos",
  },
  {
    quote:
      "A separação por setor é genial. Cada equipe cuida do seu, e eu como gestor vejo o todo. Indispensável.",
    name: "Diego A.",
    role: "Diretor Técnico — Produtora AV",
  },
];

const faqs = [
  {
    q: "Para que tipo de empresa o sistema serve?",
    a: "Produtoras audiovisuais, igrejas, empresas de locação de equipamentos, casas de show, escolas técnicas, agências de eventos — qualquer operação que controle estoque de áudio, vídeo, iluminação ou streaming.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. É 100% web. Basta acessar pelo navegador no computador, tablet ou celular. Atualizações são automáticas.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Usamos infraestrutura de nuvem com criptografia, backup automático e isolamento de dados por organização. Permissões granulares por papel (admin/staff) e por setor.",
  },
  {
    q: "Como funciona o controle por setor?",
    a: "O administrador cadastra setores (Som, Luz, Vídeo, Streaming, ou os que você quiser) e atribui cada usuário staff ao seu setor. Cada um vê e gerencia somente os equipamentos do próprio setor; admins veem tudo.",
  },
  {
    q: "Consigo registrar quando um equipamento sai e volta?",
    a: "Sim, e de forma automática. Ao confirmar uma Ordem de Serviço, o sistema registra a saída de cada equipamento. Ao fechar a OS, registra o retorno. O histórico completo fica disponível para auditoria.",
  },
  {
    q: "Posso experimentar antes de contratar?",
    a: "Sim. Oferecemos acesso para você testar com seus dados reais. Fale com a gente para liberar.",
  },
];

export default function Landing() {
  // SEO básico
  useEffect(() => {
    document.title = "AV Control — Controle de Estoque e OS para Audiovisual";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta(
      "description",
      "Sistema completo de controle de estoque e ordens de serviço para produtoras de áudio, vídeo, iluminação e streaming. Permissões por setor, manutenção rastreável e dashboard em tempo real.",
    );
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.origin + "/");
  }, []);

  return (
    <div className="min-h-screen bg-[#06080F] text-white antialiased overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#06080F]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">AV Control</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition">Recursos</a>
            <a href="#precos" className="hover:text-white transition">Preços</a>
            <a href="#comparativo" className="hover:text-white transition">Comparativo</a>
            <a href="#depoimentos" className="hover:text-white transition">Depoimentos</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/80 hover:text-white transition hidden sm:inline">
              Entrar
            </Link>
            <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/30">
              <Link to="/cadastro">Teste 7 dias grátis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(6,8,15,0.55) 0%, rgba(6,8,15,0.85) 60%, #06080F 100%), url(${heroImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/20 blur-[140px] -z-10" />

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 md:pt-32 md:pb-40 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Feito para produtoras audiovisuais
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-5xl mx-auto">
            Pare de <span className="text-white/40 line-through">perder equipamento</span>.<br />
            Comece a <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">controlar</span> seu estoque.
          </h1>

          <p className="mt-8 text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            O sistema completo de controle de estoque e ordens de serviço para
            <span className="text-white"> Som, Luz, Vídeo e Streaming</span>. Saiba
            onde está cada equipamento, quem está usando e quando volta — em tempo real.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base h-14 px-8 shadow-2xl shadow-blue-500/40">
              <Link to="/cadastro">
                Começar 7 dias grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white h-14 px-8 text-base">
              <a href="#precos">Ver planos</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-white/50">Sem cartão de crédito • Cancele quando quiser</p>

          {/* setores chips */}
          <div className="mt-14 flex flex-wrap justify-center gap-3">
            {setores.map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/80">
                <s.icon className="w-4 h-4 text-blue-400" />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* dashboard mockup */}
        <div className="max-w-6xl mx-auto px-6 -mt-10 md:-mt-20 pb-20 relative">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_50px_100px_-20px_rgba(37,99,235,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-cyan-500/10 pointer-events-none z-10" />
            <img
              src={dashboardImg}
              alt="Dashboard do AV Control mostrando KPIs de equipamentos, gráfico por categoria e equipamentos recentes"
              width={1600}
              height={1024}
              className="w-full h-auto block"
            />
          </div>
        </div>
      </header>

      {/* STATS */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: "70%", l: "Menos extravio de equipamentos" },
            { n: "3s", l: "Para localizar qualquer item" },
            { n: "4", l: "Setores integrados nativamente" },
            { n: "100%", l: "Auditável — cada saída e retorno" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                {s.n}
              </div>
              <div className="mt-2 text-sm text-white/60">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <div className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">Recursos</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Tudo que sua operação precisa,<br />num só sistema.
            </h2>
            <p className="mt-6 text-lg text-white/60">
              Construído por quem entende a rotina caótica de produção audiovisual.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-blue-500/40 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-700/10 border border-blue-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition">
                  <f.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="py-24 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">Detalhes do equipamento</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Cada equipamento com seu DNA digital.
            </h2>
            <p className="mt-6 text-lg text-white/70 leading-relaxed">
              Foto, número de patrimônio, série, marca, modelo, estado de conservação,
              acessórios, próxima revisão e especificações técnicas dinâmicas por categoria.
              Histórico completo de uso e manutenção — tudo a um clique.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Especificações técnicas adaptadas por categoria",
                "Upload de foto em alta qualidade",
                "Histórico de OSs e movimentações",
                "Alertas de revisão e manutenção",
              ].map((i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80">{i}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img
                src={equipImg}
                alt="Tela de detalhe de um microfone Shure SM58 com especificações, histórico e estado de conservação"
                width={1280}
                height={1024}
                loading="lazy"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATIVO */}
      <section id="comparativo" className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">Antes vs Depois</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Da planilha esquecida ao<br />controle absoluto.
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02]">
            <div className="grid grid-cols-3 bg-white/[0.04] border-b border-white/10 text-sm font-semibold">
              <div className="p-5 text-white/70">Tarefa</div>
              <div className="p-5 text-red-300/80 flex items-center gap-2">
                <X className="w-4 h-4" /> Planilha
              </div>
              <div className="p-5 text-blue-300 flex items-center gap-2">
                <Check className="w-4 h-4" /> AV Control
              </div>
            </div>
            {comparison.map((row, i) => (
              <div
                key={row.item}
                className={`grid grid-cols-3 text-sm md:text-base ${
                  i % 2 === 0 ? "bg-white/[0.01]" : ""
                } border-b border-white/5 last:border-0`}
              >
                <div className="p-5 font-medium text-white/90">{row.item}</div>
                <div className="p-5 text-white/50">{row.planilha}</div>
                <div className="p-5 text-white font-medium">{row.sistema}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-24 md:py-32 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">Quem já usa</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Operações que dormem tranquilas.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 flex flex-col"
              >
                <Quote className="w-8 h-8 text-blue-400/60 mb-4" />
                <p className="text-white/85 leading-relaxed flex-1">"{t.quote}"</p>
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-white/55">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">FAQ</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Perguntas frequentes
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-white/[0.03] border border-white/10 rounded-xl px-6 data-[state=open]:border-blue-500/40"
              >
                <AccordionTrigger className="text-left font-semibold text-white hover:no-underline py-5">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-white/70 leading-relaxed pb-5">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-blue-900/10 to-transparent -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/30 blur-[150px] -z-10" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Comece a controlar seu estoque<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              em menos de 10 minutos.
            </span>
          </h2>
          <p className="mt-6 text-lg text-white/70 max-w-xl mx-auto">
            Sem instalação. Sem cartão. Cadastre seus equipamentos e veja a diferença na próxima produção.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base h-14 px-10 shadow-2xl shadow-blue-500/40">
              <Link to="/login">
                Começar agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white h-14 px-8 text-base">
              <a href="mailto:contato@avcontrol.com.br?subject=Quero falar com vendas">
                Falar com vendas
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <span className="font-bold">AV Control</span>
            <span className="text-white/40 text-sm ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition">Recursos</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <Link to="/login" className="hover:text-white transition">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
