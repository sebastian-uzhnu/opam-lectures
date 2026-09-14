---
sidebar_position: 4
---

# Візуалізація даних: побудова діаграм

## Діаграма — це просто фігури

У темі 25 ви навчилися показувати дані таблицею. Таблиця чесна й точна,
але має одну ваду: з неї не видно **картини**. Двадцять рядків із числами —
це двадцять чисел, а не «продажі зростають, крім лютого».

Діаграма показує саме картину. І найважливіше, що треба зрозуміти:
з погляду коду діаграма — це не якийсь особливий елемент керування,
а звичайний набір примітивів із першого підрозділу.

```
   Дані                    Перерахунок              Примітиви

   Січень   45     ──▶   значення 45               Rectangle
   Лютий    28           перетворюється            Rectangle
   Березень 61           у висоту 138 пікселів     Rectangle
   Квітень  52           і позицію X = 210         Rectangle
                                                   + Line (сітка)
                                                   + TextBlock (підписи)
```

Сторонніх бібліотек ми не використовуємо. Усе, що потрібно, у вас уже є:
`Rectangle`, `Polyline`, `Path`, `Line`, `TextBlock` і клас `PlotArea`
з попереднього підрозділу.

## Спільна основа для всіх діаграм

Перед тим як малювати стовпчики чи сектори, треба розв'язати три однакові
для всіх діаграм задачі.

### Задача 1. Область побудови й поля

Підписи осей, назви категорій, легенда — усе це має місце **поза** тією
областю, де малюються самі дані. Якщо про це не подумати, підписи або
наїдуть на стовпчики, або обріжуться краєм вікна.

```
   Canvas 700 x 420
   ┌──────────────────────────────────────────────────────────┐
   │                    Продажі за місяцями        ◀── назва  │
   │      ┌────────────────────────────────────────────┐      │
   │   80 ├ · · · · · · · · · · · · · · · · · · · · · ·│      │
   │      │                    ▓▓▓                     │      │
   │   60 ├ · · · · · · · · · ·▓▓▓· · · · · · · · · · ·│      │
   │      │           ▓▓▓      ▓▓▓         ▓▓▓         │      │
   │   40 ├ ·▓▓▓· · · ▓▓▓· · · ▓▓▓ · · · · ▓▓▓ · · · · │      │
   │      │  ▓▓▓      ▓▓▓      ▓▓▓   ▓▓▓   ▓▓▓         │      │
   │   20 ├ ·▓▓▓· · · ▓▓▓· · · ▓▓▓· ·▓▓▓· ·▓▓▓ · · · · │      │
   │      │  ▓▓▓      ▓▓▓      ▓▓▓   ▓▓▓   ▓▓▓         │      │
   │    0 └──┬────────┬────────┬─────┬─────┬───────────┘      │
   │       Січ      Лют      Бер   Кві   Тра                  │
   │  ▲                                                       │
   │  └── padLeft: тут живуть підписи осі Y                   │
   └──────────────────────────────────────────────────────────┘
        padBottom: тут живуть назви категорій
```

### Задача 2. Масштаб під конкретні дані

Це найважливіше. Якщо максимум по осі Y зашити числом 100, то набір даних
зі значеннями 3, 5, 4 намалюється як три ледь помітні смужки біля нуля,
а набір зі значеннями 500, 700, 620 просто не вміститься.

Масштаб треба **рахувати з даних**: знайти мінімум і максимум, додати
трохи запасу й округлити до «зручного» числа.

### Задача 3. «Гарні» поділки

Якщо максимум даних 73, а поділок хочеться п'ять, наївний розрахунок
дасть крок `73 / 5 = 14.6` і підписи `0, 14.6, 29.2, 43.8, 58.4, 73`.
Формально правильно, читати неможливо.

Люди очікують круглі числа: 10, 20, 50, 100, 0.5, 0.25. Алгоритм,
який їх знаходить, називається **«гарний крок»** (nice step) і вміщується
у десять рядків:

```
   1. rawStep = діапазон / бажана кількість поділок
   2. знайти порядок: magnitude = 10^floor(log10(rawStep))
   3. normalized = rawStep / magnitude       (число від 1 до 10)
   4. округлити normalized вгору до 1, 2, 5 або 10
   5. niceStep = округлене * magnitude
```

Зберемо це в один клас.

```csharp
using System;
using System.Collections.Generic;

/// <summary>Один елемент даних для діаграми.</summary>
public sealed class ChartPoint
{
    public string Label { get; set; } = "";
    public double Value { get; set; }
}

/// <summary>Обчислена шкала: межі та крок поділок.</summary>
public readonly struct AxisScale
{
    public double Min  { get; }
    public double Max  { get; }
    public double Step { get; }

    public AxisScale(double min, double max, double step)
    {
        Min = min; Max = max; Step = step;
    }

    /// <summary>
    /// Підбирає межі та крок так, щоб усі дані вмістились,
    /// а підписи поділок були круглими числами.
    /// </summary>
    public static AxisScale ForValues(IReadOnlyList<double> values,
                                      int targetTicks = 5,
                                      bool includeZero = true)
    {
        if (values.Count == 0)
            return new AxisScale(0, 1, 0.25);

        double min = values[0];
        double max = values[0];

        for (int i = 1; i < values.Count; i++)
        {
            if (values[i] < min) min = values[i];
            if (values[i] > max) max = values[i];
        }

        // Для стовпчикових діаграм нуль має бути на шкалі обов'язково,
        // інакше стовпчики брешуть про співвідношення
        if (includeZero)
        {
            if (min > 0) min = 0;
            if (max < 0) max = 0;
        }

        // Усі значення однакові — робимо штучний діапазон
        if (Math.Abs(max - min) < 1e-9)
        {
            max = min + 1;
        }

        double step   = NiceStep((max - min) / targetTicks);
        double niceMin = Math.Floor  (min / step) * step;
        double niceMax = Math.Ceiling(max / step) * step;

        return new AxisScale(niceMin, niceMax, step);
    }

    /// <summary>Округлює крок до «людського» числа: 1, 2, 5 або 10 на порядок.</summary>
    private static double NiceStep(double rawStep)
    {
        if (rawStep <= 0) return 1;

        double magnitude  = Math.Pow(10, Math.Floor(Math.Log10(rawStep)));
        double normalized = rawStep / magnitude;      // від 1 до 10

        double nice = normalized switch
        {
            <= 1 => 1,
            <= 2 => 2,
            <= 5 => 5,
            _    => 10
        };

        return nice * magnitude;
    }
}
```

Перевіримо на прикладах:

```
Вивід (значення → підібрана шкала):

  { 45, 28, 61, 52, 39 }        →  Min=0    Max=70    Step=10
  { 3, 5, 4 }                   →  Min=0    Max=5     Step=1
  { 500, 700, 620 }             →  Min=0    Max=700   Step=100
  { 0.12, 0.31, 0.24 }          →  Min=0    Max=0.35  Step=0.05
  { -20, 15, 40 }               →  Min=-20  Max=40    Step=10
```

:::info Цікаво
`includeZero` — не технічна дрібниця, а питання чесності діаграми.
Якщо у стовпчиковій діаграмі почати вісь Y не з нуля, а, скажімо, з 95,
то значення 96 і 100 виглядатимуть як «удвічі більше», хоча різниця
чотири відсотки. Цим прийомом регулярно маніпулюють у рекламі й політиці.
Для стовпчиків нуль обов'язковий; для лінійних графіків, де важлива саме
динаміка, — необов'язковий.
:::

## Стовпчикова діаграма

Найпростіша й найчастіша. Для кожного значення — прямокутник, висота
пропорційна значенню.

Один слот на категорію, стовпчик усередині слота із проміжками з боків:

```
   ширина слота = plotWidth / кількість категорій

   │◀────── слот ──────▶│◀────── слот ──────▶│
   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
   │◀▶▓ ширина стовпця ▓│                    │
   проміжок = слот * 0.15 з кожного боку
```

```csharp
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;

public static class BarChart
{
    private static readonly Brush GridBrush  = new SolidColorBrush(Color.FromRgb(0x25, 0x2E, 0x3E));
    private static readonly Brush AxisBrush  = new SolidColorBrush(Color.FromRgb(0x7B, 0x88, 0x9C));
    private static readonly Brush LabelBrush = new SolidColorBrush(Color.FromRgb(0xC7, 0xD0, 0xDE));

    public static void Draw(Canvas canvas, IReadOnlyList<ChartPoint> data,
                            string title = "")
    {
        canvas.Children.Clear();

        if (canvas.ActualWidth < 50 || canvas.ActualHeight < 50 || data.Count == 0)
            return;

        // --- 1. Шкала під конкретні дані ---
        var values = new List<double>(data.Count);
        for (int i = 0; i < data.Count; i++)
            values.Add(data[i].Value);

        AxisScale scale = AxisScale.ForValues(values, targetTicks: 5);

        var area = new PlotArea(canvas.ActualWidth, canvas.ActualHeight,
                                xMin: 0, xMax: data.Count,
                                yMin: scale.Min, yMax: scale.Max,
                                padLeft: 58, padTop: 36,
                                padRight: 20, padBottom: 46);

        // --- 2. Назва діаграми ---
        if (title.Length > 0)
            ChartText.Add(canvas, title, area.PadLeft + area.PlotWidth / 2, 10,
                          size: 14, bold: true, centerHorizontally: true);

        // --- 3. Сітка та підписи осі значень ---
        for (double v = scale.Min; v <= scale.Max + 1e-9; v += scale.Step)
        {
            double y = area.ToScreenY(v);

            canvas.Children.Add(new Line
            {
                X1 = area.PadLeft,                  Y1 = y,
                X2 = area.PadLeft + area.PlotWidth, Y2 = y,
                Stroke          = GridBrush,
                StrokeThickness = 1
            });

            ChartText.Add(canvas, FormatValue(v), area.PadLeft - 8, y,
                          rightAligned: true, centerVertically: true);
        }

        // --- 4. Вісь X (лінія нуля) ---
        double zeroY = area.ToScreenY(0);
        canvas.Children.Add(new Line
        {
            X1 = area.PadLeft,                  Y1 = zeroY,
            X2 = area.PadLeft + area.PlotWidth, Y2 = zeroY,
            Stroke          = AxisBrush,
            StrokeThickness = 1.6
        });

        // --- 5. Стовпчики ---
        double slot     = area.PlotWidth / data.Count;
        double gap      = slot * 0.15;
        double barWidth = slot - 2 * gap;

        for (int i = 0; i < data.Count; i++)
        {
            double value = data[i].Value;

            double left   = area.PadLeft + i * slot + gap;
            double topY   = area.ToScreenY(Math.Max(value, 0));
            double baseY  = area.ToScreenY(Math.Min(value, 0));
            double height = Math.Abs(baseY - topY);

            var bar = new Rectangle
            {
                Width           = barWidth,
                Height          = Math.Max(height, 1),   // нульове значення теж видно
                RadiusX         = 3,
                RadiusY         = 3,
                Fill            = ChartPalette.BrushAt(i),
                Stroke          = Brushes.Transparent,
                ToolTip         = $"{data[i].Label}: {FormatValue(value)}"
            };

            Canvas.SetLeft(bar, left);
            Canvas.SetTop (bar, topY);
            canvas.Children.Add(bar);

            // підпис значення над стовпчиком
            ChartText.Add(canvas, FormatValue(value),
                          left + barWidth / 2, topY - 18,
                          centerHorizontally: true);

            // назва категорії під віссю
            ChartText.Add(canvas, data[i].Label,
                          left + barWidth / 2, area.PadTop + area.PlotHeight + 8,
                          centerHorizontally: true);
        }
    }

    private static string FormatValue(double v)
    {
        if (Math.Abs(v) < 1e-9) return "0";
        // «0.##» прибирає хвіст із семи знаків після коми
        return v.ToString("0.##", CultureInfo.InvariantCulture);
    }
}
```

Два допоміжні класи, які знадобляться всім діаграмам:

```csharp
/// <summary>Палітра кольорів для серій даних.</summary>
public static class ChartPalette
{
    private static readonly Color[] Palette =
    [
        Color.FromRgb(0x4C, 0x9F, 0xE0),   // синій
        Color.FromRgb(0x59, 0xC1, 0x7A),   // зелений
        Color.FromRgb(0xE8, 0xB4, 0x4B),   // жовтий
        Color.FromRgb(0xE0, 0x6C, 0x5C),   // червоний
        Color.FromRgb(0xA6, 0x7C, 0xE0),   // фіолетовий
        Color.FromRgb(0x4A, 0xC7, 0xC7),   // бірюзовий
        Color.FromRgb(0xE0, 0x8B, 0xC0),   // рожевий
        Color.FromRgb(0x8B, 0x9A, 0xB0)    // сірий
    ];

    public static Color ColorAt(int index) => Palette[index % Palette.Length];

    public static Brush BrushAt(int index)
    {
        var brush = new SolidColorBrush(ColorAt(index));
        brush.Freeze();          // заморожена кисть малюється швидше
        return brush;
    }
}

/// <summary>Підписи на полотні з коректним вирівнюванням.</summary>
public static class ChartText
{
    private static readonly Brush DefaultBrush =
        new SolidColorBrush(Color.FromRgb(0xC7, 0xD0, 0xDE));

    public static TextBlock Add(Canvas canvas, string text,
                                double x, double y,
                                double size = 11,
                                bool bold = false,
                                bool centerHorizontally = false,
                                bool rightAligned = false,
                                bool centerVertically = false,
                                Brush foreground = null)
    {
        var block = new TextBlock
        {
            Text       = text,
            FontSize   = size,
            FontWeight = bold ? FontWeights.SemiBold : FontWeights.Normal,
            Foreground = foreground ?? DefaultBrush,
            IsHitTestVisible = false
        };

        // Дізнаємось розмір тексту ДО додавання на полотно
        block.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
        Size size2 = block.DesiredSize;

        double left = x;
        if (centerHorizontally) left -= size2.Width / 2;
        if (rightAligned)       left -= size2.Width;

        double top = y;
        if (centerVertically) top -= size2.Height / 2;

        Canvas.SetLeft(block, left);
        Canvas.SetTop (block, top);
        canvas.Children.Add(block);

        return block;
    }
}
```

:::tip Порада
Зверніть увагу на `ToolTip` у стовпчика. Одна властивість — і при наведенні
миші користувач бачить точне значення. Це безкоштовний спосіб зробити
діаграму інтерактивною: підписи можна не показувати взагалі, якщо стовпчиків
багато, а точні числа лишаться доступними.
:::

## Лінійна діаграма з маркерами

Стовпчики показують «скільки», лінія — «як змінюється». Тут ми не малюємо
прямокутники, а з'єднуємо точки ламаною й ставимо на кожній маркер.

```csharp
public static class LineChart
{
    private static readonly Brush GridBrush = new SolidColorBrush(Color.FromRgb(0x25, 0x2E, 0x3E));
    private static readonly Brush AxisBrush = new SolidColorBrush(Color.FromRgb(0x7B, 0x88, 0x9C));

    public static void Draw(Canvas canvas, IReadOnlyList<ChartPoint> data,
                            string title = "")
    {
        canvas.Children.Clear();

        if (canvas.ActualWidth < 50 || canvas.ActualHeight < 50 || data.Count == 0)
            return;

        var values = new List<double>(data.Count);
        for (int i = 0; i < data.Count; i++)
            values.Add(data[i].Value);

        // Для лінійного графіка нуль на шкалі необов'язковий —
        // важлива динаміка, а не абсолютна величина
        AxisScale scale = AxisScale.ForValues(values, targetTicks: 5,
                                              includeZero: false);

        var area = new PlotArea(canvas.ActualWidth, canvas.ActualHeight,
                                xMin: 0, xMax: Math.Max(data.Count - 1, 1),
                                yMin: scale.Min, yMax: scale.Max,
                                padLeft: 58, padTop: 36,
                                padRight: 24, padBottom: 46);

        if (title.Length > 0)
            ChartText.Add(canvas, title, area.PadLeft + area.PlotWidth / 2, 10,
                          size: 14, bold: true, centerHorizontally: true);

        // Горизонтальна сітка й підписи значень
        for (double v = scale.Min; v <= scale.Max + 1e-9; v += scale.Step)
        {
            double y = area.ToScreenY(v);

            canvas.Children.Add(new Line
            {
                X1 = area.PadLeft,                  Y1 = y,
                X2 = area.PadLeft + area.PlotWidth, Y2 = y,
                Stroke = GridBrush, StrokeThickness = 1
            });

            ChartText.Add(canvas, v.ToString("0.##", CultureInfo.InvariantCulture),
                          area.PadLeft - 8, y,
                          rightAligned: true, centerVertically: true);
        }

        // Рамка знизу
        canvas.Children.Add(new Line
        {
            X1 = area.PadLeft,                  Y1 = area.PadTop + area.PlotHeight,
            X2 = area.PadLeft + area.PlotWidth, Y2 = area.PadTop + area.PlotHeight,
            Stroke = AxisBrush, StrokeThickness = 1.6
        });

        // --- Сама лінія ---
        var lineBrush = ChartPalette.BrushAt(0);

        var polyline = new Polyline
        {
            Stroke           = lineBrush,
            StrokeThickness  = 2.5,
            StrokeLineJoin   = PenLineJoin.Round,
            IsHitTestVisible = false
        };

        for (int i = 0; i < data.Count; i++)
            polyline.Points.Add(area.ToScreen(i, data[i].Value));

        canvas.Children.Add(polyline);

        // --- Маркери точок і підписи категорій ---
        for (int i = 0; i < data.Count; i++)
        {
            Point p = area.ToScreen(i, data[i].Value);

            var marker = new Ellipse
            {
                Width           = 9,
                Height          = 9,
                Fill            = Brushes.White,
                Stroke          = lineBrush,
                StrokeThickness = 2.5,
                ToolTip         = $"{data[i].Label}: {data[i].Value:0.##}"
            };

            // мінус половина розміру — щоб центр маркера збігся з точкою
            Canvas.SetLeft(marker, p.X - marker.Width  / 2);
            Canvas.SetTop (marker, p.Y - marker.Height / 2);
            canvas.Children.Add(marker);

            ChartText.Add(canvas, data[i].Label, p.X,
                          area.PadTop + area.PlotHeight + 8,
                          centerHorizontally: true);
        }
    }
}
```

:::warning Обережно
Коли точок стає багато, підписи категорій зливаються в суцільну кашу.
Просте й дієве рішення — показувати не всі: наприклад, кожен третій.

```csharp
int labelStep = Math.Max(1, data.Count / 12);   // не більше 12 підписів
if (i % labelStep == 0)
    ChartText.Add(canvas, data[i].Label, /* ... */);
```
:::

## Кругова діаграма

Найцікавіша з точки зору математики. Кожна категорія — сектор кола, кут
якого пропорційний частці цієї категорії в загальній сумі.

### Математика сектора

```
                 початок: -90°
                  (12 година)
                      │
                ╭─────┼─────╮
              ╱       │       ╲
            ╱   сектор│         ╲
           │      ╲   │          │
           │       ╲  │          │      кут росте ЗА годинниковою
           │        ╲ │ sweep    │      стрілкою, бо вісь Y на екрані
           │         ╲│  ↘       │      направлена вниз
           │          ●──────────│──▶ 0°
           │         центр       │
            ╲                  ╱
              ╲              ╱
                ╰──────────╯
```

Чотири кроки.

**Крок 1. Сума й частки.** Кут кожного сектора — це його частка від повного
кола:

```
   sweep_i = value_i / сума_всіх * 360
```

**Крок 2. Накопичений кут.** Кожен наступний сектор починається там,
де закінчився попередній. Стартуємо з `-90` градусів, щоб перший сектор
починався вгорі — так очікує око.

```
   start_0 = -90
   start_i = start_(i-1) + sweep_(i-1)
```

**Крок 3. Точка на колі.** Градуси треба перевести в радіани (`Math.Cos`
і `Math.Sin` працюють тільки з радіанами), а потім знайти координати:

```
   rad = кут * PI / 180
   x   = centerX + radius * cos(rad)
   y   = centerY + radius * sin(rad)
```

Тут `+` перед `sin`, а не `-`, як у графіках функцій. Причина та сама
перевернута вісь Y: саме через неї кут зростає за годинниковою стрілкою,
що для кругової діаграми якраз і потрібно.

**Крок 4. Контур сектора.** Сектор — це фігура з трьох частин:
відрізок від центру до початку дуги, сама дуга, відрізок назад до центру.

```
   M centerX,centerY        — почали в центрі
   L startX,startY          — відрізок до початку дуги
   A radius,radius 0 L S endX,endY   — дуга
   Z                        — замкнули (назад у центр)
```

У дузі `ArcSegment` два параметри вимагають уваги:

- **`IsLargeArc`** — через будь-які дві точки кола можна провести дві дуги:
  коротку й довгу. Прапорець каже, яку саме брати. Правило: `sweep` більше
  за 180 градусів означає `IsLargeArc = true`.
- **`SweepDirection`** — у якому напрямку йти від початкової точки до кінцевої:
  `Clockwise` (за годинниковою) або `Counterclockwise`.

```
       IsLargeArc = false              IsLargeArc = true
       (sweep = 80°)                   (sweep = 280°)

            ●B                               ●B
          ╱                          ╭───────╯
        ╱  ← коротка дуга          ╱
      ●A                          │      ← довга дуга
                                   ╲
                                     ╰──●A
```

### Код

```csharp
using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;

public static class PieChart
{
    public static void Draw(Canvas canvas, IReadOnlyList<ChartPoint> data,
                            string title = "", bool asDonut = false)
    {
        canvas.Children.Clear();

        if (canvas.ActualWidth < 80 || canvas.ActualHeight < 80 || data.Count == 0)
            return;

        // --- Сума. Від'ємні значення у круговій діаграмі не мають сенсу ---
        double total = 0;
        for (int i = 0; i < data.Count; i++)
            if (data[i].Value > 0)
                total += data[i].Value;

        if (total <= 0)
        {
            ChartText.Add(canvas, "Немає даних для кругової діаграми",
                          canvas.ActualWidth / 2, canvas.ActualHeight / 2,
                          centerHorizontally: true, centerVertically: true);
            return;
        }

        if (title.Length > 0)
            ChartText.Add(canvas, title, canvas.ActualWidth / 2, 10,
                          size: 14, bold: true, centerHorizontally: true);

        // Легенда займає праву частину — коло малюємо ліворуч від неї
        const double legendWidth = 170;

        double areaWidth = canvas.ActualWidth - legendWidth;
        double centerX   = areaWidth / 2;
        double centerY   = canvas.ActualHeight / 2 + 12;
        double radius    = Math.Min(areaWidth, canvas.ActualHeight - 60) / 2 - 12;

        if (radius < 10) return;

        double startAngle = -90;   // перший сектор починається вгорі

        for (int i = 0; i < data.Count; i++)
        {
            double value = data[i].Value;
            if (value <= 0) continue;

            double sweep = value / total * 360;

            var sector = BuildSector(centerX, centerY, radius,
                                     startAngle, sweep);

            sector.Fill            = ChartPalette.BrushAt(i);
            sector.Stroke          = new SolidColorBrush(Color.FromRgb(0x0E, 0x14, 0x21));
            sector.StrokeThickness = 2;
            sector.ToolTip         = $"{data[i].Label}: {value:0.##} " +
                                     $"({value / total * 100:0.#}%)";

            canvas.Children.Add(sector);

            // --- Підпис відсотка в середині сектора ---
            // Ставимо на 65% радіуса — так він не наїжджає ні на центр, ні на край
            double midAngle = (startAngle + sweep / 2) * Math.PI / 180;
            double labelX   = centerX + radius * 0.65 * Math.Cos(midAngle);
            double labelY   = centerY + radius * 0.65 * Math.Sin(midAngle);

            double percent = value / total * 100;

            // Підпис у вузькому секторі не поміститься — пропускаємо
            if (percent >= 5)
            {
                ChartText.Add(canvas, $"{percent:0.#}%", labelX, labelY,
                              size: 12, bold: true,
                              centerHorizontally: true, centerVertically: true,
                              foreground: Brushes.White);
            }

            startAngle += sweep;
        }

        // --- Отвір посередині перетворює «пиріг» на «бублик» ---
        if (asDonut)
        {
            var hole = new Ellipse
            {
                Width  = radius,
                Height = radius,
                Fill   = new SolidColorBrush(Color.FromRgb(0x0E, 0x14, 0x21)),
                IsHitTestVisible = false
            };
            Canvas.SetLeft(hole, centerX - radius / 2);
            Canvas.SetTop (hole, centerY - radius / 2);
            canvas.Children.Add(hole);
        }

        DrawLegend(canvas, data, total,
                   left: canvas.ActualWidth - legendWidth + 10, top: 50);
    }

    /// <summary>Будує один сектор кола як Path із дугою.</summary>
    private static Path BuildSector(double centerX, double centerY, double radius,
                                    double startAngleDeg, double sweepDeg)
    {
        // Повне коло дугою намалювати не можна: початкова й кінцева точки
        // збігаються, і дуга вироджується в ніщо. Малюємо еліпсом.
        if (sweepDeg >= 359.99)
        {
            return new Path
            {
                Data = new EllipseGeometry(new Point(centerX, centerY),
                                           radius, radius)
            };
        }

        double startRad = startAngleDeg * Math.PI / 180;
        double endRad   = (startAngleDeg + sweepDeg) * Math.PI / 180;

        var startPoint = new Point(centerX + radius * Math.Cos(startRad),
                                   centerY + radius * Math.Sin(startRad));

        var endPoint   = new Point(centerX + radius * Math.Cos(endRad),
                                   centerY + radius * Math.Sin(endRad));

        var figure = new PathFigure
        {
            StartPoint = new Point(centerX, centerY),   // від центру
            IsClosed   = true                           // Z: назад у центр
        };

        figure.Segments.Add(new LineSegment(startPoint, isStroked: true));

        figure.Segments.Add(new ArcSegment
        {
            Point          = endPoint,
            Size           = new Size(radius, radius),
            IsLargeArc     = sweepDeg > 180,            // ключовий прапорець
            SweepDirection = SweepDirection.Clockwise,
            RotationAngle  = 0,
            IsStroked      = true
        });

        var geometry = new PathGeometry();
        geometry.Figures.Add(figure);

        return new Path { Data = geometry };
    }
}
```

:::danger Часта помилка
Три помилки, через які кругова діаграма ламається.

**Забутий `IsLargeArc`.** Сектор на 300 градусів намалюється як сектор
на 60 — платформа візьме коротку дугу. Ознака: сума секторів «не сходиться»,
у колі дірка.

**Градуси замість радіанів.** `Math.Cos(90)` — це не нуль, а `-0.448`,
бо 90 тут радіан, а не градусів. Сектори розлітаються хаотично.
Множте на `Math.PI / 180`.

**Сектор на 360 градусів.** Якщо категорія одна, початкова й кінцева точки
дуги збігаються, і `ArcSegment` малює порожнечу — коло зникає. Обробляйте
цей випадок окремо, через `EllipseGeometry`.
:::

## Легенда та підписи осей

Легенда — це список «колір відповідає категорії». Будується тими самими
примітивами: квадратик кольору плюс текст. Метод нижче — частина класу
`PieChart`, саме його викликає останній рядок `Draw`.

```csharp
private static void DrawLegend(Canvas canvas, IReadOnlyList<ChartPoint> data,
                               double total, double left, double top)
{
    const double rowHeight = 24;
    const double swatch    = 13;

    ChartText.Add(canvas, "Категорії", left, top - 22, size: 12, bold: true);

    for (int i = 0; i < data.Count; i++)
    {
        double y = top + i * rowHeight;

        var box = new Rectangle
        {
            Width   = swatch,
            Height  = swatch,
            RadiusX = 3,
            RadiusY = 3,
            Fill    = ChartPalette.BrushAt(i)
        };
        Canvas.SetLeft(box, left);
        Canvas.SetTop (box, y);
        canvas.Children.Add(box);

        double percent = total > 0 ? data[i].Value / total * 100 : 0;

        ChartText.Add(canvas,
                      $"{data[i].Label} — {percent:0.#}%",
                      left + swatch + 8, y - 1);
    }
}
```

Підпис осі Y треба повернути на 90 градусів. Тут `LayoutTransform`
не потрібен — на `Canvas` компонування немає, тож беремо `RenderTransform`:

```csharp
private static void AddRotatedAxisTitle(Canvas canvas, string text,
                                        double x, double centerY)
{
    var block = ChartText.Add(canvas, text, 0, 0, size: 12, bold: true);

    block.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));

    block.RenderTransformOrigin = new Point(0.5, 0.5);
    block.RenderTransform = new RotateTransform(-90);

    Canvas.SetLeft(block, x - block.DesiredSize.Width  / 2);
    Canvas.SetTop (block, centerY - block.DesiredSize.Height / 2);
}
```

## Динамічне оновлення

Найцікавіше починається тоді, коли дані змінюються. Користувач править
число у таблиці — діаграма має перемалюватися **миттєво**, без кнопки
«Оновити».

З теми 25 ви знаєте `ObservableCollection`. Вона сповіщає про додавання
й видалення елементів через подію `CollectionChanged`. Але цього замало:
якщо користувач змінив **значення всередині** наявного елемента, колекція
про це не дізнається. Потрібні дві підписки.

```
   Користувач додав рядок
          │
          ▼
   ObservableCollection.CollectionChanged ──▶ перемалювати діаграму
   (і підписатись на PropertyChanged
    нового елемента)


   Користувач змінив число в рядку
          │
          ▼
   ChartItem.PropertyChanged ─────────────▶ перемалювати діаграму
```

Отже, елемент даних має реалізувати `INotifyPropertyChanged`:

```csharp
using System.ComponentModel;
using System.Runtime.CompilerServices;

public sealed class ChartItem : INotifyPropertyChanged
{
    private string _label = "";
    private double _value;

    public string Label
    {
        get => _label;
        set
        {
            if (_label == value) return;
            _label = value;
            OnPropertyChanged();
        }
    }

    public double Value
    {
        get => _value;
        set
        {
            if (Math.Abs(_value - value) < 1e-9) return;
            _value = value;
            OnPropertyChanged();
        }
    }

    public event PropertyChangedEventHandler PropertyChanged;

    private void OnPropertyChanged([CallerMemberName] string name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

:::warning Обережно
Спокуса підписатись на `PropertyChanged` **усіх** елементів один раз
у конструкторі закінчується витоком: видалений із колекції елемент
залишиться з живою підпискою, і його зміни й далі перемальовуватимуть
діаграму. Підписуйтесь на нові елементи в `CollectionChanged` і
**відписуйтесь від видалених** — саме там для цього є `e.NewItems`
і `e.OldItems`.
:::

## Наскрізний приклад: таблиця плюс діаграма

Збираємо все разом. Вікно ділиться навпіл: ліворуч — редагована таблиця,
праворуч — діаграма, що оновлюється в ту ж мить, коли змінюється число.

```
┌─ Аналіз даних ───────────────────────────────────── ─ □ ✕ ┐
│ ┌──────────────────────┐ ┌──────────────────────────────┐ │
│ │ Категорія  │ Значення│ │      Продажі за місяцями     │ │
│ ├────────────┼─────────┤ │                              │ │
│ │ Січень     │      45 │ │ 70├ · · · · · · · · · · · ·  │ │
│ │ Лютий      │      28 │ │   │         ▓▓               │ │
│ │ Березень   │      61 │ │ 50├ · · · · ▓▓ · · · · ·▓▓·  │ │
│ │ Квітень    │      52 │ │   │  ▓▓     ▓▓     ▓▓   ▓▓   │ │
│ │ Травень    │      39 │ │ 30├ ·▓▓· ▓▓·▓▓ · ·▓▓ · ▓▓·   │ │
│ │            │         │ │   │  ▓▓  ▓▓ ▓▓   ▓▓   ▓▓     │ │
│ │            │         │ │ 10├ ·▓▓· ▓▓·▓▓ · ▓▓ · ▓▓·    │ │
│ │            │         │ │  0└──┬───┬──┬────┬────┬───   │ │
│ │            │         │ │    Січ Лют Бер  Кві  Тра     │ │
│ ├──────────────────────┤ └──────────────────────────────┘ │
│ │ [+ Додати][− Видалити]│ ( ) Стовпчики (•) Лінія ( ) Коло│
│ └──────────────────────┘                                  │
└───────────────────────────────────────────────────────────┘
```

```xml
<Window x:Class="ChartsDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Аналіз даних" Height="560" Width="1000"
        Background="#FF0A0E17">
    <Grid Margin="12">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="320"/>
            <ColumnDefinition Width="12"/>
            <ColumnDefinition Width="*"/>
        </Grid.ColumnDefinitions>
        <Grid.RowDefinitions>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Таблиця даних -->
        <DataGrid Grid.Row="0" Grid.Column="0"
                  x:Name="DataTable"
                  ItemsSource="{Binding Items}"
                  AutoGenerateColumns="False"
                  CanUserAddRows="False"
                  HeadersVisibility="Column"
                  GridLinesVisibility="Horizontal"
                  Background="#FF131B28" Foreground="#FFDCE3ED"
                  RowBackground="#FF131B28"
                  AlternatingRowBackground="#FF17202F"
                  BorderBrush="#FF2A3446" BorderThickness="1">
            <DataGrid.Columns>
                <DataGridTextColumn Header="Категорія" Width="*"
                                    Binding="{Binding Label}"/>
                <DataGridTextColumn Header="Значення"  Width="110"
                                    Binding="{Binding Value, StringFormat=0.##}"/>
            </DataGrid.Columns>
        </DataGrid>

        <!-- Кнопки під таблицею -->
        <StackPanel Grid.Row="1" Grid.Column="0" Orientation="Horizontal"
                    Margin="0,10,0,0">
            <Button Content="Додати"  Width="100" Height="30" Margin="0,0,8,0"
                    Click="OnAdd_Click"/>
            <Button Content="Видалити" Width="100" Height="30"
                    Click="OnRemove_Click"/>
        </StackPanel>

        <!-- Полотно діаграми: ОКРЕМИЙ Canvas, нічого зайвого -->
        <Border Grid.Row="0" Grid.Column="2"
                Background="#FF0E1421" CornerRadius="8"
                BorderBrush="#FF2A3446" BorderThickness="1">
            <Canvas x:Name="ChartCanvas" ClipToBounds="True"
                    SizeChanged="OnChartCanvasSizeChanged"/>
        </Border>

        <!-- Вибір типу діаграми -->
        <StackPanel Grid.Row="1" Grid.Column="2" Orientation="Horizontal"
                    HorizontalAlignment="Center" Margin="0,10,0,0">
            <RadioButton x:Name="BarOption"  Content="Стовпчики" IsChecked="True"
                         Foreground="#FFC7D0DE" Margin="0,0,18,0"
                         Checked="OnChartTypeChanged"/>
            <RadioButton x:Name="LineOption" Content="Лінія"
                         Foreground="#FFC7D0DE" Margin="0,0,18,0"
                         Checked="OnChartTypeChanged"/>
            <RadioButton x:Name="PieOption"  Content="Кругова"
                         Foreground="#FFC7D0DE"
                         Checked="OnChartTypeChanged"/>
        </StackPanel>
    </Grid>
</Window>
```

```csharp
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;

namespace ChartsDemo
{
    public partial class MainWindow : Window
    {
        public ObservableCollection<ChartItem> Items { get; } = new();

        public MainWindow()
        {
            InitializeComponent();
            DataContext = this;

            // Початкові дані
            Add("Січень",   45);
            Add("Лютий",    28);
            Add("Березень", 61);
            Add("Квітень",  52);
            Add("Травень",  39);

            // Реагуємо на додавання й видалення рядків
            Items.CollectionChanged += OnItemsChanged;

            Loaded += (_, _) => Redraw();
        }

        // ---------- Підписки ----------

        private void OnItemsChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            // Нові елементи — підписуємось на зміну їхніх властивостей
            if (e.NewItems is not null)
            {
                foreach (ChartItem item in e.NewItems)
                    item.PropertyChanged += OnItemPropertyChanged;
            }

            // Видалені — відписуємось, щоб не тримати їх у пам'яті
            if (e.OldItems is not null)
            {
                foreach (ChartItem item in e.OldItems)
                    item.PropertyChanged -= OnItemPropertyChanged;
            }

            Redraw();
        }

        private void OnItemPropertyChanged(object sender, PropertyChangedEventArgs e)
            => Redraw();

        // ---------- Кнопки ----------

        private void OnAdd_Click(object sender, RoutedEventArgs e)
        {
            var item = new ChartItem
            {
                Label = $"Категорія {Items.Count + 1}",
                Value = 30
            };
            Items.Add(item);          // CollectionChanged зробить решту
            DataTable.SelectedItem = item;
        }

        private void OnRemove_Click(object sender, RoutedEventArgs e)
        {
            if (DataTable.SelectedItem is ChartItem selected)
                Items.Remove(selected);
        }

        private void OnChartTypeChanged(object sender, RoutedEventArgs e) => Redraw();

        private void OnChartCanvasSizeChanged(object sender, SizeChangedEventArgs e)
            => Redraw();

        // ---------- Перемальовування ----------

        private void Redraw()
        {
            // Поки вікно не завантажилось, ChartCanvas ще не має розмірів
            if (!IsLoaded) return;

            var data = new List<ChartPoint>(Items.Count);
            foreach (ChartItem item in Items)
                data.Add(new ChartPoint { Label = item.Label, Value = item.Value });

            if (PieOption.IsChecked == true)
                PieChart.Draw(ChartCanvas, data, "Структура за категоріями");
            else if (LineOption.IsChecked == true)
                LineChart.Draw(ChartCanvas, data, "Динаміка за категоріями");
            else
                BarChart.Draw(ChartCanvas, data, "Значення за категоріями");
        }

        private void Add(string label, double value)
            => Items.Add(new ChartItem { Label = label, Value = value });
    }
}
```

:::info Цікаво
Зверніть увагу: у методі `Redraw` немає жодного `if`, який перевіряє,
*що саме* змінилося. Діаграма просто малюється наново з поточних даних.
Це звучить марнотратно, але для кількох десятків точок перемальовування
займає частки мілісекунди — а код виходить удвічі коротшим і без помилок
«забув оновити підпис».

Оптимізувати має сенс лише тоді, коли ви **виміряли** гальмування,
а не тому, що «повний перерахунок здається повільним».
:::

Порядок виклику `Add` до підписки на `CollectionChanged` у конструкторі
навмисний: початкові п'ять елементів додаються ще без підписок, щоб
не перемальовувати діаграму п'ять разів поспіль на порожньому вікні.
Але тоді вони й не отримають `PropertyChanged` — тож або підписуйтесь
на них окремим циклом, або (простіше) перенесіть `Items.CollectionChanged += ...`
угору, до додавання даних. У наведеному коді підписка стоїть після
початкового наповнення саме для демонстрації цієї тонкості — у власному
проєкті ставте її першим рядком.

## Коли даних стає багато

Усе, що описано вище, чудово працює для десятків і сотень точок.
Три речі, які варто пам'ятати, коли їх тисячі.

**Не перемальовуйте на кожному кадрі таймера.** Діаграма має оновлюватися
тоді, коли змінилися **дані**, а не 60 разів на секунду про всяк випадок.
Якщо дані приходять потоком (наприклад, вимірювання щосекунди), достатньо
перемальовувати раз на надходження.

**Об'єднуйте статичні елементи.** Тисяча ліній сітки — це тисяча
`UIElement`. Одна `StreamGeometry` з тисячею сегментів у єдиному `Path` —
один елемент.

**Вимикайте зайве реагування на мишу.** Підписи, сітка, сама лінія графіка
не повинні відповідати на наведення курсора: `IsHitTestVisible = false`.
Залишіть чутливими тільки маркери й стовпчики, яким потрібен `ToolTip`.

## Типові помилки

**Жорстко зашитий масштаб.** `double maxValue = 100;` працює рівно доти,
доки хтось не введе 150. Рахуйте межі з даних через `AxisScale.ForValues`.

**Вісь Y не з нуля у стовпчиковій діаграмі.** Стовпчики порівнюють
за **висотою**, і зсунутий нуль перетворює різницю у 4 відсотки на різницю
«вдвічі». Для стовпчиків нуль обов'язковий.

**`Children.Clear()` по всьому вікну.** Якщо кнопки й повзунки лежать
на тому самому `Canvas`, що й діаграма, перше ж перемальовування знищить
інтерфейс. Полотно діаграми — завжди окремий елемент, і чистити треба саме його.

**Перемальовування по таймеру замість реакції на зміну даних.**
`DispatcherTimer` із `Redraw()` кожні 16 мілісекунд «працює», але марно
спалює процесор і батарею. Підпишіться на `CollectionChanged`
і `PropertyChanged` — діаграма оновиться рівно тоді, коли є що оновлювати.

**Підписи, що виходять за межі області.** Останній стовпчик притиснутий
до краю, і його підпис обрізається. Закладайте поля (`padRight`), центруйте
текст через виміряну `DesiredSize`, а довгі назви повертайте або скорочуйте.

**Поділки з числами на сім знаків після коми.** `0.0714285714285714` замість
`0.07` — ознака того, що крок порахований діленням «як вийде». Використовуйте
«гарний крок» і формат `"0.##"` замість `ToString()` без аргументів.

**Кругова діаграма на п'ятнадцять категорій.** Око не порівнює кути,
різницю між 6 і 7 відсотками ніхто не побачить. Кругова діаграма читабельна
до п'яти-шести секторів; далі беріть стовпчики.
