import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { api, setToken, setRole, homeOf } from '@/api';
import { C } from '@/theme';

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
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  // ---------- Escolha do tipo de conta ----------
  if (!kind) {
    return (
      <ScrollView style={s.wrap} contentContainerStyle={s.center}>
        <Text style={s.h1}>Como você quer usar o Arena<Text style={{ color: C.green }}>Hub</Text>?</Text>
        <TouchableOpacity style={s.typeCard} onPress={() => { setKind('player'); setStep(1); }}>
          <Text style={{ fontSize: 34 }}>👤</Text>
          <Text style={s.typeTitle}>Sou jogador</Text>
          <Text style={s.typeSub}>Quero encontrar quadras, reservar horários e dividir o pagamento com meus amigos.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.typeCard} onPress={() => { setKind('owner'); setStep(1); }}>
          <Text style={{ fontSize: 34 }}>🏟️</Text>
          <Text style={s.typeTitle}>Tenho um estabelecimento</Text>
          <Text style={s.typeSub}>Quero cadastrar minha arena, receber reservas e aumentar a ocupação das quadras.</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const codeBlock = (channel: 'email' | 'phone', sent: boolean, code: string, setCode: (v: string) => void, dev: string) => (
    <>
      {sent && (
        <>
          <Text style={s.lbl}>CÓDIGO DE 6 DÍGITOS</Text>
          <TextInput style={[s.input, { letterSpacing: 6, textAlign: 'center', fontSize: 20 }]} keyboardType="number-pad"
            maxLength={6} value={code} onChangeText={setCode} placeholder="••••••" placeholderTextColor={C.mut} />
          {!!dev && <Text style={s.dev}>🧪 Modo dev (sem provedor de envio): seu código é {dev}</Text>}
          <TouchableOpacity onPress={() => sendCode(channel)}>
            <Text style={s.link}>Reenviar código</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.cta, busy && s.off]} disabled={busy} onPress={() => confirmCode(channel)}>
            <Text style={s.ctaTxt}>{busy ? 'Verificando…' : 'Verificar e continuar'}</Text>
          </TouchableOpacity>
        </>
      )}
      {!sent && (
        <TouchableOpacity style={[s.cta, busy && s.off]} disabled={busy} onPress={() => sendCode(channel)}>
          <Text style={s.ctaTxt}>{busy ? 'Enviando…' : 'Receber código'}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 24, paddingBottom: 60, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
      {/* progresso */}
      <View style={s.progress}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View key={i} style={[s.bar, i < step && { backgroundColor: C.green }]} />
        ))}
      </View>
      <TouchableOpacity onPress={() => (step === 1 ? (setKind(null), setStep(0)) : setStep(step - 1))}>
        <Text style={{ color: C.mut, marginBottom: 14 }}>← Voltar</Text>
      </TouchableOpacity>

      {/* Etapa 1 — e-mail */}
      {step === 1 && (
        <>
          <Text style={s.h2}>Qual é o seu e-mail?</Text>
          <Text style={s.sub}>Enviamos um código de 6 dígitos para confirmar que ele é seu.</Text>
          <Text style={s.lbl}>E-MAIL</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
            placeholder="voce@email.com" placeholderTextColor={C.mut} />
          {codeBlock('email', emailSent, emailCode, setEmailCode, emailDev)}
        </>
      )}

      {/* Etapa 2 — celular */}
      {step === 2 && (
        <>
          <Text style={s.h2}>Confirme seu celular</Text>
          <Text style={s.sub}>Enviamos um SMS com o código — é ele que protege sua conta e suas reservas.</Text>
          <Text style={s.lbl}>CELULAR (COM DDD)</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad"
            placeholder="(41) 99999-9999" placeholderTextColor={C.mut} />
          {codeBlock('phone', phoneSent, phoneCode, setPhoneCode, phoneDev)}
        </>
      )}

      {/* Etapa 3 (só estabelecimento) — dados do negócio */}
      {kind === 'owner' && step === 3 && (
        <>
          <Text style={s.h2}>Seu estabelecimento</Text>
          <Text style={s.sub}>Esses dados aparecem para os jogadores e são usados na verificação do repasse.</Text>
          <Text style={s.lbl}>NOME DA ARENA</Text>
          <TextInput style={s.input} value={bizName} onChangeText={setBizName} placeholder="Ex.: Arena do João" placeholderTextColor={C.mut} />
          <Text style={s.lbl}>CNPJ (OU CPF SE FOR MEI/AUTÔNOMO)</Text>
          <TextInput style={s.input} value={bizDoc} onChangeText={setBizDoc} keyboardType="number-pad"
            placeholder="00.000.000/0001-00" placeholderTextColor={C.mut} />
          <Text style={s.lbl}>CIDADE</Text>
          <TextInput style={s.input} value={bizCity} onChangeText={setBizCity} placeholder="Curitiba" placeholderTextColor={C.mut} />
          <Text style={s.lbl}>ENDEREÇO</Text>
          <TextInput style={s.input} value={bizAddr} onChangeText={setBizAddr} placeholder="Rua, número e bairro" placeholderTextColor={C.mut} />
          <Text style={s.lbl}>ESPORTES OFERECIDOS</Text>
          <View style={s.chips}>
            {SPORTS.map((sp) => {
              const on = bizSports.includes(sp);
              return (
                <TouchableOpacity key={sp} style={[s.chip, on && s.chipOn]}
                  onPress={() => setBizSports(on ? bizSports.filter((x) => x !== sp) : [...bizSports, sp])}>
                  <Text style={{ color: on ? '#04170b' : C.mut, fontSize: 12.5, fontWeight: '600' }}>{sp}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[s.cta, busy && s.off]} disabled={busy}
            onPress={() => run(async () => {
              if (!bizName.trim() || !bizDoc || !bizCity.trim() || !bizAddr.trim()) throw new Error('Preencha todos os campos do estabelecimento.');
              setStep(4);
            })}>
            <Text style={s.ctaTxt}>Continuar</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Última etapa — CPF + senha */}
      {step === totalSteps && (
        <>
          <Text style={s.h2}>Pra finalizar, quem é você?</Text>
          <Text style={s.sub}>{kind === 'owner' ? 'Nome e CPF do responsável legal pela conta.' : 'Seu CPF evita contas falsas e protege os rachas.'}</Text>
          <Text style={s.lbl}>NOME COMPLETO</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex.: João Silva" placeholderTextColor={C.mut} />
          <Text style={s.lbl}>CPF</Text>
          <TextInput style={s.input} value={cpf} onChangeText={setCpf} keyboardType="number-pad"
            placeholder="000.000.000-00" placeholderTextColor={C.mut} />
          <Text style={s.lbl}>SENHA (MÍN. 8 CARACTERES)</Text>
          <TextInput style={s.input} value={pass} onChangeText={setPass} secureTextEntry placeholder="••••••••" placeholderTextColor={C.mut} />
          <Text style={s.lbl}>CONFIRMAR SENHA</Text>
          <TextInput style={s.input} value={pass2} onChangeText={setPass2} secureTextEntry placeholder="••••••••" placeholderTextColor={C.mut} />
          <TouchableOpacity style={[s.cta, busy && s.off]} disabled={busy} onPress={submit}>
            <Text style={s.ctaTxt}>{busy ? 'Criando conta…' : kind === 'owner' ? 'Criar conta do estabelecimento' : 'Criar minha conta'}</Text>
          </TouchableOpacity>
          <Text style={s.terms}>Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade.</Text>
        </>
      )}

      {!!error && <Text style={s.err}>{error}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  center: { padding: 24, gap: 14, flexGrow: 1, justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  h1: { color: C.txt, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  h2: { color: C.txt, fontSize: 21, fontWeight: '800' },
  sub: { color: C.mut, fontSize: 13, marginTop: 6, marginBottom: 10, lineHeight: 19 },
  typeCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 20 },
  typeTitle: { color: C.txt, fontSize: 17, fontWeight: '800', marginTop: 8 },
  typeSub: { color: C.mut, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.line },
  lbl: { color: C.mut, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginTop: 14, marginBottom: 4 },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 12, color: C.txt, padding: 14, fontSize: 15 },
  cta: { backgroundColor: C.green, borderRadius: 12, padding: 15, marginTop: 20 },
  off: { opacity: 0.5 },
  ctaTxt: { color: '#04170b', fontWeight: '800', textAlign: 'center', fontSize: 15 },
  link: { color: C.green, fontSize: 13, marginTop: 12 },
  dev: { color: '#e8c968', fontSize: 12.5, marginTop: 10, backgroundColor: '#2e2713', padding: 10, borderRadius: 10 },
  err: { color: C.danger, textAlign: 'center', marginTop: 16 },
  terms: { color: C.mut, fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
});
