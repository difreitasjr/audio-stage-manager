
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create user_roles table first (needed by has_role function)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create setores table
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Setores are viewable by authenticated users" ON public.setores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert setores" ON public.setores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update setores" ON public.setores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete setores" ON public.setores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  setor_id UUID REFERENCES public.setores(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user setor
CREATE OR REPLACE FUNCTION public.get_user_setor(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor_id FROM public.profiles
  WHERE user_id = _user_id
$$;

-- Profiles RLS
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Equipamentos table
CREATE TABLE public.equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  numero_serie TEXT UNIQUE,
  setor_id UUID REFERENCES public.setores(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_uso', 'danificado', 'manutencao')),
  localizacao TEXT,
  data_aquisicao DATE,
  valor DECIMAL(12,2),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select equipamentos" ON public.equipamentos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert equipamentos" ON public.equipamentos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update equipamentos" ON public.equipamentos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete equipamentos" ON public.equipamentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own setor equipamentos" ON public.equipamentos FOR SELECT TO authenticated USING (setor_id = public.get_user_setor(auth.uid()));
CREATE POLICY "Staff can update own setor equipamentos" ON public.equipamentos FOR UPDATE TO authenticated USING (setor_id = public.get_user_setor(auth.uid()));
CREATE POLICY "Staff can insert own setor equipamentos" ON public.equipamentos FOR INSERT TO authenticated WITH CHECK (setor_id = public.get_user_setor(auth.uid()));

-- Ordens de serviço
CREATE TABLE public.ordens_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero SERIAL,
  data_saida DATE NOT NULL,
  data_retorno_prevista DATE NOT NULL,
  responsavel_id UUID REFERENCES public.profiles(id) NOT NULL,
  setor_id UUID REFERENCES public.setores(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'retornado', 'atrasada')),
  cliente TEXT NOT NULL,
  contato_cliente TEXT,
  local_evento TEXT,
  descricao_servico TEXT,
  observacoes TEXT,
  checklist_funciona BOOLEAN DEFAULT false,
  checklist_acessorios BOOLEAN DEFAULT false,
  checklist_completo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select ordens" ON public.ordens_servico FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert ordens" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ordens" ON public.ordens_servico FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ordens" ON public.ordens_servico FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own setor ordens" ON public.ordens_servico FOR SELECT TO authenticated USING (setor_id = public.get_user_setor(auth.uid()));
CREATE POLICY "Staff can create ordens for own setor" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (setor_id = public.get_user_setor(auth.uid()));
CREATE POLICY "Staff can update own setor ordens" ON public.ordens_servico FOR UPDATE TO authenticated USING (setor_id = public.get_user_setor(auth.uid()));

-- Ordem equipamentos (junction table)
CREATE TABLE public.ordem_equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
  equipamento_id UUID REFERENCES public.equipamentos(id) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ordem_equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all ordem_equipamentos" ON public.ordem_equipamentos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view ordem_equipamentos" ON public.ordem_equipamentos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ordens_servico os WHERE os.id = ordem_id AND os.setor_id = public.get_user_setor(auth.uid()))
);
CREATE POLICY "Staff can insert ordem_equipamentos" ON public.ordem_equipamentos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ordens_servico os WHERE os.id = ordem_id AND os.setor_id = public.get_user_setor(auth.uid()))
);

-- Movimentacao estoque
CREATE TABLE public.movimentacao_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID REFERENCES public.equipamentos(id) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('saida', 'retorno', 'manutencao', 'aquisicao')),
  responsavel_id UUID REFERENCES public.profiles(id) NOT NULL,
  motivo TEXT,
  ordem_id UUID REFERENCES public.ordens_servico(id),
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all movimentacao" ON public.movimentacao_estoque FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own setor movimentacao" ON public.movimentacao_estoque FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.equipamentos e WHERE e.id = equipamento_id AND e.setor_id = public.get_user_setor(auth.uid()))
);
CREATE POLICY "Staff can insert movimentacao" ON public.movimentacao_estoque FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.equipamentos e WHERE e.id = equipamento_id AND e.setor_id = public.get_user_setor(auth.uid()))
);

-- Manutencao
CREATE TABLE public.manutencao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID REFERENCES public.equipamentos(id) NOT NULL,
  tipo_reparo TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES public.profiles(id),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.manutencao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all manutencao" ON public.manutencao FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own setor manutencao" ON public.manutencao FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.equipamentos e WHERE e.id = equipamento_id AND e.setor_id = public.get_user_setor(auth.uid()))
);
CREATE POLICY "Staff can insert manutencao" ON public.manutencao FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.equipamentos e WHERE e.id = equipamento_id AND e.setor_id = public.get_user_setor(auth.uid()))
);
CREATE POLICY "Staff can update manutencao" ON public.manutencao FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.equipamentos e WHERE e.id = equipamento_id AND e.setor_id = public.get_user_setor(auth.uid()))
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ordens_servico_updated_at BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_manutencao_updated_at BEFORE UPDATE ON public.manutencao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial setores
INSERT INTO public.setores (nome, descricao) VALUES
  ('Som', 'Equipamentos de áudio e sonorização'),
  ('Luz', 'Equipamentos de iluminação'),
  ('Vídeo', 'Câmeras, projetores e equipamentos de vídeo'),
  ('Streaming', 'Equipamentos de transmissão ao vivo');
