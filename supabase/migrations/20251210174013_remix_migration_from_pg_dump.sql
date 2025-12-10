CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: handle_withdrawal_approval(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_withdrawal_approval() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Subtract the withdrawal amount from user's savings balance
    UPDATE public.user_savings
    SET balance = balance - NEW.amount,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: loan_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    id_number text NOT NULL,
    whatsapp_number text NOT NULL,
    next_of_kin_name text NOT NULL,
    next_of_kin_contact text NOT NULL,
    income_level text NOT NULL,
    employment_status text NOT NULL,
    occupation text NOT NULL,
    contact_person_name text NOT NULL,
    contact_person_phone text NOT NULL,
    loan_reason text,
    loan_limit integer NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: loan_disbursements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_disbursements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    loan_amount integer NOT NULL,
    processing_fee integer NOT NULL,
    transaction_code text NOT NULL,
    payment_verified boolean DEFAULT false,
    disbursed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: savings_deposits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.savings_deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    mpesa_message text NOT NULL,
    transaction_code text,
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_email text NOT NULL,
    user_name text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_reply text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.support_requests REPLICA IDENTITY FULL;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_savings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_savings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    phone_number text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loan_applications loan_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_applications
    ADD CONSTRAINT loan_applications_pkey PRIMARY KEY (id);


--
-- Name: loan_disbursements loan_disbursements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_disbursements
    ADD CONSTRAINT loan_disbursements_pkey PRIMARY KEY (id);


--
-- Name: savings_deposits savings_deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.savings_deposits
    ADD CONSTRAINT savings_deposits_pkey PRIMARY KEY (id);


--
-- Name: support_requests support_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_savings user_savings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_savings
    ADD CONSTRAINT user_savings_pkey PRIMARY KEY (id);


--
-- Name: user_savings user_savings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_savings
    ADD CONSTRAINT user_savings_user_id_key UNIQUE (user_id);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: withdrawals on_withdrawal_approved; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_withdrawal_approved AFTER UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.handle_withdrawal_approval();


--
-- Name: loan_applications update_loan_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_loan_applications_updated_at BEFORE UPDATE ON public.loan_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loan_disbursements update_loan_disbursements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_loan_disbursements_updated_at BEFORE UPDATE ON public.loan_disbursements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_requests update_support_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_requests_updated_at BEFORE UPDATE ON public.support_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_savings update_user_savings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_savings_updated_at BEFORE UPDATE ON public.user_savings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: withdrawals update_withdrawals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loan_applications loan_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_applications
    ADD CONSTRAINT loan_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: loan_disbursements loan_disbursements_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_disbursements
    ADD CONSTRAINT loan_disbursements_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.loan_applications(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: loan_applications Admins can update all applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all applications" ON public.loan_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: savings_deposits Admins can update deposits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update deposits" ON public.savings_deposits FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: loan_disbursements Admins can update disbursements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update disbursements" ON public.loan_disbursements FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_requests Admins can update support requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update support requests" ON public.support_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: withdrawals Admins can update withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update withdrawals" ON public.withdrawals FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: loan_applications Admins can view all applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all applications" ON public.loan_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: savings_deposits Admins can view all deposits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all deposits" ON public.savings_deposits FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: loan_disbursements Admins can view all disbursements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all disbursements" ON public.loan_disbursements FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_requests Admins can view all support requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all support requests" ON public.support_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: withdrawals Admins can view all withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all withdrawals" ON public.withdrawals FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: loan_applications Users can create their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own applications" ON public.loan_applications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: savings_deposits Users can create their own deposits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own deposits" ON public.savings_deposits FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: loan_disbursements Users can create their own disbursements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own disbursements" ON public.loan_disbursements FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.loan_applications
  WHERE ((loan_applications.id = loan_disbursements.application_id) AND (loan_applications.user_id = auth.uid())))));


--
-- Name: user_savings Users can create their own savings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own savings" ON public.user_savings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_requests Users can create their own support requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own support requests" ON public.support_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: withdrawals Users can create their own withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: loan_applications Users can update their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own applications" ON public.loan_applications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_savings Users can update their own savings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own savings" ON public.user_savings FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: loan_applications Users can view their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own applications" ON public.loan_applications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: savings_deposits Users can view their own deposits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own deposits" ON public.savings_deposits FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: loan_disbursements Users can view their own disbursements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own disbursements" ON public.loan_disbursements FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.loan_applications
  WHERE ((loan_applications.id = loan_disbursements.application_id) AND (loan_applications.user_id = auth.uid())))));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_savings Users can view their own savings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own savings" ON public.user_savings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_requests Users can view their own support requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own support requests" ON public.support_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: withdrawals Users can view their own withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own withdrawals" ON public.withdrawals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: loan_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: loan_disbursements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loan_disbursements ENABLE ROW LEVEL SECURITY;

--
-- Name: savings_deposits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.savings_deposits ENABLE ROW LEVEL SECURITY;

--
-- Name: support_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_savings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_savings ENABLE ROW LEVEL SECURITY;

--
-- Name: withdrawals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


