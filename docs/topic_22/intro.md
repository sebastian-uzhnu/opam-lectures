---
sidebar_position: 1
---

# Елементи керування WPF

У минулій темі ви навчилися розкладати вікно на частини: `Grid`, `StackPanel`,
`DockPanel`, рядки й стовпці, відступи. Панелі — це полиці. Тепер настав час
поставити на ці полиці справжні речі: поля для введення, кнопки, списки, повзунки.

**Елемент керування** (control) — це готовий візуальний компонент, який уміє
показати себе на екрані й відреагувати на дії користувача. WPF дає кілька десятків
таких компонентів «з коробки», і майже будь-який інтерфейс збирається з дванадцяти
найуживаніших. Саме їх ми й розберемо.

## Дві родини елементів

Перш ніж дивитися на конкретні кнопки й поля, корисно зрозуміти, що майже всі
елементи WPF належать до однієї з двох родин. Це пояснює, чому одні властивості
називаються `Text`, інші `Content`, а треті `ItemsSource`.

```
                         Control
                            │
        ┌───────────────────┴────────────────────┐
        ▼                                        ▼
  ContentControl                           ItemsControl
  «я показую ОДИН                          «я показую БАГАТО
   довільний вміст»                         однотипних елементів»
        │                                        │
  Button, Label,                           ListBox, ComboBox,
  CheckBox, RadioButton,                   TabControl, Menu
  GroupBox, Expander
        │                                        │
  властивість Content                      властивість ItemsSource
```

- **ContentControl** має властивість `Content`, у яку можна покласти що завгодно:
  рядок, число, картинку, цілу панель з іншими елементами. Саме тому кнопка може
  містити не лише напис, а й іконку поруч із написом.
- **ItemsControl** має властивість `ItemsSource` (або колекцію `Items`), куди
  складають набір однотипних об'єктів, і сам малює по одному рядку на кожен.

Окремо стоять елементи, які показують саме **текст** і мають властивість `Text`:
`TextBlock`, `TextBox`, `PasswordBox`. Вони не ContentControl — у них не можна
покласти картинку замість рядка.

:::info Цікаво
`TextBlock` узагалі не є `Control`. Він успадковується напряму від `FrameworkElement`
і тому не має ні рамки, ні шаблону, ні фокуса введення. Це зроблено навмисно:
підписів у вікні бувають сотні, і кожен зайвий кілобайт на підпис — це пам'ять
і час відмальовування.
:::

## Оглядова таблиця теми

| Елемент | Що це | Коли використовувати | Ключові властивості | Головна подія |
|---|---|---|---|---|
| `TextBlock` | легкий нередагований текст | будь-який підпис, заголовок, результат | `Text`, `TextWrapping`, `FontSize` | немає (не інтерактивний) |
| `Label` | підпис із підтримкою гарячої клавіші | підпис саме до поля введення | `Content`, `Target` | немає |
| `TextBox` | поле введення тексту | ім'я, коментар, число у вигляді тексту | `Text`, `AcceptsReturn`, `MaxLength` | `TextChanged` |
| `PasswordBox` | поле для пароля | пароль і тільки пароль | `Password`, `PasswordChar` | `PasswordChanged` |
| `Button` | кнопка-команда | «Зберегти», «Скасувати», «Порахувати» | `Content`, `IsDefault`, `IsCancel` | `Click` |
| `CheckBox` | прапорець | незалежна опція «так або ні» | `IsChecked`, `IsThreeState` | `Checked`, `Unchecked` |
| `RadioButton` | перемикач | один варіант із кількох | `IsChecked`, `GroupName` | `Checked` |
| `ComboBox` | випадний список | вибір одного значення, коли варіантів багато | `ItemsSource`, `SelectedItem`, `IsEditable` | `SelectionChanged` |
| `ListBox` | список із прокруткою | вибір одного або кількох із видимого списку | `ItemsSource`, `SelectedItems`, `SelectionMode` | `SelectionChanged` |
| `Slider` | повзунок | число в заданому діапазоні | `Minimum`, `Maximum`, `Value`, `TickFrequency` | `ValueChanged` |
| `ProgressBar` | індикатор виконання | показати прогрес, не приймає введення | `Minimum`, `Maximum`, `Value`, `IsIndeterminate` | немає |
| `DatePicker` | вибір дати | дата народження, дата замовлення | `SelectedDate`, `DisplayDateStart` | `SelectedDateChanged` |

Далі ми пройдемо по цій таблиці групами, і для кожної групи буде маленький
робочий приклад: повний XAML плюс повний code-behind.

## Група 1. Текст

### TextBlock проти Label — різниця, яку плутають усі

Обидва показують текст. Обидва не редагуються. Виглядають однаково. Тому
студенти беруть той, що першим трапився в списку елементів — і згодом дивуються,
чому довгий текст обрізається.

| Ознака | `TextBlock` | `Label` |
|---|---|---|
| Базовий клас | `FrameworkElement` (легкий) | `ContentControl` (повноцінний Control) |
| Властивість тексту | `Text` (рядок) | `Content` (будь-який об'єкт) |
| Перенесення рядків | так, `TextWrapping="Wrap"` | ні, вміст просто обрізається |
| Форматування частин тексту | так, через `Run`, `Bold`, `LineBreak` | ні |
| Гаряча клавіша (підкреслена літера) | ні | так, через `_` у тексті + `Target` |
| Сірішає разом із вимкненим полем | ні | так |
| Витрати пам'яті | мінімальні | помітно більші |

Правило на щодня:

- Показати текст — `TextBlock`.
- Підписати конкретне поле введення так, щоб `Alt` плюс літера переводили
  фокус у це поле — `Label`.

```xml
<Window x:Class="ControlsDemo.TextWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Текстові елементи" Height="360" Width="440">
    <StackPanel Margin="16">

        <!-- Заголовок: звичайний TextBlock із форматуванням частин -->
        <TextBlock FontSize="18" Margin="0,0,0,12" TextWrapping="Wrap">
            Анкета <Bold>нового користувача</Bold><LineBreak/>
            Заповніть усі поля, позначені зірочкою.
        </TextBlock>

        <!-- Label із гарячою клавішею: Alt+І переведе фокус у NameTextBox -->
        <Label Content="_Ім'я *" Target="{x:Reference NameTextBox}"/>
        <TextBox x:Name="NameTextBox" MaxLength="40"/>

        <Label Content="_Коментар" Target="{x:Reference CommentTextBox}"
               Margin="0,10,0,0"/>
        <TextBox x:Name="CommentTextBox"
                 Height="90"
                 AcceptsReturn="True"
                 TextWrapping="Wrap"
                 VerticalScrollBarVisibility="Auto"
                 SpellCheck.IsEnabled="True"/>

        <Label Content="_Пароль" Target="{x:Reference PasswordInput}"
               Margin="0,10,0,0"/>
        <PasswordBox x:Name="PasswordInput" PasswordChar="●" MaxLength="20"/>

        <Button x:Name="ShowButton" Content="Показати зведення"
                Margin="0,14,0,0" Padding="10,4" Click="ShowButton_Click"/>

        <TextBlock x:Name="ResultTextBlock" Margin="0,12,0,0"
                   TextWrapping="Wrap" Foreground="DarkSlateGray"/>
    </StackPanel>
</Window>
```

```csharp
using System.Windows;

namespace ControlsDemo;

public partial class TextWindow : Window
{
    public TextWindow()
    {
        InitializeComponent();
    }

    private void ShowButton_Click(object sender, RoutedEventArgs e)
    {
        // Текст беремо з властивості Text, пароль — із властивості Password
        var name = NameTextBox.Text.Trim();
        var comment = CommentTextBox.Text.Trim();
        var password = PasswordInput.Password;

        // Кількість рядків у багаторядковому полі
        var lineCount = CommentTextBox.LineCount;

        ResultTextBlock.Text =
            $"Ім'я: {name}\n" +
            $"Коментар: {lineCount} рядк(ів), {comment.Length} символів\n" +
            $"Пароль: {new string('*', password.Length)} ({password.Length} симв.)";
    }
}
```

**Вивід** (після введення «Оксана», двох рядків коментаря і пароля з 6 символів):

```
Ім'я: Оксана
Коментар: 2 рядк(ів), 47 символів
Пароль: ****** (6 симв.)
```

### Важливі деталі TextBox

- `AcceptsReturn="True"` — клавіша `Enter` додає новий рядок, а не «натискає»
  кнопку за замовчуванням. Без цього багаторядкове поле не працює як багаторядкове.
- `TextWrapping="Wrap"` — довгий рядок переноситься, а не тікає праворуч.
- `VerticalScrollBarVisibility="Auto"` — смуга прокрутки з'являється сама,
  коли тексту стає забагато.
- `MaxLength` — обмеження довжини на рівні елемента, дешевше за будь-яку перевірку.
- `IsReadOnly="True"` — текст видно й можна скопіювати, але не змінити.
  Це не те саме, що `IsEnabled="False"`: вимкнений елемент сірий і з нього
  не можна скопіювати текст.

:::warning Обережно
`PasswordBox.Password` — це **не** dependency property (про них у наступному
підрозділі), і зроблено це навмисно: щоб пароль не «осідав» у системі
властивостей і не потрапляв у прив'язки. Тому пароль завжди читають
із code-behind, як у прикладі вище.
:::

## Група 2. Команди: Button

Кнопка — найпростіший елемент теми і водночас той, у якому найбільше корисних
дрібниць.

```xml
<Window x:Class="ControlsDemo.ButtonWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Кнопки" Height="220" Width="380">
    <Grid Margin="16">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <TextBox x:Name="CityTextBox" Grid.Row="0" Text="Полтава"/>

        <TextBlock x:Name="StatusTextBlock" Grid.Row="1"
                   Margin="0,12" VerticalAlignment="Center"/>

        <StackPanel Grid.Row="2" Orientation="Horizontal"
                    HorizontalAlignment="Right">
            <!-- IsDefault: спрацьовує по Enter -->
            <Button x:Name="OkButton" Content="Зберегти"
                    IsDefault="True" Width="100" Margin="0,0,8,0"
                    Click="OkButton_Click"/>
            <!-- IsCancel: спрацьовує по Escape -->
            <Button x:Name="CancelButton" Content="Скасувати"
                    IsCancel="True" Width="100"
                    Click="CancelButton_Click"/>
        </StackPanel>
    </Grid>
</Window>
```

```csharp
using System.Windows;

namespace ControlsDemo;

public partial class ButtonWindow : Window
{
    public ButtonWindow()
    {
        InitializeComponent();
    }

    private void OkButton_Click(object sender, RoutedEventArgs e)
    {
        StatusTextBlock.Text = $"Збережено місто: {CityTextBox.Text}";
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        CityTextBox.Clear();
        StatusTextBlock.Text = "Скасовано.";
    }
}
```

Що тут варто запам'ятати:

- `IsDefault="True"` робить кнопку «кнопкою за замовчуванням»: натискання
  `Enter` у будь-якому місці вікна викликає її `Click`. У діалогах це завжди
  кнопка підтвердження.
- `IsCancel="True"` — те саме для `Escape`. Якщо вікно відкрите як діалог,
  така кнопка ще й автоматично його закриває.
- Кнопка — це ContentControl, тож у `Content` можна покласти панель:

```xml
<Button Padding="10,4">
    <StackPanel Orientation="Horizontal">
        <TextBlock Text="●" Foreground="SeaGreen" Margin="0,0,6,0"/>
        <TextBlock Text="Зберегти зміни"/>
    </StackPanel>
</Button>
```

- `IsEnabled="False"` робить кнопку сірою й недоступною. Це основний спосіб
  сказати «зараз цю дію виконати не можна».

## Група 3. Вибір

### CheckBox і тристановий режим

`CheckBox` має властивість `IsChecked` типу `bool?` — так, саме nullable.
Три можливі значення:

| Значення `IsChecked` | Вигляд | Сенс |
|---|---|---|
| `true` | галочка | опцію увімкнено |
| `false` | порожній квадрат | опцію вимкнено |
| `null` | квадрат із рискою | стан невизначений |

Третій стан доступний лише коли `IsThreeState="True"`. Він потрібен рідко,
але в одному сценарії незамінний: прапорець «вибрати все», коли вибрано
тільки частину пунктів.

### RadioButton і GroupName

Перемикачі за замовчуванням групуються **за батьківським контейнером**:
усі `RadioButton` в одному `StackPanel` — одна група. Якщо потрібні дві
незалежні групи в одному контейнері, задають `GroupName`.

### ComboBox і ListBox

- `ComboBox` — згорнутий список, займає один рядок. `IsEditable="True"`
  дозволяє ще й вписати власний варіант руками.
- `ListBox` — розгорнутий список. `SelectionMode="Multiple"` дозволяє
  вибрати кілька пунктів кліками, `SelectionMode="Extended"` — кліками
  із `Shift` і `Ctrl`, як у провіднику.

Складемо все разом.

```xml
<Window x:Class="ControlsDemo.ChoiceWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Вибір" Height="430" Width="440">
    <StackPanel Margin="16">

        <TextBlock Text="Спосіб доставки" FontWeight="Bold"/>
        <StackPanel Margin="0,4,0,10">
            <RadioButton x:Name="CourierRadio" GroupName="Delivery"
                         Content="Кур'єр" IsChecked="True"/>
            <RadioButton x:Name="PostRadio" GroupName="Delivery"
                         Content="Поштове відділення"/>
            <RadioButton x:Name="PickupRadio" GroupName="Delivery"
                         Content="Самовивіз"/>
        </StackPanel>

        <TextBlock Text="Оплата" FontWeight="Bold"/>
        <StackPanel Margin="0,4,0,10">
            <RadioButton x:Name="CardRadio" GroupName="Payment"
                         Content="Карткою онлайн" IsChecked="True"/>
            <RadioButton x:Name="CashRadio" GroupName="Payment"
                         Content="Готівкою при отриманні"/>
        </StackPanel>

        <CheckBox x:Name="GiftWrapCheck" Content="Подарункове пакування"/>
        <CheckBox x:Name="NewsletterCheck" Content="Отримувати новини"
                  IsThreeState="True" Margin="0,4,0,10"/>

        <TextBlock Text="Місто" FontWeight="Bold"/>
        <ComboBox x:Name="CityComboBox" IsEditable="True"
                  Margin="0,4,0,10"
                  SelectionChanged="CityComboBox_SelectionChanged"/>

        <TextBlock Text="Товари в кошику" FontWeight="Bold"/>
        <ListBox x:Name="ProductListBox" Height="110"
                 SelectionMode="Extended" Margin="0,4,0,10"/>

        <Button Content="Оформити" Padding="10,4" Click="OrderButton_Click"/>
        <TextBlock x:Name="OrderTextBlock" Margin="0,10,0,0" TextWrapping="Wrap"/>
    </StackPanel>
</Window>
```

### Як заповнити список із code-behind

Прив'язок даних ми ще не вивчали, тому список формуємо звичайним `List`
і кладемо його у властивість `ItemsSource`. Це не Binding — це просте
присвоєння властивості.

```csharp
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;

namespace ControlsDemo;

// Клас товару. Перевизначений ToString визначає,
// що саме користувач побачить у списку.
public class Product
{
    public string Name { get; set; } = "";
    public decimal Price { get; set; }

    public override string ToString() => $"{Name} — {Price:N2} грн";
}

public partial class ChoiceWindow : Window
{
    private readonly List<Product> products =
    [
        new Product { Name = "Навушники", Price = 1290m },
        new Product { Name = "Клавіатура", Price = 2450m },
        new Product { Name = "Килимок", Price = 320m },
        new Product { Name = "USB-хаб", Price = 890m }
    ];

    public ChoiceWindow()
    {
        InitializeComponent();

        // Найпростіший варіант: список рядків
        List<string> cities = ["Київ", "Львів", "Одеса", "Харків", "Полтава"];
        CityComboBox.ItemsSource = cities;
        CityComboBox.SelectedIndex = 0;

        // Список об'єктів: у списку покажеться те, що поверне ToString
        ProductListBox.ItemsSource = products;
    }

    private void CityComboBox_SelectionChanged(object sender,
                                               SelectionChangedEventArgs e)
    {
        // SelectedItem має тип object, тому перевіряємо тип через is
        if (CityComboBox.SelectedItem is string city)
        {
            Title = $"Замовлення — {city}";
        }
    }

    private void OrderButton_Click(object sender, RoutedEventArgs e)
    {
        // 1. Перемикачі: питаємо кожен, чи він вибраний
        var delivery = "не вибрано";
        if (CourierRadio.IsChecked == true) delivery = "кур'єр";
        else if (PostRadio.IsChecked == true) delivery = "пошта";
        else if (PickupRadio.IsChecked == true) delivery = "самовивіз";

        var payment = CardRadio.IsChecked == true ? "картка" : "готівка";

        // 2. Прапорці. IsChecked має тип bool?, тому порівнюємо з true
        var giftWrap = GiftWrapCheck.IsChecked == true ? "так" : "ні";

        var newsletter = NewsletterCheck.IsChecked switch
        {
            true => "підписано",
            false => "відмовлено",
            null => "вирішу пізніше"
        };

        // 3. Місто. ComboBox редагований, тож користувач міг вписати своє
        var city = CityComboBox.SelectedItem as string ?? CityComboBox.Text;

        // 4. Кілька вибраних товарів і сума
        decimal total = 0;
        var names = new List<string>();
        foreach (var item in ProductListBox.SelectedItems)
        {
            if (item is Product product)
            {
                total += product.Price;
                names.Add(product.Name);
            }
        }

        OrderTextBlock.Text =
            $"Місто: {city}\n" +
            $"Доставка: {delivery}, оплата: {payment}\n" +
            $"Пакування: {giftWrap}, новини: {newsletter}\n" +
            $"Товари ({names.Count}): {string.Join(", ", names)}\n" +
            $"Разом: {total:N2} грн";
    }
}
```

**Вивід** (вибрано Львів, пошта, картка, два товари, прапорець новин
залишено в невизначеному стані):

```
Місто: Львів
Доставка: пошта, оплата: картка
Пакування: ні, новини: вирішу пізніше
Товари (2): Навушники, Клавіатура
Разом: 3740,00 грн
```

:::tip Порада
Якщо не хочете перевизначати `ToString` (наприклад, клас чужий), скажіть
списку, яку властивість показувати, через `DisplayMemberPath`:
`ProductListBox.DisplayMemberPath = "Name";`. Це теж не Binding —
просто рядок з іменем властивості.
:::

:::danger Часта помилка
`IsChecked` має тип `bool?`, а не `bool`. Запис `if (GiftWrapCheck.IsChecked)`
не компілюється. Пишіть `if (GiftWrapCheck.IsChecked == true)` — і тоді
невизначений стан `null` коректно потрапить у гілку «ні».
:::

## Група 4. Числа й дати

### Slider

Повзунок дає число в заданому діапазоні. Користувач не може ввести
«сто мільйонів» або «абв» — сам елемент не дозволить. Це найдешевша валідація
на світі: її просто немає, бо некоректне значення неможливе.

### ProgressBar

Індикатор виконання. Приймає ті самі `Minimum`, `Maximum`, `Value`.
`IsIndeterminate="True"` перетворює його на «біжучий рядок» для випадків,
коли тривалість операції невідома.

### DatePicker

Поле з календариком. Головна властивість — `SelectedDate` типу `DateTime?`
(знову nullable: дату могли й не вибрати). `DisplayDateStart` і `DisplayDateEnd`
обмежують діапазон дат, доступних для вибору.

```xml
<Window x:Class="ControlsDemo.NumbersWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Числа та дати" Height="300" Width="420">
    <StackPanel Margin="16">

        <TextBlock x:Name="AmountTextBlock" Text="Сума: 5000 грн"
                   FontSize="15" Margin="0,0,0,4"/>
        <Slider x:Name="AmountSlider"
                Minimum="1000" Maximum="50000" Value="5000"
                TickFrequency="1000" TickPlacement="BottomRight"
                IsSnapToTickEnabled="True"
                ValueChanged="AmountSlider_ValueChanged"/>

        <TextBlock Text="Термін (місяців)" Margin="0,12,0,4"/>
        <Slider x:Name="MonthsSlider"
                Minimum="3" Maximum="36" Value="12"
                TickFrequency="3" IsSnapToTickEnabled="True"
                ValueChanged="AmountSlider_ValueChanged"/>

        <TextBlock Text="Дата початку" Margin="0,12,0,4"/>
        <DatePicker x:Name="StartDatePicker"
                    SelectedDateChanged="StartDatePicker_SelectedDateChanged"/>

        <TextBlock Text="Заповненість анкети" Margin="0,12,0,4"/>
        <ProgressBar x:Name="FillProgressBar" Height="18"
                     Minimum="0" Maximum="100" Value="0"/>

        <TextBlock x:Name="SummaryTextBlock" Margin="0,12,0,0"
                   TextWrapping="Wrap"/>
    </StackPanel>
</Window>
```

```csharp
using System;
using System.Windows;
using System.Windows.Controls;

namespace ControlsDemo;

public partial class NumbersWindow : Window
{
    public NumbersWindow()
    {
        InitializeComponent();

        // Дозволяємо вибирати лише дати від сьогодні й на рік уперед
        StartDatePicker.DisplayDateStart = DateTime.Today;
        StartDatePicker.DisplayDateEnd = DateTime.Today.AddYears(1);
        StartDatePicker.SelectedDate = DateTime.Today;

        UpdateSummary();
    }

    private void AmountSlider_ValueChanged(object sender,
        RoutedPropertyChangedEventArgs<double> e)
    {
        // Обробник викликається ще під час побудови вікна,
        // коли інші елементи можуть бути null
        if (AmountTextBlock is null) return;

        UpdateSummary();
    }

    private void StartDatePicker_SelectedDateChanged(object sender,
        SelectionChangedEventArgs e)
    {
        UpdateSummary();
    }

    private void UpdateSummary()
    {
        // Value має тип double — округлюємо до цілого
        var amount = (int)AmountSlider.Value;
        var months = (int)MonthsSlider.Value;

        AmountTextBlock.Text = $"Сума: {amount} грн";

        // SelectedDate має тип DateTime?
        var start = StartDatePicker.SelectedDate ?? DateTime.Today;
        var end = start.AddMonths(months);

        var monthly = amount / (double)months;

        SummaryTextBlock.Text =
            $"Щомісячний платіж: {monthly:N2} грн\n" +
            $"Період: {start:dd.MM.yyyy} — {end:dd.MM.yyyy}";

        // Просто демонстрація ProgressBar: заповненість форми
        var filled = 0;
        if (StartDatePicker.SelectedDate is not null) filled += 50;
        if (amount > 1000) filled += 50;
        FillProgressBar.Value = filled;
    }
}
```

**Вивід** (сума 12000, термін 12 місяців, дата 14.09.2026):

```
Сума: 12000 грн
Щомісячний платіж: 1000,00 грн
Період: 14.09.2026 — 14.09.2027
```

:::danger Часта помилка
Обробник `ValueChanged` у `Slider` спрацьовує **під час створення вікна**,
коли XAML присвоює початкове значення `Value="5000"`. У цей момент
`InitializeComponent` ще не дійшов до наступних елементів, і звертання
до них дає `NullReferenceException`. Саме тому в прикладі стоїть рядок
`if (AmountTextBlock is null) return;` — це стандартний захисний прийом.
:::

## Типові помилки

1. **`Label` для довгого тексту.** `Label` не переносить рядки: текст просто
   обрізається на межі елемента. Для абзацу — тільки `TextBlock`
   з `TextWrapping="Wrap"`.

2. **`TextBox` для пароля з `PasswordChar`.** У WPF у `TextBox` немає такої
   властивості взагалі. Пароль — це `PasswordBox` і властивість `Password`.

3. **Читання `ComboBox.SelectedItem` як рядка без перевірки.**
   `SelectedItem` має тип `object` і дорівнює `null`, поки нічого не вибрано.
   Пишіть `if (CityComboBox.SelectedItem is string city)`, а не
   `CityComboBox.SelectedItem.ToString()`.

4. **`RadioButton` без `GroupName` у спільній панелі.** Якщо два логічно
   різні набори перемикачів лежать в одному `StackPanel`, вони стають однією
   групою, і вибір способу оплати скидає вибір доставки. Або розкладіть їх
   по різних контейнерах, або задайте `GroupName`.

5. **Заповнення `ComboBox` через `Items.Add` після присвоєння `ItemsSource`.**
   Ці два способи взаємовиключні: після `ItemsSource` колекція `Items`
   стає лише для читання, і `Add` кидає виняток. Обирайте один підхід.

## Що далі

Ви навчилися ставити елементи у вікно й читати з них значення. Але залишилися
два питання, без яких WPF виглядає магією: чому властивості елементів
поводяться дивно (успадковуються, анімуються, перекриваються стилями)
і чому обробник кліку можна повісити не на кнопку, а на панель навколо неї.
Це **властивості залежності** та **маршрутизовані події** — тема наступного
підрозділу.
