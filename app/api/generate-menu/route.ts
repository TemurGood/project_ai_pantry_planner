import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

// Рабочие модели по приоритету
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

export interface IngredientInput {
  name: string;
  amount: number;
  unit: string;
}

export interface GenerateMenuPayload {
  ingredients: IngredientInput[];
  peopleCount: number;
  equipment: string[];
  dietaryNotes?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY не задан в переменных окружения на сервере.' },
        { status: 500 }
      );
    }

    const body: GenerateMenuPayload = await req.json();
    const { ingredients, peopleCount, equipment, dietaryNotes } = body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Список ингредиентов пуст или некорректен.' },
        { status: 400 }
      );
    }

    if (!peopleCount || peopleCount < 1) {
      return NextResponse.json(
        { error: 'Количество персон должно быть не менее 1.' },
        { status: 400 }
      );
    }

    const pantryList = ingredients
      .map((item) => `- ${item.name}: ${item.amount} ${item.unit}`)
      .join('\n');

    const equipmentList = equipment && equipment.length > 0 
      ? equipment.join(', ') 
      : 'Стандартная плита и посуда';

    const prompt = `
Ты — шеф-повар и эксперт рационального питания.
Составь реалистичный план питания (завтрак, обед, ужин) на максимально возможное количество дней (до 7 дней включительно) строго из имеющихся запасов.

Входные данные:
- Персон: ${peopleCount}
- Техника: ${equipmentList}
- Ограничения/диета: ${dietaryNotes || 'Нет'}
- Запасы:
${pantryList}

Правила:
1. Максимум 7 дней. Если запасов много (например, 100 кг), рассчитай меню на 7 дней, а остаток продуктов подробно выведи в блок stockRemainder.
2. Для каждого блюда дай краткий пошаговый рецепт (3-4 понятных шага приготовления) и примерное время приготовления.
3. Учитывай указанную технику (${equipmentList}).
4. Все тексты, названия и шаги строго на русском языке.
`;

    // Схема с рецептами и временем
    const mealSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        cookingTime: { type: Type.STRING, description: 'Например: 15 минут' },
        usedIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
        instructions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3-4 кратких шага приготовления'
        }
      },
      required: ['title', 'description', 'cookingTime', 'usedIngredients', 'instructions']
    };

    const schemaConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          daysCovered: { type: Type.INTEGER, description: 'Количество дней' },
          summary: { type: Type.STRING, description: 'Краткое резюме' },
          days: {
            type: Type.ARRAY,
            description: 'План по дням',
            items: {
              type: Type.OBJECT,
              properties: {
                dayNumber: { type: Type.INTEGER },
                dayTitle: { type: Type.STRING },
                meals: {
                  type: Type.OBJECT,
                  properties: {
                    breakfast: mealSchema,
                    lunch: mealSchema,
                    dinner: mealSchema
                  },
                  required: ['breakfast', 'lunch', 'dinner']
                }
              },
              required: ['dayNumber', 'dayTitle', 'meals']
            }
          },
          stockRemainder: {
            type: Type.ARRAY,
            description: 'Остаток ингредиентов',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                remaining: { type: Type.STRING }
              },
              required: ['name', 'remaining']
            }
          }
        },
        required: ['daysCovered', 'summary', 'days', 'stockRemainder']
      }
    };

    let responseText: string | undefined;
    let isRateLimited = false;
    let lastErrorDetails: any = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: schemaConfig
        });

        responseText = response.text;
        if (responseText) break;
      } catch (err: any) {
        lastErrorDetails = err;
        const msg = String(err?.message || '');
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          isRateLimited = true;
        }
        console.warn(`Модель ${model} не ответила:`, msg);
        await delay(1200);
      }
    }

    if (isRateLimited && !responseText) {
      return NextResponse.json(
        { 
          error: 'Сейчас сервисом одновременно пользуется много людей (превышен минутный лимит бесплатного тарифа). Пожалуйста, подождите 20–30 секунд и нажмите снова.' 
        },
        { status: 429 }
      );
    }

    if (!responseText) {
      throw lastErrorDetails || new Error('Не удалось сгенерировать меню.');
    }

    const structuredData = JSON.parse(responseText);

    return NextResponse.json({ success: true, data: structuredData });
  } catch (error: any) {
    console.error('Ошибка в API generate-menu:', error);
    return NextResponse.json(
      { error: error?.message || 'Внутренняя ошибка генерации меню.' },
      { status: 500 }
    );
  }
}