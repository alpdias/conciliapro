import React, { useState, useEffect } from 'react';
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, Scale, 
  ArrowRight, XCircle, Eye, Landmark, Monitor, Calculator, 
  Filter, Save, ArrowUpDown, ListChecks, SplitSquareHorizontal, 
  Moon, Sun, Download, Sparkles, Lock, Mail, Key, LogOut, Cloud, History, Crown, CreditCard, Zap
} from 'lucide-react';

// === IMPORTAÇÕES DO FIREBASE ===
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

// ====================================================================
// 1. CHAVES DO FIREBASE
// ====================================================================
let firebaseConfig = {
  apiKey: "AIzaSyBiKrn-qzV-0d4sdWpizVjqKZJNRCZpoFo",
  authDomain: "conciliapro-69639.firebaseapp.com",
  projectId: "conciliapro-69639",
  storageBucket: "conciliapro-69639.firebasestorage.app",
  messagingSenderId: "491412875969",
  appId: "1:491412875969:web:46d6b2871a7e5929dd8240"
};

if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'conciliapro-default';

// ====================================================================
// COMPONENTE PRINCIPAL DO SISTEMA
// ====================================================================
function ConciliaProApp() {
  const [isXlsxLoaded, setIsXlsxLoaded] = useState(false);
  
  const [bankFile, setBankFile] = useState(null);
  const [sysFile, setSysFile] = useState(null);
  const [bankDataRaw, setBankDataRaw] = useState([]);
  const [sysDataRaw, setSysDataRaw] = useState([]);
  
  const [bankCols, setBankCols] = useState([]);
  const [sysCols, setSysCols] = useState([]);
  const [bankMapping, setBankMapping] = useState({ date: '', desc: '', value: '' });
  const [sysMapping, setSysMapping] = useState({ date: '', desc: '', value: '' });
  const [bankTemplateFound, setBankTemplateFound] = useState(false);
  const [sysTemplateFound, setSysTemplateFound] = useState(false);
  
  const [ignoreSigns, setIgnoreSigns] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });

  const [step, setStep] = useState(1); 
  const [activeTab, setActiveTab] = useState('pendencia');
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // === AUTENTICAÇÃO E PLANOS ===
  const [user, setUser] = useState(null);
  const [isRealUser, setIsRealUser] = useState(false);
  const [showAuthWall, setShowAuthWall] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [authMode, setAuthMode] = useState('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isSavedToCloud, setIsSavedToCloud] = useState(false);
  
  const [userPlan, setUserPlan] = useState('free'); 
  const [avulsoCredits, setAvulsoCredits] = useState(0);
  const [freeCredits, setFreeCredits] = useState(0);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [results, setResults] = useState({ 
    matched: [], bankOnly: [], sysOnly: [], allBank: [], allSys: [], 
    bankTotal: 0, sysTotal: 0, difference: 0 
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          if (!auth.currentUser) await signInAnonymously(auth);
        }
      } catch (e) {}
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsRealUser(currentUser && !currentUser.isAnonymous);
    });
    return () => unsubscribe();
  }, []);

  // === LÊ E CRIA O PERFIL DO FIREBASE (COM 5 CRÉDITOS INICIAIS) ===
  useEffect(() => {
    if (!user || !isRealUser) return;
    const fetchProfile = async () => {
      try {
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.isPremium) setUserPlan('premium');
          else setUserPlan('free');
          if (data.avulsoCredits !== undefined) setAvulsoCredits(data.avulsoCredits);
          
          if (data.freeCredits !== undefined) {
             setFreeCredits(data.freeCredits);
          } else {
             setFreeCredits(5);
             setDoc(profileRef, { freeCredits: 5 }, { merge: true });
          }
        } else {
          setFreeCredits(5);
          await setDoc(profileRef, { 
            email: user.email, 
            isPremium: false, 
            avulsoCredits: 0,
            freeCredits: 5,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch(e) {
        console.error("Erro ao ler perfil", e);
      }
    };
    fetchProfile();
  }, [user, isRealUser]);

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      script.onload = () => setIsXlsxLoaded(true);
      document.body.appendChild(script);
    } else {
      setIsXlsxLoaded(true);
    }
    try {
      const saved = localStorage.getItem('conciliador_data');
      if (saved) setHasSavedSession(true);
    } catch (e) {}
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
        setAuthSuccessMsg('Conta criada com sucesso! A preparar ambiente...');
        
        setTimeout(() => {
          setAuthLoading(false);
          setShowAuthWall(false);
          setAuthSuccessMsg('');
          handleNextToMapping();
        }, 2000);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setAuthLoading(false);
        setShowAuthWall(false);
        handleNextToMapping();
      }
    } catch (error) {
      setAuthLoading(false);
      if (error.code === 'auth/email-already-in-use') setAuthError('Este e-mail já está registado. Faça login.');
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') setAuthError('Credenciais incorretas.');
      else setAuthError('Erro na autenticação. Verifique os dados.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    resetApp();
    setUserPlan('free');
    setAvulsoCredits(0);
    setFreeCredits(0);
    try { await signInAnonymously(auth); } catch(e){}
  };

  const saveToCloud = async (dataToSave) => {
    if (!isRealUser || !user) return;
    try {
      const recRef = collection(db, 'artifacts', appId, 'users', user.uid, 'reconciliations');
      await addDoc(recRef, {
        date: new Date().toISOString(),
        bankTotal: dataToSave.bankTotal,
        sysTotal: dataToSave.sysTotal,
        difference: dataToSave.difference,
        matchedCount: dataToSave.matched.length,
        pendenciesCount: dataToSave.bankOnly.length + dataToSave.sysOnly.length,
        fullData: JSON.stringify(dataToSave)
      });
      setIsSavedToCloud(true);

      const snapshot = await getDocs(recRef);
      if (snapshot.docs.length > 10) {
        const docsArray = snapshot.docs.map(d => ({ id: d.id, date: d.data().date }));
        docsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        const docsToDelete = docsArray.slice(10);
        for (const docItem of docsToDelete) {
          const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reconciliations', docItem.id);
          await deleteDoc(docRef);
        }
      }
    } catch (e) {
      console.error("Erro ao salvar", e);
    }
  };

  const fetchHistory = async () => {
    if (!user || !isRealUser) return;
    setLoadingHistory(true);
    try {
      const recRef = collection(db, 'artifacts', appId, 'users', user.uid, 'reconciliations');
      const snapshot = await getDocs(recRef);
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      historyData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setUserHistory(historyData);
    } catch (e) {
      console.error("Erro ao buscar", e);
    }
    setLoadingHistory(false);
  };

  const openHistory = () => {
    if (userPlan !== 'premium') {
      alert("O acesso ao Histórico na nuvem é uma funcionalidade exclusiva do plano Premium!");
      setShowPricingModal(true);
      return;
    }
    setShowHistoryModal(true);
    fetchHistory();
  };

  const loadHistoricalReconciliation = (rec) => {
    if (!rec.fullData) { alert("Esta conciliação é antiga e não guardou os detalhes."); return; }
    try {
      setResults(JSON.parse(rec.fullData));
      setStep(3);
      setShowHistoryModal(false);
      setIsSavedToCloud(true);
    } catch(e) {
      alert("Erro ao carregar o detalhamento.");
    }
  };

  const handleNextToMapping = () => {
    if (!isRealUser) {
      const usages = parseInt(localStorage.getItem('concilia_usages') || '0');
      if (usages >= 1) { setShowAuthWall(true); return; }
    } else {
      if (userPlan !== 'premium' && freeCredits <= 0 && avulsoCredits <= 0) { 
        setShowPricingModal(true); 
        return; 
      }
    }
    setStep(2);
  };

  const restoreSession = () => {
    try {
      const saved = localStorage.getItem('conciliador_data');
      if (saved) {
        setResults(JSON.parse(saved));
        setStep(3);
      }
    } catch(e) {}
  };

  // ====================================================================
  // 2. LINKS DO STRIPE E CORREÇÃO DO "BYPASS"
  // ====================================================================
  const handleStripePayment = (type) => {
    // Alerta instruindo o usuário a aguardar
    alert("Como estamos num ambiente de testes, o pagamento será feito numa nova janela.\n\nApós o pagamento, atualize o site para que a sua conta seja liberada!");
    
    // Fecha o modal de preços para ele não ficar preso no ecrã
    setShowPricingModal(false);
    const emailParam = user && user.email ? `?prefilled_email=${encodeURIComponent(user.email)}` : '';

    if (type === 'avulso') {
      window.open(`https://buy.stripe.com/test_28EdR10XP3mhgL9dkU7g400${emailParam}`, '_blank');
    } else if (type === 'premium') {
      window.open(`https://buy.stripe.com/test_28EeV58qh4qlamLa8I7g401${emailParam}`, '_blank');
    }
    
    // ATENÇÃO: A linha que deixava avançar para o Step 2 foi REMOVIDA DAQUI! 
    // Agora o sistema obriga-o a ter os créditos na base de dados para passar.
  };

  const processExcel = (file, setRawData, setCols, setMapping, setTemplateFound) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const workbook = window.XLSX.read(data, { type: 'binary', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: "" });
      if (jsonData.length > 0) {
        const columns = Object.keys(jsonData[0]);
        setRawData(jsonData); setCols(columns);
        try {
          const colsKey = columns.join('||');
          const savedTemplates = JSON.parse(localStorage.getItem('conciliador_templates') || '{}');
          if (savedTemplates[colsKey]) { setMapping(savedTemplates[colsKey]); if (setTemplateFound) setTemplateFound(true); return; }
        } catch(e) {}
        if (setTemplateFound) setTemplateFound(false);
        const guessMap = { date: '', desc: '', value: '' };
        columns.forEach(col => {
          const lower = col.toLowerCase();
          if (lower.includes('data') || lower.includes('date') || lower.includes('vencimento')) guessMap.date = col;
          else if (lower.includes('desc') || lower.includes('histórico') || lower.includes('detalhe') || lower.includes('memo')) guessMap.desc = col;
          else if (lower.includes('valor') || lower.includes('saída') || lower.includes('entrada') || lower.includes('lançamento') || lower.includes('montante')) guessMap.value = col;
        });
        setMapping(guessMap);
      }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => { if (bankFile && isXlsxLoaded) processExcel(bankFile, setBankDataRaw, setBankCols, setBankMapping, setBankTemplateFound); }, [bankFile, isXlsxLoaded]);
  useEffect(() => { if (sysFile && isXlsxLoaded) processExcel(sysFile, setSysDataRaw, setSysCols, setSysMapping, setSysTemplateFound); }, [sysFile, isXlsxLoaded]);

  const parseValue = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    let isNegative = str.includes('-') || str.startsWith('(');
    str = str.replace(/[^\d.,]/g, '');
    if (!str) return 0;
    if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
      else str = str.replace(/,/g, '');
    } else if (str.includes(',')) {
      if ((str.match(/,/g) || []).length > 1) str = str.replace(/,/g, '');
      else str = str.replace(',', '.');
    }
    let num = parseFloat(str) || 0;
    return isNegative ? -Math.abs(num) : Math.abs(num);
  };

  const parseDate = (val) => {
    if (val === undefined || val === null || val === '') return '';
    if (val instanceof Date) return `${String(val.getUTCDate()).padStart(2, '0')}/${String(val.getUTCMonth() + 1).padStart(2, '0')}/${val.getUTCFullYear()}`;
    if (typeof val === 'number') {
      const d = new Date(new Date(Date.UTC(1899, 11, 30)).getTime() + val * 86400000);
      return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
    }
    let str = String(val).trim().split(' ')[0].replace(/[-.]/g, '/');
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    }
    return str;
  };

  const makeIsoDate = (dStr) => {
    if (!dStr) return '';
    const parts = dStr.split('/');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
  };

  const runReconciliation = () => {
    if (!bankMapping.date || !bankMapping.value || !sysMapping.date || !sysMapping.value) { alert("Por favor, selecione as colunas de Data e Valor."); return; }
    try {
      const savedTemplates = JSON.parse(localStorage.getItem('conciliador_templates') || '{}');
      if (bankCols.length > 0) savedTemplates[bankCols.join('||')] = bankMapping;
      if (sysCols.length > 0) savedTemplates[sysCols.join('||')] = sysMapping;
      localStorage.setItem('conciliador_templates', JSON.stringify(savedTemplates));
    } catch (e) {}

    const normalizedBank = bankDataRaw.map((row, index) => {
      const dStr = parseDate(row[bankMapping.date]);
      return { _id: `bank_${index}`, original: row, date: dStr, isoDate: makeIsoDate(dStr), desc: row[bankMapping.desc] || 'Sem descrição', value: parseValue(row[bankMapping.value]) };
    }).filter(row => row.value !== 0 && row.date !== '');

    const normalizedSys = sysDataRaw.map((row, index) => {
      const dStr = parseDate(row[sysMapping.date]);
      return { _id: `sys_${index}`, original: row, date: dStr, isoDate: makeIsoDate(dStr), desc: row[sysMapping.desc] || 'Sem descrição', value: parseValue(row[sysMapping.value]) };
    }).filter(row => row.value !== 0 && row.date !== '');

    let sysUnmatched = [...normalizedSys];
    let bankUnmatched = [];
    let matched = [];

    normalizedBank.forEach(bRow => {
      const matchIndex = sysUnmatched.findIndex(sRow => {
        const dateMatch = sRow.date === bRow.date;
        const valueMatch = Math.abs((ignoreSigns ? Math.abs(sRow.value) : sRow.value) - (ignoreSigns ? Math.abs(bRow.value) : bRow.value)) < 0.01;
        return dateMatch && valueMatch;
      });
      if (matchIndex !== -1) { matched.push({ bank: bRow, sys: sysUnmatched[matchIndex] }); sysUnmatched.splice(matchIndex, 1); } 
      else { bankUnmatched.push(bRow); }
    });

    const bankTotal = normalizedBank.reduce((acc, row) => acc + row.value, 0);
    const sysTotal = normalizedSys.reduce((acc, row) => acc + row.value, 0);
    const finalResults = { matched, bankOnly: bankUnmatched, sysOnly: sysUnmatched, allBank: normalizedBank, allSys: normalizedSys, bankTotal, sysTotal, difference: bankTotal - sysTotal };
    setResults(finalResults);
    
    try { 
      localStorage.setItem('conciliador_data', JSON.stringify(finalResults)); 
      
      if (!isRealUser) {
        localStorage.setItem('concilia_usages', '1');
      } else {
        if (userPlan !== 'premium') {
          let newFree = freeCredits;
          let newAvulso = avulsoCredits;
          
          if (newFree > 0) {
            newFree -= 1;
            setFreeCredits(newFree);
          } else if (newAvulso > 0) {
            newAvulso -= 1;
            setAvulsoCredits(newAvulso);
          }
          const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
          setDoc(profileRef, { freeCredits: newFree, avulsoCredits: newAvulso }, { merge: true });
        }
        saveToCloud(finalResults);
      }
      setHasSavedSession(true); 
    } catch(e){}
    
    setStep(3);
  };

  const resetApp = () => {
    setBankFile(null); setSysFile(null); setBankDataRaw([]); setSysDataRaw([]); setFilterStart(''); setFilterEnd('');
    try { localStorage.removeItem('conciliador_data'); } catch(e){}
    setHasSavedSession(false); setIsSavedToCloud(false); setStep(1);
  };

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const handleSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });

  const sortData = (data) => {
    return [...data].sort((a, b) => {
      let valA = sortConfig.key === 'date' ? (a.isoDate || '') : sortConfig.key === 'desc' ? (a.desc || '').toLowerCase() : a[sortConfig.key];
      let valB = sortConfig.key === 'date' ? (b.isoDate || '') : sortConfig.key === 'desc' ? (b.desc || '').toLowerCase() : b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filterByDate = (items) => items.filter(item => (!filterStart && !filterEnd) || ((!filterStart || item.isoDate >= filterStart) && (!filterEnd || item.isoDate <= filterEnd)));
  const processData = (items) => sortData(filterByDate(items));

  const displayBankOnly = processData(results.bankOnly || []);
  const displaySysOnly = processData(results.sysOnly || []);
  const displayAllBank = processData(results.allBank || []);
  const displayAllSys = processData(results.allSys || []);
  
  const sugestoesList = processData([
    ...(results.bankOnly || []).map(i => ({ ...i, type: 'bank', action: 'Lançar' })), 
    ...(results.sysOnly || []).map(i => ({ ...i, type: 'sys', action: 'Remover' }))
  ]);

  const exportToExcel = () => {
    if (activeTab === 'sugestoes' && userPlan !== 'premium') { setShowPricingModal(true); return; }
    if (!window.XLSX || sugestoesList.length === 0) return alert("Não há dados.");
    const exportData = sugestoesList.map(item => ({ 'Ação': item.action, 'Data': item.date, 'Histórico Original': item.desc, 'Valor Original (R$)': item.value }));
    const worksheet = window.XLSX.utils.json_to_sheet(exportData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Sugestões");
    window.XLSX.writeFile(workbook, "ConciliaPro_Sugestoes.xlsx");
  };

  const renderPreviewTable = (rawData, mapping) => {
    if (!mapping.date && !mapping.value) return null;
    return (
      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 mb-2"><Eye size={14} /> Pré-visualização</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700"><th className="py-1">Data Excel</th><th className="py-1 text-blue-600 dark:text-blue-400">Data Lida</th><th className="py-1">Valor Excel</th><th className="py-1 text-blue-600 dark:text-blue-400">Valor Lido</th></tr>
            </thead>
            <tbody>
              {rawData.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0"><td className="py-1 truncate max-w-[80px]">{String(row[mapping.date] || '')}</td><td className="py-1 font-medium text-blue-700 dark:text-blue-300">{parseDate(row[mapping.date])}</td><td className="py-1 truncate max-w-[80px]">{String(row[mapping.value] || '')}</td><td className="py-1 font-medium text-blue-700 dark:text-blue-300">{parseValue(row[mapping.value])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const SortableTh = ({ label, sortKey, align = 'left' }) => (
    <th className={`p-3 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition ${align === 'right' ? 'text-right' : 'text-left'}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>{label} <ArrowUpDown size={14} className={sortConfig.key === sortKey ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'} /></div>
    </th>
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-200 relative">
        
        {/* NAVEGAÇÃO SUPERIOR */}
        <div className="absolute top-6 right-6 flex items-center gap-3 z-40">
          {isRealUser ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden md:flex items-center gap-1">
                Olá, {user?.email?.split('@')[0]}
                {userPlan === 'premium' && <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Premium</span>}
                {userPlan !== 'premium' && freeCredits > 0 && <span className="ml-2 bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><CheckCircle size={10}/> {freeCredits} Grátis</span>}
                {userPlan !== 'premium' && avulsoCredits > 0 && <span className="ml-2 bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{avulsoCredits} Avulsos</span>}
              </span>
              <button onClick={openHistory} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold hover:bg-blue-200 dark:hover:bg-blue-800/60 transition shadow-sm">
                <History size={16} /> <span className="hidden sm:inline">Histórico</span>
                {userPlan !== 'premium' && <Lock size={12} className="opacity-60" />}
              </button>
              <button onClick={handleLogout} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition" title="Sair"><LogOut size={18} /></button>
            </div>
          ) : (
            <button onClick={() => setShowAuthWall(true)} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline px-4 py-2">Fazer Login</button>
          )}
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition" title="Alternar tema">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* ÁREA DA FERRAMENTA */}
        <div className="max-w-5xl mx-auto pt-24 px-6 pb-12">
          
          <header className="mb-10 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl"><Scale className="text-blue-600 dark:text-blue-400" size={32} strokeWidth={2.5} /></div>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Concilia<span className="text-blue-600 dark:text-blue-500">Pro</span></h1>
            </div>
            <p className="text-xs font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-3 uppercase">Sistema de Conciliação Financeira</p>
          </header>

          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              {hasSavedSession && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 p-4 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 text-blue-800 dark:text-blue-300"><Save size={24} /><div><h3 className="font-bold">Sessão Salva Encontrada</h3><p className="text-sm opacity-90">Deseja retomar a última conciliação?</p></div></div>
                  <button onClick={restoreSession} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition shadow">Retomar</button>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400"><FileSpreadsheet size={24} /><h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">1. Extrato Bancário</h2></div>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6"><Upload className="w-8 h-8 mb-2 text-slate-400" /><p className="text-sm text-slate-500 font-medium">{bankFile ? bankFile.name : 'Selecione o ficheiro do Banco'}</p></div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => setBankFile(e.target.files[0])} />
                  </label>
                  {bankDataRaw.length > 0 && <p className="mt-2 text-sm text-green-600">✓ {bankDataRaw.length} linhas lidas</p>}
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-4 text-purple-600 dark:text-purple-400"><FileSpreadsheet size={24} /><h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">2. Controle / Sistema</h2></div>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6"><Upload className="w-8 h-8 mb-2 text-slate-400" /><p className="text-sm text-slate-500 font-medium">{sysFile ? sysFile.name : 'Selecione o ficheiro do ERP'}</p></div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => setSysFile(e.target.files[0])} />
                  </label>
                  {sysDataRaw.length > 0 && <p className="mt-2 text-sm text-green-600">✓ {sysDataRaw.length} linhas lidas</p>}
                </div>
              </div>
              <div className="flex justify-center mt-8">
                <button onClick={handleNextToMapping} disabled={!bankFile || !sysFile || !isXlsxLoaded} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 px-8 rounded-lg flex items-center gap-2 transition shadow-lg">Continuar <ArrowRight size={20} /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 dark:text-white">Confirme as Colunas</h2>
              <div className="grid md:grid-cols-2 gap-12 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 border-b dark:border-slate-700 pb-2 mb-4 flex items-center justify-between"><span>Banco</span>{bankTemplateFound && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1"><Sparkles size={12}/> Automático</span>}</h3>
                  {['date', 'desc', 'value'].map((field) => (
                    <div key={`bank_${field}`} className="mb-3">
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{field === 'date' ? 'Data' : field === 'desc' ? 'Descrição' : 'Valor'}</label>
                      <select className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200" value={bankMapping[field]} onChange={(e) => setBankMapping({...bankMapping, [field]: e.target.value})}><option value="">Selecione...</option>{bankCols.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                  ))}
                  {renderPreviewTable(bankDataRaw, bankMapping)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400 border-b dark:border-slate-700 pb-2 mb-4 flex items-center justify-between"><span>Sistema</span>{sysTemplateFound && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1"><Sparkles size={12}/> Automático</span>}</h3>
                  {['date', 'desc', 'value'].map((field) => (
                    <div key={`sys_${field}`} className="mb-3">
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{field === 'date' ? 'Data' : field === 'desc' ? 'Descrição' : 'Valor'}</label>
                      <select className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200" value={sysMapping[field]} onChange={(e) => setSysMapping({...sysMapping, [field]: e.target.value})}><option value="">Selecione...</option>{sysCols.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                  ))}
                  {renderPreviewTable(sysDataRaw, sysMapping)}
                </div>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg mb-8 border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={ignoreSigns} onChange={(e) => setIgnoreSigns(e.target.checked)} /><div><p className="font-semibold">Ignorar Sinais (+/-)</p><p className="text-sm opacity-70">Para quando os ficheiros têm sinais opostos para o mesmo tipo de transação.</p></div></label>
              </div>
              <div className="flex items-center justify-center border-t border-slate-200 dark:border-slate-700 pt-6 relative">
                <button onClick={() => setStep(1)} className="absolute left-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium px-4 py-2">Voltar</button>
                <button onClick={runReconciliation} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg flex items-center gap-2 shadow-md"><CheckCircle size={20} /> Processar</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              {isRealUser && isSavedToCloud && (
                <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm font-semibold flex items-center justify-between border border-blue-200 dark:border-blue-800/50">
                  <div className="flex items-center gap-2"><Cloud size={18} /> Salvo automaticamente na nuvem</div>
                  <button onClick={resetApp} className="text-blue-600 hover:underline font-bold">Nova Conciliação</button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between"><div><p className="text-slate-500 text-sm">Total Banco</p><h3 className="text-2xl font-bold">{formatMoney(results.bankTotal)}</h3></div><div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full text-blue-600"><Landmark size={24} /></div></div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between"><div><p className="text-slate-500 text-sm">Total Sistema</p><h3 className="text-2xl font-bold">{formatMoney(results.sysTotal)}</h3></div><div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-full text-purple-600"><Monitor size={24} /></div></div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between"><div><p className="text-slate-500 text-sm">Diferença</p><h3 className={`text-2xl font-bold ${Math.abs(results.difference) < 0.01 ? 'text-green-600' : 'text-orange-600'}`}>{formatMoney(results.difference)}</h3></div><div className={`p-3 rounded-full ${Math.abs(results.difference) < 0.01 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}><Calculator size={24} /></div></div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-t-4 border-t-green-500 text-center shadow-sm"><CheckCircle className="mx-auto text-green-500 mb-2" size={28} /><h3 className="text-2xl font-bold">{results.matched.length}</h3><p className="text-slate-500 text-sm">Conciliados (100%)</p></div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-t-4 border-t-red-500 text-center shadow-sm"><AlertCircle className="mx-auto text-red-500 mb-2" size={28} /><h3 className="text-2xl font-bold">{results.bankOnly.length}</h3><p className="text-slate-500 text-sm">Falta no Sistema</p></div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-t-4 border-t-orange-500 text-center shadow-sm"><XCircle className="mx-auto text-orange-500 mb-2" size={28} /><h3 className="text-2xl font-bold">{results.sysOnly.length}</h3><p className="text-slate-500 text-sm">Sobra no Sistema</p></div>
              </div>

              <div className="flex border-b border-slate-300 dark:border-slate-700 mb-6 gap-6 overflow-x-auto">
                {[{id: 'pendencia', icon: SplitSquareHorizontal, label: 'Pendência'}, {id: 'sugestoes', icon: ListChecks, label: 'Sugestões', isPremium: true}, {id: 'banco', icon: Landmark, label: 'Banco'}, {id: 'sistema', icon: Monitor, label: 'Sistema'}].map(tab => (
                  <button key={tab.id} className={`pb-3 px-2 font-bold flex items-center gap-2 ${activeTab === tab.id ? 'border-b-4 border-blue-600 text-blue-700 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`} onClick={() => setActiveTab(tab.id)}>
                    <tab.icon size={20} /> {tab.label}
                    {tab.isPremium && userPlan !== 'premium' && <Lock size={12} className="text-yellow-500 mb-3" />}
                  </button>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex justify-center gap-4">
                <div className="flex items-center gap-2"><Filter size={20} /> <span>Filtrar:</span></div>
                <div className="flex items-center gap-2"><input type="date" className="border rounded-md p-1 bg-white dark:bg-slate-900 dark:[color-scheme:dark]" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} /><span>até</span><input type="date" className="border rounded-md p-1 bg-white dark:bg-slate-900 dark:[color-scheme:dark]" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} /></div>
                {(filterStart || filterEnd) && <button onClick={() => { setFilterStart(''); setFilterEnd(''); }} className="text-blue-600 hover:underline">Limpar</button>}
              </div>

              {activeTab === 'sugestoes' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden relative">
                  {userPlan !== 'premium' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-[4px]">
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl text-center max-w-sm border-2 border-yellow-400 dark:border-yellow-600 m-4 transform transition-all hover:scale-105">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-300 to-yellow-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg"><Crown size={32} /></div>
                        <h3 className="text-xl font-extrabold mb-2 text-slate-800 dark:text-white">Inteligência Bloqueada</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">Assine o plano <strong>ConciliaPro Premium</strong> para ver exatamente o que deve ser Lançado e Removido, e poupe horas com a exportação de um clique.</p>
                        <button onClick={() => setShowPricingModal(true)} className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition w-full flex items-center justify-center gap-2">
                          <Lock size={18} /> Desbloquear Sugestões
                        </button>
                      </div>
                    </div>
                  )}
                  <div className={userPlan !== 'premium' ? 'filter blur-[5px] select-none pointer-events-none opacity-40' : ''}>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b dark:border-slate-700 flex justify-between"><h3 className="font-bold flex items-center gap-2"><ListChecks size={20} /> Ações Necessárias</h3><span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">{sugestoesList.length} itens</span></div>
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-sm text-left"><thead className="bg-white dark:bg-slate-800 border-b sticky top-0 z-10"><tr><SortableTh label="Ação" sortKey="action" /><SortableTh label="Data" sortKey="date" /><SortableTh label="Histórico" sortKey="desc" /><SortableTh label="Valor" sortKey="value" align="right" /></tr></thead><tbody>
                        {sugestoesList.map(item => (<tr key={item._id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-3">{item.action === 'Lançar' ? <span className="bg-green-100 text-green-800 font-bold px-2 py-1 rounded text-xs flex w-max gap-1"><ArrowRight size={14}/> Lançar</span> : <span className="bg-red-100 text-red-800 font-bold px-2 py-1 rounded text-xs flex w-max gap-1"><XCircle size={14}/> Remover</span>}</td><td className="p-3 whitespace-nowrap">{item.date}</td><td className="p-3">{item.desc}</td><td className={`p-3 text-right font-medium ${item.value < 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatMoney(item.value)}</td></tr>))}
                      </tbody></table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pendencia' && (
                <div className="space-y-8">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden"><div className="bg-red-50 dark:bg-red-900/20 p-4 border-b flex justify-between"><h3 className="text-red-800 font-bold flex gap-2"><AlertCircle size={20} /> Falta no Sistema</h3><span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs font-bold">{displayBankOnly.length} itens</span></div><div className="overflow-x-auto max-h-[400px]"><table className="w-full text-sm text-left"><thead className="bg-white dark:bg-slate-800 border-b sticky top-0 z-10"><tr><SortableTh label="Data" sortKey="date" /><SortableTh label="Histórico do Banco" sortKey="desc" /><SortableTh label="Valor" sortKey="value" align="right" /></tr></thead><tbody>
                    {displayBankOnly.map(item => (<tr key={item._id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-3 whitespace-nowrap">{item.date}</td><td className="p-3">{item.desc}</td><td className={`p-3 text-right font-medium ${item.value < 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatMoney(item.value)}</td></tr>))}
                  </tbody></table></div></div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden"><div className="bg-orange-50 dark:bg-orange-900/20 p-4 border-b flex justify-between"><h3 className="text-orange-800 font-bold flex gap-2"><XCircle size={20} /> Sobra no Sistema</h3><span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs font-bold">{displaySysOnly.length} itens</span></div><div className="overflow-x-auto max-h-[400px]"><table className="w-full text-sm text-left"><thead className="bg-white dark:bg-slate-800 border-b sticky top-0 z-10"><tr><SortableTh label="Data" sortKey="date" /><SortableTh label="Histórico do Sistema" sortKey="desc" /><SortableTh label="Valor" sortKey="value" align="right" /></tr></thead><tbody>
                    {displaySysOnly.map(item => (<tr key={item._id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-3 whitespace-nowrap">{item.date}</td><td className="p-3">{item.desc}</td><td className={`p-3 text-right font-medium ${item.value < 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatMoney(item.value)}</td></tr>))}
                  </tbody></table></div></div>
                </div>
              )}

              {(activeTab === 'banco' || activeTab === 'sistema') && (() => {
                const isBank = activeTab === 'banco';
                const dataList = isBank ? displayAllBank : displayAllSys;
                const Icon = isBank ? Landmark : Monitor;
                return (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden"><div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b flex justify-between"><h3 className="font-bold flex gap-2"><Icon size={20} /> Todos os Lançamentos do {isBank ? 'Banco' : 'Sistema'}</h3><span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">{dataList.length} itens</span></div><div className="overflow-x-auto max-h-[500px]"><table className="w-full text-sm text-left"><thead className="bg-white dark:bg-slate-800 border-b sticky top-0 z-10"><tr><SortableTh label="Data" sortKey="date" /><SortableTh label="Histórico Original" sortKey="desc" /><SortableTh label="Valor" sortKey="value" align="right" /></tr></thead><tbody>
                    {dataList.map(item => (<tr key={item._id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-3 whitespace-nowrap">{item.date}</td><td className="p-3">{item.desc}</td><td className={`p-3 text-right font-medium ${item.value < 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatMoney(item.value)}</td></tr>))}
                  </tbody></table></div></div>
                )
              })()}

              <div className="mt-8 text-center flex flex-wrap justify-center gap-4">
                <button onClick={resetApp} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-bold py-3 px-8 rounded-lg">Encerrar e Iniciar Nova</button>
                <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2"><Download size={20} /> Exportar</button>
              </div>
            </div>
          )}
        </div>

        {/* === MODAIS GLOBAIS === */}
        {showPricingModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
              <button onClick={() => setShowPricingModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full p-1"><XCircle size={24} /></button>
              
              <div className="text-center pt-10 pb-6 px-6">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Escolha o seu plano</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">A conciliação manual consome horas do seu dia. Deixe a nossa inteligência trabalhar por si.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 p-6 lg:p-10 bg-slate-50 dark:bg-slate-900">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-sm hover:shadow-md transition">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2"><CreditCard size={20} className="text-slate-500" /> Passe Avulso</h3>
                    <div className="mb-4"><span className="text-4xl font-extrabold text-slate-900 dark:text-white">R$ 1,99</span><span className="text-slate-500 dark:text-slate-400">/uso</span></div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Ideal para quem faz conciliações raramente e quer apenas descobrir os furos de caixa.</p>
                    <ul className="space-y-3 mb-8 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> Permite +1 Conciliação no sistema</li>
                      <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> Mostra totais e diferenças</li>
                      <li className="flex gap-2 opacity-50"><XCircle size={18} className="text-slate-400 flex-shrink-0" /> <span className="line-through">Abas de Sugestões Automáticas</span></li>
                      <li className="flex gap-2 opacity-50"><XCircle size={18} className="text-slate-400 flex-shrink-0" /> <span className="line-through">Exportar Sugestões para Excel</span></li>
                    </ul>
                  </div>
                  <button onClick={() => handleStripePayment('avulso')} className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold transition">Comprar 1 Acesso no Stripe</button>
                </div>
                <div className="bg-gradient-to-b from-blue-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-2xl p-6 border-2 border-blue-500 flex flex-col h-full shadow-xl relative transform md:-translate-y-2">
                  <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1"><Crown size={12} /> Mais Popular</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2"><Zap size={20} className="text-yellow-500" /> Assinatura Premium</h3>
                    <div className="mb-4"><span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">R$ 49,90</span><span className="text-slate-500 dark:text-slate-400">/mês</span></div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Para profissionais, BPOs e escritórios que precisam de produtividade máxima e relatórios instantâneos.</p>
                    <ul className="space-y-3 mb-8 text-sm text-slate-800 dark:text-slate-200 font-medium">
                      <li className="flex gap-2"><CheckCircle size={18} className="text-blue-500 flex-shrink-0" /> Conciliações Ilimitadas</li>
                      <li className="flex gap-2"><CheckCircle size={18} className="text-blue-500 flex-shrink-0" /> Histórico salvo na nuvem</li>
                      <li className="flex gap-2"><CheckCircle size={18} className="text-blue-500 flex-shrink-0" /> Desbloqueio da "Inteligência de Sugestões"</li>
                      <li className="flex gap-2"><CheckCircle size={18} className="text-blue-500 flex-shrink-0" /> Exportação para Excel (Um clique)</li>
                    </ul>
                  </div>
                  <button onClick={() => handleStripePayment('premium')} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg">Assinar Premium com Stripe</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Autenticação com Mensagem de Sucesso */}
        {showAuthWall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full relative">
              <button onClick={() => setShowAuthWall(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XCircle size={24} /></button>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} /></div>
              <h2 className="text-2xl font-bold text-center mb-2 dark:text-white">{authMode === 'register' ? 'Crie a sua Conta' : 'Bem-vindo de volta!'}</h2>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">{authMode === 'register' ? 'Para ganhar 5 conciliações gratuitas e guardar os relatórios, crie uma conta.' : 'Faça login para continuar as suas conciliações.'}</p>

              {/* Mensagens de Sucesso / Erro */}
              {authSuccessMsg && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-200 dark:border-green-800/50 flex justify-center items-center font-bold gap-2"><CheckCircle size={18}/> {authSuccessMsg}</div>}
              {authError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800/50">{authError}</div>}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">E-mail</label>
                  <div className="relative"><Mail size={18} className="absolute left-3 top-3 text-slate-400" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={authLoading} className="w-full pl-10 pr-3 py-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50" placeholder="seu@email.com" /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Senha</label>
                  <div className="relative"><Key size={18} className="absolute left-3 top-3 text-slate-400" /><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={authLoading} className="w-full pl-10 pr-3 py-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50" placeholder="••••••••" /></div>
                </div>
                <button type="submit" disabled={authLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg shadow-md transition mt-2">{authLoading ? 'A processar...' : (authMode === 'register' ? 'Criar Conta e Continuar' : 'Entrar')}</button>
              </form>
              <div className="mt-6 text-center text-sm"><span className="text-slate-500 dark:text-slate-400">{authMode === 'register' ? 'Já tem uma conta?' : 'Ainda não tem conta?'}</span> <button onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">{authMode === 'register' ? 'Faça Login' : 'Criar Conta'}</button></div>
            </div>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}} />
    </div>
  );
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, erroMsg: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true, erroMsg: error.toString() }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#fee2e2', color: '#991b1b', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>⚠️ Ups! Houve um erro de digitação.</h1>
          <p>A tela ficou branca porque ocorreu um erro ao ler o código.</p>
          <pre style={{ background: '#7f1d1d', color: 'white', padding: '15px', borderRadius: '8px', marginTop: '20px', overflowX: 'auto' }}>{this.state.erroMsg}</pre>
          <p style={{ marginTop: '20px' }}><strong>Como resolver:</strong> Copie novamente TODO o código do chat e substitua completamente no ficheiro <code>App.jsx</code>.</p>
        </div>
      );
    }
    return <ConciliaProApp />;
  }
}
