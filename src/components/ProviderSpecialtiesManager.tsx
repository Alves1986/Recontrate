import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

interface OfficialCategory {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  specialties: Array<{
    id: string;
    category_id: string;
    nome: string;
    slug: string;
    sinonimos?: string[];
  }>;
}

export const ProviderSpecialtiesManager: React.FC<{
  providerProfileId: string;
  authToken?: string;
  onOfficialSpecialtiesChange?: (count: number) => void;
}> = ({ providerProfileId, authToken, onOfficialSpecialtiesChange }) => {
  const [categories, setCategories] = useState<OfficialCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [principalId, setPrincipalId] = useState<string>('');

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [customTags, setCustomTags] = useState<any[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');

  // Modal de sugestão de nova especialidade
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [suggestionName, setSuggestionName] = useState<string>('');
  const [suggestionDesc, setSuggestionDesc] = useState<string>('');
  const [suggestionCategoryId, setSuggestionCategoryId] = useState<string>('');
  const [similarOfficial, setSimilarOfficial] = useState<any[]>([]);

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const authHeaders: HeadersInit = authToken
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      }
    : { 'Content-Type': 'application/json' };

  const loadTaxonomy = useCallback(async () => {
    try {
      const [catRes, ovRes] = await Promise.all([
        fetch('/api/taxonomy/categories').then((r) => r.json()),
        fetch(
          `/api/app/prestador/taxonomy?providerProfileId=${encodeURIComponent(
            providerProfileId
          )}`,
          { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      if (catRes?.ok && Array.isArray(catRes.categories)) {
        setCategories(catRes.categories);
        if (!selectedCategoryId && catRes.categories[0]) {
          setSelectedCategoryId(catRes.categories[0].id);
          setSuggestionCategoryId(catRes.categories[0].id);
        }
      }

      if (ovRes?.ok) {
        const specs = ovRes.officialSpecialties || [];
        onOfficialSpecialtiesChange?.(specs.length);
        if (specs.length > 0) {
          setSelectedSpecialtyIds(specs.map((s: any) => s.specialty_id));
          const prin = specs.find((s: any) => s.especialidade_principal);
          setPrincipalId(prin?.specialty_id || specs[0].specialty_id);
          if (specs[0].category_id) {
            setSelectedCategoryId(specs[0].category_id);
            setSuggestionCategoryId(specs[0].category_id);
          }
        }
        setSuggestions(ovRes.suggestions || []);
        setCustomTags(ovRes.customTags || []);
      }
    } catch {
      // Offline preview safe fallback
    }
  }, [providerProfileId, authToken, selectedCategoryId, onOfficialSpecialtiesChange]);

  useEffect(() => {
    loadTaxonomy();
  }, [loadTaxonomy]);

  // Autocomplete em especialidades oficiais
  useEffect(() => {
    if (!selectedCategoryId) return;
    const params = new URLSearchParams({ categoryId: selectedCategoryId });
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    fetch(`/api/taxonomy/specialties?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.ok) {
          setAutocompleteResults(body.specialties || []);
        }
      })
      .catch(() => null);
  }, [selectedCategoryId, searchQuery]);

  // Busca semelhanças antes de permitir envio no modal
  useEffect(() => {
    if (!modalOpen || suggestionName.trim().length < 3) {
      setSimilarOfficial([]);
      return;
    }
    const params = new URLSearchParams({ q: suggestionName.trim() });
    if (suggestionCategoryId) {
      params.set('categoryId', suggestionCategoryId);
    }
    fetch(`/api/taxonomy/similar?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.ok) {
          setSimilarOfficial(body.similar || []);
        }
      })
      .catch(() => null);
  }, [modalOpen, suggestionName, suggestionCategoryId]);

  const toggleSpecialty = (specId: string) => {
    setFeedback(null);
    setSelectedSpecialtyIds((prev) => {
      if (prev.includes(specId)) {
        const next = prev.filter((id) => id !== specId);
        if (principalId === specId) {
          setPrincipalId(next[0] || '');
        }
        return next;
      }
      if (prev.length >= 5) {
        setFeedback({
          type: 'error',
          message: 'Você pode selecionar no máximo 5 especialidades oficiais.',
        });
        return prev;
      }
      if (!principalId) {
        setPrincipalId(specId);
      }
      return [...prev, specId];
    });
  };

  const handleSaveOfficialSpecialties = async () => {
    if (!selectedCategoryId || selectedSpecialtyIds.length === 0) {
      setFeedback({
        type: 'error',
        message:
          'Selecione 1 categoria oficial e entre 1 e 5 especialidades oficiais.',
      });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/app/prestador/specialties', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          specialtyIds: selectedSpecialtyIds,
          principalSpecialtyId: principalId || selectedSpecialtyIds[0],
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Erro ao salvar especialidades.');
      }
      setFeedback({
        type: 'success',
        message:
          'Categoria e especialidades oficiais atualizadas no seu perfil e matching!',
      });
      onOfficialSpecialtiesChange?.(selectedSpecialtyIds.length);
      loadTaxonomy();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/app/prestador/specialty-suggestions', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          categoryId: suggestionCategoryId || selectedCategoryId,
          nomeSugerido: suggestionName,
          descricao: suggestionDesc,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Não foi possível enviar a sugestão.');
      }
      setModalOpen(false);
      setSuggestionName('');
      setSuggestionDesc('');
      setFeedback({
        type: 'success',
        message:
          body.message ||
          'Sua sugestão foi enviada para análise. Enquanto isso, selecione uma especialidade oficial próxima.',
      });
      loadTaxonomy();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/app/prestador/custom-tags', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ tag: newTagInput.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Não foi possível adicionar a tag.');
      }
      setNewTagInput('');
      setFeedback({
        type: 'success',
        message: 'Tag complementar adicionada e moderada com sucesso!',
      });
      loadTaxonomy();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    await fetch(`/api/app/prestador/custom-tags/${tagId}`, {
      method: 'DELETE',
      headers: authHeaders,
    }).catch(() => null);
    loadTaxonomy();
  };

  return (
    <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-brand-link">
            Categorias de serviço · Busca e compatibilidade
          </p>
          <h3 className="font-display font-bold text-lg text-brand-ink">
            Categoria Principal, Especialidades Oficiais (1 a 5) e Tags Complementares
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-accent-strong" />
          <span>Não encontrei minha especialidade</span>
        </button>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-2xl border font-medium flex items-start gap-2 ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. Seleção obrigatória de 1 categoria oficial + Autocomplete de especialidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="font-semibold text-brand-ink">
            1. Categoria Principal Oficial *
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 bg-white font-medium"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-brand-ink">
            2. Buscar Especialidade Oficial (com sinônimos)
          </label>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-brand-primary/15">
            <Search className="w-4 h-4 text-brand-ink/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex.: chuveiro, porcelanato, split..."
              className="w-full focus:outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* Lista de especialidades oficiais selecionáveis (1 a 5) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-brand-ink">
            Especialidades Oficiais Disponíveis ({selectedSpecialtyIds.length}/5 selecionadas)
          </p>
          <button
            type="button"
            disabled={saving || selectedSpecialtyIds.length === 0}
            onClick={handleSaveOfficialSpecialties}
            className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold cursor-pointer disabled:opacity-50"
          >
            Salvar Especialidades Oficiais
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {autocompleteResults.map((spec) => {
            const isSelected = selectedSpecialtyIds.includes(spec.id);
            const isPrincipal = principalId === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => toggleSpecialty(spec.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-brand-background/70 text-brand-ink border-brand-primary/10 hover:bg-brand-surface-hover'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand-accent-strong" />}
                <span>{spec.nome}</span>
                {isPrincipal && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-accent-strong text-white">
                    Principal
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tags Livres Complementares (máx. 10) */}
      <div className="pt-4 border-t border-brand-primary/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-brand-ink flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-brand-link" />
              Tags Livres Complementares ({customTags.length}/10)
            </p>
            <p className="text-[11px] text-brand-ink/65">
              Complementam sua busca textual (ex.: eventos, arquitetura, LED). Não criam novas categorias.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddCustomTag} className="flex gap-2">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder="Adicionar tag complementar..."
            className="flex-1 px-3.5 py-2 rounded-xl border border-brand-primary/15 text-xs"
          />
          <button
            type="submit"
            disabled={saving || customTags.length >= 10}
            className="px-4 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Tag</span>
          </button>
        </form>

        {customTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customTags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-background border border-brand-primary/10 text-brand-ink"
              >
                <span>#{t.tag}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  ({t.status})
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t.id)}
                  className="text-brand-ink/50 hover:text-red-600 cursor-pointer"
                  aria-label={`Remover tag ${t.tag}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4. Acompanhamento das Sugestões Enviadas pelo Prestador */}
      {suggestions.length > 0 && (
        <div className="pt-4 border-t border-brand-primary/10 space-y-2">
          <p className="font-semibold text-brand-ink">
            Minhas Sugestões de Especialidades ({suggestions.filter((s) => s.status === 'pendente').length}/3 pendentes)
          </p>
          <div className="space-y-2">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-3 rounded-2xl bg-brand-background/60 border border-brand-primary/10 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-semibold text-brand-ink">
                    {sug.nome_sugerido} ·{' '}
                    <span className="text-brand-link">{sug.category_name}</span>
                  </p>
                  {sug.motivo_rejeicao && (
                    <p className="text-[11px] text-red-700">
                      Motivo: {sug.motivo_rejeicao}
                    </p>
                  )}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white border border-brand-primary/10 text-[11px] font-semibold">
                  {sug.status === 'pendente'
                    ? 'Em análise'
                    : sug.status === 'aprovada'
                      ? 'Aprovada no catálogo'
                      : sug.status === 'convertida'
                        ? 'Convertida em sinônimo oficial'
                        : sug.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal "Não encontrei minha especialidade" */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-brand-primary/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-lg text-brand-ink">
                Sugerir nova especialidade para análise
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-brand-background cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSuggestion} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink">
                  Categoria mais próxima *
                </label>
                <select
                  value={suggestionCategoryId}
                  onChange={(e) => setSuggestionCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15 bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-brand-ink">
                  Nome da especialidade sugerida (3 a 60 caracteres) *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={60}
                  value={suggestionName}
                  onChange={(e) => setSuggestionName(e.target.value)}
                  placeholder="Ex.: Instalação de iluminação cênica"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15"
                />
              </div>

              {similarOfficial.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <p className="font-semibold text-amber-900">
                    Especialidades oficiais semelhantes encontradas:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {similarOfficial.map((sim) => (
                      <button
                        key={sim.id}
                        type="button"
                        onClick={() => {
                          toggleSpecialty(sim.id);
                          setModalOpen(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold cursor-pointer"
                      >
                        Usar "{sim.nome}" ({sim.categoryName})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-brand-ink">
                  Descrição opcional
                </label>
                <textarea
                  rows={2}
                  value={suggestionDesc}
                  onChange={(e) => setSuggestionDesc(e.target.value)}
                  placeholder="Detalhe rapidamente o tipo de serviço atendido..."
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-brand-background text-brand-ink font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-semibold cursor-pointer"
                >
                  Enviar para moderação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
