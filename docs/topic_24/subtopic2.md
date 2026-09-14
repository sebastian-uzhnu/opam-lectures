---
sidebar_position: 3
---

# Конвертери та валідація

## Джерело каже «true», а інтерфейсу потрібен колір

Прив'язка вміє одне: узяти значення з джерела й покласти в ціль. Але типи
на двох кінцях збігаються далеко не завжди.

У моделі замовлення є властивість `IsPaid` типу `bool`. На екрані ми хочемо:

- зелену галочку, якщо оплачено, і червоний хрестик, якщо ні;
- показати панель «Реквізити для оплати» тільки для неоплачених;
- підсвітити рядок жовтим, якщо сума перевищує 10 000.

Жодне з цих завдань прив'язка сама не розв'яже: `Border.Background` хоче
`Brush`, `StackPanel.Visibility` хоче `Visibility`, а джерело дає `bool`
і `decimal`.

Спокуса — додати в модель властивість `public Brush PaidBrush`. Так робити
не можна: модель почне залежати від `System.Windows.Media`, тобто від
інтерфейсу. Модель має лишатися чистою.

Правильна відповідь — **конвертер значень**: маленький клас-перекладач, який
стоїть посеред прив'язки і перетворює тип джерела на тип цілі.

```
   ДЖЕРЕЛО                КОНВЕРТЕР                    ЦІЛЬ

   IsPaid = true  ──▶  Convert(true)  ──▶  Brushes.Green  ──▶  Border.Background
                  ◀──  ConvertBack()  ◀──                 ◀──
                       (для TwoWay)
```

## Інтерфейс IValueConverter

Конвертер — це клас, що реалізує **`IValueConverter`** з простору імен
`System.Windows.Data`. Методів рівно два:

```csharp
public interface IValueConverter
{
    object Convert(object value, Type targetType,
                   object parameter, CultureInfo culture);

    object ConvertBack(object value, Type targetType,
                       object parameter, CultureInfo culture);
}
```

Параметри:

| Параметр | Що це |
|---|---|
| `value` | значення з джерела (для `ConvertBack` — з цілі) |
| `targetType` | тип, який очікує ціль |
| `parameter` | необов'язковий параметр із XAML (`ConverterParameter=...`) |
| `culture` | культура, за якою форматувати числа й дати |

`Convert` викликається, коли значення йде з джерела до цілі.
`ConvertBack` — у зворотному напрямку, тобто **тільки для `TwoWay`
і `OneWayToSource`**. Для `OneWay` його не викличуть ніколи, і там достатньо
кинути `NotSupportedException`.

Щоб використати конвертер у XAML, його потрібно:

1. оголосити простір імен проєкту;
2. створити екземпляр у ресурсах і дати йому ключ;
3. вказати у прив'язці `Converter={StaticResource ключ}`.

## Конвертер 1: bool у Visibility

Найчастіший випадок. У WPF є вбудований `BooleanToVisibilityConverter`,
і для половини задач його вистачає. Але він жорсткий: `true` завжди дає
`Visible`, `false` завжди дає `Collapsed`. А в житті постійно потрібно навпаки
(«показати попередження, коли **не** оплачено») або `Hidden` замість
`Collapsed` (щоб елемент зник, але місце під нього лишилось).

Напишемо свій, з двома перемикачами через `ConverterParameter`:

```csharp
using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace ConvertersDemo;

/// <summary>
/// bool у Visibility.
/// ConverterParameter="Invert"  — перевернути логіку.
/// ConverterParameter="Hidden"  — ховати через Hidden, а не Collapsed.
/// ConverterParameter="Invert,Hidden" — обидва режими.
/// </summary>
public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType,
                          object parameter, CultureInfo culture)
    {
        var flag = value is bool b && b;

        var options = parameter as string ?? "";
        if (options.Contains("Invert", StringComparison.OrdinalIgnoreCase))
            flag = !flag;

        var hiddenMode = options.Contains("Hidden", StringComparison.OrdinalIgnoreCase);

        if (flag)
            return Visibility.Visible;

        return hiddenMode ? Visibility.Hidden : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType,
                              object parameter, CultureInfo culture)
    {
        // Зворотне перетворення для видимості практично не потрібне
        throw new NotSupportedException(
            "BoolToVisibilityConverter працює лише в режимі OneWay.");
    }
}
```

Реєстрація у ресурсах вікна і використання:

```xml
<Window x:Class="ConvertersDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:ConvertersDemo"
        Title="Замовлення" Height="260" Width="420">

    <Window.Resources>
        <local:BoolToVisibilityConverter x:Key="BoolToVisibility"/>
    </Window.Resources>

    <StackPanel Margin="16">

        <CheckBox x:Name="PaidCheck" Content="Замовлення оплачено"
                  IsChecked="{Binding IsPaid}"/>

        <TextBlock Text="Дякуємо, оплату отримано!"
                   Foreground="Green" Margin="0,12,0,0"
                   Visibility="{Binding IsPaid,
                                Converter={StaticResource BoolToVisibility}}"/>

        <Border BorderBrush="OrangeRed" BorderThickness="1" Padding="8" Margin="0,12,0,0"
                Visibility="{Binding IsPaid,
                             Converter={StaticResource BoolToVisibility},
                             ConverterParameter=Invert}">
            <StackPanel>
                <TextBlock Text="Реквізити для оплати" FontWeight="Bold"/>
                <TextBlock Text="IBAN UA00 0000 0000 0000 0000 0000 000"/>
            </StackPanel>
        </Border>

    </StackPanel>
</Window>
```

Один конвертер обслуговує обидва напрямки логіки. Якби ми користувались
вбудованим, довелося б заводити в моделі ще й властивість `IsNotPaid` —
дублювання, яке рано чи пізно розсинхронізується.

:::tip Порада
Якщо конвертер використовується у кількох вікнах, оголошуйте його не в ресурсах
вікна, а в `App.xaml` у секції `Application.Resources`. Тоді ключ
`BoolToVisibility` буде доступний усюди, і копіювати оголошення не доведеться.
:::

## Конвертер 2: число у колір за порогом

Другий класичний випадок: підсвітити значення залежно від того, чи воно
перевищує норму. Поріг зробимо параметром, щоб конвертер був універсальним.

```csharp
using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace ConvertersDemo;

/// <summary>
/// Число у пензель: менше порогу — звичайний колір, більше — попереджувальний.
/// Поріг передається через ConverterParameter, наприклад ConverterParameter=10000
/// </summary>
public class AmountToBrushConverter : IValueConverter
{
    public Brush NormalBrush { get; set; } = Brushes.Black;
    public Brush WarningBrush { get; set; } = Brushes.OrangeRed;

    public object Convert(object value, Type targetType,
                          object parameter, CultureInfo culture)
    {
        // value може прийти як decimal, double або int — зводимо до decimal
        decimal amount;
        if (value is decimal d)
            amount = d;
        else if (value is double dbl)
            amount = (decimal)dbl;
        else if (value is int i)
            amount = i;
        else
            return NormalBrush;          // невідомий тип — не фарбуємо

        var threshold = 0m;
        if (parameter is string text)
            decimal.TryParse(text, NumberStyles.Any,
                             CultureInfo.InvariantCulture, out threshold);

        return amount > threshold ? WarningBrush : NormalBrush;
    }

    public object ConvertBack(object value, Type targetType,
                              object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}
```

Зверніть увагу: у конвертера є **власні властивості** (`NormalBrush`,
`WarningBrush`). Їх можна задати прямо в оголошенні ресурсу — це набагато
гнучкіше, ніж зашивати кольори в код:

```xml
<Window.Resources>
    <local:AmountToBrushConverter x:Key="AmountToBrush"
                                  NormalBrush="DarkSlateGray"
                                  WarningBrush="Crimson"/>
</Window.Resources>

<TextBlock Text="{Binding TotalAmount, StringFormat={}{0:N2} грн}"
           FontWeight="Bold"
           Foreground="{Binding TotalAmount,
                        Converter={StaticResource AmountToBrush},
                        ConverterParameter=10000}"/>
```

:::warning Обережно
`ConverterParameter` — **не** прив'язка. Це статичний рядок з XAML, він не може
бути `{Binding ...}` і не оновлюється під час роботи. Якщо поріг має братися
з даних, потрібен `IMultiValueConverter` (нижче) або обчислювана властивість
у моделі подання.
:::

## Конвертер 3: дата у «сьогодні / вчора / дд.MM.yyyy»

Те, що ви бачите в кожному месенджері. Чистий `StringFormat` так не вміє —
тут потрібна логіка.

```csharp
using System;
using System.Globalization;
using System.Windows.Data;

namespace ConvertersDemo;

/// <summary>
/// DateTime у людський текст: «Сьогодні, 14:30», «Вчора, 09:05», «12.03.2026».
/// </summary>
public class FriendlyDateConverter : IValueConverter
{
    public object Convert(object value, Type targetType,
                          object parameter, CultureInfo culture)
    {
        if (value is not DateTime moment)
            return "";

        var today = DateTime.Today;
        var day = moment.Date;

        if (day == today)
            return $"Сьогодні, {moment:HH:mm}";

        if (day == today.AddDays(-1))
            return $"Вчора, {moment:HH:mm}";

        if (day == today.AddDays(1))
            return $"Завтра, {moment:HH:mm}";

        // Цього року рік не пишемо — він і так зрозумілий
        if (day.Year == today.Year)
            return moment.ToString("d MMMM", culture);

        return moment.ToString("dd.MM.yyyy", culture);
    }

    public object ConvertBack(object value, Type targetType,
                              object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}
```

**Вивід** для чотирьох різних дат (сьогодні 14 вересня 2026):

```
14.09.2026 14:30  →  Сьогодні, 14:30
13.09.2026 09:05  →  Вчора, 09:05
02.03.2026 18:00  →  2 березня
17.11.2025 08:20  →  17.11.2025
```

## IMultiValueConverter: коли значень кілька

Якщо результат залежить не від одного, а від кількох джерел, потрібен
**`IMultiValueConverter`** і `MultiBinding`. Метод `Convert` отримує масив
значень у тому порядку, у якому перелічені прив'язки.

```csharp
using System;
using System.Globalization;
using System.Windows.Data;

namespace ConvertersDemo;

/// Складає ім'я та прізвище в одне поле.
public class FullNameConverter : IMultiValueConverter
{
    public object Convert(object[] values, Type targetType,
                          object parameter, CultureInfo culture)
    {
        var first = values.Length > 0 ? values[0] as string ?? "" : "";
        var last  = values.Length > 1 ? values[1] as string ?? "" : "";
        return $"{last} {first}".Trim();
    }

    public object[] ConvertBack(object value, Type targetTypes,
                                object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}
```

```xml
<TextBlock FontSize="16">
    <TextBlock.Text>
        <MultiBinding Converter="{StaticResource FullName}">
            <Binding Path="FirstName"/>
            <Binding Path="LastName"/>
        </MultiBinding>
    </TextBlock.Text>
</TextBlock>
```

Типовий інший приклад: кнопка «Зберегти», активна лише тоді, коли заповнені
**обидва** поля — `MultiBinding` на `IsEnabled` з конвертером «усі непорожні».

## Коли конвертер — це помилка

Конвертер зручний, і тому ним зловживають. Ознаки того, що ви пішли
не тим шляхом:

| Ситуація | Правильне рішення |
|---|---|
| Конвертер рахує суму, знижку, залишок | обчислювана властивість у моделі подання |
| Конвертер ходить у базу або читає файл | сервіс, який викликає модель подання |
| Конвертер потребує двох-трьох `ConverterParameter` | обчислювана властивість |
| Конвертер повертає різний текст залежно від бізнес-правил | властивість у моделі подання |
| Конвертер `bool` у `Visibility`, `enum` у колір, форматування дати | конвертер — саме те, що треба |

Межа проходить так: **конвертер відповідає за подання, а не за зміст**.
Перетворити наявне значення на візуальну форму — його робота. Вирішити,
яким має бути значення, — робота моделі подання.

Приклад, який вирішує все. Замість конвертера «чи прострочено замовлення»
з трьома параметрами напишіть у моделі подання:

```csharp
public bool IsOverdue => !IsPaid && DueDate < DateTime.Today;
```

і прив'яжіться до `IsOverdue` через простенький `BoolToVisibility`. Читається
краще, тестується без WPF узагалі.

## Валідація: три підходи

Друга половина теми. Користувач вводить у поле «Ціна» текст «абв» або
від'ємне число — програма має це помітити й показати помилку.

WPF пропонує три механізми.

| Підхід | Де живе логіка | Плюси | Мінуси |
|---|---|---|---|
| `ValidationRule` | окремий клас, прив'язаний до конкретного поля у XAML | перевірка до запису в джерело; ловить «абв» у числовому полі | правила розмазані по XAML, важко перевикористати, не бачить інших полів |
| `IDataErrorInfo` | у самому класі даних | правила поруч із даними, працюють і без інтерфейсу, легко тестувати | перевірка по одній властивості, синхронна |
| `INotifyDataErrorInfo` | у самому класі даних | кілька помилок на властивість, асинхронні перевірки, сповіщення про зміну помилок | помітно більше коду |

Для навчальних і невеликих проєктів оптимальний **`IDataErrorInfo`**: він дає
90% користі за 10% зусиль. Його й розберемо докладно.

:::info Цікаво
`IDataErrorInfo` прийшов у .NET ще з часів Windows Forms — це один із
найстаріших інтерфейсів у `System.ComponentModel`. `INotifyDataErrorInfo`
додали пізніше саме тому, що старий інтерфейс не вмів повідомляти інтерфейс
про те, що помилка з'явилась або зникла сама по собі.
:::

## IDataErrorInfo детально

Інтерфейс складається з двох членів:

```csharp
public interface IDataErrorInfo
{
    string this[string columnName] { get; }   // помилка конкретної властивості
    string Error { get; }                     // помилка об'єкта в цілому
}
```

Індексатор отримує ім'я властивості й повертає **текст помилки** або
**порожній рядок**, якщо все гаразд. WPF викликає його автоматично щоразу,
коли двостороння прив'язка записує значення в джерело.

Повний приклад — форма реєстрації товару:

```csharp
using System;
using System.ComponentModel;

namespace ValidationDemo;

public class ProductForm : ObservableObject, IDataErrorInfo
{
    private string name = "";
    private string priceText = "";
    private int quantity;

    public string Name
    {
        get => name;
        set => SetProperty(ref name, value);
    }

    // Ціну беремо рядком, щоб самим контролювати розбір
    public string PriceText
    {
        get => priceText;
        set => SetProperty(ref priceText, value);
    }

    public int Quantity
    {
        get => quantity;
        set => SetProperty(ref quantity, value);
    }

    // ---------- IDataErrorInfo ----------

    public string Error => "";     // помилка всього об'єкта; тут не використовуємо

    public string this[string columnName]
    {
        get
        {
            switch (columnName)
            {
                case nameof(Name):
                    if (string.IsNullOrWhiteSpace(Name))
                        return "Назва не може бути порожньою.";
                    if (Name.Length < 3)
                        return "Назва закоротка: щонайменше 3 символи.";
                    if (Name.Length > 60)
                        return "Назва задовга: не більше 60 символів.";
                    return "";

                case nameof(PriceText):
                    if (string.IsNullOrWhiteSpace(PriceText))
                        return "Вкажіть ціну.";
                    if (!decimal.TryParse(PriceText, out var price))
                        return "Ціна має бути числом, наприклад 249,50";
                    if (price <= 0)
                        return "Ціна має бути більшою за нуль.";
                    if (price > 1_000_000)
                        return "Ціна виглядає нереальною.";
                    return "";

                case nameof(Quantity):
                    if (Quantity < 0)
                        return "Кількість не може бути від'ємною.";
                    if (Quantity > 10_000)
                        return "Забагато: максимум 10 000 одиниць.";
                    return "";

                default:
                    return "";
            }
        }
    }

    /// Зручний прапорець: чи форму взагалі можна зберігати.
    public bool IsValid =>
        this[nameof(Name)] == "" &&
        this[nameof(PriceText)] == "" &&
        this[nameof(Quantity)] == "";
}
```

Щоб WPF почав викликати цей індексатор, у прив'язці треба ввімкнути
**`ValidatesOnDataErrors=True`**:

```xml
<TextBox Text="{Binding Name,
                ValidatesOnDataErrors=True,
                UpdateSourceTrigger=PropertyChanged}"/>
```

Без цього атрибута інтерфейс `IDataErrorInfo` буде проігноровано, і студенти
щоразу на цьому спотикаються.

## Як показати помилку користувачеві

За замовчуванням WPF малює навколо поля з помилкою тонку червону рамку — і все.
Ні тексту, ні пояснення. Виправимо це стилем.

WPF додає до елемента з помилкою дві приєднані властивості:

- **`Validation.HasError`** — `true`, якщо є хоч одна помилка;
- **`Validation.Errors`** — колекція помилок; текст першої доступний
  за шляхом `(Validation.Errors)[0].ErrorContent`.

Стиль, який фарбує рамку і кладе текст помилки у спливаючу підказку:

```xml
<Window.Resources>
    <Style x:Key="ValidatedTextBox" TargetType="TextBox">
        <Setter Property="Padding" Value="4"/>
        <Setter Property="Margin" Value="0,2,0,8"/>
        <Style.Triggers>
            <Trigger Property="Validation.HasError" Value="True">
                <Setter Property="BorderBrush" Value="Crimson"/>
                <Setter Property="BorderThickness" Value="2"/>
                <Setter Property="Background" Value="#FFF3F3"/>
                <Setter Property="ToolTip"
                        Value="{Binding RelativeSource={RelativeSource Self},
                                        Path=(Validation.Errors)[0].ErrorContent}"/>
            </Trigger>
        </Style.Triggers>
    </Style>
</Window.Resources>
```

Дужки навколо `(Validation.Errors)` обов'язкові: так у XAML записують
**приєднану** властивість у шляху прив'язки.

Ще краще — показувати текст помилки поруч із полем, а не лише у підказці.
Для цього існує **`Validation.ErrorTemplate`**: шаблон, який малюється
поверх елемента. Місце самого елемента в шаблоні позначає
`AdornedElementPlaceholder`:

```xml
<Style x:Key="ValidatedTextBoxWithMessage" TargetType="TextBox"
       BasedOn="{StaticResource ValidatedTextBox}">
    <Setter Property="Validation.ErrorTemplate">
        <Setter.Value>
            <ControlTemplate>
                <DockPanel LastChildFill="True">
                    <TextBlock DockPanel.Dock="Bottom"
                               Foreground="Crimson" FontSize="11"
                               Margin="2,2,0,0"
                               Text="{Binding ElementName=Placeholder,
                                              Path=AdornedElement.(Validation.Errors)[0].ErrorContent}"/>
                    <AdornedElementPlaceholder x:Name="Placeholder"/>
                </DockPanel>
            </ControlTemplate>
        </Setter.Value>
    </Setter>
</Style>
```

Повне вікно форми:

```xml
<Window x:Class="ValidationDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Новий товар" Height="320" Width="400">
    <StackPanel Margin="20">

        <TextBlock Text="Назва товару:"/>
        <TextBox Style="{StaticResource ValidatedTextBoxWithMessage}"
                 Text="{Binding Name,
                        ValidatesOnDataErrors=True,
                        UpdateSourceTrigger=PropertyChanged}"/>

        <TextBlock Text="Ціна, грн:"/>
        <TextBox Style="{StaticResource ValidatedTextBoxWithMessage}"
                 Text="{Binding PriceText,
                        ValidatesOnDataErrors=True,
                        UpdateSourceTrigger=PropertyChanged}"/>

        <TextBlock Text="Кількість:"/>
        <TextBox Style="{StaticResource ValidatedTextBoxWithMessage}"
                 Text="{Binding Quantity,
                        ValidatesOnDataErrors=True,
                        UpdateSourceTrigger=LostFocus}"/>

        <Button Content="Зберегти" Padding="12,6" Margin="0,12,0,0"
                HorizontalAlignment="Right"
                IsEnabled="{Binding IsValid}"/>

    </StackPanel>
</Window>
```

**Макет вікна з помилкою:**

```
┌────────────────────────────────────────────┐
│ Назва товару:                              │
│ ┌────────────────────────────────────────┐ │
│ │ Ка                                     │ │  ← червона рамка
│ └────────────────────────────────────────┘ │
│   Назва закоротка: щонайменше 3 символи.   │  ← ErrorTemplate
│                                            │
│ Ціна, грн:                                 │
│ ┌────────────────────────────────────────┐ │
│ │ 249,50                                 │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Кількість:                                 │
│ ┌────────────────────────────────────────┐ │
│ │ 3                                      │ │
│ └────────────────────────────────────────┘ │
│                            [  Зберегти  ]  │  ← сіра, бо IsValid = false
└────────────────────────────────────────────┘
```

:::danger Часта помилка
Кнопка «Зберегти» у прикладі прив'язана до `IsValid` — але `IsValid`
не надсилає сповіщень! Щоб вона працювала, у сеттерах `Name`, `PriceText`
і `Quantity` треба додати `OnPropertyChanged(nameof(IsValid))`.
Це та сама пастка обчислюваної властивості з попереднього підрозділу.
:::

## Ще три властивості прив'язки для валідації

**`ValidatesOnDataErrors=True`** — вмикає `IDataErrorInfo`. Обов'язкове.

**`ValidatesOnExceptions=True`** — перетворює виняток із сеттера джерела
на помилку валідації. Зручно, коли модель сама кидає `ArgumentException`.
Також рятує у випадку, коли користувач вводить «абв» у поле, прив'язане
до `int`: без цього прапорця помилка перетворення просто зникає.

**`NotifyOnValidationError=True`** — змушує WPF підняти маршрутизовану подію
`Validation.Error`, на яку можна підписатись у вікні:

```xml
<StackPanel Validation.Error="OnValidationError">
    <TextBox Text="{Binding PriceText,
                    ValidatesOnDataErrors=True,
                    NotifyOnValidationError=True}"/>
</StackPanel>
```

```csharp
private int errorCount;

private void OnValidationError(object sender, ValidationErrorEventArgs e)
{
    if (e.Action == ValidationErrorEventAction.Added)
        errorCount++;
    else
        errorCount--;

    SaveButton.IsEnabled = errorCount == 0;
}
```

Це запасний варіант для тих випадків, коли рахувати помилки зручніше
на рівні вікна, ніж у моделі.

:::tip Порада
Для полів із числами тримайте у формі **рядкову** властивість
(`PriceText`), а число діставайте вже після успішної валідації. Так ви самі
контролюєте повідомлення про помилку і не залежите від того, як WPF
перетворює текст на `decimal` у поточній культурі. Це особливо важливо
для України, де десятковий роздільник — кома.
:::

## Типові помилки

- **Конвертер написано, зареєстровано, а поле порожнє.** Забули
  `Converter={StaticResource ...}` у прив'язці або переплутали ключ ресурсу.
  Дивіться вікно Output: там буде `Cannot find resource named ...`.
- **`ConvertBack` кидає виняток у двосторонній прив'язці.** Якщо ціль —
  `TextBox.Text` або `CheckBox.IsChecked`, режим за замовчуванням `TwoWay`,
  і `ConvertBack` таки викличуть. Або реалізуйте його, або явно вкажіть
  `Mode=OneWay`.
- **`ValidatesOnDataErrors` не вказано.** `IDataErrorInfo` реалізовано,
  індексатор написано, точка зупинки в ньому не спрацьовує — бо WPF
  його не питає.
- **Бізнес-логіка в конвертері.** Якщо в `Convert` з'явився `if` про знижки
  чи статуси замовлення — цьому місце в моделі подання.
- **Помилка є, кнопка активна.** Обчислювана властивість `IsValid`
  без сповіщення про зміну.
