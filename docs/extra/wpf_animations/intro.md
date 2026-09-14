---
sidebar_position: 1
---

# Введення у WPF та систему анімацій

## Що таке WPF

**Windows Presentation Foundation (WPF)** — це сучасна технологія для створення настільних застосунків на платформі .NET. На відміну від Windows Forms, яка використовує GDI+ для малювання елементів управління, WPF побудований на основі **DirectX** і надає потужну систему графіки, анімацій та стилів.

Головні відмінності WPF від Windows Forms:

| Характеристика | Windows Forms | WPF |
|---|---|---|
| Мова розмітки | Немає (тільки C#) | XAML + C# |
| Система малювання | GDI+ | DirectX (апаратне прискорення) |
| Анімації | Вручну через `Timer` | Декларативно через `Storyboard` |
| Масштабування | Піксельне (нечітке при масштабуванні) | Векторне (чітке будь-якого розміру) |
| Прив'язка даних | Обмежена | Потужна (MVVM) |

## Структура WPF-проекту

При створенні нового WPF-проекту у Visual Studio ви отримаєте два основних файли для головного вікна:

**`MainWindow.xaml`** — декларативний опис інтерфейсу:
```xml
<Window x:Class="WpfAnimations.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="WPF Анімації" Height="500" Width="700">
    <Grid>
        <!-- Тут розміщуємо елементи -->
    </Grid>
</Window>
```

**`MainWindow.xaml.cs`** — код-позаду (code-behind):
```csharp
public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
```

## Система анімацій WPF: загальна концепція

В WPF анімація — це **плавна зміна значення властивості** певного об'єкта з плином часу. Уявіть, що ви хочете плавно змінити колір кнопки з червоного на синій за 2 секунди. WPF сам обчислить усі проміжні кольори між ними.

### Ключові класи системи анімацій

```
Storyboard (контейнер)
    └── Animation (власне анімація)
            ├── ColorAnimation       — плавна зміна кольору
            ├── DoubleAnimation      — плавна зміна числа (double)
            ├── PointAnimation       — плавна зміна точки
            ├── ThicknessAnimation   — плавна зміна відступів
            └── ...та інші
```

**`Storyboard`** — це контейнер, який керує однією або кількома анімаціями. Він знає *коли* запустити кожну анімацію, *скільки* вона триває і *скільки разів* повторюється.

**`Animation`** — безпосередня анімація конкретної властивості. Вказує початкове і кінцеве значення, тривалість та режим повторення.

### Прив'язка анімації до властивості

Щоб WPF знав, *яку саме властивість* якого *конкретного об'єкта* анімувати, використовуються два прикріплені властивості:

```csharp
Storyboard.SetTargetName(animation, "myRectangle"); // ім'я об'єкта
Storyboard.SetTargetProperty(animation,
    new PropertyPath("Fill.Color"));               // шлях до властивості
```

### Повний цикл запуску анімації

```csharp
// 1. Створюємо анімацію
var anim = new ColorAnimation
{
    From = Colors.Red,
    To   = Colors.Blue,
    Duration = TimeSpan.FromSeconds(2)
};

// 2. Прив'язуємо до об'єкта та властивості
Storyboard.SetTargetName(anim, "myRect");
Storyboard.SetTargetProperty(anim, new PropertyPath("Fill.Color"));

// 3. Вкладаємо в Storyboard
var sb = new Storyboard();
sb.Children.Add(anim);

// 4. Реєструємо Storyboard у NameScope
sb.Begin(this); // this = вікно, яке є коренем NameScope
```

## Важлива концепція: NameScope

WPF використовує **NameScope** для пошуку об'єктів за іменем. Коли ви пишете `x:Name="myRect"` у XAML або `RegisterName("myRect", myRect)` у C#, ви реєструєте об'єкт у NameScope поточного вікна. Без цього `Storyboard` не зможе знайти ціль анімації.

```csharp
// Реєстрація у C#-коді
var rect = new Rectangle { Fill = new SolidColorBrush(Colors.Red) };
this.RegisterName("myRect", rect);
```

## Перший приклад: мигаючий прямокутник

Створімо простий приклад — прямокутник, який плавно змінює прозорість (мигає).

**XAML:**
```xml
<Canvas x:Name="MainCanvas">
    <Rectangle x:Name="BlinkRect"
               Width="100" Height="100"
               Canvas.Left="50" Canvas.Top="50"
               Fill="CornflowerBlue"/>
</Canvas>
```

**C#:**
```csharp
private void StartBlinkAnimation()
{
    var anim = new DoubleAnimation
    {
        From           = 1.0,   // повністю видимий
        To             = 0.0,   // повністю прозорий
        Duration       = TimeSpan.FromSeconds(0.8),
        AutoReverse    = true,  // анімація іде назад (0→1)
        RepeatBehavior = RepeatBehavior.Forever
    };

    Storyboard.SetTargetName(anim, "BlinkRect");
    Storyboard.SetTargetProperty(anim, new PropertyPath(UIElement.OpacityProperty));

    var sb = new Storyboard();
    sb.Children.Add(anim);
    sb.Begin(this);
}
```

Властивість `AutoReverse = true` змушує анімацію грати вперед, а потім у зворотному напрямку. `RepeatBehavior.Forever` повторює її нескінченно.

## Режими повторення та прискорення

WPF підтримує **easing functions** — функції, що контролюють, як змінюється значення з часом (не обов'язково лінійно):

```csharp
var anim = new DoubleAnimation
{
    From = 0, To = 300,
    Duration = TimeSpan.FromSeconds(1),
    EasingFunction = new BounceEase { Bounces = 3, EasinMode = EasingMode.EaseOut }
};
```

Популярні easing functions:

| Клас | Ефект |
|---|---|
| `LinearEase` | Рівномірно (за замовчуванням) |
| `SineEase` | Плавне прискорення/сповільнення |
| `BounceEase` | Ефект м'яча, що підстрибує |
| `ElasticEase` | Пружний ефект |
| `QuadraticEase` | Квадратична крива |

---

Тепер, маючи базове розуміння системи анімацій WPF, розглянемо конкретні типи анімацій детальніше.
