import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Building2, FlaskConical, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { api, setToken, setRole, homeOf } from '@/api';
import { Theme, inputText, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';

const SPORTS = ['futebol', 'beach tennis', 'vôlei', 'basquete', 'futsal', 'futevôlei'];

function cpfOk(raw: string) {
  const s = raw.replace(/\D/g, '');
  if (s.length !== 11 || /^(\d)\1{10}$/.test(s)) return false;
  const dv = (n: number) => {
    let t = 0;
    for (let i = 0; i < n; i++) t += Number(s[i]) * (n + 1 - i);
    return ((t * 10) % 11) % 10 === Number(s[n]);
  };
  return dv(9) && dv(10);
}

type Kind = 'player' | 'owner';

export default function Register() {
  const c = useColors();
  const s = useStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  // dados pessoais + verificações
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailDev, setEmailDev] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneDev, setPhoneDev] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  // estabelecimento
  const [bizName, setBizName] = useState('');
  const [bizDoc, setBizDoc] = useState('');
  const [bizCity, setBizCity] = useState('');
  const [bizAddr, setBizAddr] = useState('');
  const [bizSports, setBizSports] = useState<string[]>(['futebol']);
  // segurança
  const [cpf, setCpf] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');

  const totalSteps = kind === 'owner' ? 4 : 3;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const sendCode = (channel: 'email' | 'phone') => run(async () => {
    const target = channel === 'email' ? email.trim() : phone;
    if (!target) throw new Error(channel === 'email' ? 'Informe o e-mail.' : 'Informe o celular.');
    const r = await api.verifyRequest(channel, target);
    if (channel === 'email') { setEmailSent(true); setEmailDev(r.devCode || ''); }
    else { setPhoneSent(true); setPhoneDev(r.devCode || ''); }
  });

  const confirmCode = (channel: 'email' | 'phone') => run(async () => {
    const target = channel === 'email' ? email.trim() : phone;
    const code = channel === 'email' ? emailCode : phoneCode;
    const { valid } = await api.verifyConfirm(channel, target, code.trim());
    if (!valid) throw new Error('Código inválido ou expirado.');
    setStep(step + 1);
  });

  const submit = () => run(async () => {
    if (name.trim().split(' ').length < 2) throw new Error('Informe seu nome completo.');
    if (!cpfOk(cpf)) throw new Error('CPF inválido — confira os números.');
    if (pass.length < 8) throw new Error('A senha precisa de pelo menos 8 caracteres.');
    if (pass !== pass2) throw new Error('As senhas não conferem.');
    const body: any = {
      name: name.trim(), email: email.trim(), phone, password: pass,
      cpf: cpf.replace(/\D/g, ''), emailCode: emailCode.trim(), phoneCode: phoneCode.trim(),
      role: kind,
    };
    if (kind === 'owner')
      body.business = { name: bizName.trim(), doc: bizDoc, city: bizCity.trim(), address: bizAddr.trim(), sports: bizSports };
    const { token, user } = await api.register(body);
    await setToken(token);
    await setRole(user.role);
    router.replace(homeOf(user.role) as any);
  });

  /** Campo de texto com a borda neon no foco, como nas telas do Stitch. */
  const field = (key: string, props: React.ComponentProps<typeof TextInput>) => (
    <View style={[s.field, focused === key && s.fieldFocus]}>
      <TextInput
        {...props}
        style={[s.input, props.style]}
        placeholderTextColor={c.textDim}
        onFocus={() => setFocused(key)}
        onBlur={() => setFocused(null)}
      />
    </View>
  );

  // ---------- Escolha do tipo de conta ----------
  if (!kind) {
    return (
      <ScrollView style={s.wrap} contentContainerStyle={[s.center, { paddingTop: insets.top + Theme.spacing.lg }]}>
        <Text style={s.wordmark}>Liggo<Text style={s.dot}>.</Text></Text>
        <Text style={s.h1}>Como você quer usar o Liggo?</Text>

        <TouchableOpacity style={s.typeCard} activeOpacity={0.85} onPress={() => { setKind('player'); setStep(1); }}>
          <View style={s.typeIcon}><User color={c.text} size={24} strokeWidth={1.8} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.typeTitle}>Sou jogador</Text>
            <Text style={s.typeSub}>Quero encontrar quadras, reservar horários e dividir o pagamento com meus amigos.</Text>
          </View>
          <ChevronRight color={c.textDim} size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={s.typeCard} activeOpacity={0.85} onPress={() => { setKind('owner'); setStep(1); }}>
          <View style={s.typeIcon}><Building2 color={c.text} size={24} strokeWidth={1.8} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.typeTitle}>Tenho um estabelecimento</Text>
            <Text style={s.typeSub}>Quero cadastrar minha arena, receber reservas e aumentar a ocupação das quadras.</Text>
          </View>
          <ChevronRight color={c.textDim} size={20} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const codeBlock = (channel: 'email' | 'phone', sent: boolean, code: string, setCode: (v: string) => void, dev: string) => (
    <>
      {sent && (
        <>
          <Text style={s.lbl}>CÓDIGO DE 6 DÍGITOS</Text>
          {field(`code-${channel}`, {
            keyboardType: 'number-pad',
            maxLength: 6,
            value: code,
            onChangeText: setCode,
            placeholder: '••••••',
            style: { letterSpacing: 8, textAlign: 'center', fontSize: 22, fontFamily: Theme.fonts.bodyBold },
          })}
          {!!dev && (
            <View style={s.devBanner}>
              <FlaskConical color={c.warning} size={15} />
              <Text style={s.devTxt}>Modo dev (sem provedor de envio): seu código é {dev}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => sendCode(channel)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.link}>Reenviar código</Text>
          </TouchableOpacity>
          <Button
            title={busy ? 'Verificando…' : 'Verificar e continuar'}
            size="lg"
            fullWidth
            disabled={busy}
            loading={busy}
            onPress={() => confirmCode(channel)}
            style={s.cta}
          />
        </>
      )}
      {!sent && (
        <Button
          title={busy ? 'Enviando…' : 'Receber código'}
          size="lg"
          fullWidth
          disabled={busy}
          loading={busy}
          onPress={() => sendCode(channel)}
          style={s.cta}
        />
      )}
    </>
  );

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={[s.content, { paddingTop: insets.top + Theme.spacing.sm }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {/* Cabeçalho: voltar + etapa atual */}
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => (step === 1 ? (setKind(null), setStep(0)) : setStep(step - 1))}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft color={c.text} size={22} />
        </TouchableOpacity>
        <Text style={s.stepTxt}>ETAPA {step} DE {totalSteps}</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.progress}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View key={i} style={[s.bar, i < step && s.barOn]} />
        ))}
      </View>

      {/* Etapa 1 — e-mail */}
      {step === 1 && (
        <>
          <Text style={s.h2}>Qual é o seu e-mail?</Text>
          <Text style={s.sub}>Enviamos um código de 6 dígitos para confirmar que ele é seu.</Text>
          <Text style={s.lbl}>E-MAIL</Text>
          {field('email', {
            value: email, onChangeText: setEmail, autoCapitalize: 'none',
            keyboardType: 'email-address', placeholder: 'voce@email.com',
          })}
          {codeBlock('email', emailSent, emailCode, setEmailCode, emailDev)}
        </>
      )}

      {/* Etapa 2 — celular */}
      {step === 2 && (
        <>
          <Text style={s.h2}>Seu número de celular</Text>
          <Text style={s.sub}>Enviamos um SMS com o código — é ele que protege sua conta e suas reservas.</Text>
          <Text style={s.lbl}>CELULAR (COM DDD)</Text>
          {field('phone', {
            value: phone, onChangeText: setPhone, keyboardType: 'phone-pad',
            placeholder: '(41) 99999-9999',
          })}
          {codeBlock('phone', phoneSent, phoneCode, setPhoneCode, phoneDev)}
        </>
      )}

      {/* Etapa 3 (só estabelecimento) — dados do negócio */}
      {kind === 'owner' && step === 3 && (
        <>
          <Text style={s.h2}>Seu estabelecimento</Text>
          <Text style={s.sub}>Esses dados aparecem para os jogadores e são usados na verificação do repasse.</Text>
          <Text style={s.lbl}>NOME DA ARENA</Text>
          {field('bizName', { value: bizName, onChangeText: setBizName, placeholder: 'Ex.: Arena do João' })}
          <Text style={s.lbl}>CNPJ (OU CPF SE FOR MEI/AUTÔNOMO)</Text>
          {field('bizDoc', { value: bizDoc, onChangeText: setBizDoc, keyboardType: 'number-pad', placeholder: '00.000.000/0001-00' })}
          <Text style={s.lbl}>CIDADE</Text>
          {field('bizCity', { value: bizCity, onChangeText: setBizCity, placeholder: 'Curitiba' })}
          <Text style={s.lbl}>ENDEREÇO</Text>
          {field('bizAddr', { value: bizAddr, onChangeText: setBizAddr, placeholder: 'Rua, número e bairro' })}
          <Text style={s.lbl}>ESPORTES OFERECIDOS</Text>
          <View style={s.chips}>
            {SPORTS.map((sp) => {
              const on = bizSports.includes(sp);
              return (
                <Chip
                  key={sp}
                  label={sp}
                  selected={on}
                  onPress={() => setBizSports(on ? bizSports.filter((x) => x !== sp) : [...bizSports, sp])}
                />
              );
            })}
          </View>
          <Button
            title="Continuar"
            size="lg"
            fullWidth
            disabled={busy}
            style={s.cta}
            onPress={() => run(async () => {
              if (!bizName.trim() || !bizDoc || !bizCity.trim() || !bizAddr.trim()) throw new Error('Preencha todos os campos do estabelecimento.');
              setStep(4);
            })}
          />
        </>
      )}

      {/* Última etapa — CPF + senha */}
      {step === totalSteps && (
        <>
          <Text style={s.h2}>Pra finalizar, quem é você?</Text>
          <Text style={s.sub}>{kind === 'owner' ? 'Nome e CPF do responsável legal pela conta.' : 'Seu CPF evita contas falsas e protege os rachas.'}</Text>
          <Text style={s.lbl}>NOME COMPLETO</Text>
          {field('name', { value: name, onChangeText: setName, placeholder: 'Ex.: João Silva' })}
          <Text style={s.lbl}>CPF</Text>
          {field('cpf', { value: cpf, onChangeText: setCpf, keyboardType: 'number-pad', placeholder: '000.000.000-00' })}
          <Text style={s.lbl}>SENHA (MÍN. 8 CARACTERES)</Text>
          {field('pass', { value: pass, onChangeText: setPass, secureTextEntry: true, placeholder: '••••••••' })}
          <Text style={s.lbl}>CONFIRMAR SENHA</Text>
          {field('pass2', { value: pass2, onChangeText: setPass2, secureTextEntry: true, placeholder: '••••••••' })}
          <Button
            title={busy ? 'Criando conta…' : kind === 'owner' ? 'Criar conta do estabelecimento' : 'Criar minha conta'}
            size="lg"
            fullWidth
            disabled={busy}
            loading={busy}
            onPress={submit}
            style={s.cta}
          />
          <Text style={s.terms}>Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade.</Text>
        </>
      )}

      {!!error && <Text style={s.err} accessibilityRole="alert">{error}</Text>}
    </ScrollView>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.background },
  content: {
    paddingHorizontal: Theme.spacing.margin,
    paddingBottom: Theme.spacing.section,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    paddingHorizontal: Theme.spacing.margin,
    paddingBottom: Theme.spacing.section,
    gap: Theme.spacing.stack,
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  wordmark: { ...Theme.typography.display, fontSize: 32, lineHeight: 38, letterSpacing: -1.3, color: c.text, textAlign: 'center' },
  dot: { color: c.accent },
  h1: { ...Theme.typography.h2, color: c.text, textAlign: 'center', marginBottom: Theme.spacing.md },

  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadow.raised,
  },
  typeIcon: {
    width: 48, height: 48, borderRadius: Theme.radius.full,
    backgroundColor: c.surfaceGray,
    alignItems: 'center', justifyContent: 'center',
  },
  typeTitle: { ...Theme.typography.bodySemibold, color: c.text },
  typeSub: { ...Theme.typography.small, color: c.textMuted, marginTop: 2, lineHeight: 17 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -Theme.spacing.stack },
  stepTxt: { ...Theme.typography.overline, color: c.primary, flex: 1, textAlign: 'center' },

  progress: { flexDirection: 'row', gap: Theme.spacing.xs, marginTop: Theme.spacing.sm, marginBottom: Theme.spacing.lg },
  bar: { flex: 1, height: 6, borderRadius: Theme.radius.full, backgroundColor: c.border },
  barOn: { backgroundColor: c.accent },

  h2: { ...Theme.typography.h1, color: c.text },
  sub: { ...Theme.typography.caption, color: c.textMuted, marginTop: Theme.spacing.sm, lineHeight: 20 },

  lbl: { ...Theme.typography.overline, color: c.textMuted, marginTop: Theme.spacing.lg, marginBottom: Theme.spacing.sm },
  field: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: c.surfaceGray,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fieldFocus: { borderColor: c.accent },
  input: { ...inputText(Theme.typography.body), color: c.text, paddingVertical: 0 },

  cta: { marginTop: Theme.spacing.lg },
  link: { ...Theme.typography.captionSemibold, color: c.primary, marginTop: Theme.spacing.stack },

  devBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm,
    backgroundColor: c.warningDim, padding: Theme.spacing.stack,
    borderRadius: Theme.radius.sm, marginTop: Theme.spacing.stack,
  },
  devTxt: { ...Theme.typography.small, color: c.text, flex: 1 },

  err: { ...Theme.typography.caption, color: c.danger, textAlign: 'center', marginTop: Theme.spacing.md },
  terms: { ...Theme.typography.small, color: c.textMuted, textAlign: 'center', marginTop: Theme.spacing.md, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm },
});
