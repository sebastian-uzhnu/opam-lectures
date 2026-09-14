---
sidebar_position: 3
---

# Контейнери, ресурси та стилі

Панелі компонування з теми 21 відповідають на питання «де стоїть елемент».
Контейнери з цього підрозділу відповідають на інше питання — «як користувач
розуміє, що ці п'ять елементів пов'язані між собою». А ресурси й стилі
відповідають на третє: «як зробити, щоб оформлення не було розмазане
по всій розмітці».

## Частина 1. Контейнери та групування

### Border — прямокутник з рамкою й заокругленням

`Border` уміє рівно три речі: намалювати фон, намалювати рамку та заокруглити
кути. І має рівно **одну** дитину. Це найуживаніший «декоративний» елемент WPF.

```xml
<Border Background="#F4F6F8"
        BorderBrush="#C9D2DC"
        BorderThickness="1"
        CornerRadius="8"
        Padding="14"
        Margin="0,0,0,12">
    <StackPanel>
        <TextBlock Text="Ваше замовлення" FontWeight="Bold"/>
        <TextBlock Text="3 позиції на суму 4 060 грн" Margin="0,4,0,0"/>
    </StackPanel>
</Border>
```

Чому `Border`, а не фон на самій панелі: у `StackPanel` і `Grid` немає
ні `BorderThickness`, ні `CornerRadius`, ні `Padding`. Тому стандартний
прийом — загорнути панель у `Border`.

### GroupBox — рамка з підписом

`GroupBox` — це `Border` із заголовком, вбудованим у верхню лінію рамки.
Використовують, коли групі елементів потрібна назва.

```xml
<GroupBox Header="Спосіб доставки" Padding="10" Margin="0,0,0,12">
    <StackPanel>
        <RadioButton Content="Кур'єр" IsChecked="True"/>
        <RadioButton Content="Поштове відділення"/>
        <RadioButton Content="Самовивіз"/>
    </StackPanel>
</GroupBox>
```

Додатковий бонус: `GroupBox` — це контейнер, тому `RadioButton` усередині
автоматично утворюють окрему групу, без `GroupName`.

### Expander — те, що можна згорнути

`Expander` показує заголовок і стрілочку. Клік розгортає вміст.
Незамінний для «додаткових налаштувань», які потрібні одному
користувачеві з десяти.

```xml
<Expander Header="Додаткові параметри" IsExpanded="False" Margin="0,0,0,12">
    <StackPanel Margin="20,8,0,0">
        <CheckBox Content="Надіслати чек на пошту"/>
        <CheckBox Content="Зателефонувати перед доставкою"/>
        <TextBlock Text="Коментар для кур'єра" Margin="0,8,0,2"/>
        <TextBox Height="50" AcceptsReturn="True" TextWrapping="Wrap"/>
    </StackPanel>
</Expander>
```

Властивість `ExpandDirection` дозволяє розгортати вміст не лише вниз,
а й убік — зручно для бічних панелей.

### TabControl — вкладки

Коли форма не влазить в один екран і ділиться на логічні розділи,
беруть `TabControl`. Кожна вкладка — це `TabItem` із власним `Header`.

```xml
<TabControl x:Name="SettingsTabs" SelectionChanged="SettingsTabs_SelectionChanged">
    <TabItem Header="Профіль">
        <StackPanel Margin="12">
            <TextBlock Text="Ім'я"/>
            <TextBox x:Name="ProfileNameTextBox"/>
        </StackPanel>
    </TabItem>
    <TabItem Header="Сповіщення">
        <StackPanel Margin="12">
            <CheckBox Content="Пошта" IsChecked="True"/>
            <CheckBox Content="Push-сповіщення"/>
        </StackPanel>
    </TabItem>
    <TabItem Header="Про програму">
        <TextBlock Margin="12" TextWrapping="Wrap"
                   Text="Навчальний застосунок, версія 1.0"/>
    </TabItem>
</TabControl>
```

```csharp
private void SettingsTabs_SelectionChanged(object sender,
                                           SelectionChangedEventArgs e)
{
    // e.Source перевіряємо, бо SelectionChanged спливає і від внутрішніх
    // списків усередині вкладок
    if (e.Source is TabControl tabs && tabs.SelectedItem is TabItem tab)
    {
        Title = $"Налаштування — {tab.Header}";
    }
}
```

:::warning Обережно
`TabControl` за замовчуванням **створює вміст вкладки лише при першому
її відкритті**. Якщо звернутися до `ProfileNameTextBox` із конструктора
вікна, коли активна інша вкладка, отримаєте `null`. Це та сама пастка,
що й з `Slider.ValueChanged`, — перевіряйте на `null`.
:::

### ScrollViewer — прокрутка

Якщо вміст може не поміститися, його загортають у `ScrollViewer`.

```xml
<ScrollViewer VerticalScrollBarVisibility="Auto"
              HorizontalScrollBarVisibility="Disabled">
    <StackPanel Margin="16">
        <!-- тут може бути хоч сто елементів -->
    </StackPanel>
</ScrollViewer>
```

:::danger Часта помилка
`ScrollViewer` дає своїй дитині **нескінченну** висоту. Тому якщо покласти
всередину `Grid` з `RowDefinition Height="*"` або `ListBox` без явної висоти,
прокрутка не з'явиться ніколи: вміст «розтягнеться» під власний розмір.
Загортайте у `ScrollViewer` те, що має природну висоту, — наприклад
`StackPanel`.
:::

### Порівняння контейнерів

| Контейнер | Дає рамку | Дає заголовок | Скільки дітей | Коли брати |
|---|---|---|---|---|
| `Border` | так, з `CornerRadius` | ні | одна | будь-яке візуальне оформлення блоку |
| `GroupBox` | так | так | одна | названа група полів або перемикачів |
| `Expander` | так | так, клікабельний | одна | необов'язкові налаштування |
| `TabControl` | так | вкладки | багато `TabItem` | форма з кількох розділів |
| `ScrollViewer` | ні | ні | одна | вміст може не поміститися |

## Частина 2. Ресурси

### Проблема

Подивіться на цю розмітку чесним поглядом:

```xml
<Button Content="Зберегти"  Background="#2E7D6F" Foreground="White" Padding="14,7"/>
<Button Content="Оновити"   Background="#2E7D6F" Foreground="White" Padding="14,7"/>
<Button Content="Надіслати" Background="#2E7D6F" Foreground="White" Padding="14,7"/>
<Border BorderBrush="#2E7D6F" BorderThickness="2"/>
<TextBlock Foreground="#2E7D6F" Text="Заголовок"/>
```

Колір `#2E7D6F` записано п'ять разів. У реальному вікні його буде разів
дванадцять, а у застосунку — сотні. Замовник каже: «зробіть фірмовий колір
трохи темнішим». Ви йдете шукати всі входження вручну, одне пропускаєте —
і в застосунку назавжди залишається кнопка «не того» зеленого.

Це та сама проблема, що й «магічні числа» у звичайному коді. І розв'язується
так само: дати значенню ім'я й оголосити його в одному місці.

### Словник ресурсів вікна

**Ресурс** — це іменований об'єкт, оголошений один раз і доступний
за іменем у будь-якому місці нижче по дереву.

```xml
<Window x:Class="ResourcesDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:sys="clr-namespace:System;assembly=System.Runtime"
        Title="Ресурси" Height="260" Width="380">

    <Window.Resources>
        <!-- Кожен ресурс ОБОВ'ЯЗКОВО має x:Key -->
        <SolidColorBrush x:Key="BrandBrush" Color="#2E7D6F"/>
        <SolidColorBrush x:Key="DangerBrush" Color="#B23A48"/>
        <Thickness x:Key="ButtonPadding">14,7</Thickness>
        <sys:Double x:Key="TitleFontSize">20</sys:Double>
        <sys:String x:Key="AppTitle">Облік замовлень</sys:String>
    </Window.Resources>

    <StackPanel Margin="16">
        <TextBlock Text="{StaticResource AppTitle}"
                   FontSize="{StaticResource TitleFontSize}"
                   Foreground="{StaticResource BrandBrush}"/>

        <Button Content="Зберегти"
                Background="{StaticResource BrandBrush}"
                Foreground="White"
                Padding="{StaticResource ButtonPadding}"
                Margin="0,12,0,0"/>

        <Button Content="Видалити"
                Background="{StaticResource DangerBrush}"
                Foreground="White"
                Padding="{StaticResource ButtonPadding}"
                Margin="0,8,0,0"/>
    </StackPanel>
</Window>
```

Тепер фірмовий колір записано **один раз**. Змінили один рядок — змінилося
все вікно.

### Де можна оголошувати ресурси

```
  Application.Resources   ◄── App.xaml, видно з УСЬОГО застосунку
         │
         ▼
  Window.Resources        ◄── видно в межах цього вікна
         │
         ▼
  Grid.Resources          ◄── видно в межах цієї панелі
         │
         ▼
  Button.Resources        ◄── видно лише всередині цієї кнопки
```

Пошук ресурсу йде **знизу вгору**: спочатку у власних ресурсах елемента,
потім у батька, потім вище, аж до `Application.Resources`. Перший знайдений
перемагає. Це дозволяє «перевизначити» ресурс для однієї частини вікна.

Ресурси застосунку оголошують у `App.xaml`:

```xml
<Application x:Class="ResourcesDemo.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             StartupUri="MainWindow.xaml">
    <Application.Resources>
        <SolidColorBrush x:Key="BrandBrush" Color="#2E7D6F"/>
    </Application.Resources>
</Application>
```

### StaticResource проти DynamicResource

| | `StaticResource` | `DynamicResource` |
|---|---|---|
| Коли шукається ресурс | один раз, при завантаженні XAML | щоразу, при кожному зверненні |
| Реагує на заміну ресурсу в коді | ні | так, оновлює елемент миттєво |
| Ресурс мусить бути оголошений вище за місцем використання | так | ні |
| Якщо ресурсу немає | помилка при завантаженні вікна | мовчки нічого не застосує |
| Швидкодія | висока | нижча, тримається живий зв'язок |
| Коли використовувати | у 95 % випадків | зміна теми на льоту, системні кольори |

Класичний сценарій, де потрібен саме динамічний ресурс, — **перемикання теми**:

```xml
<Window x:Class="ResourcesDemo.ThemeWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Теми" Height="200" Width="320"
        Background="{DynamicResource PageBackgroundBrush}">

    <Window.Resources>
        <SolidColorBrush x:Key="PageBackgroundBrush" Color="White"/>
        <SolidColorBrush x:Key="PageTextBrush" Color="#202020"/>
    </Window.Resources>

    <StackPanel Margin="16">
        <TextBlock Text="Перемикання теми на льоту"
                   Foreground="{DynamicResource PageTextBrush}"
                   FontSize="16"/>
        <Button Content="Темна тема" Margin="0,12,0,0" Padding="10,5"
                Click="DarkButton_Click"/>
        <Button Content="Світла тема" Margin="0,6,0,0" Padding="10,5"
                Click="LightButton_Click"/>
    </StackPanel>
</Window>
```

```csharp
using System.Windows;
using System.Windows.Media;

namespace ResourcesDemo;

public partial class ThemeWindow : Window
{
    public ThemeWindow()
    {
        InitializeComponent();
    }

    private void DarkButton_Click(object sender, RoutedEventArgs e)
    {
        // Підміняємо сам ресурс — усі DynamicResource оновляться самі
        Resources["PageBackgroundBrush"] =
            new SolidColorBrush(Color.FromRgb(0x20, 0x24, 0x28));
        Resources["PageTextBrush"] = Brushes.White;
    }

    private void LightButton_Click(object sender, RoutedEventArgs e)
    {
        Resources["PageBackgroundBrush"] = Brushes.White;
        Resources["PageTextBrush"] =
            new SolidColorBrush(Color.FromRgb(0x20, 0x20, 0x20));
    }
}
```

**Вивід:** натискання «Темна тема» миттєво перефарбовує вікно й текст.
Якби скрізь стояв `StaticResource`, не змінилося б нічого: значення
вже було прочитане один раз під час завантаження вікна.

### Окремий файл словника ресурсів

Коли ресурсів стає більше десятка, тримати їх в `App.xaml` незручно.
Їх виносять в окремий файл.

Створіть у проєкті файл `Styles/AppTheme.xaml` (Add — Resource Dictionary (WPF)):

```xml
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
                    xmlns:sys="clr-namespace:System;assembly=System.Runtime">

    <SolidColorBrush x:Key="BrandBrush" Color="#2E7D6F"/>
    <SolidColorBrush x:Key="BrandDarkBrush" Color="#25655A"/>
    <SolidColorBrush x:Key="DangerBrush" Color="#B23A48"/>
    <SolidColorBrush x:Key="SurfaceBrush" Color="#F4F6F8"/>
    <SolidColorBrush x:Key="BorderLineBrush" Color="#C9D2DC"/>

    <sys:Double x:Key="TitleFontSize">20</sys:Double>

</ResourceDictionary>
```

Підключення в `App.xaml` через **об'єднані словники**:

```xml
<Application x:Class="ResourcesDemo.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             StartupUri="MainWindow.xaml">
    <Application.Resources>
        <ResourceDictionary>
            <ResourceDictionary.MergedDictionaries>
                <ResourceDictionary Source="Styles/AppTheme.xaml"/>
                <ResourceDictionary Source="Styles/AppStyles.xaml"/>
            </ResourceDictionary.MergedDictionaries>

            <!-- Тут можна дописати ще ресурси, специфічні для застосунку -->
        </ResourceDictionary>
    </Application.Resources>
</Application>
```

:::tip Порада
Стандартна структура проєкту середнього розміру: `AppTheme.xaml` —
кольори й розміри, `AppStyles.xaml` — стилі елементів. Перший підключається
першим, бо другий на нього посилається. Порядок у `MergedDictionaries`
має значення.
:::

## Частина 3. Стилі

**Стиль** — це іменований набір значень властивостей, який можна застосувати
до багатьох елементів одразу. Якщо ресурс — це одне значення, то стиль —
це цілий «костюм».

### Іменований стиль

```xml
<Window.Resources>
    <SolidColorBrush x:Key="BrandBrush" Color="#2E7D6F"/>

    <Style x:Key="PrimaryButtonStyle" TargetType="Button">
        <Setter Property="Background" Value="{StaticResource BrandBrush}"/>
        <Setter Property="Foreground" Value="White"/>
        <Setter Property="Padding" Value="16,8"/>
        <Setter Property="FontSize" Value="14"/>
        <Setter Property="FontWeight" Value="SemiBold"/>
        <Setter Property="BorderThickness" Value="0"/>
        <Setter Property="Cursor" Value="Hand"/>
        <Setter Property="MinWidth" Value="110"/>
    </Style>
</Window.Resources>
```

Застосування — так само, як звичайний ресурс:

```xml
<Button Content="Зберегти" Style="{StaticResource PrimaryButtonStyle}"/>
<Button Content="Надіслати" Style="{StaticResource PrimaryButtonStyle}"/>
```

Вісім рядків оформлення перетворилися на один атрибут.

### Неявний стиль

Якщо в стилю є `TargetType`, але **немає** `x:Key`, він застосовується
до **всіх** елементів цього типу в зоні видимості — автоматично,
без жодного атрибута.

```xml
<Window.Resources>
    <!-- Усі TextBlock у вікні отримають ці налаштування -->
    <Style TargetType="TextBlock">
        <Setter Property="Margin" Value="0,0,0,4"/>
        <Setter Property="Foreground" Value="#303840"/>
    </Style>

    <!-- Усі TextBox стануть однаковими -->
    <Style TargetType="TextBox">
        <Setter Property="Padding" Value="6,4"/>
        <Setter Property="BorderBrush" Value="#C9D2DC"/>
        <Setter Property="Margin" Value="0,0,0,10"/>
    </Style>
</Window.Resources>
```

Неявний стиль зручний для базової типографіки, але з ним треба бути обережним:
він зачепить геть усі елементи типу, зокрема ті, що всередині інших контролів.

### BasedOn — успадкування стилів

Стилі можуть успадковуватися так само, як класи.

```xml
<Window.Resources>
    <SolidColorBrush x:Key="BrandBrush" Color="#2E7D6F"/>
    <SolidColorBrush x:Key="DangerBrush" Color="#B23A48"/>

    <!-- Базовий стиль: усе спільне -->
    <Style x:Key="BaseButtonStyle" TargetType="Button">
        <Setter Property="Foreground" Value="White"/>
        <Setter Property="Padding" Value="16,8"/>
        <Setter Property="FontSize" Value="14"/>
        <Setter Property="BorderThickness" Value="0"/>
        <Setter Property="MinWidth" Value="110"/>
        <Setter Property="Margin" Value="0,0,8,0"/>
        <Setter Property="Cursor" Value="Hand"/>
    </Style>

    <!-- Нащадки: тільки те, чим відрізняються -->
    <Style x:Key="PrimaryButtonStyle" TargetType="Button"
           BasedOn="{StaticResource BaseButtonStyle}">
        <Setter Property="Background" Value="{StaticResource BrandBrush}"/>
    </Style>

    <Style x:Key="DangerButtonStyle" TargetType="Button"
           BasedOn="{StaticResource BaseButtonStyle}">
        <Setter Property="Background" Value="{StaticResource DangerBrush}"/>
    </Style>

    <Style x:Key="GhostButtonStyle" TargetType="Button"
           BasedOn="{StaticResource BaseButtonStyle}">
        <Setter Property="Background" Value="Transparent"/>
        <Setter Property="Foreground" Value="#505A64"/>
        <Setter Property="BorderThickness" Value="1"/>
        <Setter Property="BorderBrush" Value="#C9D2DC"/>
    </Style>
</Window.Resources>
```

Три види кнопок, а спільні налаштування записані один раз.

:::info Цікаво
Щоб успадкувати **неявний** стиль (той, що без `x:Key`), використовують запис
`BasedOn="{StaticResource {x:Type Button}}"`. Ключем неявного стилю
є сам об'єкт типу, а не рядок.
:::

## Частина 4. Тригери

Сеттер задає значення назавжди. **Тригер** задає значення *за умовою*:
поки умова істинна — діє значення тригера, перестала бути істинною —
значення саме повертається як було. Нічого скидати вручну не треба.

```xml
<Style x:Key="PrimaryButtonStyle" TargetType="Button">
    <Setter Property="Background" Value="#2E7D6F"/>
    <Setter Property="Foreground" Value="White"/>
    <Setter Property="Padding" Value="16,8"/>
    <Setter Property="BorderThickness" Value="0"/>
    <Setter Property="Cursor" Value="Hand"/>

    <Style.Triggers>
        <!-- Миша над кнопкою -->
        <Trigger Property="IsMouseOver" Value="True">
            <Setter Property="Background" Value="#25655A"/>
        </Trigger>

        <!-- Кнопку затиснуто -->
        <Trigger Property="IsPressed" Value="True">
            <Setter Property="Background" Value="#1D5048"/>
            <Setter Property="Padding" Value="16,9,16,7"/>
        </Trigger>

        <!-- Кнопка вимкнена -->
        <Trigger Property="IsEnabled" Value="False">
            <Setter Property="Background" Value="#D3D9DF"/>
            <Setter Property="Foreground" Value="#8A939C"/>
            <Setter Property="Cursor" Value="Arrow"/>
        </Trigger>
    </Style.Triggers>
</Style>
```

Згадайте таблицю пріоритетів із попереднього підрозділу: тригер (рівень 3)
сильніший за сеттер стилю (рівень 4), тому під час наведення перемагає
`#25655A`. А от локальне значення `Background="White"` прямо на кнопці
переб'є **обидва** — і тригер не спрацює.

### MultiTrigger

Спрацьовує, лише коли істинні **всі** умови одночасно.

```xml
<Style.Triggers>
    <MultiTrigger>
        <MultiTrigger.Conditions>
            <Condition Property="IsMouseOver" Value="True"/>
            <Condition Property="IsEnabled" Value="True"/>
        </MultiTrigger.Conditions>
        <Setter Property="BorderBrush" Value="#25655A"/>
        <Setter Property="BorderThickness" Value="2"/>
    </MultiTrigger>
</Style.Triggers>
```

## Частина 5. Кисті та оформлення

### Кисті

**Кисть** (`Brush`) — це те, чим WPF зафарбовує площину. Усі властивості
кольору (`Background`, `Foreground`, `BorderBrush`, `Fill`) насправді
приймають не колір, а кисть.

```xml
<Window.Resources>
    <!-- Суцільний колір -->
    <SolidColorBrush x:Key="BrandBrush" Color="#2E7D6F"/>

    <!-- Лінійний градієнт: 0,0 — лівий верхній кут, 1,1 — правий нижній -->
    <LinearGradientBrush x:Key="HeaderBrush" StartPoint="0,0" EndPoint="1,1">
        <GradientStop Color="#2E7D6F" Offset="0"/>
        <GradientStop Color="#1B4F6B" Offset="1"/>
    </LinearGradientBrush>

    <!-- Градієнт із трьох кольорів, згори вниз -->
    <LinearGradientBrush x:Key="SunsetBrush" StartPoint="0,0" EndPoint="0,1">
        <GradientStop Color="#FFB75E" Offset="0"/>
        <GradientStop Color="#ED8F03" Offset="0.5"/>
        <GradientStop Color="#B23A48" Offset="1"/>
    </LinearGradientBrush>

    <!-- Зображення як заливка (файл має бути доданий у проєкт
         з Build Action = Resource) -->
    <ImageBrush x:Key="PatternBrush" ImageSource="Assets/pattern.png"
                TileMode="Tile" Stretch="None"
                Viewport="0,0,64,64" ViewportUnits="Absolute"/>
</Window.Resources>
```

Зверніть увагу: короткий запис `Background="Red"` — це той самий
`SolidColorBrush`, просто XAML дозволяє писати колір рядком.

### Шрифти

| Властивість | Що задає | Приклад значення |
|---|---|---|
| `FontFamily` | гарнітура | `Segoe UI`, `Verdana` |
| `FontSize` | розмір | `14` |
| `FontWeight` | насиченість | `Normal`, `SemiBold`, `Bold` |
| `FontStyle` | накреслення | `Normal`, `Italic` |
| `TextDecorations` | лінії | `Underline`, `Strikethrough` |

Оскільки всі властивості шрифту успадковуються, задавати їх варто
на `Window` або в неявному стилі, а не на кожному елементі.

### Заокруглення й тінь

`CornerRadius` є лише у `Border` (та ще в кількох елементів). Щоб заокруглити
кути кнопки чи поля, у стилі змінюють властивість `Border` усередині
їхнього шаблону — або просто загортають елемент у `Border`.

Тінь додає `Effect`:

```xml
<Border Background="White" CornerRadius="10" Padding="16">
    <Border.Effect>
        <DropShadowEffect Color="#404040"
                          Direction="270"
                          ShadowDepth="3"
                          BlurRadius="12"
                          Opacity="0.25"/>
    </Border.Effect>
    <TextBlock Text="Картка з тінню" FontSize="16"/>
</Border>
```

| Властивість `DropShadowEffect` | Сенс |
|---|---|
| `Direction` | напрямок у градусах: 270 — тінь падає вниз |
| `ShadowDepth` | наскільки тінь зміщена від об'єкта |
| `BlurRadius` | розмитість краю тіні |
| `Opacity` | прозорість, 0 — невидима, 1 — суцільна |

:::warning Обережно
`Effect` обраховується для кожного кадру відмальовування. Тінь на десяти
картках — нормально, тінь на кожному рядку списку з тисячі елементів
помітно гальмує інтерфейс. Використовуйте ефекти економно.
:::

## Частина 6. ControlTemplate — коротко

Стиль змінює **значення властивостей** елемента. Але сам вигляд кнопки —
прямокутник із рамкою, у центрі напис — лишається. Якщо вам потрібна
кругла кнопка, ніякий `Setter` не допоможе: круглості немає серед
властивостей `Button`.

| | `Style` | `ControlTemplate` |
|---|---|---|
| Що змінює | значення наявних властивостей | усю візуальну будову елемента |
| Можна зробити круглу кнопку | ні | так |
| Поведінка (клік, фокус) | зберігається | зберігається — логіка в класі, не в шаблоні |
| Складність | низька | висока |
| Як часто потрібен | щодня | коли дизайн справді нестандартний |

**Шаблон елемента керування** (`ControlTemplate`) — це опис того, з яких
геометричних фігур складається елемент. Логіка кнопки (реакція на клік,
подія `Click`) живе у класі `Button` і шаблоном не зачіпається.

```xml
<Window.Resources>
    <Style x:Key="CircleButtonStyle" TargetType="Button">
        <Setter Property="Width" Value="56"/>
        <Setter Property="Height" Value="56"/>
        <Setter Property="Foreground" Value="White"/>
        <Setter Property="FontSize" Value="24"/>
        <Setter Property="Cursor" Value="Hand"/>
        <Setter Property="Template">
            <Setter.Value>
                <ControlTemplate TargetType="Button">
                    <Grid>
                        <Ellipse x:Name="Circle" Fill="#2E7D6F"/>
                        <!-- ContentPresenter показує те, що лежить
                             у властивості Content кнопки -->
                        <ContentPresenter HorizontalAlignment="Center"
                                          VerticalAlignment="Center"/>
                    </Grid>

                    <!-- Тригери шаблону працюють з іменами всередині шаблону -->
                    <ControlTemplate.Triggers>
                        <Trigger Property="IsMouseOver" Value="True">
                            <Setter TargetName="Circle" Property="Fill"
                                    Value="#25655A"/>
                        </Trigger>
                        <Trigger Property="IsPressed" Value="True">
                            <Setter TargetName="Circle" Property="Fill"
                                    Value="#1D5048"/>
                        </Trigger>
                    </ControlTemplate.Triggers>
                </ControlTemplate>
            </Setter.Value>
        </Setter>
    </Style>
</Window.Resources>
```

```xml
<StackPanel Orientation="Horizontal" Margin="16">
    <Button Content="+" Style="{StaticResource CircleButtonStyle}"
            Margin="0,0,10,0" Click="AddButton_Click"/>
    <Button Content="−" Style="{StaticResource CircleButtonStyle}"
            Click="RemoveButton_Click"/>
</StackPanel>
```

**Вивід:** дві круглі зелені кнопки діаметром 56 пікселів, які темнішають
при наведенні й ще більше — при натисканні. Події `Click` працюють
абсолютно звичайно.

Два важливі елементи шаблону:

- `ContentPresenter` — «сюди підставиться `Content`». Без нього напис
  на кнопці зникне.
- `Setter TargetName="Circle"` — тригер шаблону вміє змінювати властивості
  іменованих частин усередині шаблону, чого звичайний тригер стилю не вміє.

:::danger Часта помилка
Замінивши `Template`, ви замінюєте вигляд **повністю**. Стандартна кнопка
вміє показувати фокус клавіатури, стан «вимкнено» й натискання — ваш шаблон
не вміє нічого з цього, поки ви самі не додасте відповідні тригери.
Тому шаблон пишуть лише тоді, коли стилю справді не вистачає.
:::

## Типові помилки

1. **Ресурс без `x:Key`.** Усе, крім стилів із `TargetType`, зобов'язане
   мати ключ. Інакше — помилка компіляції XAML.

2. **`StaticResource` на ресурс, оголошений нижче.** XAML читається
   згори вниз; статичний ресурс має існувати на момент читання.
   Тому блок `Window.Resources` завжди йде **перед** вмістом вікна,
   а всередині словника ресурс-залежність оголошують раніше за того,
   хто на нього посилається.

3. **Стиль без `TargetType`.** Тоді в `Setter` доводиться писати повне
   ім'я властивості (`Button.Background`), і будь-яка описка виявиться
   лише під час запуску. Завжди вказуйте `TargetType`.

4. **Локальне значення замість стилю.** `Background="White"` на елементі
   робить тригери стилю безсилими. Якщо оформленням керує стиль —
   у розмітці елемента кольорів бути не повинно.

5. **`DynamicResource` «про всяк випадок».** Він дорожчий і мовчки
   проковтує помилку в імені ресурсу. За замовчуванням — `StaticResource`,
   динамічний тільки там, де ресурс справді підмінюється у коді.

## Що далі

Усі інструменти зібрано. У наступному підрозділі ми складемо з них
одну справжню форму — і побачимо на цифрах, наскільки коротшою стає
розмітка, коли оформлення винесене у стилі.
