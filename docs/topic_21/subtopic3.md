---
sidebar_position: 4
---

# Практичний приклад: вікно калькулятора чайових

Теорія закінчилася. Зберемо все, що вивчили, в один застосунок, який справді
хочеться показати: калькулятор чайових. Користувач вводить суму рахунку,
обирає відсоток чайових і кількість людей за столом — програма рахує, скільки
залишити офіціантові та скільки скидається кожен.

Задача маленька, але в ній є все: сітка, вкладені панелі, кілька типів
елементів, обробники подій, перевірка введення й акуратне масштабування.

## Що ми будуємо

Спочатку домовимося про вигляд. Скриншота тут немає, тому ось макет
у псевдографіці — саме так вікно виглядатиме після запуску.

```
┌─ Калькулятор чайових ──────────────────────────── ─ □ ✕ ┐
│                                                           │
│  Калькулятор чайових                                      │
│  Порахуємо, скільки лишити й скільки скинутись             │
│ ─────────────────────────────────────────────────────────  │
│                                                           │
│  Сума рахунку, грн   ┌──────────────────────────────────┐ │
│                      │ 840,50                           │ │
│                      └──────────────────────────────────┘ │
│                                                           │
│  Чайові, %           ┌──────────────────────────────────┐ │
│                      │ 10                               │ │
│                      └──────────────────────────────────┘ │
│                      ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│                      │ 5 % │ │10 % │ │15 % │ │20 % │      │
│                      └─────┘ └─────┘ └─────┘ └─────┘      │
│                                                           │
│  Людей за столом     ┌──────────────────────────────────┐ │
│                      │ 3                                │ │
│                      └──────────────────────────────────┘ │
│                                                           │
│ ─────────────────────────────────────────────────────────  │
│  Чайові:            84,05 грн                             │
│  Разом:            924,55 грн                             │
│  З кожного:        308,18 грн                             │
│                                                           │
│           ┌───────────────┐  ┌────────────────────────┐   │
│           │   Очистити    │  │      Порахувати        │   │
│           └───────────────┘  └────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

## План компонування

Перше, що робить розробник WPF, — ділить вікно на зони. Не пише розмітку,
не перетягує кнопки, а дивиться на макет і питає: скільки тут великих
частин і як вони поводяться при зміні розміру?

У нашому вікні три частини:

```
┌─────────────────────────────────────────┐
│  Row 0   Height="Auto"                  │
│  Шапка: заголовок і підзаголовок.       │
│  Займає рівно скільки треба тексту.     │
├─────────────────────────────────────────┤
│                                         │
│  Row 1   Height="*"                     │
│  Форма введення: три підписи            │
│  і три поля. Весь приріст висоти        │
│  вікна дістається цій зоні.             │
│                                         │
├─────────────────────────────────────────┤
│  Row 2   Height="Auto"                  │
│  Результати й кнопки.                   │
│  Знизу, сталої висоти.                  │
└─────────────────────────────────────────┘
```

Це та сама схема «Auto — зірочка — Auto», яку ми радили в підрозділі про
панелі. Вона підходить до дев'яти вікон із десяти.

Усередині середньої зони — власна сітка з двох стовпців: вузький для підписів
(`Auto`, за найдовшим підписом) і широкий для полів (`*`, увесь залишок).

```
        Column 0            Column 1
        Width="Auto"        Width="*"
      ┌───────────────┬──────────────────────────┐
 Row0 │ Сума рахунку  │ [поле введення         ] │
      ├───────────────┼──────────────────────────┤
 Row1 │ Чайові, %     │ [поле введення         ] │
      ├───────────────┼──────────────────────────┤
 Row2 │               │ [5%][10%][15%][20%]      │
      ├───────────────┼──────────────────────────┤
 Row3 │ Людей         │ [поле введення         ] │
      └───────────────┴──────────────────────────┘
```

## Розмітка

Створіть проєкт **WPF Application** на .NET 8 з назвою `TipCalculator`
і замініть вміст `MainWindow.xaml` на такий:

```xml
<Window x:Class="TipCalculator.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Калькулятор чайових"
        Height="480" Width="460"
        MinHeight="420" MinWidth="380"
        WindowStartupLocation="CenterScreen"
        FontSize="14">

    <Grid Margin="20">

        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>   <!-- шапка -->
            <RowDefinition Height="*"/>      <!-- форма -->
            <RowDefinition Height="Auto"/>   <!-- результат і кнопки -->
        </Grid.RowDefinitions>

        <!-- ============ ЗОНА 1: ШАПКА ============ -->
        <StackPanel Grid.Row="0" Margin="0,0,0,16">
            <TextBlock Text="Калькулятор чайових"
                       FontSize="22"
                       FontWeight="Bold"/>
            <TextBlock Text="Порахуємо, скільки лишити й скільки скинутись"
                       Foreground="Gray"
                       TextWrapping="Wrap"
                       Margin="0,4,0,10"/>
            <Border Height="1" Background="#FFD8D8D8"/>
        </StackPanel>

        <!-- ============ ЗОНА 2: ФОРМА ============ -->
        <Grid Grid.Row="1" VerticalAlignment="Top">

            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="Auto"/>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>

            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="Auto"/>
            </Grid.RowDefinitions>

            <TextBlock Grid.Row="0" Grid.Column="0"
                       Text="Сума рахунку, грн"
                       VerticalAlignment="Center"
                       Margin="0,0,12,10"/>
            <TextBox Grid.Row="0" Grid.Column="1"
                     x:Name="BillTextBox"
                     Padding="6,4"
                     MaxWidth="260"
                     HorizontalAlignment="Stretch"
                     Margin="0,0,0,10"/>

            <TextBlock Grid.Row="1" Grid.Column="0"
                       Text="Чайові, %"
                       VerticalAlignment="Center"
                       Margin="0,0,12,10"/>
            <TextBox Grid.Row="1" Grid.Column="1"
                     x:Name="PercentTextBox"
                     Text="10"
                     Padding="6,4"
                     MaxWidth="260"
                     HorizontalAlignment="Stretch"
                     Margin="0,0,0,10"/>

            <!-- Кнопки швидкого вибору відсотка.
                 Усі чотири підписані на один обробник,
                 а значення передається через Tag. -->
            <WrapPanel Grid.Row="2" Grid.Column="1" Margin="0,0,0,14">
                <Button Content="5 %"  Tag="5"  Width="56" Margin="0,0,6,6"
                        Padding="4" Click="PercentPresetButton_Click"/>
                <Button Content="10 %" Tag="10" Width="56" Margin="0,0,6,6"
                        Padding="4" Click="PercentPresetButton_Click"/>
                <Button Content="15 %" Tag="15" Width="56" Margin="0,0,6,6"
                        Padding="4" Click="PercentPresetButton_Click"/>
                <Button Content="20 %" Tag="20" Width="56" Margin="0,0,6,6"
                        Padding="4" Click="PercentPresetButton_Click"/>
            </WrapPanel>

            <TextBlock Grid.Row="3" Grid.Column="0"
                       Text="Людей за столом"
                       VerticalAlignment="Center"
                       Margin="0,0,12,10"/>
            <TextBox Grid.Row="3" Grid.Column="1"
                     x:Name="PeopleTextBox"
                     Text="1"
                     Padding="6,4"
                     MaxWidth="260"
                     HorizontalAlignment="Stretch"
                     Margin="0,0,0,10"/>
        </Grid>

        <!-- ============ ЗОНА 3: РЕЗУЛЬТАТ І КНОПКИ ============ -->
        <StackPanel Grid.Row="2">

            <Border Height="1" Background="#FFD8D8D8" Margin="0,0,0,12"/>

            <Grid Margin="0,0,0,14">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="Auto"/>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <Grid.RowDefinitions>
                    <RowDefinition Height="Auto"/>
                    <RowDefinition Height="Auto"/>
                    <RowDefinition Height="Auto"/>
                </Grid.RowDefinitions>

                <TextBlock Grid.Row="0" Grid.Column="0" Text="Чайові:"
                           Margin="0,0,12,4"/>
                <TextBlock Grid.Row="0" Grid.Column="1"
                           x:Name="TipTextBlock"
                           Text="—"
                           HorizontalAlignment="Right"
                           Margin="0,0,0,4"/>

                <TextBlock Grid.Row="1" Grid.Column="0" Text="Разом:"
                           Margin="0,0,12,4"/>
                <TextBlock Grid.Row="1" Grid.Column="1"
                           x:Name="TotalTextBlock"
                           Text="—"
                           HorizontalAlignment="Right"
                           Margin="0,0,0,4"/>

                <TextBlock Grid.Row="2" Grid.Column="0" Text="З кожного:"
                           FontWeight="Bold" Margin="0,0,12,0"/>
                <TextBlock Grid.Row="2" Grid.Column="1"
                           x:Name="PerPersonTextBlock"
                           Text="—"
                           FontWeight="Bold"
                           FontSize="16"
                           HorizontalAlignment="Right"/>
            </Grid>

            <TextBlock x:Name="MessageTextBlock"
                       Text=""
                       Foreground="#FFB00020"
                       TextWrapping="Wrap"
                       Margin="0,0,0,10"/>

            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="2*"/>
                </Grid.ColumnDefinitions>

                <Button Grid.Column="0"
                        x:Name="ClearButton"
                        Content="Очистити"
                        Padding="8,6"
                        Margin="0,0,8,0"
                        Click="ClearButton_Click"/>

                <Button Grid.Column="1"
                        x:Name="CalculateButton"
                        Content="Порахувати"
                        Padding="8,6"
                        FontWeight="Bold"
                        IsDefault="True"
                        Click="CalculateButton_Click"/>
            </Grid>
        </StackPanel>
    </Grid>
</Window>
```

Кілька деталей розмітки, на які варто звернути увагу.

**`FontSize="14"` на вікні.** Розмір шрифту успадковується вниз деревом
елементів. Один рядок у вікні — і всі написи й кнопки всередині стали
більшими. Не треба дублювати `FontSize` на кожному елементі.

**`MinHeight` і `MinWidth` у вікна.** Захист від користувача, який стисне
вікно до смужки. Нижче цих значень вікно просто не зменшиться.

**`Tag` у кнопок відсотка.** `Tag` — універсальна властивість «покласти
сюди що завгодно своє», яка є в кожного елемента WPF. Ми кладемо туди
значення відсотка, щоб один обробник обслуговував усі чотири кнопки.

**`IsDefault="True"` у кнопки розрахунку.** Тепер натискання Enter у будь-якому
полі спрацьовує як клік по цій кнопці. Дрібниця, яка сильно покращує відчуття
від програми.

**`MaxWidth="260"` у полях.** Поля розтягуються разом із вікном, але
не перетворюються на смуги через увесь монітор. Це та сама пара
«розтягується, але в межах розумного», про яку йшлося раніше.

## Код

Тепер `MainWindow.xaml.cs`:

```csharp
using System.Globalization;
using System.Windows;
using System.Windows.Controls;

namespace TipCalculator;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    // --- Кнопка "Порахувати" -------------------------------------------

    private void CalculateButton_Click(object sender, RoutedEventArgs e)
    {
        // 1. Читаємо й перевіряємо суму рахунку
        if (!TryReadDecimal(BillTextBox.Text, out var bill) || bill <= 0)
        {
            ShowError("Сума рахунку має бути додатним числом.");
            BillTextBox.Focus();
            return;
        }

        // 2. Читаємо й перевіряємо відсоток
        if (!TryReadDecimal(PercentTextBox.Text, out var percent)
            || percent < 0 || percent > 100)
        {
            ShowError("Відсоток чайових має бути числом від 0 до 100.");
            PercentTextBox.Focus();
            return;
        }

        // 3. Читаємо й перевіряємо кількість людей
        if (!int.TryParse(PeopleTextBox.Text.Trim(), out var people)
            || people < 1)
        {
            ShowError("Кількість людей має бути цілим числом, не меншим за 1.");
            PeopleTextBox.Focus();
            return;
        }

        // 4. Рахуємо
        var tip = bill * percent / 100m;
        var total = bill + tip;
        var perPerson = total / people;

        // 5. Виводимо
        TipTextBlock.Text = $"{tip:N2} грн";
        TotalTextBlock.Text = $"{total:N2} грн";
        PerPersonTextBlock.Text = $"{perPerson:N2} грн";

        ClearError();
    }

    // --- Кнопки швидкого вибору відсотка --------------------------------

    private void PercentPresetButton_Click(object sender, RoutedEventArgs e)
    {
        // sender — це та кнопка, яку натиснули.
        // Перевіряємо тип і одночасно отримуємо змінну button.
        if (sender is Button button && button.Tag is string tagValue)
        {
            PercentTextBox.Text = tagValue;
        }
    }

    // --- Кнопка "Очистити" ----------------------------------------------

    private void ClearButton_Click(object sender, RoutedEventArgs e)
    {
        BillTextBox.Text = string.Empty;
        PercentTextBox.Text = "10";
        PeopleTextBox.Text = "1";

        TipTextBlock.Text = "—";
        TotalTextBlock.Text = "—";
        PerPersonTextBlock.Text = "—";

        ClearError();
        BillTextBox.Focus();
    }

    // --- Допоміжні методи -----------------------------------------------

    /// <summary>
    /// Читає десяткове число, приймаючи і крапку, і кому як роздільник.
    /// </summary>
    private static bool TryReadDecimal(string text, out decimal value)
    {
        var normalized = text.Trim().Replace(',', '.');

        return decimal.TryParse(
            normalized,
            NumberStyles.Number,
            CultureInfo.InvariantCulture,
            out value);
    }

    private void ShowError(string message)
    {
        MessageTextBlock.Text = message;

        TipTextBlock.Text = "—";
        TotalTextBlock.Text = "—";
        PerPersonTextBlock.Text = "—";
    }

    private void ClearError()
    {
        MessageTextBlock.Text = string.Empty;
    }
}
```

## Що тут відбувається

**Три обробники — три незалежні дії.** Зверніть увагу: між ними немає жодного
порядку. Користувач може натиснути «Порахувати» першим, потім «15 %», потім
знову «Порахувати», потім «Очистити». Кожен обробник робить свою роботу
й не знає про інші. Це і є подієва модель, про яку йшлося на початку теми.

**Стан живе в елементах.** У консольній програмі суму рахунку зберігала б
локальна змінна в `Main`. Тут її зберігає сам `TextBox` — у властивості
`Text`. Між натисканнями кнопок метод не існує, а дані нікуди не діваються,
бо вони в дереві елементів.

**Перевірка введення через `TryParse`.** Найважливіша частина. Користувач
у вікні може набрати будь-що: `abc`, порожній рядок, `-5`, `10 гривень`.
Метод `decimal.Parse` на такому вводі кине `FormatException`, і програма
впаде з віконцем «Необроблений виняток». `TryParse` не кидає нічого —
він повертає `false`, і ми маємо шанс ввічливо сказати, що не так.

Схема перевірки завжди однакова:

```
    прочитати текст
          │
          ▼
    ┌──────────────┐   false   ┌───────────────────────┐
    │  TryParse    │──────────▶│ показати повідомлення │
    └──────┬───────┘           │ повернути фокус у поле│
           │ true              │ вийти з методу        │
           ▼                   └───────────────────────┘
    ┌──────────────┐   ні
    │ значення     │──────────▶ (те саме)
    │ у межах?     │
    └──────┬───────┘
           │ так
           ▼
      рахувати далі
```

**Раннє повернення.** Кожна перевірка закінчується `return`, а не вкладеним
`else`. Якби ми писали вкладеними умовами, до моменту обчислення відступ
був би на п'ять рівнів. Такий стиль — «перевірив, не склалося, вийшов» —
робить код пласким і читабельним.

**`Focus()` після помилки.** Курсор сам стрибає в поле, де проблема.
Користувачеві не треба клацати мишею й шукати, що саме не так.

**`sender is Button button`.** Pattern matching, який ви вже знаєте.
Один обробник на чотири кнопки — не тому, що ліньки, а тому, що код кнопок
ідентичний і дублювати його немає сенсу. `Tag` зберігається як рядок
(у XAML усе спочатку рядок), тому й перевірка `is string`.

**Форматування `N2`.** Виводить число з двома знаками після коми
й розділенням тисяч: `1 234,55`. Для грошей це саме те, що треба.

**Вивід повідомлень не через окреме віконце.** Ми пишемо помилку прямо
у вікні — у `MessageTextBlock`. Це сучасніший підхід, ніж вискакувати
діалогом на кожну дрібницю: користувач бачить проблему поруч із формою
і не мусить клацати «OK».

:::tip Порада
Спробуйте прямо зараз розтягнути вікно за правий край. Поля розширяться
до `MaxWidth` і зупиняться, підписи лишаться на місці, кнопки внизу
поділять ширину в пропорції 1:2, а блок результатів триматиметься низу.
Нічого з цього ми не програмували — це зробили правила компонування. Саме
заради цього ми й возилися з `Grid` замість координат.
:::

:::info Цікаво
Спробуйте також натиснути Tab кілька разів. Фокус послідовно обійде поля
й кнопки в тому порядку, в якому вони оголошені в розмітці. Клавіатурна
навігація працює сама, без жодного рядка коду — WPF будує її з дерева
елементів. Якщо порядок треба змінити, є властивість `TabIndex`.
:::

## Що можна додати самостійно

Застосунок робочий, але його легко покращити — і кожне покращення
тренує щось одне:

1. **Округлення чайових угору до цілої гривні.** Додайте прапорець
   `CheckBox` і, якщо він відмічений, використайте
   `Math.Ceiling(tip)`.
2. **Заборонити вводити літери в поля.** Подія `PreviewTextInput`
   у `TextBox` дозволяє відхилити символ ще до того, як він з'явиться.
3. **Порахувати, скільки додати кожному, якщо скидаються рівними
   купюрами по 50 грн.**
4. **Кнопки «плюс» і «мінус» біля кількості людей** замість введення
   числа руками.

## Типові помилки

Це найважливіший розділ підрозділу — тут зібрані ті п'ять речей, через які
студенти справді втрачають час на лабораторній.

### Забутий InitializeComponent

Найпідступніша помилка WPF. Ви змінили конструктор — наприклад, дописали
свою ініціалізацію — і випадково прибрали або закоментували виклик.

```csharp
public MainWindow()
{
    // InitializeComponent();   // ← прибрали "зайвий" рядок
    BillTextBox.Text = "0";
}
```

Компілятор мовчить. Програма запускається. І одразу падає:

```
System.NullReferenceException: Object reference not set to an instance
of an object.
```

Причина: дерево елементів не побудоване, поле `BillTextBox` дорівнює `null`.
**`InitializeComponent()` має бути першим рядком конструктора вікна** —
до будь-якого звернення до елементів.

### Елемент без x:Name

```xml
<TextBox Padding="6,4"/>
```

```csharp
BillTextBox.Text = "";   // помилка збірки
```

```
CS0103: The name 'BillTextBox' does not exist in the current context
```

Поле класу створюється **тільки** для елементів, у яких є `x:Name`. Немає
імені — немає поля — немає доступу з коду. Додайте `x:Name="BillTextBox"`
у розмітку, перезберіть проєкт (Ctrl+Shift+B), і помилка зникне.

:::warning Обережно
Іноді ім'я вже додане, а IntelliSense його не бачить і підкреслює червоним.
Причина в тому, що файл `MainWindow.g.i.cs` ще не перегенеровано. Ліки:
зберегти файл розмітки і **зібрати проєкт**. Після збірки поле з'явиться.
Якщо не допомогло — Build → Rebuild Solution.
:::

### Grid без визначених рядків

```xml
<Grid>
    <TextBlock Grid.Row="0" Text="Сума"/>
    <TextBox   Grid.Row="1"/>
    <Button    Grid.Row="2" Content="Порахувати"/>
</Grid>
```

Помилки немає. Вікно відкривається. І в ньому видно лише кнопку — бо
в сітки один-єдиний рядок, і всі три елементи лежать у ньому один поверх
одного, а останній малюється зверху.

Правило: **`Grid.Row="N"` не створює рядка**. Рядки створює тільки
`Grid.RowDefinitions`. Забули їх оголосити — усе злиплося в комірці [0, 0].

### Фіксовані розміри замість зіркових

```xml
<Grid>
    <Grid.RowDefinitions>
        <RowDefinition Height="80"/>
        <RowDefinition Height="200"/>
        <RowDefinition Height="100"/>
    </Grid.RowDefinitions>
    ...
</Grid>
```

Виглядає ідеально — рівно доти, доки вікно має розмір 380 на 480. Розтягнули
вікно вниз — унизу з'явилася порожня сіра смуга. Зменшили — нижня частина
поїхала за край. На комп'ютері з масштабом 150 % текст не вміщається в рядки.

Правильно: `Auto` для того, що має природний розмір, `*` для того, що
має тягтися. Фіксовані числа — лише там, де розмір справді сталий
(лінія-роздільник заввишки 1, іконка 16 на 16).

### Пошук дизайнера з перетягуванням

Питання, яке звучить на кожній першій лабораторній: «а де тут Toolbox,
щоб перетягнути кнопку мишею?»

Відповідь: у WPF-проєкті на .NET 8 у Visual Studio 2022 дизайнер працює
**у режимі попереднього перегляду**. Вікно розділене навпіл: угорі ви бачите,
як виглядатиме вікно, унизу — розмітку. Зміни в розмітці одразу видно
у перегляді. Але перетягування елементів мишею з панелі на форму, як це
робилося у старих технологіях, тут немає, і інтерфейс пишуть руками.

І це нормально — більше того, так працюють професійно. Причини прості:

| Мишею | Руками в XAML |
|---|---|
| генерує координати або випадкові відступи | ви свідомо обираєте правило компонування |
| результат важко переглянути в Git-різниці | звичайний текстовий файл, різниця читається |
| скопіювати блок на інше вікно складно | Ctrl+C, Ctrl+V |
| перейменувати елемент — через вікно властивостей | Ctrl+H, заміна в тексті |

Перші два тижні писати розмітку руками незвично. Далі ви помічаєте, що
набрати п'ять рядків швидше, ніж три рази підвести мишу, і питання
відпадає само.

:::tip Порада
Щоб під час роботи над розміткою бачити більше коду, натисніть у нижній
частині вікна дизайнера кнопку вертикального розділення (Vertical Split) —
перегляд стане ліворуч, розмітка праворуч. А якщо перегляд гальмує на
слабкому ноутбуці, його можна згорнути зовсім: XAML чудово пишеться
й без нього, а результат ви побачите після F5.
:::
