---
sidebar_position: 2
---

# ColorAnimation, DoubleAnimation та інші типи анімацій

## ColorAnimation — анімація кольору

`ColorAnimation` плавно змінює значення типу `Color`. Важлива деталь: безпосередньо анімувати `Fill` (який є `Brush`) не можна — потрібно анімувати властивість `Color` всередині `SolidColorBrush`.

### Приклад: кнопка, що змінює колір при натисканні

**XAML:**
```xml
<Canvas x:Name="MainCanvas">
    <Rectangle x:Name="ColorRect"
               Width="200" Height="100"
               Canvas.Left="50" Canvas.Top="50">
        <Rectangle.Fill>
            <!-- SolidColorBrush має ім'я, щоб дістатись до Color -->
            <SolidColorBrush x:Name="RectBrush" Color="OrangeRed"/>
        </Rectangle.Fill>
    </Rectangle>

    <Button Content="Змінити колір"
            Canvas.Left="50" Canvas.Top="170"
            Click="OnChangeColor_Click"/>
</Canvas>
```

**C#:**
```csharp
private void OnChangeColor_Click(object sender, RoutedEventArgs e)
{
    var anim = new ColorAnimation
    {
        To       = Colors.MediumBlue,
        Duration = TimeSpan.FromSeconds(1.5),
        // AutoReverse = true — якщо хочемо повернутися назад
    };

    // Анімуємо властивість Color об'єкта RectBrush
    Storyboard.SetTargetName(anim, "RectBrush");
    Storyboard.SetTargetProperty(anim, new PropertyPath(SolidColorBrush.ColorProperty));

    var sb = new Storyboard();
    sb.Children.Add(anim);
    sb.Begin(this);
}
```

:::tip Шлях до Color через Fill
Якщо `SolidColorBrush` не має імені `x:Name`, ви все одно можете дістатись до нього через шлях властивості:
```csharp
Storyboard.SetTargetName(anim, "ColorRect");
Storyboard.SetTargetProperty(anim, new PropertyPath("Fill.Color"));
```
Але об'єкт за `x:Name` повинен бути зареєстрований у NameScope.
:::

### Безперервна анімація кольору (rainbow-ефект)

```csharp
private void StartRainbowAnimation()
{
    // Анімація по ключових кадрах (ColorAnimationUsingKeyFrames)
    var anim = new ColorAnimationUsingKeyFrames
    {
        Duration       = TimeSpan.FromSeconds(4),
        RepeatBehavior = RepeatBehavior.Forever
    };

    // Ключові кадри: у кожен момент часу — певний колір
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Red,    KeyTime.FromPercent(0.0)));
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Yellow, KeyTime.FromPercent(0.25)));
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Lime,   KeyTime.FromPercent(0.5)));
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Cyan,   KeyTime.FromPercent(0.75)));
    anim.KeyFrames.Add(new LinearColorKeyFrame(Colors.Red,    KeyTime.FromPercent(1.0)));

    Storyboard.SetTargetName(anim, "RectBrush");
    Storyboard.SetTargetProperty(anim, new PropertyPath(SolidColorBrush.ColorProperty));

    var sb = new Storyboard();
    sb.Children.Add(anim);
    sb.Begin(this);
}
```

`ColorAnimationUsingKeyFrames` дозволяє вказати довільну кількість проміжних точок (ключових кадрів). WPF інтерполює колір між ними.

---

## DoubleAnimation — анімація числових властивостей

`DoubleAnimation` — найбільш вживаний тип анімації. Він анімує будь-яку властивість типу `double`: розмір, позицію, прозорість, кут повороту, масштаб тощо.

### Переміщення об'єкта по горизонталі

```csharp
private void AnimatePosition()
{
    var anim = new DoubleAnimation
    {
        From           = 0,
        To             = 500,
        Duration       = TimeSpan.FromSeconds(2),
        AutoReverse    = true,
        RepeatBehavior = RepeatBehavior.Forever,
        EasingFunction = new SineEase { EasingMode = EasingMode.EaseInOut }
    };

    Storyboard.SetTargetName(anim, "MovingRect");
    // Canvas.LeftProperty — прикріплена властивість Canvas
    Storyboard.SetTargetProperty(anim, new PropertyPath(Canvas.LeftProperty));

    var sb = new Storyboard();
    sb.Children.Add(anim);
    sb.Begin(this);
}
```

### Анімація розміру та прозорості одночасно

Один `Storyboard` може містити декілька анімацій, які виконуються паралельно:

```csharp
private void AnimateMultiple()
{
    var sb = new Storyboard();

    // Анімація прозорості
    var opacityAnim = new DoubleAnimation
    {
        From           = 1.0,
        To             = 0.2,
        Duration       = TimeSpan.FromSeconds(1.5),
        AutoReverse    = true,
        RepeatBehavior = RepeatBehavior.Forever
    };
    Storyboard.SetTargetName(opacityAnim, "ScaleRect");
    Storyboard.SetTargetProperty(opacityAnim, new PropertyPath(UIElement.OpacityProperty));

    // Анімація ширини
    var widthAnim = new DoubleAnimation
    {
        From           = 50,
        To             = 200,
        Duration       = TimeSpan.FromSeconds(1.5),
        AutoReverse    = true,
        RepeatBehavior = RepeatBehavior.Forever
    };
    Storyboard.SetTargetName(widthAnim, "ScaleRect");
    Storyboard.SetTargetProperty(widthAnim, new PropertyPath(FrameworkElement.WidthProperty));

    sb.Children.Add(opacityAnim);
    sb.Children.Add(widthAnim);
    sb.Begin(this);
}
```

### Анімація повороту через RotateTransform

Для обертання об'єкта потрібно використати `RotateTransform`:

**XAML:**
```xml
<Rectangle x:Name="SpinRect" Width="80" Height="80"
           Canvas.Left="200" Canvas.Top="200" Fill="Tomato">
    <Rectangle.RenderTransform>
        <RotateTransform x:Name="SpinTransform" CenterX="40" CenterY="40"/>
    </Rectangle.RenderTransform>
</Rectangle>
```

**C#:**
```csharp
private void StartRotation()
{
    var anim = new DoubleAnimation
    {
        From           = 0,
        To             = 360,
        Duration       = TimeSpan.FromSeconds(2),
        RepeatBehavior = RepeatBehavior.Forever
    };

    Storyboard.SetTargetName(anim, "SpinTransform");
    Storyboard.SetTargetProperty(anim, new PropertyPath(RotateTransform.AngleProperty));

    var sb = new Storyboard();
    sb.Children.Add(anim);
    sb.Begin(this);
}
```

---

## PointAnimation — анімація точки

`PointAnimation` анімує значення типу `Point`. Корисний для переміщення елементів у геометрії шляхів (`PathGeometry`).

```csharp
var anim = new PointAnimation
{
    From     = new Point(50, 50),
    To       = new Point(300, 200),
    Duration = TimeSpan.FromSeconds(2),
    AutoReverse = true,
    RepeatBehavior = RepeatBehavior.Forever
};

Storyboard.SetTargetName(anim, "MyEllipseGeometry");
Storyboard.SetTargetProperty(anim, new PropertyPath(EllipseGeometry.CenterProperty));
```

---

## ThicknessAnimation — анімація відступів

Корисний для `Margin` і `Padding` елементів:

```csharp
var anim = new ThicknessAnimation
{
    From     = new Thickness(0),
    To       = new Thickness(20),
    Duration = TimeSpan.FromSeconds(0.5),
    AutoReverse    = true,
    RepeatBehavior = RepeatBehavior.Forever
};

Storyboard.SetTargetName(anim, "MyButton");
Storyboard.SetTargetProperty(anim, new PropertyPath(FrameworkElement.MarginProperty));
```

---

## Повний практичний приклад: анімований світлофор

Розглянемо повний приклад — три кола, що почергово підсвічуються як світлофор.

**XAML:**
```xml
<Canvas x:Name="MainCanvas">
    <Ellipse x:Name="RedLight"    Width="60" Height="60"
             Canvas.Left="70" Canvas.Top="50">
        <Ellipse.Fill><SolidColorBrush x:Name="RedBrush"   Color="#440000"/></Ellipse.Fill>
    </Ellipse>
    <Ellipse x:Name="YellowLight" Width="60" Height="60"
             Canvas.Left="70" Canvas.Top="120">
        <Ellipse.Fill><SolidColorBrush x:Name="YellowBrush" Color="#444400"/></Ellipse.Fill>
    </Ellipse>
    <Ellipse x:Name="GreenLight"  Width="60" Height="60"
             Canvas.Left="70" Canvas.Top="190">
        <Ellipse.Fill><SolidColorBrush x:Name="GreenBrush"  Color="#004400"/></Ellipse.Fill>
    </Ellipse>

    <Button Content="Запустити" Canvas.Left="70" Canvas.Top="270"
            Click="OnStartTrafficLight_Click"/>
</Canvas>
```

**C#:**
```csharp
private void OnStartTrafficLight_Click(object sender, RoutedEventArgs e)
{
    var sb = new Storyboard { RepeatBehavior = RepeatBehavior.Forever };

    // Допоміжна функція для створення анімації одного вогника
    void AddLight(string brushName, Color brightColor, double beginAt, double holdFor)
    {
        // Вмикаємо
        var on = new ColorAnimation
        {
            To            = brightColor,
            Duration      = TimeSpan.FromSeconds(0.3),
            BeginTime     = TimeSpan.FromSeconds(beginAt)
        };
        Storyboard.SetTargetName(on, brushName);
        Storyboard.SetTargetProperty(on, new PropertyPath(SolidColorBrush.ColorProperty));

        // Вимикаємо
        var off = new ColorAnimation
        {
            To        = Color.FromRgb(
                (byte)(brightColor.R / 8),
                (byte)(brightColor.G / 8),
                (byte)(brightColor.B / 8)),
            Duration  = TimeSpan.FromSeconds(0.3),
            BeginTime = TimeSpan.FromSeconds(beginAt + holdFor)
        };
        Storyboard.SetTargetName(off, brushName);
        Storyboard.SetTargetProperty(off, new PropertyPath(SolidColorBrush.ColorProperty));

        sb.Children.Add(on);
        sb.Children.Add(off);
    }

    // Червоний: 0s — 3s
    AddLight("RedBrush",    Colors.Red,    beginAt: 0, holdFor: 3);
    // Жовтий: 3s — 4.5s
    AddLight("YellowBrush", Colors.Yellow, beginAt: 3, holdFor: 1.5);
    // Зелений: 4.5s — 7.5s
    AddLight("GreenBrush",  Colors.Lime,   beginAt: 4.5, holdFor: 3);
    // Жовтий знову: 7.5s — 9s
    AddLight("YellowBrush", Colors.Yellow, beginAt: 7.5, holdFor: 1.5);
    // Загальна тривалість циклу: 9s

    // Явно вказуємо тривалість Storyboard для коректного повторення
    sb.Duration = TimeSpan.FromSeconds(9);
    sb.Begin(this);
}
```

:::info BeginTime
Властивість `BeginTime` на анімації (не на Storyboard) дозволяє відкласти початок цієї конкретної анімації після запуску Storyboard. Це ключовий інструмент для побудови послідовних анімацій.
:::
