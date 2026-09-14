---
sidebar_position: 2
---

# Побудова графіків функцій та математичних кривих

## Дві системи координат

Перед тим як намалювати хоч один графік, треба розібратися з головною
проблемою. Вона не в математиці і не в WPF — вона у тому, що системи координат
у цих двох світів різні.

```
   МАТЕМАТИЧНА площина              ЕКРАННА площина (Canvas)

           y ▲                        (0,0)●──────────────▶ x
             │                             │
        2 ───┤   ● (1.5, 2)                │
             │                             │      ● (340, 95)
   ──────────┼──────────▶ x                │
        -2  0│   2                         │
             │                             ▼
             │                             y
   нуль у центрі                     нуль у лівому верхньому куті
   y зростає ВГОРУ                   y зростає ВНИЗ
   одиниці — які завгодно            одиниці — пікселі
```

Отже, треба написати **перерахунок**: функцію, яка бере математичну точку
і повертає екранну. У ній лише три речі — масштаб, зсув і переворот осі Y.

Спершу визначимо, що саме ми малюємо. Нехай є:

- **область значень** — прямокутник у математичних координатах:
  від `xMin` до `xMax` і від `yMin` до `yMax`;
- **область побудови** — прямокутник на полотні у пікселях:
  лівий верхній кут `(padLeft, padTop)`, ширина `plotWidth`, висота `plotHeight`.

```
   Canvas (600 x 400)
   ┌──────────────────────────────────────────────────┐
   │        ▲ padTop = 20                             │
   │  ┌─────┴────────────────────────────────┐        │
   │  │                                      │        │
   │◀─┤        ОБЛАСТЬ ПОБУДОВИ              ├──────▶ │
   │pad│      plotWidth x plotHeight         │padRight│
   │Left│                                    │  = 20  │
   │ =55│   (xMin..xMax) x (yMin..yMax)      │        │
   │  └──────────────┬───────────────────────┘        │
   │        padBottom = 40  (тут підписи осі X)       │
   └──────────────────────────────────────────────────┘
```

Формули перерахунку:

```
   screenX = padLeft + (x - xMin) / (xMax - xMin) * plotWidth

   screenY = padTop  + (yMax - y) / (yMax - yMin) * plotHeight
                        ^^^^^^^^
                        ось тут переворот осі Y:
                        максимальне значення дає screenY = padTop (верх),
                        мінімальне — screenY = padTop + plotHeight (низ)
```

Оформимо це класом. Він знадобиться нам в усій темі — і для графіків функцій,
і для діаграм у наступному підрозділі.

```csharp
using System.Windows;

/// <summary>
/// Перерахунок математичних координат в екранні для прямокутної області побудови.
/// </summary>
public sealed class PlotArea
{
    public double XMin { get; }
    public double XMax { get; }
    public double YMin { get; }
    public double YMax { get; }

    public double PadLeft   { get; }
    public double PadTop    { get; }
    public double PadRight  { get; }
    public double PadBottom { get; }

    public double CanvasWidth  { get; }
    public double CanvasHeight { get; }

    public PlotArea(double canvasWidth, double canvasHeight,
                    double xMin, double xMax, double yMin, double yMax,
                    double padLeft = 55, double padTop = 20,
                    double padRight = 20, double padBottom = 40)
    {
        CanvasWidth  = canvasWidth;
        CanvasHeight = canvasHeight;
        XMin = xMin; XMax = xMax;
        YMin = yMin; YMax = yMax;
        PadLeft = padLeft; PadTop = padTop;
        PadRight = padRight; PadBottom = padBottom;
    }

    /// <summary>Ширина області побудови у пікселях.</summary>
    public double PlotWidth  => CanvasWidth  - PadLeft - PadRight;

    /// <summary>Висота області побудови у пікселях.</summary>
    public double PlotHeight => CanvasHeight - PadTop  - PadBottom;

    /// <summary>Математичний X у екранний X.</summary>
    public double ToScreenX(double x)
        => PadLeft + (x - XMin) / (XMax - XMin) * PlotWidth;

    /// <summary>Математичний Y у екранний Y (вісь перевернута).</summary>
    public double ToScreenY(double y)
        => PadTop + (YMax - y) / (YMax - YMin) * PlotHeight;

    /// <summary>Математична точка у екранну.</summary>
    public Point ToScreen(double x, double y)
        => new Point(ToScreenX(x), ToScreenY(y));

    /// <summary>Зворотний перерахунок: екранний X у математичний.</summary>
    public double ToMathX(double screenX)
        => XMin + (screenX - PadLeft) / PlotWidth * (XMax - XMin);
}
```

:::tip Порада
Зворотний перерахунок `ToMathX` знадобиться, коли користувач водить мишею
над графіком, а програма показує «x = 2.35, y = 5.52». Без нього доведеться
шукати найближчу точку перебором — а так це одна формула.
:::

## Графік функції через Polyline

Тепер сам графік. Алгоритм максимально прямий:

1. Проходимо по екранній ширині області побудови з кроком в один піксель.
2. Для кожного пікселя рахуємо математичний `x`.
3. Обчислюємо `y = f(x)`.
4. Перераховуємо пару в екранні координати й додаємо до `Polyline`.

```csharp
using System;
using System.Windows.Media;
using System.Windows.Shapes;

private Polyline BuildFunctionPlot(PlotArea area, Func<double, double> f,
                                   Brush color, double thickness = 2)
{
    var line = new Polyline
    {
        Stroke          = color,
        StrokeThickness = thickness,
        StrokeLineJoin  = PenLineJoin.Round
    };

    // Один крок = один піксель по горизонталі. Дрібніше не має сенсу:
    // екран просто не покаже різниці.
    int steps = (int)area.PlotWidth;

    for (int i = 0; i <= steps; i++)
    {
        double x = area.XMin + (area.XMax - area.XMin) * i / steps;
        double y = f(x);

        // Пропускаємо точки, де функція не визначена або пішла в нескінченність
        if (double.IsNaN(y) || double.IsInfinity(y))
            continue;

        line.Points.Add(area.ToScreen(x, y));
    }

    return line;
}
```

Виклик виглядає так:

```csharp
var area = new PlotArea(PlotCanvas.ActualWidth, PlotCanvas.ActualHeight,
                        xMin: -2 * Math.PI, xMax: 2 * Math.PI,
                        yMin: -1.5,         yMax: 1.5);

PlotCanvas.Children.Add(BuildFunctionPlot(area, Math.Sin, Brushes.DeepSkyBlue));
PlotCanvas.Children.Add(BuildFunctionPlot(area, Math.Cos, Brushes.Orange));
```

:::danger Часта помилка
Просто `continue` для невизначених точок недостатньо, якщо у функції є **розрив**.
У `Math.Tan` біля `x = pi/2` значення стрибає з плюс нескінченності у мінус,
і `Polyline` чесно з'єднає ці дві точки вертикальною прямою через увесь екран.
Виглядає як асимптота, але це сміття.

Правильно — розбивати графік на кілька `Polyline`: щойно `y` вийшов за межі
`yMin..yMax` або став `NaN`, завершуємо поточну ламану й починаємо нову.
:::

Ось варіант, що коректно працює з розривами:

```csharp
private void AddFunctionPlot(Canvas canvas, PlotArea area,
                             Func<double, double> f, Brush color)
{
    int steps = (int)area.PlotWidth;

    Polyline current = null;

    for (int i = 0; i <= steps; i++)
    {
        double x = area.XMin + (area.XMax - area.XMin) * i / steps;
        double y = f(x);

        bool valid = !double.IsNaN(y) && !double.IsInfinity(y)
                     && y >= area.YMin && y <= area.YMax;

        if (!valid)
        {
            current = null;   // розрив — наступна точка почне нову ламану
            continue;
        }

        if (current is null)
        {
            current = new Polyline { Stroke = color, StrokeThickness = 2 };
            canvas.Children.Add(current);
        }

        current.Points.Add(area.ToScreen(x, y));
    }
}
```

## Осі, поділки, сітка й підписи

Графік без осей — просто хвиляста лінія. Додамо координатну сітку.

Задача розбивається на чотири частини: сітка, осі, поділки, підписи.
Усе малюється в екранних координатах, але кроки рахуються в математичних.

```csharp
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;

private static readonly Brush GridBrush  = new SolidColorBrush(Color.FromRgb(0x2A, 0x33, 0x44));
private static readonly Brush AxisBrush  = new SolidColorBrush(Color.FromRgb(0x9A, 0xA5, 0xB8));
private static readonly Brush LabelBrush = new SolidColorBrush(Color.FromRgb(0xC3, 0xCC, 0xDB));

private void DrawGridAndAxes(Canvas canvas, PlotArea area,
                             double stepX, double stepY)
{
    // --- 1. Вертикальні лінії сітки та підписи осі X ---
    // Починаємо з першої «круглої» позначки, не меншої за XMin
    double startX = Math.Ceiling(area.XMin / stepX) * stepX;

    for (double x = startX; x <= area.XMax + 1e-9; x += stepX)
    {
        double sx = area.ToScreenX(x);

        canvas.Children.Add(new Line
        {
            X1 = sx, Y1 = area.PadTop,
            X2 = sx, Y2 = area.PadTop + area.PlotHeight,
            Stroke = GridBrush, StrokeThickness = 1
        });

        // поділка — короткий штрих нижче області побудови
        canvas.Children.Add(new Line
        {
            X1 = sx, Y1 = area.PadTop + area.PlotHeight,
            X2 = sx, Y2 = area.PadTop + area.PlotHeight + 5,
            Stroke = AxisBrush, StrokeThickness = 1
        });

        AddLabel(canvas, FormatTick(x), sx, area.PadTop + area.PlotHeight + 8,
                 centerHorizontally: true);
    }

    // --- 2. Горизонтальні лінії сітки та підписи осі Y ---
    double startY = Math.Ceiling(area.YMin / stepY) * stepY;

    for (double y = startY; y <= area.YMax + 1e-9; y += stepY)
    {
        double sy = area.ToScreenY(y);

        canvas.Children.Add(new Line
        {
            X1 = area.PadLeft,                   Y1 = sy,
            X2 = area.PadLeft + area.PlotWidth,  Y2 = sy,
            Stroke = GridBrush, StrokeThickness = 1
        });

        canvas.Children.Add(new Line
        {
            X1 = area.PadLeft - 5, Y1 = sy,
            X2 = area.PadLeft,     Y2 = sy,
            Stroke = AxisBrush, StrokeThickness = 1
        });

        AddLabel(canvas, FormatTick(y), area.PadLeft - 10, sy,
                 rightAligned: true, centerVertically: true);
    }

    // --- 3. Самі осі: там, де математичний нуль потрапляє в область ---
    if (area.YMin <= 0 && 0 <= area.YMax)
    {
        double zeroY = area.ToScreenY(0);
        canvas.Children.Add(new Line
        {
            X1 = area.PadLeft,                  Y1 = zeroY,
            X2 = area.PadLeft + area.PlotWidth, Y2 = zeroY,
            Stroke = AxisBrush, StrokeThickness = 1.8
        });
    }

    if (area.XMin <= 0 && 0 <= area.XMax)
    {
        double zeroX = area.ToScreenX(0);
        canvas.Children.Add(new Line
        {
            X1 = zeroX, Y1 = area.PadTop,
            X2 = zeroX, Y2 = area.PadTop + area.PlotHeight,
            Stroke = AxisBrush, StrokeThickness = 1.8
        });
    }

    // --- 4. Рамка області побудови ---
    var frame = new Rectangle
    {
        Width           = area.PlotWidth,
        Height          = area.PlotHeight,
        Stroke          = AxisBrush,
        StrokeThickness = 1
    };
    Canvas.SetLeft(frame, area.PadLeft);
    Canvas.SetTop (frame, area.PadTop);
    canvas.Children.Add(frame);
}

/// <summary>Підпис поділки: без «хвоста» з семи знаків після коми.</summary>
private static string FormatTick(double value)
{
    // -0 виглядає безглуздо — прибираємо
    if (Math.Abs(value) < 1e-9) return "0";
    return value.ToString("0.###", CultureInfo.InvariantCulture);
}

private void AddLabel(Canvas canvas, string text, double x, double y,
                      bool centerHorizontally = false,
                      bool rightAligned       = false,
                      bool centerVertically   = false)
{
    var block = new TextBlock
    {
        Text       = text,
        Foreground = LabelBrush,
        FontSize   = 11,
        FontFamily = new FontFamily("Segoe UI")
    };

    // Щоб дізнатись розмір тексту до появи на екрані — вимірюємо вручну
    block.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
    Size size = block.DesiredSize;

    double left = x;
    if (centerHorizontally) left -= size.Width / 2;
    if (rightAligned)       left -= size.Width;

    double top = y;
    if (centerVertically)   top -= size.Height / 2;

    Canvas.SetLeft(block, left);
    Canvas.SetTop (block, top);
    canvas.Children.Add(block);
}
```

:::info Цікаво
`block.Measure(...)` із нескінченним доступним розміром — це офіційний спосіб
дізнатись, скільки місця займе текст, **до** того, як елемент з'явиться
у дереві. Після виклику `DesiredSize` містить потрібні ширину й висоту.
Саме так центрують підписи, і той самий прийом ми використаємо для легенди
діаграми у наступному підрозділі.
:::

Зберемо повний приклад — вікно з графіками синуса й косинуса.

```xml
<Window x:Class="PlotDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Графіки функцій" Height="480" Width="760"
        Background="#FF0F1724">
    <Grid Margin="12">
        <Grid.RowDefinitions>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <Border Grid.Row="0" Background="#FF131C2B" CornerRadius="6">
            <Canvas x:Name="PlotCanvas" ClipToBounds="True"
                    SizeChanged="OnPlotCanvasSizeChanged"/>
        </Border>

        <StackPanel Grid.Row="1" Orientation="Horizontal"
                    HorizontalAlignment="Center" Margin="0,10,0,0">
            <Button Content="sin(x)"        Width="110" Margin="4" Click="OnSin_Click"/>
            <Button Content="sin(x)/x"      Width="110" Margin="4" Click="OnSinc_Click"/>
            <Button Content="x² - 3"        Width="110" Margin="4" Click="OnParabola_Click"/>
            <Button Content="Синус і косинус" Width="140" Margin="4" Click="OnBoth_Click"/>
        </StackPanel>
    </Grid>
</Window>
```

```csharp
using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace PlotDemo
{
    public partial class MainWindow : Window
    {
        // Що саме малюємо зараз — щоб перемалювати при зміні розміру вікна
        private Action _currentPlot;

        public MainWindow()
        {
            InitializeComponent();
            _currentPlot = DrawBoth;
        }

        private void OnPlotCanvasSizeChanged(object sender, SizeChangedEventArgs e)
            => _currentPlot?.Invoke();

        private void OnSin_Click(object sender, RoutedEventArgs e)
        {
            _currentPlot = DrawSin;
            DrawSin();
        }

        private void OnSinc_Click(object sender, RoutedEventArgs e)
        {
            _currentPlot = DrawSinc;
            DrawSinc();
        }

        private void OnParabola_Click(object sender, RoutedEventArgs e)
        {
            _currentPlot = DrawParabola;
            DrawParabola();
        }

        private void OnBoth_Click(object sender, RoutedEventArgs e)
        {
            _currentPlot = DrawBoth;
            DrawBoth();
        }

        private PlotArea CreateArea(double xMin, double xMax,
                                    double yMin, double yMax)
            => new PlotArea(PlotCanvas.ActualWidth, PlotCanvas.ActualHeight,
                            xMin, xMax, yMin, yMax);

        private void DrawSin()
        {
            PlotCanvas.Children.Clear();
            var area = CreateArea(-2 * Math.PI, 2 * Math.PI, -1.5, 1.5);
            DrawGridAndAxes(PlotCanvas, area, stepX: Math.PI / 2, stepY: 0.5);
            AddFunctionPlot(PlotCanvas, area, Math.Sin, Brushes.DeepSkyBlue);
        }

        private void DrawSinc()
        {
            PlotCanvas.Children.Clear();
            var area = CreateArea(-15, 15, -0.4, 1.1);
            DrawGridAndAxes(PlotCanvas, area, stepX: 5, stepY: 0.25);

            // У нулі функція не визначена — повертаємо границю, яка дорівнює 1
            AddFunctionPlot(PlotCanvas, area,
                x => Math.Abs(x) < 1e-9 ? 1.0 : Math.Sin(x) / x,
                Brushes.MediumSpringGreen);
        }

        private void DrawParabola()
        {
            PlotCanvas.Children.Clear();
            var area = CreateArea(-4, 4, -4, 12);
            DrawGridAndAxes(PlotCanvas, area, stepX: 1, stepY: 2);
            AddFunctionPlot(PlotCanvas, area, x => x * x - 3, Brushes.Gold);
        }

        private void DrawBoth()
        {
            PlotCanvas.Children.Clear();
            var area = CreateArea(-2 * Math.PI, 2 * Math.PI, -1.5, 1.5);
            DrawGridAndAxes(PlotCanvas, area, stepX: Math.PI / 2, stepY: 0.5);
            AddFunctionPlot(PlotCanvas, area, Math.Sin, Brushes.DeepSkyBlue);
            AddFunctionPlot(PlotCanvas, area, Math.Cos, Brushes.Orange);
        }
    }
}
```

```
┌─ Графіки функцій ─────────────────────────────── ─ □ ✕ ┐
│ ┌────────────────────────────────────────────────────┐ │
│ │ 1.5│···········│···········│···········│··········  │ │
│ │ 1.0│···╱‾‾╲····│···········│····╱‾‾╲···│··········  │ │
│ │ 0.5│··╱····╲···│···········│···╱····╲··│··········  │ │
│ │ 0.0├─╱──────╲──┼───────────┼──╱──────╲─┼──────────  │ │
│ │-0.5│╱········╲·│··········╱│·╱········╲│··········  │ │
│ │-1.0│··········╲│·······╱‾‾·│···········│╲·········  │ │
│ │-1.5└──────┬────┴─────┬─────┴─────┬─────┴─────┬────  │ │
│ │        -6.28      -3.14         0          3.14     │ │
│ └────────────────────────────────────────────────────┘ │
│      [ sin(x) ] [ sin(x)/x ] [ x²-3 ] [ Синус і косинус ]│
└─────────────────────────────────────────────────────────┘
```

:::warning Обережно
Зверніть увагу на `SizeChanged` і поле `_currentPlot`. Область побудови
залежить від `ActualWidth`, тому при зміні розміру вікна графік треба
перемалювати. Без цього він залишиться маленьким у кутку розтягнутого вікна.

І ще: у `Canvas` варто ставити `ClipToBounds="True"` — інакше фігури, що
виходять за межі полотна, будуть намальовані поверх сусідніх елементів.
:::

## Математичні криві

Графік функції `y = f(x)` — окремий випадок. Кожному `x` відповідає рівно
один `y`, тому коло чи серце так не намалюєш. Загальний спосіб — **параметричне
задання**: обидві координати є функціями третьої змінної, параметра `t`.

```
   y = f(x)                     параметрично
   ─────────────                ────────────────────
   x пробігає діапазон          t пробігає діапазон
   y = f(x)                     x = X(t)
                                y = Y(t)

   один y на кожен x            крива може замикатись,
   (коло неможливе)             перетинати себе, робити петлі
```

Алгоритм малювання завжди один і той самий:

1. Пробігаємо `t` від `tMin` до `tMax` у циклі.
2. Рахуємо `x(t)` і `y(t)` за формулою.
3. Масштабуємо, переносимо в центр полотна, перевертаємо вісь Y.
4. Додаємо точку до `Polyline` (незамкнена крива) або `Polygon` (замкнена).

Універсальна заготовка:

```csharp
/// <summary>
/// Малює параметричну криву. fx і fy — формули кривої,
/// centerX/centerY — куди помістити початок математичних координат,
/// scale — у скільки разів збільшити.
/// </summary>
private Polyline BuildParametricCurve(
    Func<double, double> fx, Func<double, double> fy,
    double tMin, double tMax, int steps,
    double centerX, double centerY, double scale,
    Brush color, double thickness = 1.5)
{
    var curve = new Polyline
    {
        Stroke          = color,
        StrokeThickness = thickness,
        StrokeLineJoin  = PenLineJoin.Round
    };

    for (int i = 0; i <= steps; i++)
    {
        double t = tMin + (tMax - tMin) * i / steps;

        double x = fx(t);
        double y = fy(t);

        // мінус перед y — переворот осі: у математиці вгору, на екрані вниз
        curve.Points.Add(new Point(centerX + x * scale,
                                   centerY - y * scale));
    }

    return curve;
}
```

### Пряма лінія

Найпростіша параметрична крива — відрізок між двома точками:

```
   x(t) = x0 + t * (x1 - x0)
   y(t) = y0 + t * (y1 - y0)          t від 0 до 1
```

Для самої лінії в WPF є готовий елемент `Line`, тож писати такий код
на практиці не треба. Але саме на ньому найлегше побачити ідею параметра:
`t = 0` дає початок, `t = 1` — кінець, `t = 0.5` — рівно середину.
Це стане в пригоді в наступному підрозділі, де ми будемо малювати лінію
поступово, крок за кроком.

### Крива серця

Класика. Параметричні рівняння:

```
   x(t) = 16 * sin³(t)
   y(t) = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)

   t від 0 до 2*pi
```

Формула дає фігуру приблизно від -16 до +16 по `x` і від -17 до +13 по `y`,
тому обов'язково потрібен масштаб.

```csharp
private void DrawHeart(Canvas canvas)
{
    double cx = canvas.ActualWidth  / 2;
    double cy = canvas.ActualHeight / 2;

    // Підбираємо масштаб так, щоб серце вписалось у полотно з запасом
    double scale = Math.Min(canvas.ActualWidth, canvas.ActualHeight) / 40;

    var heart = new Polygon      // Polygon — бо крива замкнена
    {
        Stroke          = new SolidColorBrush(Colors.HotPink),
        StrokeThickness = 2.5,
        Fill            = new SolidColorBrush(Color.FromArgb(70, 255, 105, 180))
    };

    const int steps = 600;
    for (int i = 0; i <= steps; i++)
    {
        double t = 2 * Math.PI * i / steps;

        double x = 16 * Math.Pow(Math.Sin(t), 3);
        double y = 13 * Math.Cos(t)
                 -  5 * Math.Cos(2 * t)
                 -  2 * Math.Cos(3 * t)
                 -      Math.Cos(4 * t);

        heart.Points.Add(new Point(cx + x * scale, cy - y * scale));
    }

    canvas.Children.Add(heart);
}
```

:::danger Часта помилка
`cy - y * scale`, а не `cy + y * scale`. Забудете мінус — серце вийде
перевернутим вістрям догори. Це та сама пастка з перевернутою віссю Y,
і найкраща перевірка проста: якщо фігура «стоїть на голові», ви загубили мінус.
:::

Є і простіший варіант — у **полярних координатах**. Там точка задається
не парою `(x, y)`, а кутом `theta` й відстанню від центру `r`:

```
   r(theta) = 1 - sin(theta)

   переведення у декартові:
   x = r * cos(theta)
   y = r * sin(theta)
```

```csharp
private void DrawPolarHeart(Canvas canvas)
{
    double cx    = canvas.ActualWidth  / 2;
    double cy    = canvas.ActualHeight / 2 - 40;   // фігура «висить» під центром
    double scale = 110;

    var heart = new Polygon
    {
        Stroke          = Brushes.Crimson,
        StrokeThickness = 2,
        Fill            = new SolidColorBrush(Color.FromArgb(60, 220, 20, 60))
    };

    const int steps = 400;
    for (int i = 0; i <= steps; i++)
    {
        double theta = 2 * Math.PI * i / steps;
        double r     = 1 - Math.Sin(theta);

        double x = r * Math.Cos(theta);
        double y = r * Math.Sin(theta);

        heart.Points.Add(new Point(cx + x * scale, cy - y * scale));
    }

    canvas.Children.Add(heart);
}
```

### Спірограф

Пам'ятаєте пластикову іграшку, де маленьке зубчасте коліщатко котиться
всередині великого кільця, а олівець у дірочці малює візерунок? Математично
це **гіпотрохоїда**.

```
        ┌──────────── велике нерухоме коло, радіус R
        │
   ╭────┴─────────────╮
  ╱                    ╲
 │      ╭───╮           │
 │     ╱  ●d ╲  ◀── маленьке коло радіуса r котиться всередині,
 │    │   ·   │         олівець — на відстані d від його центру
 │     ╲     ╱
 │      ╰───╯
  ╲                    ╱
   ╰──────────────────╯
```

Параметричні рівняння:

```
   x(t) = (R - r) * cos(t) + d * cos((R - r) / r * t)
   y(t) = (R - r) * sin(t) - d * sin((R - r) / r * t)
```

де `R` — радіус нерухомого кола, `r` — радіус рухомого, `d` — відстань
від центру рухомого кола до точки малювання.

Найцікавіше питання — **коли крива замкнеться**. Відповідь дає найбільший
спільний дільник:

```
   n = R / НСД(R, r)        — скільки «пелюсток» матиме крива
   обертів = r / НСД(R, r)  — скільки разів t має пройти від 0 до 2*pi
   tMax = 2 * pi * обертів
```

```csharp
private Polyline BuildSpirograph(double centerX, double centerY,
                                 double R, double r, double d,
                                 Brush color, double thickness = 1.5)
{
    int    g     = Gcd((int)R, (int)r);
    double turns = r / g;                      // повних обертів до замикання
    double tMax  = 2 * Math.PI * turns;

    // Крок підбираємо так, щоб на кожен оберт припадало ~600 точок
    int steps = (int)(turns * 600);

    var curve = new Polyline
    {
        Stroke          = color,
        StrokeThickness = thickness,
        StrokeLineJoin  = PenLineJoin.Round
    };

    for (int i = 0; i <= steps; i++)
    {
        double t = tMax * i / steps;

        double x = (R - r) * Math.Cos(t) + d * Math.Cos((R - r) / r * t);
        double y = (R - r) * Math.Sin(t) - d * Math.Sin((R - r) / r * t);

        curve.Points.Add(new Point(centerX + x, centerY - y));
    }

    return curve;
}

private static int Gcd(int a, int b) => b == 0 ? a : Gcd(b, a % b);
```

### Пресети спірографа

Ці комбінації перевірені — саме такі фігури вони дають. Кількість пелюсток
рахується за формулою `R / НСД(R, r)`, а характер малюнка визначає відношення
`d` до `R - r`.

| R | r | d | Пелюсток | Що виходить |
|---|---|---|---|---|
| 120 | 40 | 40 | 3 | **Дельтоїд** — криволінійний трикутник із трьома вістрями (`d = r`, класична гіпоциклоїда) |
| 120 | 40 | 80 | 3 | Трипелюсткова квітка: пелюстки сходяться точно в центрі (`d = R - r`) |
| 120 | 30 | 90 | 4 | Чотирипелюсткова квітка, теж із центром у нулі |
| 120 | 24 | 80 | 5 | П'ятипелюсткова квітка з невеликим отвором посередині (`d` менше за `R - r`) |
| 150 | 50 | 120 | 3 | **Трикутна фігура з петлями**: `d` більше за `R - r`, тому пелюстки заходять одна за одну |
| 120 | 60 | 40 | 2 | **Еліпс.** При `R = 2r` гіпотрохоїда вироджується в еліпс із півосями 100 і 20 |
| 120 | 45 | 120 | 8 | Восьмипроменева зірка з петлями, замикається за 3 оберти |
| 120 | 35 | 90 | 24 | Густа розетка на 24 промені, 7 обертів |
| 100 | 37 | 85 | 100 | Дуже щільне мереживо: 100 пелюсток, 37 обертів |

:::info Цікаво
Рядок `R = 120, r = 60` — це знаменитий **механізм ат-Тусі**: коли коло вдвічі
меншого радіуса котиться всередині більшого, будь-яка точка на його обводі
рухається строго по прямій. Персидський астроном Насір ад-Дін ат-Тусі описав
цей ефект у XIII столітті, щоб пояснити рух планет. Спробуйте `d = r = 60` —
і замість еліпса отримаєте звичайний відрізок.
:::

### Епітрохоїда

Якщо маленьке коло котиться **зовні** великого, виходить епітрохоїда.
Формула майже така сама, змінюються лише знаки:

```
   x(t) = (R + r) * cos(t) - d * cos((R + r) / r * t)
   y(t) = (R + r) * sin(t) - d * sin((R + r) / r * t)
```

```csharp
private Polyline BuildEpitrochoid(double centerX, double centerY,
                                  double R, double r, double d, Brush color)
{
    int    g     = Gcd((int)R, (int)r);
    double turns = r / g;
    double tMax  = 2 * Math.PI * turns;
    int    steps = (int)(turns * 600);

    var curve = new Polyline { Stroke = color, StrokeThickness = 1.5 };

    for (int i = 0; i <= steps; i++)
    {
        double t = tMax * i / steps;

        double x = (R + r) * Math.Cos(t) - d * Math.Cos((R + r) / r * t);
        double y = (R + r) * Math.Sin(t) - d * Math.Sin((R + r) / r * t);

        curve.Points.Add(new Point(centerX + x, centerY - y));
    }

    return curve;
}
```

Окремий випадок `R = r` і `d = r` дає **кардіоїду** — ще одну криву у формі
серця, набагато простішу за ту, з якої ми починали.

### Роза

Квітка з пелюстками, задана в полярних координатах однією формулою:

```
   r(theta) = a * cos(k * theta)

   x = r * cos(theta)
   y = r * sin(theta)
```

Правило для кількості пелюсток дуже красиве:

- якщо `k` **непарне** — пелюсток буде рівно `k`;
- якщо `k` **парне** — пелюсток буде `2k`.

```csharp
private Polygon BuildRose(double centerX, double centerY,
                          double a, int k, Brush stroke, Brush fill)
{
    var rose = new Polygon
    {
        Stroke          = stroke,
        Fill            = fill,
        StrokeThickness = 2
    };

    const int steps = 2000;
    // Для парного k крива замикається за 2*pi, для непарного — за pi,
    // але 2*pi підходить завжди (непарну просто пройдемо двічі)
    for (int i = 0; i <= steps; i++)
    {
        double theta = 2 * Math.PI * i / steps;
        double r     = a * Math.Cos(k * theta);

        double x = r * Math.Cos(theta);
        double y = r * Math.Sin(theta);

        rose.Points.Add(new Point(centerX + x, centerY - y));
    }

    return rose;
}
```

| a | k | Результат |
|---|---|---|
| 140 | 3 | Три пелюстки |
| 140 | 4 | Вісім пелюсток |
| 140 | 5 | П'ять пелюсток |
| 140 | 8 | Шістнадцять пелюсток |

### Фігури Ліссажу

Крива, яку описує точка, що коливається одночасно по двох осях із різними
частотами. Саме такі візерунки показує осцилограф, коли на його входи подають
два синусоїдальні сигнали.

```
   x(t) = A * sin(a * t + delta)
   y(t) = B * sin(b * t)
```

```csharp
private Polyline BuildLissajous(double centerX, double centerY,
                                double amplitudeX, double amplitudeY,
                                double freqX, double freqY, double phase,
                                Brush color)
{
    var curve = new Polyline { Stroke = color, StrokeThickness = 1.8 };

    const int steps = 3000;
    for (int i = 0; i <= steps; i++)
    {
        double t = 2 * Math.PI * i / steps;

        double x = amplitudeX * Math.Sin(freqX * t + phase);
        double y = amplitudeY * Math.Sin(freqY * t);

        curve.Points.Add(new Point(centerX + x, centerY - y));
    }

    return curve;
}
```

| freqX | freqY | phase | Результат |
|---|---|---|---|
| 1 | 1 | 0 | Діагональна пряма |
| 1 | 1 | pi/2 | Коло |
| 1 | 2 | pi/2 | Вісімка (лежача) |
| 3 | 2 | pi/2 | Класичний «вузол» на три петлі |
| 5 | 4 | pi/2 | Щільне плетиво |

## Продуктивність: скільки точок насправді потрібно

Спокуса очевидна: «більше точок — плавніше». Спробуйте задати крок `0.0001`
для спірографа з 37 обертами — і отримаєте `Polyline` на два мільйони точок.
Вікно буде відкриватися секунд десять, а прокрутка стане ривками.

Причин дві.

**Перша.** `PointCollection` зберігає кожну точку як структуру `Point` —
два числа `double`, тобто 16 байт. Два мільйони точок — 32 мегабайти
самих лише координат, плюс накладні витрати колекції.

**Друга, важливіша.** `Polyline` — це `UIElement`. Він бере участь
у перевірці попадання миші (`hit-testing`), і при кожному русі курсора
платформа має вирішити, чи не потрапив курсор у лінію. Для мільйона
сегментів це дорого.

І головне: сенсу в цих точках немає. Область побудови має ширину, скажімо,
800 пікселів. Більше ніж кілька тисяч точок екран фізично не покаже — сусідні
точки лягають в один і той самий піксель.

### Що робити

**Спосіб 1. Розумний крок.** Прив'язуйте кількість точок до розміру
області, а не до «красивого» числа:

```csharp
// Для графіка функції: один крок = один піксель
int steps = (int)area.PlotWidth;

// Для замкненої кривої: пропорційно її периметру на екрані
int steps = (int)(Math.PI * 2 * radius);   // приблизно один крок на піксель дуги
```

**Спосіб 2. Адаптивний крок.** Там, де крива майже пряма, точки не потрібні;
там, де крутий злам — потрібні. Простий критерій: додавати нову точку, лише
якщо вона відійшла від попередньої більш ніж на піксель.

```csharp
private Polyline BuildCurveAdaptive(Func<double, Point> curve,
                                    double tMin, double tMax,
                                    Brush color, double minPixelStep = 1.0)
{
    var line = new Polyline { Stroke = color, StrokeThickness = 1.5 };

    const int probes = 20000;          // рахуємо часто, але додаємо рідко
    Point last = curve(tMin);
    line.Points.Add(last);

    for (int i = 1; i <= probes; i++)
    {
        double t = tMin + (tMax - tMin) * i / probes;
        Point p  = curve(t);

        // Додаємо, лише якщо точка помітно відійшла від попередньої
        double dx = p.X - last.X;
        double dy = p.Y - last.Y;
        if (dx * dx + dy * dy >= minPixelStep * minPixelStep)
        {
            line.Points.Add(p);
            last = p;
        }
    }

    line.Points.Add(curve(tMax));      // фінальна точка — обов'язково
    return line;
}
```

На типовому спірографі це прибирає 80–90 відсотків точок, а на око різниці
немає.

**Спосіб 3. StreamGeometry замість Polyline.** Якщо крива статична —
її не треба редагувати, вона не реагує на мишу — беріть `StreamGeometry`.
Це «геометрія лише для малювання»: вона не зберігає список точок як об'єкти,
а записує їх у компактний внутрішній потік.

```csharp
private Path BuildCurveFast(Func<double, Point> curve,
                            double tMin, double tMax, int steps,
                            Brush color)
{
    var geometry = new StreamGeometry();

    using (StreamGeometryContext ctx = geometry.Open())
    {
        ctx.BeginFigure(curve(tMin), isFilled: false, isClosed: false);

        for (int i = 1; i <= steps; i++)
        {
            double t = tMin + (tMax - tMin) * i / steps;
            // isStroked: true — сегмент малюється,
            // isSmoothJoin: false — без згладжування стику (швидше)
            ctx.LineTo(curve(t), isStroked: true, isSmoothJoin: false);
        }
    }

    geometry.Freeze();     // заморожуємо: платформа перестає стежити за змінами

    return new Path
    {
        Data            = geometry,
        Stroke          = color,
        StrokeThickness = 1.5,
        IsHitTestVisible = false      // не беремо участі в перевірці миші
    };
}
```

Три рядки тут дають основний виграш: `using` навколо контексту,
`geometry.Freeze()` і `IsHitTestVisible = false`.

| Підхід | Коли брати | Коли не брати |
|---|---|---|
| `Polyline` | До кількох тисяч точок, треба додавати точки поступово | Десятки тисяч точок, багато кривих одночасно |
| `Polygon` | Те саме, але крива замкнена й залита | Те саме |
| `StreamGeometry` + `Path` | Крива готова цілком, більше не змінюється | Точки додаються по одній в анімації |
| `PathGeometry` | Потрібні дуги, Безьє, редагування сегментів | Просто багато точок — надто важко |

:::tip Порада
Перевіряти продуктивність «на око» — погана ідея. Увімкніть у Visual Studio
вікно **Diagnostic Tools** (меню Налагодження, або `Alt+F2` для профілювання)
і подивіться на вкладку CPU під час малювання. Якщо побудова точок займає
менше 10 мілісекунд, а вікно все одно гальмує — проблема не в обчисленнях,
а в кількості елементів на полотні.
:::

## Типові помилки

**Забутий мінус перед Y.** Фігура виходить перевернутою. Перевірте формулу
перерахунку: на екрані `screenY` зменшується, коли математичний `y` зростає.

**Жорстко зашитий масштаб.** `scale = 12` чудово працює на полотні 600 на 400
і зовсім не працює на 1920 на 1080. Рахуйте масштаб від `ActualWidth`
і `ActualHeight`, і перемальовуйте графік у `SizeChanged`.

**Малювання в конструкторі.** `ActualWidth` дорівнює нулю, поки вікно
не виміряне, тому весь графік зіб'ється в точку. Малюйте у `Loaded`.

**Графік через розрив.** `Math.Tan` або `1/x` дадуть вертикальну «пряму»
через увесь екран. Розривайте `Polyline` на окремі шматки, як тільки значення
вийшло за межі області.

**Десятки тисяч точок «про всяк випадок».** Екран не покаже більше, ніж
у нього пікселів. Прив'язуйте кількість кроків до ширини області побудови.
