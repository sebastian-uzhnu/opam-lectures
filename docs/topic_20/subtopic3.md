---
sidebar_position: 4
---

# DispatcherTimer та покрокові анімації

## Коли Storyboard недостатньо

`Storyboard` чудово підходить для анімацій із заздалегідь відомими значеннями (`From`/`To`). Але іноді потрібно:

- Малювати криву **поступово**, точка за точкою
- Анімувати малювання спірографа як живий процес
- Будувати криву, де наступна точка залежить від попередньої (фракталоподібні криві)
- Змінювати напрямок або поведінку під час виконання

У таких випадках використовується **`DispatcherTimer`** — таймер, що виконує зворотний виклик у потоці UI з заданим інтервалом.

## DispatcherTimer: основи

```csharp
using System.Windows.Threading;

private DispatcherTimer _timer;

private void StartTimer()
{
    _timer = new DispatcherTimer
    {
        Interval = TimeSpan.FromMilliseconds(16) // ~60 FPS
    };
    _timer.Tick += OnTick;
    _timer.Start();
}

private void OnTick(object sender, EventArgs e)
{
    // Цей код виконується кожні 16 мілісекунд
    // Тут відбувається наступний "крок" анімації
}

private void StopTimer()
{
    _timer?.Stop();
}
```

:::info Інтервал і FPS
- 16 мс ≈ 60 кадрів/сек
- 33 мс ≈ 30 кадрів/сек
- 100 мс = 10 кадрів/сек (помітне гальмування)

WPF сам по собі рендерить з частотою монітора (зазвичай 60 Hz), тому 16 мс — оптимальний інтервал для плавних анімацій.
:::

---

## Покрокове малювання прямої лінії

Перший приклад: лінія, яка "малюється" поступово, від початку до кінця.

**XAML:**
```xml
<Canvas x:Name="MainCanvas" Background="#0a0a1a">
    <Button Content="Намалювати лінію"
            Canvas.Left="20" Canvas.Top="20"
            Click="OnDrawLine_Click"/>
    <Button Content="Скинути"
            Canvas.Left="160" Canvas.Top="20"
            Click="OnReset_Click"/>
</Canvas>
```

**C#:**
```csharp
public partial class MainWindow : Window
{
    private DispatcherTimer _timer;
    private Polyline        _currentLine;
    private double          _t;          // поточний параметр (0..1)
    private const double    Step = 0.01; // крок за один тік

    // Точки початку і кінця лінії
    private Point _lineFrom = new Point(50,  200);
    private Point _lineTo   = new Point(650, 200);

    public MainWindow() => InitializeComponent();

    private void OnDrawLine_Click(object sender, RoutedEventArgs e)
    {
        _timer?.Stop();
        MainCanvas.Children.Clear();

        // Повторно додаємо кнопки (вони були на Canvas і очистились)
        // Краща практика — розмістити кнопки поза Canvas або зберегти посилання
        // Тут для простоти — перезапуск через програмне керування

        _currentLine = new Polyline
        {
            Stroke          = Brushes.LimeGreen,
            StrokeThickness = 2
        };
        MainCanvas.Children.Add(_currentLine);

        _t = 0;
        _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(8) };
        _timer.Tick += DrawLineStep;
        _timer.Start();
    }

    private void DrawLineStep(object sender, EventArgs e)
    {
        if (_t > 1.0)
        {
            _timer.Stop();
            return;
        }

        double x = _lineFrom.X + _t * (_lineTo.X - _lineFrom.X);
        double y = _lineFrom.Y + _t * (_lineTo.Y - _lineFrom.Y);
        _currentLine.Points.Add(new Point(x, y));

        _t += Step;
    }

    private void OnReset_Click(object sender, RoutedEventArgs e)
    {
        _timer?.Stop();
        MainCanvas.Children.Clear();
    }
}
```

---

## Покрокове малювання серця

Той самий підхід застосуємо до кривої серця — вона буде "з'являтись" плавно:

```csharp
public partial class MainWindow : Window
{
    private DispatcherTimer _timer;
    private Polygon         _heartPolygon;
    private int             _step;
    private const int       TotalSteps = 500;

    public MainWindow() => InitializeComponent();

    private void OnDrawHeart_Click(object sender, RoutedEventArgs e)
    {
        _timer?.Stop();
        MainCanvas.Children.Clear();

        double cx    = MainCanvas.ActualWidth  / 2;
        double cy    = MainCanvas.ActualHeight / 2;
        double scale = Math.Min(cx, cy) / 18; // адаптивний масштаб

        // Попередньо обчислимо всі точки
        _heartPoints = ComputeHeartPoints(cx, cy, scale, TotalSteps);

        // Малюємо через Polyline (не Polygon) щоб бачити процес
        _heartLine = new Polyline
        {
            Stroke          = new SolidColorBrush(Colors.HotPink),
            StrokeThickness = 2
        };
        MainCanvas.Children.Add(_heartLine);

        _step  = 0;
        _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(5) };
        _timer.Tick += DrawHeartStep;
        _timer.Start();
    }

    private Point[] _heartPoints;
    private Polyline _heartLine;

    private Point[] ComputeHeartPoints(double cx, double cy, double scale, int steps)
    {
        var pts = new Point[steps + 1];
        for (int i = 0; i <= steps; i++)
        {
            double t = 2 * Math.PI * i / steps;
            double x =  16 * Math.Pow(Math.Sin(t), 3);
            double y = -(13 * Math.Cos(t) - 5 * Math.Cos(2 * t)
                       -  2 * Math.Cos(3 * t) - Math.Cos(4 * t));
            pts[i] = new Point(cx + x * scale, cy + y * scale);
        }
        return pts;
    }

    private void DrawHeartStep(object sender, EventArgs e)
    {
        if (_step >= _heartPoints.Length)
        {
            _timer.Stop();
            return;
        }
        _heartLine.Points.Add(_heartPoints[_step]);
        _step++;
    }
}
```

---

## Покрокове малювання спірографа

Спірограф особливо красиво виглядає при покроковому малюванні — видно, як рухається пензлик по складній траєкторії.

```csharp
public partial class MainWindow : Window
{
    private DispatcherTimer _timer;
    private Polyline        _spiroLine;
    private Point[]         _spiroPoints;
    private int             _spiroStep;

    // Параметри спірографа
    private double _R = 120, _r = 40, _d = 80;

    private void OnDrawSpiro_Click(object sender, RoutedEventArgs e)
    {
        _timer?.Stop();
        MainCanvas.Children.Clear();

        double cx = MainCanvas.ActualWidth  / 2;
        double cy = MainCanvas.ActualHeight / 2;

        _spiroPoints = ComputeSpiroPoints(cx, cy, _R, _r, _d);

        _spiroLine = new Polyline
        {
            Stroke          = new SolidColorBrush(Colors.Cyan),
            StrokeThickness = 1.5
        };
        MainCanvas.Children.Add(_spiroLine);

        _spiroStep = 0;
        _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(4) };
        _timer.Tick += DrawSpiroStep;
        _timer.Start();
    }

    private Point[] ComputeSpiroPoints(double cx, double cy,
                                       double R,  double r, double d)
    {
        int    gcd   = GCD((int)R, (int)r);
        double tMax  = 2 * Math.PI * (r / gcd);
        int    steps = (int)(tMax / 0.002);
        var    pts   = new Point[steps + 1];

        for (int i = 0; i <= steps; i++)
        {
            double t = tMax * i / steps;
            double x = (R - r) * Math.Cos(t) + d * Math.Cos((R - r) / r * t);
            double y = (R - r) * Math.Sin(t) - d * Math.Sin((R - r) / r * t);
            pts[i] = new Point(cx + x, cy + y);
        }
        return pts;
    }

    private void DrawSpiroStep(object sender, EventArgs e)
    {
        if (_spiroStep >= _spiroPoints.Length)
        {
            _timer.Stop();
            return;
        }
        // Додаємо кілька точок за тік для більшої швидкості малювання
        int batchSize = 3;
        for (int i = 0; i < batchSize && _spiroStep < _spiroPoints.Length; i++)
        {
            _spiroLine.Points.Add(_spiroPoints[_spiroStep]);
            _spiroStep++;
        }
    }

    private static int GCD(int a, int b) => b == 0 ? a : GCD(b, a % b);
}
```

---

## Повний проект: інтерактивна галерея з покроковою анімацією

Тепер об'єднаємо все у один застосунок з керуванням через UI:

**XAML:**
```xml
<Window ...
        Title="Математична графіка WPF"
        Height="620" Width="900"
        Background="#0a0a1a">
    <DockPanel>
        <!-- Панель управління зліва -->
        <Border DockPanel.Dock="Left" Width="200"
                Background="#12122a" Padding="12">
            <StackPanel>
                <TextBlock Text="Фігури" Foreground="White"
                           FontSize="16" FontWeight="Bold" Margin="0,0,0,12"/>

                <Button x:Name="BtnLine"   Content="Лінія"
                        Margin="0,4" Click="OnLine_Click"/>
                <Button x:Name="BtnHeart"  Content="Серце"
                        Margin="0,4" Click="OnHeart_Click"/>
                <Button x:Name="BtnSpiro1" Content="Спіро: квітка 3"
                        Margin="0,4" Click="OnSpiro1_Click"/>
                <Button x:Name="BtnSpiro2" Content="Спіро: квітка 4"
                        Margin="0,4" Click="OnSpiro2_Click"/>
                <Button x:Name="BtnSpiro3" Content="Спіро: зірка"
                        Margin="0,4" Click="OnSpiro3_Click"/>
                <Button x:Name="BtnEpitro" Content="Епітрохоїда"
                        Margin="0,4" Click="OnEpitro_Click"/>

                <Separator Margin="0,12" Background="#333"/>

                <TextBlock Text="Швидкість" Foreground="#aaa" Margin="0,0,0,4"/>
                <Slider x:Name="SpeedSlider"
                        Minimum="1" Maximum="20" Value="5"
                        Foreground="White"/>

                <Separator Margin="0,12" Background="#333"/>

                <Button Content="Стоп"    Margin="0,4" Click="OnStop_Click"/>
                <Button Content="Очистити" Margin="0,4" Click="OnClear_Click"/>

                <!-- Індикатор статусу -->
                <TextBlock x:Name="StatusText"
                           Foreground="#aaa" FontSize="11"
                           Margin="0,16,0,0" TextWrapping="Wrap"
                           Text="Оберіть фігуру для малювання"/>
            </StackPanel>
        </Border>

        <!-- Полотно для малювання -->
        <Canvas x:Name="MainCanvas" Background="#0f0f23"
                SizeChanged="OnCanvasSizeChanged"/>
    </DockPanel>
</Window>
```

**C# (MainWindow.xaml.cs):**
```csharp
using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using System.Windows.Threading;

namespace MathGraphicsWpf
{
    public partial class MainWindow : Window
    {
        private DispatcherTimer _timer;
        private Polyline        _activeLine;
        private Point[]         _points;
        private int             _pointIndex;

        public MainWindow() => InitializeComponent();

        // --- Обробники кнопок ---

        private void OnLine_Click(object sender, RoutedEventArgs e)
        {
            double cx = MainCanvas.ActualWidth  / 2;
            double cy = MainCanvas.ActualHeight / 2;
            StartDrawing(
                ComputeLine(new Point(cx - 250, cy), new Point(cx + 250, cy)),
                Brushes.LimeGreen, 2, "Пряма лінія");
        }

        private void OnHeart_Click(object sender, RoutedEventArgs e)
        {
            double cx    = MainCanvas.ActualWidth  / 2;
            double cy    = MainCanvas.ActualHeight / 2;
            double scale = Math.Min(cx, cy) / 18;
            StartDrawing(
                ComputeHeart(cx, cy, scale, 600),
                new SolidColorBrush(Colors.HotPink), 2, "Крива серця");
        }

        private void OnSpiro1_Click(object sender, RoutedEventArgs e)
            => StartSpiro(120, 40, 80,  Colors.Cyan,     "Спірограф: 3 пелюстки");

        private void OnSpiro2_Click(object sender, RoutedEventArgs e)
            => StartSpiro(120, 30, 90,  Colors.Gold,     "Спірограф: 4 пелюстки");

        private void OnSpiro3_Click(object sender, RoutedEventArgs e)
            => StartSpiro(100, 37, 85,  Colors.Violet,   "Спірограф: зірка");

        private void OnEpitro_Click(object sender, RoutedEventArgs e)
        {
            double cx = MainCanvas.ActualWidth  / 2;
            double cy = MainCanvas.ActualHeight / 2;
            StartDrawing(
                ComputeEpitrochoid(cx, cy, 80, 30, 80),
                new SolidColorBrush(Colors.OrangeRed), 1.5, "Епітрохоїда");
        }

        private void OnStop_Click(object sender, RoutedEventArgs e)
        {
            _timer?.Stop();
            StatusText.Text = "Зупинено.";
        }

        private void OnClear_Click(object sender, RoutedEventArgs e)
        {
            _timer?.Stop();
            MainCanvas.Children.Clear();
            StatusText.Text = "Полотно очищено.";
        }

        private void OnCanvasSizeChanged(object sender, SizeChangedEventArgs e)
        {
            // Canvas змінив розмір — зупиняємо поточну анімацію
            _timer?.Stop();
        }

        // --- Запуск малювання ---

        private void StartSpiro(double R, double r, double d, Color color, string name)
        {
            double cx = MainCanvas.ActualWidth  / 2;
            double cy = MainCanvas.ActualHeight / 2;
            StartDrawing(
                ComputeSpiro(cx, cy, R, r, d),
                new SolidColorBrush(color), 1.5, name);
        }

        private void StartDrawing(Point[] points, Brush color,
                                   double thickness, string name)
        {
            _timer?.Stop();
            MainCanvas.Children.Clear();

            _activeLine = new Polyline
            {
                Stroke          = color,
                StrokeThickness = thickness
            };
            MainCanvas.Children.Add(_activeLine);

            _points     = points;
            _pointIndex = 0;

            int interval = Math.Max(1, (int)(21 - SpeedSlider.Value));
            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(interval)
            };
            _timer.Tick += OnTick;
            _timer.Start();

            StatusText.Text = $"Малюємо: {name}\n{points.Length} точок";
        }

        private void OnTick(object sender, EventArgs e)
        {
            if (_pointIndex >= _points.Length)
            {
                _timer.Stop();
                StatusText.Text = StatusText.Text.Replace("Малюємо:", "Готово:");
                return;
            }

            // Кількість точок за тік залежить від швидкості
            int batch = Math.Max(1, (int)SpeedSlider.Value);
            for (int i = 0; i < batch && _pointIndex < _points.Length; i++)
            {
                _activeLine.Points.Add(_points[_pointIndex++]);
            }
        }

        // --- Обчислення точок ---

        private static Point[] ComputeLine(Point from, Point to, int steps = 200)
        {
            var pts = new Point[steps + 1];
            for (int i = 0; i <= steps; i++)
            {
                double t = (double)i / steps;
                pts[i] = new Point(
                    from.X + t * (to.X - from.X),
                    from.Y + t * (to.Y - from.Y));
            }
            return pts;
        }

        private static Point[] ComputeHeart(double cx, double cy,
                                             double scale, int steps)
        {
            var pts = new Point[steps + 1];
            for (int i = 0; i <= steps; i++)
            {
                double t = 2 * Math.PI * i / steps;
                double x =  16 * Math.Pow(Math.Sin(t), 3);
                double y = -(13 * Math.Cos(t) - 5 * Math.Cos(2 * t)
                           -  2 * Math.Cos(3 * t) - Math.Cos(4 * t));
                pts[i] = new Point(cx + x * scale, cy + y * scale);
            }
            return pts;
        }

        private static Point[] ComputeSpiro(double cx, double cy,
                                             double R,  double r, double d)
        {
            int    gcd   = GCD((int)R, (int)r);
            double tMax  = 2 * Math.PI * (r / gcd);
            int    steps = (int)(tMax / 0.001);
            var    pts   = new Point[steps + 1];

            for (int i = 0; i <= steps; i++)
            {
                double t = tMax * i / steps;
                double x = (R - r) * Math.Cos(t) + d * Math.Cos((R - r) / r * t);
                double y = (R - r) * Math.Sin(t) - d * Math.Sin((R - r) / r * t);
                pts[i] = new Point(cx + x, cy + y);
            }
            return pts;
        }

        private static Point[] ComputeEpitrochoid(double cx, double cy,
                                                   double R,  double r, double d)
        {
            int    gcd   = GCD((int)R, (int)r);
            double tMax  = 2 * Math.PI * (r / gcd);
            int    steps = (int)(tMax / 0.001);
            var    pts   = new Point[steps + 1];

            for (int i = 0; i <= steps; i++)
            {
                double t = tMax * i / steps;
                double x = (R + r) * Math.Cos(t) - d * Math.Cos((R + r) / r * t);
                double y = (R + r) * Math.Sin(t) - d * Math.Sin((R + r) / r * t);
                pts[i] = new Point(cx + x, cy + y);
            }
            return pts;
        }

        private static int GCD(int a, int b) => b == 0 ? a : GCD(b, a % b);
    }
}
```

---

## Комбінація Storyboard + DispatcherTimer

Часто найкращий підхід — поєднати обидва методи:
- `DispatcherTimer` керує покроковим малюванням
- `Storyboard` анімує властивості вже намальованих елементів

```csharp
private void AnimateDrawnCurve()
{
    // Після завершення покрокового малювання
    // запускаємо Storyboard-анімацію кольору вже намальованої лінії

    var brush = new SolidColorBrush(Colors.Cyan);
    _activeLine.Stroke = brush;
    this.RegisterName("drawnBrush", brush);

    var anim = new ColorAnimationUsingKeyFrames
    {
        Duration       = TimeSpan.FromSeconds(3),
        RepeatBehavior = RepeatBehavior.Forever
    };
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Cyan,    KeyTime.FromPercent(0.0)));
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Magenta, KeyTime.FromPercent(0.33)));
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Gold,    KeyTime.FromPercent(0.67)));
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Cyan,    KeyTime.FromPercent(1.0)));

    Storyboard.SetTargetName(anim, "drawnBrush");
    Storyboard.SetTargetProperty(anim, new PropertyPath(SolidColorBrush.ColorProperty));

    var sb = new Storyboard();
    sb.Children.Add(anim);
    sb.Begin(this);
}
```

---

## Підсумок теми

| Підхід | Коли використовувати |
|---|---|
| `ColorAnimation` | Плавна зміна кольору фону, обводки, заливки |
| `DoubleAnimation` | Переміщення, масштаб, поворот, прозорість |
| `PointAnimation` | Переміщення точок у геометрії |
| `*AnimationUsingKeyFrames` | Кілька проміжних значень, нелінійна анімація |
| `DispatcherTimer` | Покрокова побудова, алгоритмічна анімація, фізичні симуляції |
| Комбінація | Малювання + анімація кольору/розміру готового елемента |

**Корисні ресурси для подальшого вивчення:**
- [Wolfram MathWorld — Curves](https://mathworld.wolfram.com/topics/Curves.html)
- [Desmos — побудова графіків онлайн](https://www.desmos.com/calculator)
- [WPF Animation Overview — Microsoft Docs](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/graphics-multimedia/animation-overview)
- [WPF Storyboards — Microsoft Docs](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/graphics-multimedia/storyboards-overview)
- [Wikipedia: Spirograph](https://en.wikipedia.org/wiki/Spirograph)
- [Wikipedia: Hypotrochoid](https://en.wikipedia.org/wiki/Hypotrochoid)
