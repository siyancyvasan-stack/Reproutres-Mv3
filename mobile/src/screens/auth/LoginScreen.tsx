/**
 * LoginScreen.tsx
 *
 * Two-mode auth screen:
 *  A. Password login  → on success, offers biometric enrolment once
 *  B. Biometric login → no password; only shown when a device token is enrolled
 *
 * No password is stored or re-sent during biometric login.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BiometricCancelledError,
  BiometricNotEnrolledError,
  BiometricUnavailableError,
  getBiometricStatus,
  isBiometricEnrolled,
} from '../../services/biometricAuthService';
import { useAuth } from '../../contexts/AuthContext';

type Portal = 'manager' | 'sales' | 'factory';

const PORTAL_COPY: Record<Portal, [string, string]> = {
  manager: ['Manager Portal',         'Sign in to continue to the Manager Portal'],
  sales:   ['Sales Portal',            'Sign in to continue to the Sales Portal'],
  factory: ['Factory Manager Portal',  'Sign in to continue to the Factory Manager Portal'],
};
const ROLE_FOR_PORTAL = {
  manager: 'manager',
  sales:   'agent',
  factory: 'factory_manager',
} as const;

// ─── Small presentational components (unchanged from original) ────────────────
function Brand() {
  return (
    <View style={s.brand}>
      <LinearGradient colors={['#fff', '#e0f2fe']} style={s.logo}>
        <View style={s.pinRing}/>
        <Text style={s.logoS}>S</Text>
        <View style={s.bars}>
          <View style={[s.bar,{height:9}]}/>
          <View style={[s.bar,{height:17}]}/>
          <View style={[s.bar,{height:25}]}/>
        </View>
        <View style={s.pinTip}/>
      </LinearGradient>
      <Text style={s.word}>Sales<Text style={s.purple}>S</Text><Text style={s.blue}>phere</Text></Text>
    </View>
  );
}

function Stat({ label, value, color='#e2e8f0' }: { label:string; value:string; color?:string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue,{color}]}>{value}</Text>
    </View>
  );
}

function SalesMap() {
  const pulse = useRef(new Animated.Value(.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, {toValue:1, duration:1800, useNativeDriver:true}),
      Animated.timing(pulse, {toValue:.5, duration:1800, useNativeDriver:true}),
    ]));
    a.start();
    return () => a.stop();
  }, [pulse]);

  return (
    <View style={s.map}>
      {Array.from({length:7}, (_,i) => <View key={`h${i}`} style={[s.hline,{top:24+i*25}]}/>)}
      {Array.from({length:8}, (_,i) => <View key={`v${i}`} style={[s.vline,{left:18+i*43}]}/>)}
      <Animated.View style={[s.route,{opacity:pulse}]}/>
      {([[64,105,'#22d3ee'],[148,83,'#34d399'],[235,120,'#f59e0b'],[185,156,'#818cf8']] as const).map(([left,top,color],i) =>
        <Animated.View key={i} style={[s.dot,{left,top,backgroundColor:color,opacity:pulse}]}/>
      )}
      <View style={s.tl}><Stat label="ACTIVE AGENTS" value="8 / 10 On Field"/></View>
      <View style={s.tr}><Stat label="TODAY ORDERS"  value="124 Booked"/></View>
      <View style={s.bl}><Stat label="DISTANCE TRACKED" value="286.0 KM" color="#34d399"/></View>
      <View style={s.br}><Stat label="TODAY REVENUE"    value="LKR 485,000" color="#fbbf24"/></View>
    </View>
  );
}

function Fingerprint() {
  return (
    <View style={s.finger}>
      <View style={[s.ridge,s.r1]}/>
      <View style={[s.ridge,s.r2]}/>
      <View style={[s.ridge,s.r3]}/>
      <View style={s.stem}/>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function LoginScreen() {
  const { signIn, signInWithBiometric } = useAuth();

  const [portal,   setPortal]   = useState<Portal>('sales');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [bio,      setBio]      = useState(false);
  const [error,    setError]    = useState('');

  // Whether biometric login button should be shown (enrolled + hardware available)
  const [canUseBio,    setCanUseBio]    = useState(false);

  // Check on mount whether biometric button should be visible
  useEffect(() => {
    void (async () => {
      const enrolled = await isBiometricEnrolled();
      const status   = await getBiometricStatus();
      setCanUseBio(enrolled && status === 'available');
    })();
  }, []);

  // ── Password sign in ────────────────────────────────────────────────────────
  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password, ROLE_FOR_PORTAL[portal]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  // ── Biometric sign in (true passwordless) ───────────────────────────────────
  const biometricSignIn = async () => {
    setBio(true);
    setError('');
    try {
      await signInWithBiometric(PORTAL_COPY[portal][0], ROLE_FOR_PORTAL[portal]);
      // signIn sets status → navigation happens automatically
    } catch (e) {
      if (e instanceof BiometricCancelledError) {
        // User cancelled — silently clear, stay on screen
        setError('');
      } else if (e instanceof BiometricNotEnrolledError) {
        setCanUseBio(false);
        setError('Biometric login is not set up. Sign in with your password.');
      } else if (e instanceof BiometricUnavailableError) {
        setError(e.message);
      } else {
        // 401 from backend = credential revoked → clear local enrolment
        setCanUseBio(false);
        setError('Biometric credential was revoked or expired. Sign in with your password.');
      }
    } finally {
      setBio(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>

          {/* Hero section — unchanged visuals */}
          <LinearGradient colors={['#f8fdff','#eef6ff','#eef2ff']} style={s.hero}>
            <View style={s.heroHead}>
              <Brand/>
              <View style={s.intro}><Text style={s.introText}>▶ 3D LIVE</Text></View>
            </View>
            <SalesMap/>
            <Text style={s.tag}>Track Teams. Manage Sales. <Text style={s.cyan}>Grow Faster.</Text></Text>
            <Text style={s.desc}>Monitor sales agents, routes, attendance, orders and performance in one secure place.</Text>
            <View style={s.features}>
              <Text style={s.feature}>✓ Real-time agent visibility</Text>
              <Text style={s.feature}>✓ Daily attendance & distance</Text>
              <Text style={s.feature}>✓ Product & order management</Text>
              <Text style={s.feature}>✓ Performance analytics</Text>
            </View>
          </LinearGradient>

          {/* Login area */}
          <View style={s.loginArea}>
            <Brand/>
            <View style={s.card}>

              <>
                  {/* Portal tabs */}
                  <View style={s.tabs}>
                    {(['manager','sales','factory'] as Portal[]).map(p => (
                      <Pressable
                        key={p}
                        onPress={() => { setPortal(p); setError(''); }}
                        style={[s.tab, portal === p && s.tabOn]}
                      >
                        <Text style={[s.tabText, portal === p && s.tabTextOn]}>
                          {p === 'manager' ? 'Manager\nPortal' : p === 'sales' ? 'Sales Portal' : 'Factory'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={s.title}>{PORTAL_COPY[portal][0]}</Text>
                  <Text style={s.subtitle}>{PORTAL_COPY[portal][1]}</Text>

                  {/* Email */}
                  <Text style={s.label}>EMAIL ADDRESS</Text>
                  <View style={s.inputBox}>
                    <Text style={s.icon}>✉</Text>
                    <TextInput
                      style={s.input}
                      placeholder="name@company.com"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  {/* Password */}
                  <View style={s.passwordHead}>
                    <Text style={s.label}>PASSWORD</Text>
                    <Pressable onPress={() => setError('Password reset is available from the web portal.')}>
                      <Text style={s.forgot}>Forgot password?</Text>
                    </Pressable>
                  </View>
                  <View style={s.inputBox}>
                    <Text style={s.icon}>●</Text>
                    <TextInput
                      style={s.input}
                      placeholder="••••••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!show}
                      autoCapitalize="none"
                      autoComplete="password"
                      value={password}
                      onChangeText={setPassword}
                      onSubmitEditing={() => void submit()}
                    />
                    <Pressable onPress={() => setShow(v => !v)}>
                      <Text style={s.show}>{show ? 'HIDE' : 'SHOW'}</Text>
                    </Pressable>
                  </View>

                  {/* Error */}
                  {error ? (
                    <View style={s.errorBox}>
                      <Text style={s.error}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Sign In button */}
                  <Pressable disabled={loading || bio} onPress={() => void submit()}>
                    <LinearGradient colors={['#2563eb','#4f46e5']} style={s.signIn}>
                      {loading
                        ? <ActivityIndicator color="#fff"/>
                        : <Text style={s.signText}>Sign In  →</Text>
                      }
                    </LinearGradient>
                  </Pressable>

                  {/* Biometric button — only shown when enrolled + hardware available */}
                  {canUseBio && (
                    <Pressable
                      disabled={loading || bio}
                      onPress={() => void biometricSignIn()}
                      style={s.biometric}
                      accessibilityLabel="Sign in with fingerprint or Face ID"
                      accessibilityRole="button"
                    >
                      {bio
                        ? <ActivityIndicator color="#0891b2"/>
                        : <Fingerprint/>
                      }
                      <Text style={s.bioText}>
                        {bio ? 'Verifying…' : 'Sign in with Fingerprint / Face ID'}
                      </Text>
                    </Pressable>
                  )}

                  <View style={s.divider}/>
                  <Text style={s.secure}>✣  Secure 256-bit encrypted access</Text>
              </>
            </View>
            <Text style={s.copyright}>© 2026 Reproutes Inc. Enterprise field sales intelligence.</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles (original styles preserved; new styles appended) ─────────────────
const s = StyleSheet.create({
  flex:{flex:1},safe:{flex:1,backgroundColor:'#f8fafc'},page:{backgroundColor:'#fff'},
  hero:{padding:18,paddingBottom:25},heroHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  brand:{flexDirection:'row',alignItems:'center',gap:9},logo:{width:54,height:58,borderRadius:13,alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:1,borderColor:'#dbeafe'},pinRing:{position:'absolute',width:38,height:45,borderWidth:4,borderColor:'#111827',borderRadius:20,transform:[{rotate:'20deg'}]},pinTip:{position:'absolute',bottom:1,width:10,height:10,backgroundColor:'#111827',transform:[{rotate:'45deg'}]},logoS:{color:'#9333ea',fontWeight:'900',fontStyle:'italic',fontSize:37,lineHeight:44,zIndex:2},bars:{position:'absolute',zIndex:3,right:8,top:16,flexDirection:'row',alignItems:'flex-end',gap:2},bar:{width:4,borderRadius:2,backgroundColor:'#06b6d4'},word:{color:'#0f172a',fontWeight:'900',fontSize:22},purple:{color:'#a21caf'},blue:{color:'#0ea5e9'},
  intro:{borderWidth:1,borderColor:'#bae6fd',backgroundColor:'#fff',padding:8,borderRadius:11},introText:{color:'#06b6d4',fontSize:9,fontWeight:'900'},
  map:{height:220,borderRadius:24,overflow:'hidden',backgroundColor:'#07182f',borderWidth:1,borderColor:'#155e75',elevation:7},hline:{position:'absolute',left:15,right:15,height:1,backgroundColor:'#164e63',transform:[{rotate:'-5deg'}]},vline:{position:'absolute',top:10,bottom:8,width:1,backgroundColor:'#164e63',transform:[{rotate:'12deg'}]},route:{position:'absolute',left:40,top:113,width:245,height:4,borderRadius:3,backgroundColor:'#22d3ee',transform:[{rotate:'-7deg'}]},dot:{position:'absolute',width:12,height:12,borderRadius:6,borderWidth:3,borderColor:'#e0f2fe',elevation:8},
  stat:{minWidth:100,borderRadius:13,paddingHorizontal:9,paddingVertical:7,backgroundColor:'rgba(30,41,59,.9)',borderWidth:1,borderColor:'#64748b'},statLabel:{color:'#94a3b8',fontSize:7,fontWeight:'900'},statValue:{fontSize:10,fontWeight:'900',marginTop:2},
  tl:{position:'absolute',top:10,left:10},tr:{position:'absolute',top:10,right:10},bl:{position:'absolute',bottom:10,left:10},br:{position:'absolute',bottom:10,right:10},
  tag:{color:'#0f172a',fontSize:20,lineHeight:27,fontWeight:'900',marginTop:18},cyan:{color:'#06b6d4'},desc:{color:'#64748b',fontSize:12,lineHeight:18,marginTop:7},features:{flexDirection:'row',flexWrap:'wrap',marginTop:12,rowGap:8},feature:{width:'50%',color:'#475569',fontSize:10,fontWeight:'700'},
  loginArea:{padding:20,gap:18,alignItems:'center'},card:{width:'100%',borderWidth:1,borderColor:'#e2e8f0',borderRadius:24,padding:18,backgroundColor:'#fff',elevation:8},
  tabs:{flexDirection:'row',backgroundColor:'#6b7280',borderRadius:12,padding:3,marginBottom:22},tab:{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:9},tabOn:{backgroundColor:'#06b6d4'},tabText:{color:'#334155',fontSize:10,textAlign:'center',fontWeight:'800'},tabTextOn:{color:'#06202a'},
  title:{color:'#1e293b',fontWeight:'900',fontSize:23,textAlign:'center'},subtitle:{color:'#64748b',fontSize:12,textAlign:'center',marginTop:6,marginBottom:22},
  label:{color:'#334155',fontWeight:'900',fontSize:11,letterSpacing:.7,marginBottom:7},passwordHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:16},forgot:{color:'#06b6d4',fontSize:11,fontWeight:'700',marginBottom:7},
  inputBox:{minHeight:54,borderRadius:17,borderWidth:1,borderColor:'#e2e8f0',backgroundColor:'#fff',flexDirection:'row',alignItems:'center',paddingHorizontal:14,elevation:2},icon:{width:24,color:'#94a3b8'},input:{flex:1,color:'#0f172a',fontSize:14,paddingVertical:13},show:{color:'#64748b',fontSize:9,fontWeight:'900'},
  errorBox:{padding:10,borderRadius:12,backgroundColor:'#fff1f2',borderWidth:1,borderColor:'#fecdd3',marginBottom:12},error:{color:'#be123c',textAlign:'center',fontSize:11,fontWeight:'700'},
  signIn:{minHeight:54,borderRadius:14,alignItems:'center',justifyContent:'center'},signText:{color:'#fff',fontSize:14,fontWeight:'900'},
  biometric:{minHeight:54,marginTop:13,borderRadius:14,borderWidth:1,borderColor:'#cbd5e1',backgroundColor:'#f8fafc',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12},bioText:{color:'#475569',fontSize:11,fontWeight:'800'},
  finger:{width:28,height:32,alignItems:'center'},ridge:{position:'absolute',borderWidth:2,borderColor:'#0891b2',borderBottomColor:'transparent'},r1:{width:27,height:31,borderRadius:14},r2:{width:19,height:24,borderRadius:10,top:6},r3:{width:11,height:17,borderRadius:6,top:11},stem:{position:'absolute',bottom:0,width:2,height:10,backgroundColor:'#0891b2'},
  divider:{height:1,backgroundColor:'#e2e8f0',marginTop:18},secure:{color:'#64748b',fontSize:10,textAlign:'center',marginTop:14},copyright:{color:'#64748b',fontSize:9,textAlign:'center',marginBottom:12},
});
