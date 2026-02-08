
import React, { useState, useRef } from 'react';
import { 
  Scale, 
  FileText, 
  Users, 
  Gavel, 
  Search, 
  Download, 
  History, 
  Plus, 
  Trash2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Sparkles,
  X,
  Phone,
  RotateCcw,
  Library,
  Box,
  Paperclip,
  File,
  Image as ImageIcon,
  FileArchive
} from 'lucide-react';
import { CaseType, CaseDetails, Party, JudgementDraft, PartyRole, LegalProvision, Attachment } from './types';
import { generateJudgementDraft, extractPartyInfo } from './services/geminiService';

const INITIAL_CASE_DETAILS: CaseDetails = {
  caseNumber: '',
  courtName: '某某市中级人民法院',
  caseType: CaseType.CIVIL,
  prosecutors: [],
  plaintiffs: [{ role: 'plaintiff', name: '', identity: '', address: '', phone: '' }],
  defendants: [{ role: 'defendant', name: '', identity: '', address: '', phone: '' }],
  thirdParties: [],
  claims: '',
  facts: '',
  evidence: '',
  legalBasis: [{ lawName: '', article: '', content: '' }],
  attachments: []
};

const App: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [draft, setDraft] = useState<JudgementDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [caseDetails, setCaseDetails] = useState<CaseDetails>(INITIAL_CASE_DETAILS);

  const handleReset = () => {
    if (window.confirm('确定要清空所有已输入的信息吗？此操作不可撤销。')) {
      setCaseDetails(INITIAL_CASE_DETAILS);
      setDraft(null);
      setStep(1);
    }
  };

  const handleAddParty = (role: PartyRole) => {
    const key = role === 'plaintiff' ? 'plaintiffs' : 
                role === 'defendant' ? 'defendants' : 
                role === 'third_party' ? 'thirdParties' : 'prosecutors';
    setCaseDetails(prev => ({
      ...prev,
      [key]: [...prev[key as keyof CaseDetails] as Party[], { role, name: '', identity: '', address: '', phone: '' }]
    }));
  };

  const handleRemoveParty = (role: PartyRole, index: number) => {
    const key = role === 'plaintiff' ? 'plaintiffs' : 
                role === 'defendant' ? 'defendants' : 
                role === 'third_party' ? 'thirdParties' : 'prosecutors';
    setCaseDetails(prev => ({
      ...prev,
      [key]: (prev[key as keyof CaseDetails] as Party[]).filter((_, i) => i !== index)
    }));
  };

  const updateParty = (role: PartyRole, index: number, field: keyof Party, value: string) => {
    const key = role === 'plaintiff' ? 'plaintiffs' : 
                role === 'defendant' ? 'defendants' : 
                role === 'third_party' ? 'thirdParties' : 'prosecutors';
    const newList = [...(caseDetails[key as keyof CaseDetails] as Party[])];
    newList[index] = { ...newList[index], [field]: value };
    setCaseDetails(prev => ({ ...prev, [key]: newList }));
  };

  const handleAddLegalBasis = () => {
    setCaseDetails(prev => ({
      ...prev,
      legalBasis: [...prev.legalBasis, { lawName: '', article: '', content: '' }]
    }));
  };

  const handleRemoveLegalBasis = (index: number) => {
    setCaseDetails(prev => ({
      ...prev,
      legalBasis: prev.legalBasis.filter((_, i) => i !== index)
    }));
  };

  const updateLegalBasis = (index: number, field: keyof LegalProvision, value: string) => {
    const newList = [...caseDetails.legalBasis];
    newList[index] = { ...newList[index], [field]: value };
    setCaseDetails(prev => ({ ...prev, legalBasis: newList }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const fileData = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      newAttachments.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        data: fileData
      });
    }

    setCaseDetails(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const handleRemoveAttachment = (id: string) => {
    setCaseDetails(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

  const handleSmartExtract = async () => {
    if (!extractText.trim()) return;
    setExtracting(true);
    try {
      const parties = await extractPartyInfo(extractText);
      const newDetails = { ...caseDetails };
      
      parties.forEach(p => {
        if (p.role === 'plaintiff') newDetails.plaintiffs = [...newDetails.plaintiffs, p];
        else if (p.role === 'defendant') newDetails.defendants = [...newDetails.defendants, p];
        else if (p.role === 'third_party') newDetails.thirdParties = [...newDetails.thirdParties, p];
        else if (p.role === 'prosecutor') newDetails.prosecutors = [...newDetails.prosecutors, p];
      });

      if (newDetails.plaintiffs.length > 1 && !newDetails.plaintiffs[0].name) newDetails.plaintiffs.shift();
      if (newDetails.defendants.length > 1 && !newDetails.defendants[0].name) newDetails.defendants.shift();

      setCaseDetails(newDetails);
      setShowExtractModal(false);
      setExtractText('');
    } catch (error) {
      alert("信息提取失败");
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await generateJudgementDraft(caseDetails);
      setDraft(result);
      setStep(2);
    } catch (error) {
      alert("生成失败，请检查配置。");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5 text-blue-500" />;
  };

  const renderPartyForm = (role: PartyRole, title: string, icon: React.ReactNode) => {
    const key = role === 'plaintiff' ? 'plaintiffs' : 
                role === 'defendant' ? 'defendants' : 
                role === 'third_party' ? 'thirdParties' : 'prosecutors';
    const list = caseDetails[key as keyof CaseDetails] as Party[];

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {icon} {title}
          </h3>
          <button 
            onClick={() => handleAddParty(role)}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
          >
            <Plus className="w-3 h-3" /> 添加
          </button>
        </div>
        {list.map((p, i) => (
          <div key={i} className="bg-slate-50 p-4 rounded-lg relative border border-slate-200 group">
            <button onClick={() => handleRemoveParty(role, i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">姓名/名称</label>
                <input 
                  placeholder="姓名或单位名称" 
                  className="text-sm p-2 border rounded w-full bg-white focus:border-indigo-500 outline-none"
                  value={p.name}
                  onChange={e => updateParty(role, i, 'name', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">证件/信用代码</label>
                <input 
                  placeholder="身份证号或信用代码" 
                  className="text-sm p-2 border rounded w-full bg-white focus:border-indigo-500 outline-none"
                  value={p.identity}
                  onChange={e => updateParty(role, i, 'identity', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">详细地址</label>
                <input 
                  placeholder="住所地、联系地址" 
                  className="text-sm p-2 border rounded w-full bg-white focus:border-indigo-500 outline-none"
                  value={p.address}
                  onChange={e => updateParty(role, i, 'address', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">联系电话</label>
                <div className="relative">
                  <Phone className="absolute left-2 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    placeholder="联系方式" 
                    className="text-sm p-2 pl-7 border rounded w-full bg-white focus:border-indigo-500 outline-none"
                    value={p.phone}
                    onChange={e => updateParty(role, i, 'phone', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">代理人/代表人</label>
                <input 
                  placeholder="委托代理人、法定代表人" 
                  className="text-sm p-2 border rounded w-full bg-white focus:border-indigo-500 outline-none"
                  value={p.legalRep || ''}
                  onChange={e => updateParty(role, i, 'legalRep', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Extract Modal */}
      {showExtractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> 智能提取当事人信息
              </h3>
              <button onClick={() => setShowExtractModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                请粘贴起诉状、传票或警察笔录中关于当事人的段落，AI 将自动识别并填充表单。
              </p>
              <textarea 
                rows={8}
                className="w-full border rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                placeholder="例如：原告张三，男，1980年生，住某某市... 被告某某有限公司，法定代表人李四..."
                value={extractText}
                onChange={e => setExtractText(e.target.value)}
              />
              <div className="mt-6 flex gap-3">
                <button 
                  onClick={() => setShowExtractModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button 
                  disabled={extracting || !extractText.trim()}
                  onClick={handleSmartExtract}
                  className="flex-[2] px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:bg-slate-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                  {extracting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
                  立即提取并填充
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              法鼎 <span className="text-sm font-normal text-slate-500 ml-2 hidden sm:inline">智能法律文书辅助系统</span>
            </h1>
          </div>
          <nav className="flex items-center space-x-3 sm:space-x-4">
            <button 
              onClick={handleReset}
              className="text-slate-500 hover:text-red-600 font-bold text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              title="一键清空所有输入内容"
            >
              <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">一键清空</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
            <button className="text-slate-600 hover:text-indigo-600 font-medium text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
              <History className="w-4 h-4" /> <span className="hidden sm:inline">历史</span>
            </button>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-100 active:scale-95">
              <Plus className="w-4 h-4" /> <span>新建</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6 border-b pb-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold">案件基础信息</h2>
                  </div>
                  <button 
                    onClick={() => setShowExtractModal(true)}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-all active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> 智能提取当事人
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">法院名称</label>
                    <input 
                      type="text" 
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 border outline-none"
                      value={caseDetails.courtName}
                      onChange={e => setCaseDetails({...caseDetails, courtName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">案号</label>
                    <input 
                      type="text" 
                      placeholder="(2024) 粤01民初..."
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 border outline-none"
                      value={caseDetails.caseNumber}
                      onChange={e => setCaseDetails({...caseDetails, caseNumber: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">案件类型</label>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.values(CaseType).map(type => (
                        <button
                          key={type}
                          onClick={() => setCaseDetails({...caseDetails, caseType: type})}
                          className={`py-2 px-4 rounded-lg text-sm font-bold border transition-all ${
                            caseDetails.caseType === type 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-100' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {caseDetails.caseType === CaseType.CRIMINAL && renderPartyForm('prosecutor', '公诉机关', <ShieldCheck className="w-4 h-4" />)}
                  {renderPartyForm('plaintiff', caseDetails.caseType === CaseType.CRIMINAL ? '附带民事原告' : '原告方', <Users className="w-4 h-4" />)}
                  {renderPartyForm('defendant', '被告方', <Users className="w-4 h-4" />)}
                  {renderPartyForm('third_party', '第三人', <Users className="w-4 h-4" />)}
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2 text-slate-900 border-b pb-4">
                  <Gavel className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold">裁判内容核心</h2>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 font-bold">诉讼请求 / 指控事项</label>
                  <textarea 
                    rows={4} 
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border outline-none transition-shadow"
                    placeholder="具体主张或指控罪名..."
                    value={caseDetails.claims}
                    onChange={e => setCaseDetails({...caseDetails, claims: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 font-bold">查明事实</label>
                  <textarea 
                    rows={6} 
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border outline-none transition-shadow"
                    placeholder="经庭审确认的关键事实..."
                    value={caseDetails.facts}
                    onChange={e => setCaseDetails({...caseDetails, facts: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2 font-bold">
                    <Box className="w-4 h-4 text-indigo-600" /> 主要证据及描述
                  </label>
                  <textarea 
                    rows={4} 
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border outline-none transition-shadow"
                    placeholder="描述证据链条及其采信情况..."
                    value={caseDetails.evidence}
                    onChange={e => setCaseDetails({...caseDetails, evidence: e.target.value})}
                  />
                </div>
                
                {/* Multi-level Legal Basis */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Library className="w-4 h-4 text-indigo-600" /> 法律依据 (多级条文)
                    </label>
                    <button 
                      onClick={handleAddLegalBasis}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold bg-indigo-50 px-2 py-1 rounded"
                    >
                      <Plus className="w-3 h-3" /> 添加法律条款
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {caseDetails.legalBasis.map((lb, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group animate-in slide-in-from-right-2 duration-200">
                        {caseDetails.legalBasis.length > 1 && (
                          <button 
                            onClick={() => handleRemoveLegalBasis(i)}
                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">法律名称</label>
                            <input 
                              placeholder="如：中华人民共和国民法典" 
                              className="text-sm p-2 border rounded w-full bg-white focus:border-indigo-500 outline-none"
                              value={lb.lawName}
                              onChange={e => updateLegalBasis(i, 'lawName', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">具体条款 (第X条第X款)</label>
                            <input 
                              placeholder="如：第五百七十七条" 
                              className="text-sm p-2 border rounded w-full bg-white focus:border-indigo-500 outline-none"
                              value={lb.article}
                              onChange={e => updateLegalBasis(i, 'article', e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">条款内容摘要 (可选)</label>
                          <textarea 
                            rows={2}
                            placeholder="粘贴法律原文或关键要点..."
                            className="text-sm p-2 border rounded w-full bg-white focus:border-indigo-500 outline-none resize-none"
                            value={lb.content}
                            onChange={e => updateLegalBasis(i, 'content', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-indigo-600" /> 附件材料 (证据原件/参考判例)
                    </label>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold bg-indigo-50 px-2 py-1 rounded"
                    >
                      <Plus className="w-3 h-3" /> 选择文件
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      multiple 
                      onChange={handleFileUpload} 
                    />
                  </div>
                  
                  {caseDetails.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {caseDetails.attachments.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl group hover:border-indigo-200 hover:shadow-sm transition-all">
                          <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate" title={file.name}>{file.name}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                          </div>
                          <button 
                            onClick={() => handleRemoveAttachment(file.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                      <Paperclip className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-xs">暂无附件材料</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar Tools */}
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-white sticky top-24 overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" /> 准备就绪
                </h3>
                <div className="space-y-4 mb-8">
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
                    AI 将整合当事人身份信息、指控事实、证据链条、结构化法律依据及附件材料，自动生成一份完整的规范格式判决书。
                  </div>
                </div>
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    loading 
                    ? 'bg-slate-800 cursor-not-allowed text-slate-500' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-lg shadow-indigo-900/20'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      撰写中...
                    </>
                  ) : (
                    <>
                      生成判决书草案 <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">使用提示</h3>
                <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                  <p className="flex gap-2"><span className="text-indigo-600 font-bold">•</span> 上传图片证据，AI 将尝试识别其中的关键内容辅助撰写。</p>
                  <p className="flex gap-2"><span className="text-indigo-600 font-bold">•</span> 使用多级法律依据功能，可以精确引用法律条文。</p>
                  <p className="flex gap-2"><span className="text-indigo-600 font-bold">•</span> 若需重写，可点击顶部的“一键清空”重置所有表单。</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Preview Section */
          <div className="max-w-4xl mx-auto pb-20 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 font-bold flex items-center gap-1 bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95"
              >
                返回修改
              </button>
              <div className="flex gap-3">
                <button className="px-5 py-2.5 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95">
                  <Download className="w-4 h-4" /> 导出 Word
                </button>
                <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                  <FileText className="w-4 h-4" /> 打印
                </button>
              </div>
            </div>

            <div className="bg-white shadow-2xl border border-slate-200 rounded-sm p-12 md:p-24 font-serif-zh min-h-[1000px] leading-relaxed text-slate-900 selection:bg-indigo-100">
              {draft && (
                <div className="space-y-12 text-[18px]">
                  <h1 className="text-3xl font-bold text-center tracking-[0.2em] leading-loose whitespace-pre-wrap py-4">
                    {draft.title}
                  </h1>
                  
                  <div className="space-y-6">
                    <p className="whitespace-pre-wrap leading-[2] text-justify">{draft.partiesSection}</p>
                    <p className="whitespace-pre-wrap leading-[2] text-justify">{draft.proceedings}</p>
                  </div>

                  <div className="space-y-10">
                    <div>
                      <h2 className="text-xl font-bold mb-6">一、原告主张与被告辩称</h2>
                      <div className="whitespace-pre-wrap leading-[2.2] indent-[2em] text-justify">{draft.claimsAndDefense}</div>
                    </div>
                    
                    <div>
                      <h2 className="text-xl font-bold mb-6">二、本院查明事实</h2>
                      <div className="whitespace-pre-wrap leading-[2.2] indent-[2em] text-justify">{draft.courtFindings}</div>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold mb-6">三、本院认为</h2>
                      <div className="whitespace-pre-wrap leading-[2.2] indent-[2em] text-justify">{draft.courtReasoning}</div>
                    </div>

                    <div className="pt-8">
                      <h2 className="text-xl font-bold mb-6 text-center tracking-[0.5em] py-6 border-y-2 border-slate-900">判 决 结 果</h2>
                      <div className="whitespace-pre-wrap leading-[2.2] font-bold text-justify pt-4">{draft.judgment}</div>
                    </div>
                  </div>

                  <div className="pt-20 flex flex-col items-end space-y-6">
                    <div className="text-right whitespace-pre-wrap text-xl font-bold leading-relaxed">
                      {draft.closing}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm font-medium">法鼎智能判决书辅助生成系统</p>
          <p className="text-slate-300 text-xs mt-1">AI 辅助工具仅供参考，具体文书请以审判委员会或法官最终签发为准。</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
