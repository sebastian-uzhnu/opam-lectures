---
sidebar_position: 2
---

# Властивості залежності та маршрутизовані події

Це найдивніший підрозділ теми. Досі все в C# було зрозуміло: властивість — це
пара методів навколо поля, подія — це список підписників. У WPF обидва ці
механізми замінено на інші, значно складніші. Питання «навіщо?» тут не
риторичне — без відповіді на нього стилі, тригери й анімація з наступного
підрозділу виглядатимуть як магія.

## Частина 1. Чому звичайної властивості замало

Розберемо на конкретному прикладі. Ось звичайна властивість C#:

```csharp
public class OldButton
{
    public double FontSize { get; set; } = 12;
}
```

Значення лежить у полі всередині об'єкта. Просто, швидко, зрозуміло.
А тепер подивімося, чого ця конструкція **не вміє**, а WPF потребує.

### Проблема 1. Анімація

Ви хочете, щоб кнопка при наведенні плавно збільшила шрифт з 12 до 16
за 0.2 секунди. Хто має змінювати значення поля 60 разів на секунду?
Хтось мусить тимчасово «перехопити» властивість, поганяти її, а потім
повернути як було. Звичайне поле такого не передбачає — у нього немає
пам'яті про те, «яким значення було до анімації».

### Проблема 2. Стилі

Ви описали стиль: «усі кнопки в застосунку мають шрифт 14». Але одній
конкретній кнопці в XAML написали `FontSize="20"`. Хто має перемогти?
Очевидно, локальне значення. А якщо на кнопку ще й наведено мишу
й спрацював тригер, який каже 16? Тепер потрібна ціла **система пріоритетів**,
а не просто поле, у яке останній, хто писав, той і виграв.

### Проблема 3. Успадкування значень

Ви ставите `FontSize="16"` на вікні — і хочете, щоб усі підписи всередині
теж стали 16-м шрифтом, без жодного зайвого рядка. Звичайна властивість
не знає нічого про «батьків» — вона знає лише своє поле.

### Проблема 4. Пам'ять

Це найнесподіваніший аргумент, але він вирішальний. Клас `Control` у WPF
має приблизно **сотню** властивостей: шрифт, колір, товщина рамки, відступи,
вирівнювання, підказка, курсор, прозорість і так далі. Типове вікно містить
від кількох сотень до кількох тисяч елементів.

```
Звичайні властивості (поля в кожному об'єкті):

  1000 елементів × 100 властивостей × 8 байтів = 800 000 байтів
  ...і 98 % із них ніхто ніколи не змінював —
     там просто лежить значення за замовчуванням.

Властивості залежності:

  1000 елементів × 3 реально змінені властивості = 3000 записів
  решта 97 000 значень не зберігаються взагалі,
  вони обчислюються на вимогу.
```

Ось тут і з'являється головна ідея.

## Як працює dependency property

**Властивість залежності** (dependency property) — це властивість, значення
якої **не зберігається в самому об'єкті**, а обчислюється системою властивостей
WPF з кількох можливих джерел.

```
        ЗВИЧАЙНА ВЛАСТИВІСТЬ                ВЛАСТИВІСТЬ ЗАЛЕЖНОСТІ

   ┌──────────────────────┐          ┌──────────────────────┐
   │  об'єкт Button       │          │  об'єкт Button       │
   │  ┌────────────────┐  │          │  (полів немає!)      │
   │  │ fontSize = 12  │  │          │  GetValue(FontSize…) ├──┐
   │  │ foreground=... │  │          └──────────────────────┘  │
   │  │ margin    =... │  │                                    │
   │  │ ... ще 97 полів│  │          ┌─────────────────────────▼──────────┐
   │  └────────────────┘  │          │   Система властивостей WPF         │
   └──────────────────────┘          │   (одна на весь застосунок)        │
                                     │                                    │
   значення живе в об'єкті           │  Хто? Яка властивість? Значення?   │
                                     │  ────────────────────────────────  │
                                     │  Button#3   FontSize     20        │
                                     │  Button#7   Background   Red       │
                                     │  TextBox#1  Text         "Оксана"  │
                                     │                                    │
                                     │  Усього іншого тут НЕМАЄ —         │
                                     │  бо воно не змінювалося.           │
                                     └────────────────────────────────────┘
```

Коли ви питаєте `myButton.FontSize`, викликається не читання поля,
а метод `GetValue(FontSizeProperty)`, який щоразу питає систему властивостей:
«яке зараз значення цієї властивості для цього об'єкта?». І система шукає
відповідь по черзі в кількох місцях.

## Пріоритет джерел значення

Це найважливіша таблиця підрозділу. Система перебирає джерела зверху вниз
і бере **перше знайдене**.

| № | Джерело | Приклад | Перебиває все, що нижче |
|---|---|---|---|
| 1 | Анімація | `DoubleAnimation` на `FontSize` | так, навіть локальне значення |
| 2 | **Локальне значення** | `FontSize="20"` прямо в XAML або `btn.FontSize = 20` | так |
| 3 | Тригер стилю / шаблону | `Trigger` на `IsMouseOver` | так |
| 4 | Сеттер стилю | `Setter Property="FontSize" Value="14"` | так |
| 5 | Значення зі шаблону елемента | `ControlTemplate` | так |
| 6 | **Успадковане значення** | `FontSize="16"` на батьківському `Window` | так |
| 7 | **Значення за замовчуванням** | 12 для `FontSize` | — |

(Повний список у документації довший — там є ще стилі теми й кілька службових
рівнів. Для роботи достатньо цих семи.)

:::danger Часта помилка
Пункт 2 вище пункту 3 і 4 — і це ламає найбільше нервів новачкам.
Якщо ви написали в XAML `Background="White"` на кнопці, **жоден тригер
наведення миші з вашого стилю вже не спрацює візуально**: локальне значення
сильніше за тригер. Хочете, щоб стиль керував кольором — приберіть колір
із розмітки елемента повністю.
:::

## Успадкування значень по дереву

Не всі властивості успадковуються — лише ті, які зареєстровані з прапорцем
`Inherits`. На щастя, це саме ті, які найчастіше потрібні: `FontSize`,
`FontFamily`, `FontWeight`, `Foreground` (частково), `FlowDirection`,
`DataContext`, `IsEnabled`.

```xml
<Window x:Class="DepPropsDemo.InheritWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Успадкування" Height="240" Width="380"
        FontSize="16" FontFamily="Segoe UI">
    <StackPanel Margin="16">
        <TextBlock Text="Я успадкував розмір 16 від вікна"/>
        <TextBlock Text="І я теж"/>
        <StackPanel FontSize="22" Margin="0,10">
            <TextBlock Text="А я у вкладеній панелі — тут уже 22"/>
            <TextBlock Text="Я успадкував 22 від панелі, а не 16 від вікна"/>
        </StackPanel>
        <TextBlock Text="А я маю власне локальне значення" FontSize="11"/>
    </StackPanel>
</Window>
```

Схема руху значення:

```
  Window  FontSize = 16  ◄── локальне значення
    │
    └── StackPanel       ◄── свого немає → питає батька → 16
          │
          ├── TextBlock  ◄── свого немає → 16
          ├── TextBlock  ◄── свого немає → 16
          │
          ├── StackPanel  FontSize = 22  ◄── локальне значення
          │     │
          │     ├── TextBlock ◄── свого немає → питає батька → 22
          │     └── TextBlock ◄── свого немає → 22
          │
          └── TextBlock  FontSize = 11  ◄── локальне, сильніше за успадковане
```

Одного рядка на вікні вистачило, щоб задати шрифт усьому застосунку.
Саме так і роблять на практиці: базові налаштування типографіки ставлять
на `Window`, а не повторюють у тридцяти елементах.

:::info Цікаво
`Background` **не** успадковується — і це навмисно. Якби успадковувався,
кожен `TextBlock` малював би прямокутник свого кольору поверх фону панелі,
і замість одного заливання екрана система робила б тисячі. Успадковують
лише те, що дешево і логічно.
:::

## Як оголосити власну властивість залежності

Писати власні DP доводиться рідше, ніж здається, але прочитати чужий код
із ними ви маєте вміти. Ось повний шаблон.

```csharp
using System.Windows;
using System.Windows.Controls;

namespace DepPropsDemo;

// Кнопка, яка сама рахує, скільки разів на неї натиснули
public class CounterButton : Button
{
    // 1. Статичне поле-ідентифікатор. Ім'я ЗАВЖДИ закінчується на "Property".
    //    Воно одне на весь клас, а не на кожен об'єкт — у цьому вся економія.
    public static readonly DependencyProperty ClickCountProperty =
        DependencyProperty.Register(
            name: nameof(ClickCount),          // ім'я властивості
            propertyType: typeof(int),         // її тип
            ownerType: typeof(CounterButton),  // клас-власник
            typeMetadata: new PropertyMetadata(
                defaultValue: 0,               // значення за замовчуванням
                propertyChangedCallback: OnClickCountChanged));

    // 2. Звичайна C#-обгортка. Вона потрібна лише для зручності:
    //    щоб писати button.ClickCount, а не GetValue/SetValue.
    public int ClickCount
    {
        get => (int)GetValue(ClickCountProperty);
        set => SetValue(ClickCountProperty, value);
    }

    // 3. Реакція на зміну значення. Метод статичний, бо належить класу,
    //    а не об'єкту — тому потрібен параметр d (хто саме змінився).
    private static void OnClickCountChanged(DependencyObject d,
                                            DependencyPropertyChangedEventArgs e)
    {
        if (d is CounterButton button)
        {
            var newCount = (int)e.NewValue;
            button.Content = newCount == 0
                ? "Ще жодного кліку"
                : $"Натиснуто {newCount} раз(ів)";
        }
    }

    protected override void OnClick()
    {
        base.OnClick();
        ClickCount++;   // зміна значення сама запустить OnClickCountChanged
    }
}
```

Використання в XAML (`local` — це простір імен вашого проєкту):

```xml
<Window x:Class="DepPropsDemo.CounterWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:DepPropsDemo"
        Title="Лічильник" Height="160" Width="320">
    <StackPanel Margin="16">
        <local:CounterButton x:Name="MyCounter" Padding="10,6"
                             Content="Ще жодного кліку"/>
    </StackPanel>
</Window>
```

**Вивід:** після трьох натискань напис на кнопці стає
`Натиснуто 3 раз(ів)`. Зверніть увагу: ми ніде не викликали оновлення
інтерфейсу вручну — це зробила система властивостей, коли побачила зміну.

:::warning Обережно
Ніколи не додавайте логіку в тіло C#-обгортки:

```csharp
public int ClickCount
{
    get => (int)GetValue(ClickCountProperty);
    set
    {
        SetValue(ClickCountProperty, value);
        DoSomething();   // ← ця логіка НЕ виконається при виклику з XAML
    }
}
```

Коли значення приходить із XAML, зі стилю або з анімації, система
викликає `SetValue` напряму, обминаючи вашу обгортку. Уся логіка —
тільки в callback-методі.
:::

## Частина 2. Маршрутизовані події

Друга половина підрозділу — про події. І тут теж почнемо з питання «навіщо».

### Задача, яку неможливо розв'язати звичайними подіями

Уявіть панель калькулятора: двадцять кнопок із цифрами й операціями.
Зі звичайними подіями .NET вам потрібно двадцять обробників. Або один
обробник, підписаний двадцять разів — але підписувати все одно доведеться
кожну кнопку окремо.

А хочеться сказати так: «панель, слухай — якщо всередині тебе хтось
натиснув кнопку, скажи мені яку». Один рядок замість двадцяти.

Саме це й дають маршрутизовані події.

**Маршрутизована подія** (routed event) — це подія, яка після виникнення
не зупиняється на елементі-джерелі, а **подорожує деревом елементів**,
даючи шанс обробити себе кожному предку (або нащадку).

### Три стратегії маршрутизації

| Стратегія | Куди рухається | Коли використовується | Приклад |
|---|---|---|---|
| **Direct** (пряма) | нікуди, лише сам елемент | подія стосується тільки джерела | `MouseEnter`, `MouseLeave` |
| **Bubbling** (висхідна) | від джерела **вгору** до кореня | 90 % випадків | `Click`, `KeyDown`, `MouseDown`, `TextInput` |
| **Tunneling** (тунельна) | від кореня **вниз** до джерела | перехопити подію до того, як її обробить сам елемент | `PreviewKeyDown`, `PreviewMouseDown`, `PreviewTextInput` |

Тунельні події завжди називаються з префіксом `Preview` і завжди
йдуть **першими**, ще до відповідної висхідної.

### Схема руху події

Користувач натиснув на кнопку `OkButton` усередині `StackPanel`
усередині `Grid` усередині `Window`:

```
                 ФАЗА 1: ТУНЕЛЮВАННЯ            ФАЗА 2: СПЛИВАННЯ ВГОРУ
                 (Preview-події)                (звичайні події)

  Window      PreviewMouseDown   ①                    ⑧  MouseDown
     │              │                                     ▲
     ▼              ▼                                     │
  Grid        PreviewMouseDown   ②                    ⑦  MouseDown
     │              │                                     ▲
     ▼              ▼                                     │
  StackPanel  PreviewMouseDown   ③                    ⑥  MouseDown
     │              │                                     ▲
     ▼              ▼                                     │
  OkButton    PreviewMouseDown   ④  ───────────────►  ⑤  MouseDown
                                        джерело
                                        (OriginalSource)
```

Спочатку подія спускається зверху вниз у вигляді `Preview`-версії,
доходить до кнопки, а потім тим самим шляхом піднімається назад
у вигляді звичайної версії. Вісім викликів на одне натискання.

### Два «джерела» в аргументах події

У будь-якому обробнику маршрутизованої події є два різні поняття:

- `sender` — елемент, **на якому висить цей обробник** (наприклад, панель);
- `e.OriginalSource` — елемент, **де подія справді виникла** (наприклад,
  текстовий блок усередині кнопки);
- `e.Source` — логічне джерело, зазвичай сама кнопка.

### Робочий приклад: одна панель замість двадцяти обробників

```xml
<Window x:Class="RoutedDemo.CalculatorWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Клавіатура" Height="260" Width="260">
    <StackPanel Margin="12">

        <TextBlock x:Name="DisplayTextBlock" Text="0"
                   FontSize="28" TextAlignment="Right"
                   Margin="0,0,0,10"/>

        <!-- ОДИН обробник на всю панель.
             Жодна кнопка власного Click не має. -->
        <UniformGrid Columns="3" Rows="4" Button.Click="Keypad_Click">
            <Button Content="7"/>
            <Button Content="8"/>
            <Button Content="9"/>
            <Button Content="4"/>
            <Button Content="5"/>
            <Button Content="6"/>
            <Button Content="1"/>
            <Button Content="2"/>
            <Button Content="3"/>
            <Button Content="0"/>
            <Button Content="."/>
            <Button Content="C"/>
        </UniformGrid>
    </StackPanel>
</Window>
```

```csharp
using System.Windows;
using System.Windows.Controls;

namespace RoutedDemo;

public partial class CalculatorWindow : Window
{
    public CalculatorWindow()
    {
        InitializeComponent();
    }

    private void Keypad_Click(object sender, RoutedEventArgs e)
    {
        // sender — це UniformGrid (там висить обробник).
        // e.Source — кнопка, яку насправді натиснули.
        if (e.Source is not Button button) return;

        var key = button.Content?.ToString() ?? "";

        if (key == "C")
        {
            DisplayTextBlock.Text = "0";
        }
        else if (DisplayTextBlock.Text == "0" && key != ".")
        {
            DisplayTextBlock.Text = key;
        }
        else
        {
            DisplayTextBlock.Text += key;
        }

        // Подія вже зроблена своє — далі вгору її пускати нема сенсу
        e.Handled = true;
    }
}
```

Запис `Button.Click="Keypad_Click"` у XAML називають **прикріпленою подією**
(attached event): панель сама не має події `Click`, але може слухати
`Click`, який пропливає крізь неї від нащадків.

**Вивід:** послідовні натискання `4`, `2`, `.`, `5` дають на екрані `42.5`,
натискання `C` повертає `0`. Обробник — один, кнопок — дванадцять.

## e.Handled: зупинка поширення

Властивість `e.Handled = true` означає «подію оброблено, далі не несіть».
Після цього подія формально продовжує рух деревом, але **звичайні обробники
її вже не бачать**.

```
   Window       ✕ обробник не викликається
     ▲
     │  Handled = true  ← тут поширення практично зупинилося
   StackPanel   ✔ обробник спрацював
     ▲
     │
   Button       ✔ обробник спрацював
```

Найсильніший ефект дає `Handled` у **тунельній** фазі: якщо встановити
`e.Handled = true` в `PreviewMouseDown` на панелі, кнопки всередині взагалі
не побачать натискання й не спрацюють.

```xml
<Window x:Class="RoutedDemo.LockWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Замок на панелі" Height="200" Width="320">
    <StackPanel Margin="12">
        <CheckBox x:Name="LockCheckBox" Content="Заблокувати панель"
                  Margin="0,0,0,10"/>

        <StackPanel x:Name="ActionsPanel"
                    PreviewMouseLeftButtonDown="ActionsPanel_PreviewMouseDown">
            <Button Content="Зберегти" Margin="0,2" Click="Action_Click"/>
            <Button Content="Друкувати" Margin="0,2" Click="Action_Click"/>
            <Button Content="Видалити" Margin="0,2" Click="Action_Click"/>
        </StackPanel>

        <TextBlock x:Name="LogTextBlock" Margin="0,10,0,0"/>
    </StackPanel>
</Window>
```

```csharp
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace RoutedDemo;

public partial class LockWindow : Window
{
    public LockWindow()
    {
        InitializeComponent();
    }

    private void ActionsPanel_PreviewMouseDown(object sender,
                                               MouseButtonEventArgs e)
    {
        if (LockCheckBox.IsChecked == true)
        {
            LogTextBlock.Text = "Панель заблоковано — натискання скасовано.";

            // Подія не дійде до кнопки — жоден Click не спрацює
            e.Handled = true;
        }
    }

    private void Action_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button button)
        {
            LogTextBlock.Text = $"Виконано дію: {button.Content}";
        }
    }
}
```

**Вивід:** зі знятим прапорцем натискання «Друкувати» дає
`Виконано дію: Друкувати`. З увімкненим прапорцем будь-яке натискання
будь-якої кнопки дає `Панель заблоковано — натискання скасовано.`,
і сам `Click` не виникає взагалі.

## PreviewKeyDown проти KeyDown

Таблиця на пам'ять:

| | `PreviewKeyDown` | `KeyDown` |
|---|---|---|
| Стратегія | тунельна (згори вниз) | висхідна (знизу вгору) |
| Коли спрацьовує | **перед** тим, як елемент обробить клавішу | після |
| Типове застосування | заборонити натискання, гарячі клавіші рівня вікна | реакція на введену клавішу |
| Чи можна скасувати введення | так, `e.Handled = true` | ні, символ уже потрапив у поле |

Правило: **щоб чомусь завадити — Preview; щоб на щось відреагувати —
звичайна подія**.

## Практичний сценарій: тільки цифри в TextBox

Класична задача: поле «вік» або «кількість» має приймати лише цифри.
Правильний інструмент — тунельна подія `PreviewTextInput`, яка виникає
до того, як символ потрапить у текст.

```xml
<Window x:Class="RoutedDemo.DigitsWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Тільки цифри" Height="200" Width="340">
    <StackPanel Margin="16">
        <TextBlock Text="Кількість місць"/>
        <TextBox x:Name="SeatsTextBox" MaxLength="3"
                 PreviewTextInput="DigitsOnly_PreviewTextInput"
                 PreviewKeyDown="DigitsOnly_PreviewKeyDown"/>

        <TextBlock Text="Вік"/>
        <TextBox x:Name="AgeTextBox" MaxLength="3"
                 PreviewTextInput="DigitsOnly_PreviewTextInput"
                 PreviewKeyDown="DigitsOnly_PreviewKeyDown"/>

        <TextBlock x:Name="HintTextBlock" Margin="0,10,0,0"
                   Foreground="Firebrick"/>
    </StackPanel>
</Window>
```

```csharp
using System.Windows;
using System.Windows.Input;

namespace RoutedDemo;

public partial class DigitsWindow : Window
{
    public DigitsWindow()
    {
        InitializeComponent();
    }

    // Один обробник — на обидва поля. Спрацьовує до появи символу в тексті.
    private void DigitsOnly_PreviewTextInput(object sender,
                                             TextCompositionEventArgs e)
    {
        // e.Text — символи, які ЗБИРАЮТЬСЯ потрапити в поле
        foreach (var symbol in e.Text)
        {
            if (!char.IsDigit(symbol))
            {
                e.Handled = true;   // символ не потрапить у TextBox
                HintTextBlock.Text = "Дозволені лише цифри.";
                return;
            }
        }

        HintTextBlock.Text = "";
    }

    // Пробіл не проходить через PreviewTextInput у деяких розкладках,
    // тому забороняємо його окремо
    private void DigitsOnly_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Space)
        {
            e.Handled = true;
        }
    }
}
```

**Вивід:** спроба ввести `1a2` залишає в полі `12`, під полями
з'являється напис `Дозволені лише цифри.`. Клавіші `Backspace`, `Delete`,
стрілки, `Ctrl+C` працюють як завжди — вони не породжують `PreviewTextInput`.

:::tip Порада
Вставка тексту через `Ctrl+V` теж обминає `PreviewTextInput`. Якщо поле
має бути захищене повністю, додайте ще й обробник `TextChanged`, який
перевіряє результат і відкочує його. Але для навчальних задач достатньо
`PreviewTextInput`.
:::

:::info Цікаво
Чому WPF узагалі має тунельну фазу, якої немає в більшості UI-бібліотек?
Відповідь — у складених елементах. Кнопка насправді складається з рамки
й текстового блоку всередині. Без тунелювання зовнішнє вікно ніколи
не змогло б перехопити натискання, призначене «нутрощам» контрола,
бо воно дізналося б про подію останнім.
:::

## Типові помилки

1. **Логіка в сеттері C#-обгортки dependency property.** При заданні
   значення з XAML, стилю чи анімації обгортка не викликається.
   Уся логіка — у `PropertyChangedCallback`.

2. **Локальне значення поверх стилю.** Написали `Background="White"`
   на елементі — і дивуєтеся, чому тригер наведення не працює. Локальне
   значення сильніше за тригер. Приберіть його з розмітки.

3. **Спроба скасувати введення в `KeyDown` замість `PreviewKeyDown`.**
   У момент `KeyDown` елемент уже обробив клавішу; `e.Handled = true`
   тут нічого не скасує.

4. **Забутий `e.Handled` після обробки на панелі.** Подія піднімається
   далі й може вдруге спрацювати на вікні або запустити кнопку
   за замовчуванням. Оброблена подія має бути позначена обробленою.

5. **Плутанина `sender` і `e.OriginalSource`.** Якщо обробник висить
   на панелі, `sender` — це панель, і `sender as Button` завжди дасть `null`.
   Потрібну кнопку шукайте в `e.Source`.

## Що далі

Ви розібралися, **чому** властивості WPF так дивно влаштовані. У наступному
підрозділі ми скористаємося цим: стилі, тригери й ресурси працюють саме
тому, що властивість уміє брати значення з кількох джерел і знає
їхній пріоритет.
