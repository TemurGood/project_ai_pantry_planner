'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  Users, 
  Utensils, 
  Sparkles, 
  CookingPot, 
  AlertCircle,
  Calendar,
  PackageCheck,
  Copy,
  Check,
  Loader2,
  Coffee,
  Sun,
  Moon,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

export interface IngredientItem {
  id: string;
  name: string;
  amount: number | '';
  unit: string;
}

export interface Meal {
  title: string;
  description: string;
  cookingTime?: string;
  usedIngredients: string[];
  instructions?: string[];
}

export interface DayPlan {
  dayNumber: number;
  dayTitle: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
  };
}

export interface StockRemainderItem {
  name: string;
  remaining: string;
}

export interface MenuResponseData {
  daysCovered: number;
  summary: string;
  days: DayPlan[];
  stockRemainder: StockRemainderItem[];
}

// Добавлен Казан
const AVAILABLE_EQUIPMENT = [
  'Плита',
  'Духовка',
  'Казан',
  'Мультиварка',
  'Микроволновка',
  'Блендер',
  'Гриль / Сэндвичница'
];

// Кг теперь на первом месте
const UNIT_OPTIONS = ['кг', 'г', 'шт', 'л', 'мл', 'упак'];

export default function PantryPlannerDashboard() {
  // Стартовые продукты в кг и шт
  const [ingredients, setIngredients] = useState<IngredientItem[]>([
    { id: '1', name: 'Мясо (говядина)', amount: 1.5, unit: 'кг' },
    { id: '2', name: 'Рис', amount: 1, unit: 'кг' },
    { id: '3', name: 'Морковь', amount: 1, unit: 'кг' },
    { id: '4', name: 'Лук', amount: 0.5, unit: 'кг' },
    { id: '5', name: 'Яйца', amount: 10, unit: 'шт' },
  ]);

  const [peopleCount, setPeopleCount] = useState<number>(3);
  const [equipment, setEquipment] = useState<string[]>(['Плита', 'Казан']);
  const [dietaryNotes, setDietaryNotes] = useState<string>('Узбекская кухня приветствуется');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [menuResult, setMenuResult] = useState<MenuResponseData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('last_generated_menu');
      if (saved) {
        setMenuResult(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Не удалось загрузить кэш из localStorage', e);
    }
  }, []);

  const toggleRecipe = (key: string) => {
    setExpandedRecipes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Новая строка по умолчанию создаётся в КГ
  const addIngredientRow = () => {
    setIngredients((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', amount: '', unit: 'кг' }
    ]);
  };

  const removeIngredientRow = (id: string) => {
    if (ingredients.length <= 1) {
      setValidationError('Оставьте хотя бы один ингредиент.');
      return;
    }
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  const updateIngredient = (
    id: string, 
    field: keyof Omit<IngredientItem, 'id'>, 
    value: any
  ) => {
    setValidationError(null);
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((eq) => eq !== item) : [...prev, item]
    );
  };

  const validateForm = () => {
    const invalidItems = ingredients.some(
      (item) => !item.name.trim() || !item.amount || Number(item.amount) <= 0
    );

    if (invalidItems) {
      setValidationError('Пожалуйста, укажите название и вес/количество для всех продуктов.');
      return false;
    }

    if (peopleCount < 1) {
      setValidationError('Укажите хотя бы 1 персону.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleGenerateMenu = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const payload = {
        ingredients: ingredients.map((i) => ({
          name: i.name.trim(),
          amount: Number(i.amount),
          unit: i.unit
        })),
        peopleCount,
        equipment,
        dietaryNotes: dietaryNotes.trim() || undefined
      };

      const res = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Ошибка при генерации меню.');
      }

      setMenuResult(json.data);
      localStorage.setItem('last_generated_menu', JSON.stringify(json.data));

      setTimeout(() => {
        document.getElementById('menu-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setApiError(err.message || 'Произошла непредвиденная ошибка.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSavedMenu = () => {
    localStorage.removeItem('last_generated_menu');
    setMenuResult(null);
    setExpandedRecipes({});
  };

  const handleCopyMenu = () => {
    if (!menuResult) return;

    let text = `📋 План питания на ${menuResult.daysCovered} дн. (на ${peopleCount} чел.):\n\n`;
    menuResult.days.forEach((d) => {
      text += `📅 ${d.dayTitle} (День ${d.dayNumber}):\n`;
      text += `  🍳 Завтрак: ${d.meals.breakfast.title} (${d.meals.breakfast.cookingTime || '15 мин'})\n`;
      if (d.meals.breakfast.instructions) {
        d.meals.breakfast.instructions.forEach((step, i) => {
          text += `     ${i + 1}. ${step}\n`;
        });
      }
      text += `  🍲 Обед: ${d.meals.lunch.title} (${d.meals.lunch.cookingTime || '40 мин'})\n`;
      if (d.meals.lunch.instructions) {
        d.meals.lunch.instructions.forEach((step, i) => {
          text += `     ${i + 1}. ${step}\n`;
        });
      }
      text += `  🍽️ Ужин: ${d.meals.dinner.title} (${d.meals.dinner.cookingTime || '30 мин'})\n`;
      if (d.meals.dinner.instructions) {
        d.meals.dinner.instructions.forEach((step, i) => {
          text += `     ${i + 1}. ${step}\n`;
        });
      }
      text += `\n`;
    });

    text += `📦 Остатки продуктов:\n`;
    menuResult.stockRemainder.forEach((r) => {
      text += `  • ${r.name}: ${r.remaining}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const renderMealBlock = (
    label: string, 
    meal: Meal, 
    dayNum: number, 
    mealType: 'breakfast' | 'lunch' | 'dinner',
    icon: React.ReactNode,
    colorClass: string,
    badgeClass: string
  ) => {
    const key = `day-${dayNum}-${mealType}`;
    const isExpanded = !!expandedRecipes[key];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 text-xs font-bold ${colorClass}`}>
            {icon}
            {label}: {meal.title}
          </div>
          {meal.cookingTime && (
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {meal.cookingTime}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {meal.description}
        </p>

        <div className="flex flex-wrap gap-1">
          {meal.usedIngredients.map((ing, i) => (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${badgeClass}`}>
              {ing}
            </span>
          ))}
        </div>

        {meal.instructions && meal.instructions.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleRecipe(key)}
              className="text-[11px] font-semibold text-slate-600 hover:text-emerald-700 inline-flex items-center gap-1 transition"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Скрыть рецепт
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Показать рецепт ({meal.instructions.length} шага)
                </>
              )}
            </button>

            {isExpanded && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 animate-fadeIn">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Приготовление:
                </span>
                <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                  {meal.instructions.map((step, idx) => (
                    <li key={idx} className="leading-snug">
                      <span className="font-medium text-slate-900">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                AI Pantry & Menu Planner
              </h1>
              <p className="text-xs text-slate-500">
                Недельное меню из запасов в кг с подробными рецептами
              </p>
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Gemini 3.5 Ready
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Настройки */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Количество персон
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setPeopleCount((p) => Math.max(1, p - 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-700 transition disabled:opacity-50"
              >
                -
              </button>
              <div className="w-16 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-900">
                {peopleCount}
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setPeopleCount((p) => Math.min(10, p + 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-700 transition disabled:opacity-50"
              >
                +
              </button>
              <span className="text-xs text-slate-500">
                {peopleCount === 1 ? 'персона' : peopleCount < 5 ? 'персоны' : 'персон'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4 text-emerald-600" />
              Пожелания (кухня, диета)
            </label>
            <input
              type="text"
              disabled={isLoading}
              placeholder="Например: узбекские блюда, без свинины, побольше зелени..."
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:bg-slate-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2.5">
              <CookingPot className="w-4 h-4 text-emerald-600" />
              Доступная техника и посуда
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EQUIPMENT.map((item) => {
                const isSelected = equipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={isLoading}
                    onClick={() => toggleEquipment(item)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition disabled:opacity-50 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Продукты */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Запасы продуктов (в кг / шт)
              </h2>
              <p className="text-xs text-slate-500">
                Рассчитано до 7 дней; остатки выведутся отдельно
              </p>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={addIngredientRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Добавить продукт
            </button>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {validationError}
            </div>
          )}

          <div className="space-y-3">
            {ingredients.map((item, index) => (
              <div 
                key={item.id} 
                className="flex items-center gap-2 sm:gap-3 p-2 rounded-xl bg-slate-50/80 border border-slate-200/70"
              >
                <span className="w-6 text-xs text-slate-400 text-center font-medium">
                  {index + 1}.
                </span>

                <input
                  type="text"
                  disabled={isLoading}
                  placeholder="Название (например, Мясо)"
                  value={item.name}
                  onChange={(e) => updateIngredient(item.id, 'name', e.target.value)}
                  className="flex-1 min-w-[140px] px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />

                <input
                  type="number"
                  disabled={isLoading}
                  placeholder="Вес/кол-во"
                  min="0.05"
                  step="any"
                  value={item.amount}
                  onChange={(e) =>
                    updateIngredient(
                      item.id, 
                      'amount', 
                      e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-24 px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />

                {/* Единица измерения с кг по умолчанию */}
                <select
                  disabled={isLoading}
                  value={item.unit}
                  onChange={(e) => updateIngredient(item.id, 'unit', e.target.value)}
                  className="px-2.5 py-2 text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:bg-slate-100 font-medium"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => removeIngredientRow(item.id)}
                  title="Удалить"
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={addIngredientRow}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить еще строку (в кг)
            </button>
          </div>
        </section>

        {/* Кнопка генерации */}
        <div className="flex flex-col items-center justify-center pt-2 space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGenerateMenu}
            className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition flex items-center gap-2.5 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Шеф составляет недельное меню и рецепты...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Рассчитать рацион с рецептами
              </>
            )}
          </button>

          {apiError && (
            <div className="max-w-md w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}
        </div>

        {/* РЕЗУЛЬТАТЫ */}
        {menuResult && (
          <section id="menu-results" className="space-y-8 pt-6 border-t border-slate-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  Хватит на: {menuResult.daysCovered} {menuResult.daysCovered === 1 ? 'день' : menuResult.daysCovered < 5 ? 'дня' : 'дней'}
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  План питания и рецепты готовы!
                </h3>
                <p className="text-emerald-100 text-sm max-w-2xl">
                  {menuResult.summary}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleClearSavedMenu}
                  title="Очистить сохранённое меню"
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition backdrop-blur-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyMenu}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-900 rounded-xl font-semibold text-sm shadow hover:bg-emerald-50 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      Скопировано!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Скопировать с рецептами
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menuResult.days.map((day) => (
                <div 
                  key={day.dayNumber}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold">
                        {day.dayNumber}
                      </span>
                      {day.dayTitle}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">3 приёма пищи</span>
                  </div>

                  <div className="p-5 space-y-4 flex-1">
                    {renderMealBlock(
                      'Завтрак',
                      day.meals.breakfast,
                      day.dayNumber,
                      'breakfast',
                      <Coffee className="w-3.5 h-3.5" />,
                      'text-amber-700',
                      'bg-amber-50 text-amber-800 border-amber-200'
                    )}

                    <div className="border-t border-slate-100" />

                    {renderMealBlock(
                      'Обед',
                      day.meals.lunch,
                      day.dayNumber,
                      'lunch',
                      <Sun className="w-3.5 h-3.5" />,
                      'text-emerald-700',
                      'bg-emerald-50 text-emerald-800 border-emerald-200'
                    )}

                    <div className="border-t border-slate-100" />

                    {renderMealBlock(
                      'Ужин',
                      day.meals.dinner,
                      day.dayNumber,
                      'dinner',
                      <Moon className="w-3.5 h-3.5" />,
                      'text-indigo-700',
                      'bg-indigo-50 text-indigo-800 border-indigo-200'
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="text-base font-bold text-slate-900">
                  Остаток запасов после всех приготовлений
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {menuResult.stockRemainder.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {item.name}
                    </p>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">
                      {item.remaining}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}