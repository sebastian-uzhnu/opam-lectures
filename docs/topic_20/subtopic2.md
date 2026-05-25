---
sidebar_position: 3
---

# Малювання математичних кривих у WPF

## Принцип малювання кривих

У WPF для малювання довільних фігур використовується елемент `Polyline` (ламана лінія) або `Path` з `PathGeometry`. Ідея проста:

1. Обчислюємо набір точок `(x, y)` за математичною формулою
2. Додаємо ці точки до `PointCollection` елемента `Polyline`
3. WPF сполучає точки відрізками — чим більше точок, тим плавніша крива

```csharp
var polyline = new Polyline
{
    Stroke          = Brushes.White,
    StrokeThickness = 1.5
};

for (double t = 0; t <= 2 * Math.PI; t += 0.01)
{
    double x = /* формула */;
    double y = /* формула */;
    polyline.Points.Add(new Point(x, y));
}

MainCanvas.Children.Add(polyline);
```

## Корисні ресурси з математичними формулами

Перед тим як малювати криві, варто знати, де знаходити їхні параметричні рівняння:

| Ресурс | Що містить |
|---|---|
| [Wolfram MathWorld](https://mathworld.wolfram.com) | Найповніша база математичних кривих, формули, графіки |
| [Wikipedia: List of curves](https://en.wikipedia.org/wiki/List_of_curves) | Класифікація кривих із посиланнями |
| [Desmos Graphing Calculator](https://www.desmos.com/calculator) | Онлайн-побудова графіків для перевірки формул |
| [GeoGebra](https://www.geogebra.org) | Інтерактивна геометрія та графіки |
| [Plane Curves](http://www.2dcurves.com) | Каталог плоских кривих із параметричними рівняннями |
| [Mathematical curves (Xah Lee)](http://xahlee.info/SpecialPlaneCurves_dir/specialPlaneCurves.html) | Список кривих із кодом |

---

## Пряма лінія

Найпростіший випадок. Пряма лінія між двома точками задається параметрично:

$$x(t) = x_0 + t \cdot (x_1 - x_0)$$
$$y(t) = y_0 + t \cdot (y_1 - y_0)$$

де $t \in [0, 1]$.

```csharp
private Polyline DrawLine(Point from, Point to, Brush color, double thickness = 1.5)
{
    var line = new Polyline
    {
        Stroke          = color,
        StrokeThickness = thickness
    };

    int steps = 100;
    for (int i = 0; i <= steps; i++)
    {
        double t = (double)i / steps;
        double x = from.X + t * (to.X - from.X);
        double y = from.Y + t * (to.Y - from.Y);
        line.Points.Add(new Point(x, y));
    }

    return line;
}

// Використання:
private void DrawScene()
{
    // Центр Canvas
    double cx = MainCanvas.ActualWidth  / 2;
    double cy = MainCanvas.ActualHeight / 2;

    // Малюємо хрест
    MainCanvas.Children.Add(DrawLine(
        new Point(cx - 100, cy), new Point(cx + 100, cy),
        Brushes.Cyan));

    MainCanvas.Children.Add(DrawLine(
        new Point(cx, cy - 100), new Point(cx, cy + 100),
        Brushes.Cyan));
}
```

Звісно, для простої прямої лінії в WPF є готовий елемент `Line`, але цей підхід демонструє загальний принцип параметричного малювання.

---

## Крива серця (Heart curve)

Серце малюється за параметричними рівняннями (варіант на основі астроїди):

$$x(t) = 16 \sin^3(t)$$
$$y(t) = 13\cos(t) - 5\cos(2t) - 2\cos(3t) - \cos(4t)$$

де $t \in [0, 2\pi]$.

:::info Формула
Джерело: [Wolfram MathWorld — Heart Curve](https://mathworld.wolfram.com/HeartCurve.html)
:::

Ця формула дає серце розміром приблизно від -16 до +16 по x, і від -17 до +13 по y. Нам потрібно **масштабувати** і **перемістити** у центр Canvas.

```csharp
private void DrawHeart()
{
    MainCanvas.Children.Clear();

    double cx     = MainCanvas.ActualWidth  / 2;
    double cy     = MainCanvas.ActualHeight / 2;
    double scale  = 12; // масштаб — підбирається під розмір Canvas

    var polyline = new Polyline
    {
        Stroke          = new SolidColorBrush(Colors.HotPink),
        StrokeThickness = 2,
        // Щоб замкнути фігуру (з'єднати кінець із початком)
        // використаємо Polygon замість Polyline
    };

    // Використовуємо Polygon для замкнутої фігури
    var polygon = new Polygon
    {
        Stroke          = new SolidColorBrush(Colors.HotPink),
        StrokeThickness = 2,
        Fill            = new SolidColorBrush(Color.FromArgb(80, 255, 105, 180))
    };

    int steps = 500; // більше кроків = плавніша крива
    for (int i = 0; i <= steps; i++)
    {
        double t = 2 * Math.PI * i / steps;

        // Параметричні рівняння серця
        double x =  16 * Math.Pow(Math.Sin(t), 3);
        double y = -(13 * Math.Cos(t)
                   -  5 * Math.Cos(2 * t)
                   -  2 * Math.Cos(3 * t)
                   -      Math.Cos(4 * t)); // мінус — бо вісь Y в WPF направлена вниз

        // Перетворення у координати Canvas
        polygon.Points.Add(new Point(cx + x * scale, cy + y * scale));
    }

    MainCanvas.Children.Add(polygon);
}
```

:::warning Вісь Y у WPF
У WPF (і більшості комп'ютерних графічних систем) вісь **Y направлена вниз**. У математиці — вгору. Тому для коректного відображення потрібно змінювати знак `y`: `cy + y * scale` замість `cy - y * scale`, або навпаки — залежно від формули.
:::

### Альтернативна формула серця (полярні координати)

Існує простіший варіант у полярних координатах:

$$r(\theta) = 1 - \sin(\theta)$$

де $r$ — відстань від центру, $\theta$ — кут.

Перетворення з полярних у декартові: $x = r\cos\theta$, $y = r\sin\theta$.

```csharp
private void DrawPolarHeart()
{
    double cx    = MainCanvas.ActualWidth  / 2;
    double cy    = MainCanvas.ActualHeight / 2 + 50; // зміщення вниз
    double scale = 150;

    var polygon = new Polygon
    {
        Stroke          = Brushes.Crimson,
        StrokeThickness = 2,
        Fill            = new SolidColorBrush(Color.FromArgb(60, 220, 20, 60))
    };

    int steps = 300;
    for (int i = 0; i <= steps; i++)
    {
        double theta = 2 * Math.PI * i / steps;
        double r     = 1 - Math.Sin(theta);

        double x =  r * Math.Cos(theta);
        double y = -r * Math.Sin(theta); // мінус для правильної орієнтації
        polygon.Points.Add(new Point(cx + x * scale, cy + y * scale));
    }

    MainCanvas.Children.Add(polygon);
}
```

---

## Спірограф (Spirograph / Hypotrochoid)

Спірограф — крива, що утворюється точкою на колі, яке котиться **всередині** більшого кола. Це **гіпотрохоїда**.

Параметричні рівняння гіпотрохоїди:

$$x(t) = (R - r)\cos(t) + d\cos\left(\frac{R-r}{r} \cdot t\right)$$
$$y(t) = (R - r)\sin(t) - d\sin\left(\frac{R-r}{r} \cdot t\right)$$

де:
- $R$ — радіус зовнішнього (нерухомого) кола
- $r$ — радіус внутрішнього (рухомого) кола  
- $d$ — відстань від центру рухомого кола до точки малювання
- $t$ — кут, від $0$ до $2\pi \cdot r / \gcd(R, r)$ (для замкнутої кривої)

:::info Формула
Докладно: [Wolfram MathWorld — Hypotrochoid](https://mathworld.wolfram.com/Hypotrochoid.html)
:::

```csharp
private void DrawSpirograph(double R, double r, double d, Brush color)
{
    double cx = MainCanvas.ActualWidth  / 2;
    double cy = MainCanvas.ActualHeight / 2;

    var polyline = new Polyline
    {
        Stroke          = color,
        StrokeThickness = 1.5
    };

    // Кількість обертів для замкнутої кривої
    // НСД(R, r): крива замикається через r/НСД(R,r) обертів зовнішнього кола
    int gcd      = GCD((int)R, (int)r);
    double turns = r / gcd;           // кількість повних обертів
    double tMax  = 2 * Math.PI * turns;

    int steps = (int)(tMax / 0.002);  // дрібний крок для плавності
    for (int i = 0; i <= steps; i++)
    {
        double t = tMax * i / steps;

        double x = (R - r) * Math.Cos(t) + d * Math.Cos((R - r) / r * t);
        double y = (R - r) * Math.Sin(t) - d * Math.Sin((R - r) / r * t);

        polyline.Points.Add(new Point(cx + x, cy + y));
    }

    MainCanvas.Children.Add(polyline);
}

private static int GCD(int a, int b) => b == 0 ? a : GCD(b, a % b);
```

### Цікаві комбінації параметрів спірографа

| R | r | d | Результат |
|---|---|---|---|
| 120 | 40 | 80 | Трипелюсткова квітка |
| 120 | 30 | 90 | Чотирипелюсткова квітка |
| 150 | 50 | 120 | Трикутна спіраль |
| 120 | 24 | 80 | П'ятипелюсткова квітка |
| 100 | 37 | 85 | Складна зірка |
| 120 | 45 | 120 | Дельтоїд |

```csharp
private void DrawSpirographGallery()
{
    MainCanvas.Children.Clear();

    var parameters = new (double R, double r, double d, Color color)[]
    {
        (120, 40,  80, Colors.Cyan),
        (120, 30,  90, Colors.HotPink),
        (150, 50, 120, Colors.Gold),
        (120, 24,  80, Colors.LimeGreen),
    };

    foreach (var (R, r, d, c) in parameters)
    {
        DrawSpirograph(R, r, d, new SolidColorBrush(c));
    }
}
```

### Епітрохоїда (зовнішній спірограф)

Якщо маленьке коло котиться **зовні** великого — це **епітрохоїда**:

$$x(t) = (R + r)\cos(t) - d\cos\left(\frac{R+r}{r} \cdot t\right)$$
$$y(t) = (R + r)\sin(t) - d\sin\left(\frac{R+r}{r} \cdot t\right)$$

Особливий випадок епітрохоїди при $d = r$ — **епіциклоїда**. При $R = r, d = r$ отримуємо **кардіоїду** (форма серця!).

```csharp
private void DrawEpitrochoid(double R, double r, double d, Brush color)
{
    double cx = MainCanvas.ActualWidth  / 2;
    double cy = MainCanvas.ActualHeight / 2;

    var polyline = new Polyline { Stroke = color, StrokeThickness = 1.5 };

    int    gcd   = GCD((int)R, (int)r);
    double tMax  = 2 * Math.PI * (r / gcd);
    int    steps = (int)(tMax / 0.002);

    for (int i = 0; i <= steps; i++)
    {
        double t = tMax * i / steps;

        double x = (R + r) * Math.Cos(t) - d * Math.Cos((R + r) / r * t);
        double y = (R + r) * Math.Sin(t) - d * Math.Sin((R + r) / r * t);

        polyline.Points.Add(new Point(cx + x, cy + y));
    }

    MainCanvas.Children.Add(polyline);
}
```

---

## Повний приклад: галерея кривих

```xml
<Window x:Name="Root" ...>
    <DockPanel>
        <StackPanel DockPanel.Dock="Left" Width="180" Background="#1a1a2e">
            <Button Content="Серце (формула 1)"  Margin="8" Click="OnHeart1_Click"/>
            <Button Content="Серце (полярне)"    Margin="8" Click="OnHeart2_Click"/>
            <Button Content="Спірограф (квітка)" Margin="8" Click="OnSpiro1_Click"/>
            <Button Content="Епітрохоїда"        Margin="8" Click="OnEpitro_Click"/>
            <Button Content="Галерея"            Margin="8" Click="OnGallery_Click"/>
            <Button Content="Очистити"           Margin="8" Click="OnClear_Click"/>
        </StackPanel>

        <Canvas x:Name="MainCanvas" Background="#0f0f23"/>
    </DockPanel>
</Window>
```

```csharp
private void OnHeart1_Click(object sender, RoutedEventArgs e)
{
    MainCanvas.Children.Clear();
    DrawHeart();
}

private void OnSpiro1_Click(object sender, RoutedEventArgs e)
{
    MainCanvas.Children.Clear();
    DrawSpirograph(120, 40, 80, Brushes.Cyan);
}

private void OnGallery_Click(object sender, RoutedEventArgs e)
{
    MainCanvas.Children.Clear();
    // Кілька кривих з різними параметрами одночасно
    DrawSpirograph(130, 40,  80, new SolidColorBrush(Colors.Cyan));
    DrawSpirograph(130, 30,  90, new SolidColorBrush(Color.FromArgb(120, 255, 105, 180)));
    DrawSpirograph(130, 24, 100, new SolidColorBrush(Color.FromArgb(120, 255, 215, 0)));
}

private void OnClear_Click(object sender, RoutedEventArgs e)
{
    MainCanvas.Children.Clear();
}
```
