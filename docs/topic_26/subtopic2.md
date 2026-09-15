---
sidebar_position: 3
---

# Анімація

## Що таке анімація у WPF

Наївне уявлення про анімацію таке: у циклі трохи посунув фігуру, перемалював
екран, зачекав, посунув ще. Саме так це робили тридцять років тому, і саме
так це **не** робиться у WPF.

Тут анімація — це **зміна властивості залежності в часі**. Ви не малюєте кадри.
Ви кажете платформі: «властивість `Opacity` цього прямокутника має за дві
секунди перейти від 1 до 0». Далі все робить система:

```
   Ваш код                    Система анімацій WPF           Екран
   ───────                    ────────────────────           ─────

   "Opacity: 1 → 0
    за 2 секунди"  ──────▶   годинник тикає ~60 разів
                             на секунду
                                    │
                             для кожного кадру рахує
                             проміжне значення
                             (0.98, 0.96, 0.95 …)
                                    │
                             підставляє його у властивість
                             з найвищим пріоритетом
                                    │
                             позначає елемент
                             як «треба перемалювати» ──────▶  новий кадр
```

Два наслідки, які варто усвідомити одразу.

**Перший.** Анімувати можна **лише властивості залежності** — ті самі, про які
йшлося у темі 22. Звичайна C#-властивість анімуватися не може: у неї немає
механізму пріоритетів і сповіщення про зміну.

**Другий.** Поки анімація працює, вона має **найвищий пріоритет**. Присвоїти
`rect.Opacity = 0.5` під час анімації можна, але видимого ефекту не буде —
анімація перебиває локальне значення. Це не баг, а описана поведінка,
і про неї ще буде розмова наприкінці підрозділу.

## Найкоротший шлях: BeginAnimation

Перш ніж говорити про `Storyboard`, подивимось на найпростіший спосіб.
У кожного `UIElement` є метод `BeginAnimation` — дай йому властивість
і анімацію, і все запрацює.

```xml
<Window x:Class="AnimDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Перша анімація" Height="320" Width="520"
        Background="#FF0F1724">
    <Grid>
        <Canvas>
            <Rectangle x:Name="BlinkRect"
                       Canvas.Left="60" Canvas.Top="60"
                       Width="120" Height="120"
                       Fill="CornflowerBlue" RadiusX="12" RadiusY="12"/>
        </Canvas>
        <Button Content="Мигати" Width="110" Height="32"
                HorizontalAlignment="Right" VerticalAlignment="Bottom"
                Margin="16" Click="OnBlink_Click"/>
    </Grid>
</Window>
```

```csharp
using System;
using System.Windows;
using System.Windows.Media.Animation;

private void OnBlink_Click(object sender, RoutedEventArgs e)
{
    var fade = new DoubleAnimation
    {
        From           = 1.0,
        To             = 0.15,
        Duration       = TimeSpan.FromSeconds(0.8),
        AutoReverse    = true,
        RepeatBehavior = RepeatBehavior.Forever
    };

    // Перший аргумент — яку властивість анімувати, другий — як
    BlinkRect.BeginAnimation(UIElement.OpacityProperty, fade);
}
```

Три рядки — і прямокутник мигає. Зупинити анімацію теж просто: передати
`null` замість анімації.

```csharp
BlinkRect.BeginAnimation(UIElement.OpacityProperty, null);
```

`BeginAnimation` ідеально підходить, коли треба анімувати **одну властивість
одного об'єкта, який у вас уже є під рукою**. Але щойно анімацій стає кілька,
або їх треба запускати послідовно, або керувати ними як групою — потрібен
`Storyboard`.

## Властивості анімації

Розберемо набір, спільний для всіх типів анімацій.

| Властивість | Що задає |
|---|---|
| `From` | Початкове значення. Якщо не вказане, береться поточне значення властивості |
| `To` | Кінцеве значення |
| `By` | Наскільки змінити відносно початкового (замість `To`) |
| `Duration` | Тривалість. `TimeSpan.FromSeconds(2)` або рядок `"0:0:2"` |
| `BeginTime` | Затримка перед стартом цієї конкретної анімації |
| `SpeedRatio` | Множник швидкості: `2` — удвічі швидше |
| `AutoReverse` | Після завершення програти назад |
| `RepeatBehavior` | `Forever`, `new RepeatBehavior(3)` — 3 рази, `new RepeatBehavior(TimeSpan.FromSeconds(10))` — 10 секунд |
| `FillBehavior` | Що робити після завершення: `HoldEnd` (тримати кінцеве, за замовчуванням) або `Stop` (повернути початкове) |
| `EasingFunction` | Функція згладжування — про неї нижче |

Кілька комбінацій, які варто розрізняти:

```csharp
// 1. Явний старт і фініш: завжди від 0 до 300
var a = new DoubleAnimation { From = 0, To = 300, Duration = TimeSpan.FromSeconds(1) };

// 2. Тільки фініш: від ПОТОЧНОГО значення до 300.
//    Якщо натиснути кнопку двічі, друга анімація підхопить там, де зупинилась перша
var b = new DoubleAnimation { To = 300, Duration = TimeSpan.FromSeconds(1) };

// 3. Відносно: «посунути ще на 50 вправо від того, де зараз»
var c = new DoubleAnimation { By = 50, Duration = TimeSpan.FromSeconds(0.3) };

// 4. AutoReverse + Forever — вічне коливання туди-сюди
var d = new DoubleAnimation
{
    From = 0, To = 300,
    Duration       = TimeSpan.FromSeconds(1),
    AutoReverse    = true,
    RepeatBehavior = RepeatBehavior.Forever
};
```

:::warning[Обережно]
`AutoReverse = true` **подвоює** реальний час: анімація на 1 секунду з поверненням
триває 2 секунди. Якщо кілька анімацій у `Storyboard` мають синхронізуватися
через `BeginTime`, це треба враховувати в розрахунках.
:::

### FillBehavior і чому властивість «залипає»

```csharp
var move = new DoubleAnimation
{
    From = 0, To = 400,
    Duration     = TimeSpan.FromSeconds(1),
    FillBehavior = FillBehavior.HoldEnd    // за замовчуванням
};
```

Після завершення такої анімації прямокутник залишиться на позиції 400 —
і це виглядає логічно. Але насправді властивість `Canvas.Left` **і далі
перебуває під контролем анімації**, просто анімація «завмерла» на кінцевому
значенні. Спроба написати `Canvas.SetLeft(rect, 100)` нічого не дасть.

Вихід один із двох:

```csharp
// Варіант А: зняти анімацію, тоді властивість знову слухається коду
rect.BeginAnimation(Canvas.LeftProperty, null);
Canvas.SetLeft(rect, 100);

// Варіант Б: FillBehavior.Stop — після завершення значення повертається
// до того, яке було до анімації (для «разових» ефектів це те, що треба)
var flash = new DoubleAnimation
{
    From = 1.0, To = 0.3,
    Duration     = TimeSpan.FromSeconds(0.2),
    AutoReverse  = true,
    FillBehavior = FillBehavior.Stop
};
```

## Storyboard

**`Storyboard`** — це контейнер анімацій із власним годинником. Він знає,
які анімації до нього входять, коли кожна починається і як довго триває.
Його можна запустити, поставити на паузу, продовжити, зупинити або перемотати
цілком — усі анімації всередині підкоряються.

Оскільки `Storyboard` — окремий об'єкт, а не частина елемента, йому треба
пояснити **кого** і **що** анімувати. Для цього є дві прикріплені властивості:

```csharp
Storyboard.SetTargetName(animation, "MovingRect");                  // кого
Storyboard.SetTargetProperty(animation, new PropertyPath(Canvas.LeftProperty)); // що
```

```
   Storyboard  (годинник: 0 → 9 сек, Forever)
       │
       ├── DoubleAnimation   TargetName="MovingRect"
       │                     TargetProperty=Canvas.Left      BeginTime=0s
       │
       ├── ColorAnimation    TargetName="RectBrush"
       │                     TargetProperty=Color            BeginTime=1s
       │
       └── DoubleAnimation   TargetName="SpinTransform"
                             TargetProperty=Angle            BeginTime=1s
```

Повний цикл запуску з коду:

```csharp
private void StartMoveAnimation()
{
    // 1. Створюємо анімацію
    var move = new DoubleAnimation
    {
        From           = 0,
        To             = 420,
        Duration       = TimeSpan.FromSeconds(2),
        AutoReverse    = true,
        RepeatBehavior = RepeatBehavior.Forever,
        EasingFunction = new SineEase { EasingMode = EasingMode.EaseInOut }
    };

    // 2. Вказуємо ціль
    Storyboard.SetTargetName(move, "MovingRect");
    Storyboard.SetTargetProperty(move, new PropertyPath(Canvas.LeftProperty));

    // 3. Кладемо в Storyboard
    var story = new Storyboard();
    story.Children.Add(move);

    // 4. Запускаємо, вказавши, ДЕ шукати ім'я "MovingRect"
    story.Begin(this);
}
```

### PropertyPath: три способи вказати властивість

```csharp
// А. Через об'єкт властивості залежності — надійно, помилку зловить компілятор
new PropertyPath(Canvas.LeftProperty)
new PropertyPath(UIElement.OpacityProperty)

// Б. Рядком — коли треба «пройти вглиб» по ланцюжку властивостей
new PropertyPath("Fill.Color")
new PropertyPath("RenderTransform.Angle")

// В. Рядком з індексом — коли всередині TransformGroup кілька перетворень
new PropertyPath("RenderTransform.Children[1].Angle")
```

:::danger[Часта помилка]
Рядковий шлях не перевіряється компілятором. Опечатка в `"Fil.Color"` дасть
не помилку збірки, а тихо непрацюючу анімацію: нічого не рухається,
і жодного повідомлення. Якщо анімація «не працює без причини» — почніть
перевірку саме з рядка `PropertyPath`.
:::

### NameScope: чому Storyboard не знаходить елемент

`Storyboard.SetTargetName` шукає елемент за іменем у **просторі імен**
(`NameScope`) того об'єкта, який ви передали в `Begin`. Усе, що має `x:Name`
у XAML, реєструється в просторі імен свого вікна автоматично — тому
`story.Begin(this)` з вікна працює.

А от елемент, створений у коді, ніде не зареєстрований. Його треба
зареєструвати вручну:

```csharp
private void AnimateDynamicRect()
{
    var rect = new Rectangle
    {
        Width = 80, Height = 80,
        Fill  = new SolidColorBrush(Colors.Tomato)
    };
    Canvas.SetLeft(rect, 20);
    Canvas.SetTop (rect, 20);
    SceneCanvas.Children.Add(rect);

    // ОБОВ'ЯЗКОВО: реєструємо ім'я у просторі імен вікна
    this.RegisterName("DynamicRect", rect);

    var move = new DoubleAnimation
    {
        To       = 400,
        Duration = TimeSpan.FromSeconds(1.5)
    };
    Storyboard.SetTargetName(move, "DynamicRect");
    Storyboard.SetTargetProperty(move, new PropertyPath(Canvas.LeftProperty));

    var story = new Storyboard();
    story.Children.Add(move);
    story.Begin(this);
}
```

:::tip[Порада]
Ім'я не можна зареєструвати двічі — другий виклик `RegisterName` із тим самим
рядком кине виняток. Якщо елементи створюються й видаляються багато разів,
звільняйте ім'я через `this.UnregisterName("DynamicRect")`.

А ще простіше — обійтись без імен зовсім: замість `SetTargetName` є
`Storyboard.SetTarget(animation, rect)`, який приймає сам об'єкт. Тоді
`NameScope` не потрібен узагалі, і `story.Begin()` викликається без аргументів.
:::

### Запуск анімації з XAML

Часто анімація взагалі не потребує C#-коду. `Storyboard` описується у ресурсах,
а запускається **тригером події**:

```xml
<Window x:Class="AnimDemo.TriggerWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Анімація з XAML" Height="300" Width="560"
        Background="#FF0F1724">
    <Canvas>
        <Ellipse x:Name="Ball" Width="70" Height="70"
                 Canvas.Left="30" Canvas.Top="110">
            <Ellipse.Fill>
                <RadialGradientBrush GradientOrigin="0.35,0.3">
                    <GradientStop Color="#FFFFE29A" Offset="0"/>
                    <GradientStop Color="#FFFF6A3D" Offset="1"/>
                </RadialGradientBrush>
            </Ellipse.Fill>
        </Ellipse>

        <Button x:Name="GoButton" Content="Кинути м'яч"
                Canvas.Left="30" Canvas.Top="30" Width="130" Height="32">
            <Button.Triggers>
                <EventTrigger RoutedEvent="Button.Click">
                    <BeginStoryboard>
                        <Storyboard>
                            <DoubleAnimation
                                Storyboard.TargetName="Ball"
                                Storyboard.TargetProperty="(Canvas.Left)"
                                From="30" To="450" Duration="0:0:1.4">
                                <DoubleAnimation.EasingFunction>
                                    <PowerEase EasingMode="EaseIn" Power="1"/>
                                </DoubleAnimation.EasingFunction>
                            </DoubleAnimation>

                            <DoubleAnimation
                                Storyboard.TargetName="Ball"
                                Storyboard.TargetProperty="(Canvas.Top)"
                                From="30" To="200" Duration="0:0:1.4">
                                <DoubleAnimation.EasingFunction>
                                    <BounceEase EasingMode="EaseOut"
                                                Bounces="3" Bounciness="2"/>
                                </DoubleAnimation.EasingFunction>
                            </DoubleAnimation>
                        </Storyboard>
                    </BeginStoryboard>
                </EventTrigger>
            </Button.Triggers>
        </Button>
    </Canvas>
</Window>
```

Жодного рядка C# — м'яч летить по дузі й підстрибує.

Зверніть увагу на дужки: `Storyboard.TargetProperty="(Canvas.Left)"`.
Прикріплені властивості в XAML-шляху беруться в круглі дужки. Без них
анімація не знайде ціль.

| Дія у XAML | Що робить |
|---|---|
| `BeginStoryboard` | Запустити |
| `PauseStoryboard` | Пауза (потрібен `BeginStoryboardName`) |
| `ResumeStoryboard` | Продовжити |
| `StopStoryboard` | Зупинити й скинути |
| `SeekStoryboard` | Перемотати на позицію |

## Типи анімацій

### DoubleAnimation

Найуживаніший тип: анімує будь-яку властивість типу `double` — координати,
розмір, прозорість, кут, масштаб.

```csharp
// Обертання. Анімуємо не сам прямокутник, а його RotateTransform
private void StartRotation()
{
    var spin = new DoubleAnimation
    {
        From           = 0,
        To             = 360,
        Duration       = TimeSpan.FromSeconds(2.5),
        RepeatBehavior = RepeatBehavior.Forever
    };

    Storyboard.SetTargetName(spin, "SpinTransform");
    Storyboard.SetTargetProperty(spin, new PropertyPath(RotateTransform.AngleProperty));

    var story = new Storyboard();
    story.Children.Add(spin);
    story.Begin(this);
}
```

```xml
<Rectangle x:Name="SpinRect" Width="90" Height="90"
           Canvas.Left="200" Canvas.Top="120" Fill="Tomato"
           RenderTransformOrigin="0.5,0.5">
    <Rectangle.RenderTransform>
        <RotateTransform x:Name="SpinTransform"/>
    </Rectangle.RenderTransform>
</Rectangle>
```

Кілька анімацій в одному `Storyboard` виконуються паралельно:

```csharp
private void AnimatePulse()
{
    var story = new Storyboard();

    // Прозорість
    var fade = new DoubleAnimation
    {
        From = 1.0, To = 0.35,
        Duration       = TimeSpan.FromSeconds(1.2),
        AutoReverse    = true,
        RepeatBehavior = RepeatBehavior.Forever
    };
    Storyboard.SetTargetName(fade, "PulseRect");
    Storyboard.SetTargetProperty(fade, new PropertyPath(UIElement.OpacityProperty));

    // Ширина — одночасно з прозорістю
    var grow = new DoubleAnimation
    {
        From = 60, To = 220,
        Duration       = TimeSpan.FromSeconds(1.2),
        AutoReverse    = true,
        RepeatBehavior = RepeatBehavior.Forever
    };
    Storyboard.SetTargetName(grow, "PulseRect");
    Storyboard.SetTargetProperty(grow, new PropertyPath(FrameworkElement.WidthProperty));

    story.Children.Add(fade);
    story.Children.Add(grow);
    story.Begin(this);
}
```

### ColorAnimation

Анімує значення типу `Color`. Тут є важлива тонкість: **анімувати `Fill`
напряму не можна**. `Fill` має тип `Brush`, а `Brush` — це не колір,
а цілий об'єкт. Анімувати треба властивість `Color` всередині кисті.

```xml
<Rectangle x:Name="ColorRect" Width="220" Height="110"
           Canvas.Left="60" Canvas.Top="50" RadiusX="10" RadiusY="10">
    <Rectangle.Fill>
        <!-- кисть має власне ім'я, щоб анімація могла дістатись до Color -->
        <SolidColorBrush x:Name="RectBrush" Color="OrangeRed"/>
    </Rectangle.Fill>
</Rectangle>
```

```csharp
private void OnChangeColor_Click(object sender, RoutedEventArgs e)
{
    var recolor = new ColorAnimation
    {
        To          = Colors.MediumBlue,
        Duration    = TimeSpan.FromSeconds(1.2),
        AutoReverse = true
    };

    Storyboard.SetTargetName(recolor, "RectBrush");
    Storyboard.SetTargetProperty(recolor, new PropertyPath(SolidColorBrush.ColorProperty));

    var story = new Storyboard();
    story.Children.Add(recolor);
    story.Begin(this);
}
```

Якщо імені в кисті немає, до кольору можна дійти шляхом від самої фігури:

```csharp
Storyboard.SetTargetName(recolor, "ColorRect");
Storyboard.SetTargetProperty(recolor, new PropertyPath("Fill.Color"));
```

### PointAnimation

Анімує значення типу `Point` — обидві координати одразу. Найчастіше
застосовується до геометрій.

```xml
<Path Stroke="Cyan" StrokeThickness="2" Fill="#3000FFFF">
    <Path.Data>
        <EllipseGeometry x:Name="MovingCircle"
                         Center="60,60" RadiusX="40" RadiusY="40"/>
    </Path.Data>
</Path>
```

```csharp
var slide = new PointAnimation
{
    From           = new Point(60, 60),
    To             = new Point(380, 210),
    Duration       = TimeSpan.FromSeconds(2),
    AutoReverse    = true,
    RepeatBehavior = RepeatBehavior.Forever,
    EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseInOut }
};

Storyboard.SetTargetName(slide, "MovingCircle");
Storyboard.SetTargetProperty(slide, new PropertyPath(EllipseGeometry.CenterProperty));
```

### ThicknessAnimation

Анімує `Thickness` — тобто `Margin`, `Padding`, `BorderThickness`.
Зручно для «підстрибування» кнопки при наведенні.

```csharp
var nudge = new ThicknessAnimation
{
    From         = new Thickness(0),
    To           = new Thickness(0, -6, 0, 6),
    Duration     = TimeSpan.FromSeconds(0.18),
    AutoReverse  = true,
    FillBehavior = FillBehavior.Stop
};

Storyboard.SetTargetName(nudge, "SubmitButton");
Storyboard.SetTargetProperty(nudge, new PropertyPath(FrameworkElement.MarginProperty));
```

:::warning[Обережно]
Анімація `Margin` змінює компонування, а отже змушує панель перераховувати
розміри всіх сусідів **на кожному кадрі**. Для коротких ефектів це нормально,
для довгих і складних сцен — ні. Той самий візуальний результат дешевше
отримати через `RenderTransform` із `TranslateTransform`.
:::

### Інші типи

Для кожного анімовного типу є свій клас: `Int32Animation`, `SizeAnimation`,
`RectAnimation`, `Vector3DAnimation`, `StringAnimationUsingKeyFrames`
і десяток інших. Правило запам'ятовується легко: `ТипЗначенняAnimation`.

## Повний приклад: анімований світлофор

Класична задача, на якій добре видно роботу `BeginTime`: три вогники,
що загоряються по черзі й зациклюються.

```xml
<Window x:Class="AnimDemo.TrafficLightWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Світлофор" Height="420" Width="300"
        Background="#FF11161F">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <Border Grid.Row="0" Background="#FF20262F" CornerRadius="16"
                Width="110" Padding="18" Margin="0,16,0,0"
                HorizontalAlignment="Center" VerticalAlignment="Center">
            <StackPanel>
                <Ellipse Width="70" Height="70" Margin="0,0,0,12">
                    <Ellipse.Fill>
                        <SolidColorBrush x:Name="RedBrush" Color="#FF3A0F0F"/>
                    </Ellipse.Fill>
                </Ellipse>
                <Ellipse Width="70" Height="70" Margin="0,0,0,12">
                    <Ellipse.Fill>
                        <SolidColorBrush x:Name="YellowBrush" Color="#FF3A340F"/>
                    </Ellipse.Fill>
                </Ellipse>
                <Ellipse Width="70" Height="70">
                    <Ellipse.Fill>
                        <SolidColorBrush x:Name="GreenBrush" Color="#FF0F3A17"/>
                    </Ellipse.Fill>
                </Ellipse>
            </StackPanel>
        </Border>

        <StackPanel Grid.Row="1" Orientation="Horizontal"
                    HorizontalAlignment="Center" Margin="0,16">
            <Button Content="Запустити" Width="110" Margin="4"
                    Click="OnStart_Click"/>
            <Button Content="Зупинити"  Width="110" Margin="4"
                    Click="OnStop_Click"/>
        </StackPanel>
    </Grid>
</Window>
```

```csharp
using System;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace AnimDemo
{
    public partial class TrafficLightWindow : Window
    {
        private Storyboard _trafficStory;

        public TrafficLightWindow() => InitializeComponent();

        private void OnStart_Click(object sender, RoutedEventArgs e)
        {
            _trafficStory?.Stop(this);
            _trafficStory = BuildTrafficStoryboard();
            _trafficStory.Begin(this, isControllable: true);
        }

        private void OnStop_Click(object sender, RoutedEventArgs e)
        {
            // isControllable: true у Begin дозволяє потім зупиняти Storyboard
            _trafficStory?.Stop(this);
        }

        private Storyboard BuildTrafficStoryboard()
        {
            var story = new Storyboard
            {
                Duration       = TimeSpan.FromSeconds(9),
                RepeatBehavior = RepeatBehavior.Forever
            };

            // Локальна функція: вмикає вогник у момент beginAt
            // і гасить його через holdFor секунд
            void AddLight(string brushName, Color bright,
                          double beginAt, double holdFor)
            {
                var turnOn = new ColorAnimation
                {
                    To        = bright,
                    Duration  = TimeSpan.FromSeconds(0.3),
                    BeginTime = TimeSpan.FromSeconds(beginAt)
                };
                Storyboard.SetTargetName(turnOn, brushName);
                Storyboard.SetTargetProperty(turnOn,
                    new PropertyPath(SolidColorBrush.ColorProperty));

                // «Погашений» колір — той самий відтінок, але темний
                var dim = Color.FromRgb((byte)(bright.R / 5),
                                        (byte)(bright.G / 5),
                                        (byte)(bright.B / 5));

                var turnOff = new ColorAnimation
                {
                    To        = dim,
                    Duration  = TimeSpan.FromSeconds(0.3),
                    BeginTime = TimeSpan.FromSeconds(beginAt + holdFor)
                };
                Storyboard.SetTargetName(turnOff, brushName);
                Storyboard.SetTargetProperty(turnOff,
                    new PropertyPath(SolidColorBrush.ColorProperty));

                story.Children.Add(turnOn);
                story.Children.Add(turnOff);
            }

            //             кисть          яскравий колір  старт  тримати
            AddLight("RedBrush",    Colors.Red,      0.0,   3.0);   // 0.0 – 3.0
            AddLight("YellowBrush", Colors.Gold,     3.0,   1.5);   // 3.0 – 4.5
            AddLight("GreenBrush",  Colors.Lime,     4.5,   3.0);   // 4.5 – 7.5
            AddLight("YellowBrush", Colors.Gold,     7.5,   1.5);   // 7.5 – 9.0

            return story;
        }
    }
}
```

```
  Часова шкала циклу (9 секунд)

  0s        3s      4.5s           7.5s      9s
  ├─────────┼───────┼──────────────┼─────────┤
  │ ЧЕРВОНИЙ│ЖОВТИЙ │   ЗЕЛЕНИЙ    │ ЖОВТИЙ  │  → знову з нуля
  └─────────┴───────┴──────────────┴─────────┘
```

:::info[Цікаво]
`BeginTime` задається **на анімації**, а не на `Storyboard`. Це і є головний
інструмент для послідовних сцен: усі анімації стартують одночасно з погляду
коду, але кожна чекає свого моменту за внутрішнім годинником контейнера.
Явно задана `story.Duration` тут обов'язкова — інакше `RepeatBehavior.Forever`
рахував би тривалість циклу по найдовшій анімації, а не по всіх 9 секундах.
:::

## Функції згладжування

Лінійна анімація виглядає механічно: об'єкт рушає з місця миттєво, летить
із постійною швидкістю й так само різко зупиняється. У природі так не буває.

**Функція згладжування** (easing function) змінює залежність «прогрес часу —
прогрес значення». Час іде рівномірно, а значення — ні.

```
   Значення
      1 ┤                    ╭─────     EaseOut: різкий старт,
        │                 ╭──╯          м'яке гальмування
        │              ╭──╯
        │          ╭───╯
        │      ╭───╯
      0 ┼──────╯──────────────────▶ Час
        0                        1

   Значення
      1 ┤                   ╭──         EaseIn: повільний старт,
        │                 ╭─╯           розгін до кінця
        │               ╭─╯
        │            ╭──╯
        │      ╭─────╯
      0 ┼──────╯──────────────────▶ Час
```

Кожна функція має властивість **`EasingMode`** із трьома значеннями:

| `EasingMode` | Де застосовується ефект |
|---|---|
| `EaseIn` | На початку анімації |
| `EaseOut` | У кінці анімації |
| `EaseInOut` | Симетрично: на початку й у кінці |

:::danger[Часта помилка]
Властивість називається **`EasingMode`**, а не `EasinMode`. Опечатка в одну
літеру дає помилку компіляції в C# і помилку розбору XAML під час виконання —
і студенти витрачають на її пошук більше часу, ніж на всю анімацію.

І друге: класу `LinearEase` **не існує**. Лінійна анімація — це просто
анімація **без** `EasingFunction`. Якщо лінійність потрібна явно (наприклад,
у ресурсі, де функція вже задана), беріть `PowerEase` з `Power="1"` —
математично це та сама пряма.
:::

### Що яка функція робить

| Клас | Ефект | Коли брати |
|---|---|---|
| `QuadraticEase` | М'яке прискорення, `t²` | Універсальний вибір за замовчуванням |
| `CubicEase` | Помітніше за квадратичну, `t³` | Коли треба виразніший рух |
| `QuarticEase`, `QuinticEase` | Ще різкіше, `t⁴` і `t⁵` | Драматичні появи |
| `PowerEase` | Довільний степінь через `Power` | Коли треба точно налаштувати |
| `SineEase` | Дуже м'яке, синусоїдальне | Плавні фонові анімації, пульсація |
| `CircleEase` | Різке в кінці, як чверть кола | Механічний рух, важкі об'єкти |
| `ExponentialEase` | Дуже повільно, потім різко | Ефект «вистрілу» |
| `BackEase` | Трохи заходить за межу й повертається | Появи панелей, кнопок |
| `ElasticEase` | Пружинить біля кінцевої точки | Ігрові інтерфейси, привернення уваги |
| `BounceEase` | Підстрибує, як м'яч | Падіння об'єктів, весела анімація |

```csharp
// М'яч, що падає й підстрибує
var drop = new DoubleAnimation
{
    From     = 40,
    To       = 320,
    Duration = TimeSpan.FromSeconds(1.6),
    EasingFunction = new BounceEase
    {
        EasingMode = EasingMode.EaseOut,
        Bounces    = 4,     // скільки разів підстрибнути
        Bounciness = 2.2    // більше число — слабші відскоки
    }
};

// Панель, що «виїжджає» з невеликим перельотом
var slideIn = new DoubleAnimation
{
    From     = -260,
    To       = 0,
    Duration = TimeSpan.FromSeconds(0.45),
    EasingFunction = new BackEase
    {
        EasingMode = EasingMode.EaseOut,
        Amplitude  = 0.35   // наскільки далеко «перелетіти»
    }
};

// Пружина
var springy = new DoubleAnimation
{
    From     = 0,
    To       = 200,
    Duration = TimeSpan.FromSeconds(1.2),
    EasingFunction = new ElasticEase
    {
        EasingMode   = EasingMode.EaseOut,
        Oscillations = 3,    // кількість коливань
        Springiness  = 4     // більше — швидше затухає
    }
};
```

:::tip[Порада]
Універсальне правило інтерфейсів: для **появи** елемента беріть `EaseOut`
(швидко з'явився, м'яко зупинився), для **зникнення** — `EaseIn` (м'яко
рушив, швидко полетів геть). Так рух виглядає природно й не відволікає.
:::

## Анімація за ключовими кадрами

Коли проміжних значень більше двох, пари `From`/`To` замало. Тоді беруть
**ключові кадри**: список «у такий момент значення має бути таким».

Клас називається `ТипЗначенняAnimationUsingKeyFrames`, а всередині —
колекція `KeyFrames`.

```csharp
private void StartRainbow()
{
    var rainbow = new ColorAnimationUsingKeyFrames
    {
        Duration       = TimeSpan.FromSeconds(5),
        RepeatBehavior = RepeatBehavior.Forever
    };

    // KeyTime.FromPercent — частка від загальної тривалості
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Red,     KeyTime.FromPercent(0.00)));
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Gold,    KeyTime.FromPercent(0.25)));
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Lime,    KeyTime.FromPercent(0.50)));
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Cyan,    KeyTime.FromPercent(0.75)));
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Red,     KeyTime.FromPercent(1.00)));

    Storyboard.SetTargetName(rainbow, "RectBrush");
    Storyboard.SetTargetProperty(rainbow, new PropertyPath(SolidColorBrush.ColorProperty));

    var story = new Storyboard();
    story.Children.Add(rainbow);
    story.Begin(this);
}
```

Ключові кадри бувають трьох видів, і це стосується всіх типів анімацій:

| Префікс | Як переходить до наступного значення |
|---|---|
| `Linear…KeyFrame` | Рівномірно, по прямій |
| `Discrete…KeyFrame` | Стрибком, у момент кадру (без проміжних значень) |
| `Spline…KeyFrame` | По кривій Безьє, задається через `KeySpline` |

Дискретні кадри зручні для «миготіння» або покрокової зміни тексту:

```csharp
var countdown = new StringAnimationUsingKeyFrames
{
    Duration = TimeSpan.FromSeconds(3)
};
countdown.KeyFrames.Add(new DiscreteStringKeyFrame("3", KeyTime.FromTimeSpan(TimeSpan.FromSeconds(0))));
countdown.KeyFrames.Add(new DiscreteStringKeyFrame("2", KeyTime.FromTimeSpan(TimeSpan.FromSeconds(1))));
countdown.KeyFrames.Add(new DiscreteStringKeyFrame("1", KeyTime.FromTimeSpan(TimeSpan.FromSeconds(2))));
countdown.KeyFrames.Add(new DiscreteStringKeyFrame("Старт!", KeyTime.FromTimeSpan(TimeSpan.FromSeconds(3))));

Storyboard.SetTargetName(countdown, "CountdownText");
Storyboard.SetTargetProperty(countdown, new PropertyPath(TextBlock.TextProperty));
```

## DispatcherTimer: коли Storyboard недостатньо

`Storyboard` знає кінцеве значення **наперед**. Він чудовий, коли рух
описується формулою «з точки А в точку Б». Але є задачі, де наступний стан
залежить від поточного, або обчислюється алгоритмом:

- малювати криву поступово, точка за точкою;
- ігровий цикл: перевірити зіткнення, оновити позиції, нарахувати очки;
- фізична симуляція, де швидкість змінюється від сил;
- годинник, що щосекунди читає системний час.

Для цього є **`DispatcherTimer`** — таймер, який викликає ваш обробник
у потоці інтерфейсу через заданий інтервал. «У потоці інтерфейсу» тут
ключове: всередині обробника можна безпечно міняти елементи, чого звичайний
`System.Timers.Timer` не дозволяє.

```csharp
using System.Windows.Threading;

private DispatcherTimer _timer;

private void StartLoop()
{
    _timer = new DispatcherTimer
    {
        Interval = TimeSpan.FromMilliseconds(16)   // приблизно 60 кадрів на секунду
    };
    _timer.Tick += OnTick;
    _timer.Start();
}

private void OnTick(object sender, EventArgs e)
{
    // Один крок анімації
}

private void StopLoop()
{
    if (_timer is not null)
    {
        _timer.Tick -= OnTick;    // відписуємось, щоб не було подвійних викликів
        _timer.Stop();
        _timer = null;
    }
}
```

:::info[Цікаво]
Інтервал і частота кадрів:

- 16 мс — приблизно 60 кадрів на секунду, стандарт для плавного руху;
- 33 мс — 30 кадрів, вже помітно «дешевше»;
- 100 мс — 10 кадрів, рух виглядає ривками.

`DispatcherTimer` не дає гарантованої точності: якщо обробник не встиг
виконатись за 16 мс, наступний тік просто відкладеться. Тому в іграх
і симуляціях час між кадрами вимірюють через `Stopwatch`, а не вважають
його рівним інтервалу.
:::

### Покрокове малювання кривої

Тепер зберемо все разом — застосунок, який малює математичні криві
з попереднього підрозділу **поступово**, наче невидимий олівець.

Ключове архітектурне рішення: **два окремих контейнери**. Панель керування
живе у своїй частині `Grid`, а полотно для малювання — у своїй.

```
   ┌─ Вікно ───────────────────────────────────────────┐
   │ ┌──────────────┐ ┌──────────────────────────────┐ │
   │ │ ControlPanel │ │  DrawCanvas                  │ │
   │ │              │ │                              │ │
   │ │ [ Серце    ] │ │      ╭─╮   ╭─╮               │ │
   │ │ [ Спірограф] │ │     ╱   ╲ ╱   ╲              │ │
   │ │ [ Роза     ] │ │    │     ▼     │             │ │
   │ │ [ Стоп     ] │ │     ╲         ╱              │ │
   │ │ [ Очистити ] │ │       ╲     ╱                │ │
   │ │              │ │         ╲ ╱                  │ │
   │ │ Швидкість    │ │          ▼                   │ │
   │ │ ▬▬▬●▬▬▬▬     │ │                              │ │
   │ └──────────────┘ └──────────────────────────────┘ │
   │   НЕ чіпаємо       DrawCanvas.Children.Clear()    │
   │   при очищенні     безпечно — тут лише крива      │
   └───────────────────────────────────────────────────┘
```

:::danger[Часта помилка]
Спокуслива схема — покласти кнопки прямо на `Canvas`, бо `Canvas` дозволяє
розмістити їх у будь-якому місці. А потім написати `MainCanvas.Children.Clear()`
перед новим малюнком — і разом із кривою зникнуть **усі кнопки застосунку**.
Вікно стає порожнім, натиснути нема на що, залишається тільки закрити програму.

Правило: полотно для малювання завжди окреме. Усе, що не є малюнком, живе
за його межами.
:::

```xml
<Window x:Class="AnimDemo.CurveDrawerWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Покрокове малювання кривих" Height="620" Width="940"
        Background="#FF0A0E17">
    <Grid>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="210"/>
            <ColumnDefinition Width="*"/>
        </Grid.ColumnDefinitions>

        <!-- Панель керування: ОКРЕМО від полотна -->
        <Border Grid.Column="0" Background="#FF141B27" Padding="14">
            <StackPanel>
                <TextBlock Text="Криві" Foreground="White"
                           FontSize="16" FontWeight="SemiBold" Margin="0,0,0,12"/>

                <Button Content="Серце"        Margin="0,4" Height="30" Click="OnHeart_Click"/>
                <Button Content="Спірограф"    Margin="0,4" Height="30" Click="OnSpiro_Click"/>
                <Button Content="Роза"         Margin="0,4" Height="30" Click="OnRose_Click"/>
                <Button Content="Ліссажу"      Margin="0,4" Height="30" Click="OnLissajous_Click"/>

                <Separator Margin="0,14" Background="#FF2A3446"/>

                <TextBlock Text="Швидкість" Foreground="#FF8E9AAE" Margin="0,0,0,4"/>
                <Slider x:Name="SpeedSlider" Minimum="1" Maximum="30" Value="8"/>

                <Separator Margin="0,14" Background="#FF2A3446"/>

                <Button Content="Стоп"     Margin="0,4" Height="30" Click="OnStop_Click"/>
                <Button Content="Очистити" Margin="0,4" Height="30" Click="OnClear_Click"/>

                <TextBlock x:Name="StatusText" Foreground="#FF8E9AAE"
                           FontSize="11" TextWrapping="Wrap" Margin="0,18,0,0"
                           Text="Оберіть криву"/>
            </StackPanel>
        </Border>

        <!-- Полотно: тут і ТІЛЬКИ тут живе малюнок -->
        <Canvas Grid.Column="1" x:Name="DrawCanvas"
                Background="#FF0E1421" ClipToBounds="True"/>
    </Grid>
</Window>
```

```csharp
using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using System.Windows.Threading;

namespace AnimDemo
{
    public partial class CurveDrawerWindow : Window
    {
        private DispatcherTimer _timer;
        private Polyline        _activeLine;
        private Point[]         _points;
        private int             _index;

        public CurveDrawerWindow() => InitializeComponent();

        // ---------- Обробники кнопок ----------

        private void OnHeart_Click(object sender, RoutedEventArgs e)
        {
            double cx    = DrawCanvas.ActualWidth  / 2;
            double cy    = DrawCanvas.ActualHeight / 2;
            double scale = Math.Min(DrawCanvas.ActualWidth,
                                    DrawCanvas.ActualHeight) / 40;

            StartDrawing(ComputeHeart(cx, cy, scale, 700),
                         Colors.HotPink, 2.5, "Крива серця");
        }

        private void OnSpiro_Click(object sender, RoutedEventArgs e)
        {
            double cx = DrawCanvas.ActualWidth  / 2;
            double cy = DrawCanvas.ActualHeight / 2;

            StartDrawing(ComputeSpirograph(cx, cy, R: 120, r: 45, d: 120),
                         Colors.Cyan, 1.5, "Спірограф 120/45/120");
        }

        private void OnRose_Click(object sender, RoutedEventArgs e)
        {
            double cx = DrawCanvas.ActualWidth  / 2;
            double cy = DrawCanvas.ActualHeight / 2;

            StartDrawing(ComputeRose(cx, cy, amplitude: 170, k: 5, steps: 1600),
                         Colors.Gold, 2, "Роза, 5 пелюсток");
        }

        private void OnLissajous_Click(object sender, RoutedEventArgs e)
        {
            double cx = DrawCanvas.ActualWidth  / 2;
            double cy = DrawCanvas.ActualHeight / 2;

            StartDrawing(ComputeLissajous(cx, cy, 220, 160, 3, 2,
                                          Math.PI / 2, 2000),
                         Colors.MediumSpringGreen, 2, "Фігура Ліссажу 3:2");
        }

        private void OnStop_Click(object sender, RoutedEventArgs e)
        {
            StopTimer();
            StatusText.Text = "Зупинено.";
        }

        private void OnClear_Click(object sender, RoutedEventArgs e)
        {
            StopTimer();
            // Очищаємо ЛИШЕ полотно — кнопки й повзунок живуть в іншій колонці
            DrawCanvas.Children.Clear();
            StatusText.Text = "Полотно очищено.";
        }

        // ---------- Керування таймером ----------

        private void StartDrawing(Point[] points, Color color,
                                  double thickness, string title)
        {
            StopTimer();
            DrawCanvas.Children.Clear();

            _activeLine = new Polyline
            {
                Stroke           = new SolidColorBrush(color),
                StrokeThickness  = thickness,
                StrokeLineJoin   = PenLineJoin.Round,
                IsHitTestVisible = false
            };
            DrawCanvas.Children.Add(_activeLine);

            _points = points;
            _index  = 0;

            _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(16) };
            _timer.Tick += OnTick;
            _timer.Start();

            StatusText.Text = $"Малюємо: {title}\nТочок: {points.Length}";
        }

        private void OnTick(object sender, EventArgs e)
        {
            if (_index >= _points.Length)
            {
                StopTimer();
                StatusText.Text = StatusText.Text.Replace("Малюємо:", "Готово:");
                return;
            }

            // За один тік додаємо пачку точок — швидкість регулює повзунок
            int batch = Math.Max(1, (int)SpeedSlider.Value);

            for (int i = 0; i < batch && _index < _points.Length; i++)
            {
                _activeLine.Points.Add(_points[_index]);
                _index++;
            }
        }

        private void StopTimer()
        {
            if (_timer is null) return;

            _timer.Stop();
            _timer.Tick -= OnTick;
            _timer = null;
        }

        // ---------- Обчислення точок ----------

        private static Point[] ComputeHeart(double cx, double cy,
                                            double scale, int steps)
        {
            var pts = new Point[steps + 1];
            for (int i = 0; i <= steps; i++)
            {
                double t = 2 * Math.PI * i / steps;
                double x = 16 * Math.Pow(Math.Sin(t), 3);
                double y = 13 * Math.Cos(t) - 5 * Math.Cos(2 * t)
                         -  2 * Math.Cos(3 * t) -   Math.Cos(4 * t);

                pts[i] = new Point(cx + x * scale, cy - y * scale);
            }
            return pts;
        }

        private static Point[] ComputeSpirograph(double cx, double cy,
                                                 double R, double r, double d)
        {
            int    g     = Gcd((int)R, (int)r);
            double turns = r / g;
            double tMax  = 2 * Math.PI * turns;
            int    steps = (int)(turns * 600);

            var pts = new Point[steps + 1];
            for (int i = 0; i <= steps; i++)
            {
                double t = tMax * i / steps;
                double x = (R - r) * Math.Cos(t) + d * Math.Cos((R - r) / r * t);
                double y = (R - r) * Math.Sin(t) - d * Math.Sin((R - r) / r * t);

                pts[i] = new Point(cx + x, cy - y);
            }
            return pts;
        }

        private static Point[] ComputeRose(double cx, double cy,
                                           double amplitude, int k, int steps)
        {
            var pts = new Point[steps + 1];
            for (int i = 0; i <= steps; i++)
            {
                double theta = 2 * Math.PI * i / steps;
                double rad   = amplitude * Math.Cos(k * theta);

                pts[i] = new Point(cx + rad * Math.Cos(theta),
                                   cy - rad * Math.Sin(theta));
            }
            return pts;
        }

        private static Point[] ComputeLissajous(double cx, double cy,
                                                double ampX, double ampY,
                                                double freqX, double freqY,
                                                double phase, int steps)
        {
            var pts = new Point[steps + 1];
            for (int i = 0; i <= steps; i++)
            {
                double t = 2 * Math.PI * i / steps;
                pts[i] = new Point(cx + ampX * Math.Sin(freqX * t + phase),
                                   cy - ampY * Math.Sin(freqY * t));
            }
            return pts;
        }

        private static int Gcd(int a, int b) => b == 0 ? a : Gcd(b, a % b);
    }
}
```

Зверніть увагу на три деталі, які роблять цей код правильним.

**Точки рахуються заздалегідь**, а таймер лише додає їх до `Polyline`.
Обчислення тригонометрії всередині `Tick` — зайва робота на кожному кадрі.

**`StopTimer` відписується від події.** Якщо цього не робити, а просто
викликати `Stop()`, кожен новий запуск додасть ще один обробник до того самого
таймера — і крива почне малюватися вдвічі, втричі, вчетверо швидше без
видимої причини.

**`DrawCanvas.Children.Clear()` безпечний**, бо на `DrawCanvas` немає нічого,
крім намальованого.

### Комбінація: намалювали таймером, підсвітили Storyboard

Два підходи чудово поєднуються. Таймер малює криву, а коли він закінчив —
запускається `Storyboard`, який переливає її кольорами:

```csharp
private void AnimateFinishedCurve()
{
    var brush = new SolidColorBrush(Colors.Cyan);
    _activeLine.Stroke = brush;

    // Прив'язуємо анімацію напряму до об'єкта — NameScope не потрібен
    var rainbow = new ColorAnimationUsingKeyFrames
    {
        Duration       = TimeSpan.FromSeconds(4),
        RepeatBehavior = RepeatBehavior.Forever
    };
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Cyan,    KeyTime.FromPercent(0.00)));
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Magenta, KeyTime.FromPercent(0.33)));
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Gold,    KeyTime.FromPercent(0.67)));
    rainbow.KeyFrames.Add(new LinearColorKeyFrame(Colors.Cyan,    KeyTime.FromPercent(1.00)));

    brush.BeginAnimation(SolidColorBrush.ColorProperty, rainbow);
}
```

## Storyboard проти DispatcherTimer

| | `Storyboard` | `DispatcherTimer` |
|---|---|---|
| Що описуєте | Результат: «з А в Б за 2 секунди» | Процес: «що робити на кожному кроці» |
| Хто рахує проміжні значення | Платформа | Ви |
| Синхронізація з кадрами | Так, керує система рендерингу | Ні, приблизна |
| Функції згладжування | Вбудовані | Писати самому |
| Пауза, перемотка, реверс | Готові методи | Писати самому |
| Наступний стан залежить від поточного | Ні | Так, це його сильна сторона |
| Ігровий цикл, фізика, зіткнення | Не підходить | Так |
| Малювання «по одній точці» | Незручно | Природно |
| Витрати | Мінімальні | Ваш код виконується щокадрово |
| Типове застосування | Інтерфейс: появи, підсвітки, переходи | Алгоритмічна анімація, симуляції, годинник |

Правило вибору просте: **якщо ви знаєте кінцеве значення — беріть
`Storyboard`. Якщо ви його рахуєте на кожному кроці — `DispatcherTimer`.**

## Типові помилки

**`EasinMode` замість `EasingMode`.** Опечатка в одну літеру. Компілятор
скаже про неї в C#, але в XAML помилка вилізе лише під час запуску.

**Спроба використати `LinearEase`.** Такого класу немає. Лінійна анімація —
це відсутність `EasingFunction`.

**Анімація `Fill` замість `Fill.Color`.** `ColorAnimation` не може анімувати
властивість типу `Brush`. Дайте кисті `x:Name` і анімуйте її `Color`.

**Забутий `RegisterName` для елемента з коду.** `Storyboard.SetTargetName`
не знайде об'єкт, якого немає в просторі імен, і анімація тихо нічого
не зробить. Або реєструйте ім'я, або використовуйте `Storyboard.SetTarget`.

**Присвоєння властивості під час анімації.** Поки анімація активна
(або завмерла у `HoldEnd`), вона перебиває код. Спочатку `BeginAnimation(prop, null)`,
потім присвоєння.

**Таймер без відписки від `Tick`.** Кожен новий запуск додає ще один обробник.
Анімація прискорюється з кожним натисканням кнопки — і причину знайти важко.

**Кнопки на тому самому `Canvas`, що й малюнок.** Перший же
`Children.Clear()` знищить інтерфейс. Полотно для малювання — завжди окреме.
