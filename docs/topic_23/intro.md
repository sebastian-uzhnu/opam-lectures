---
sidebar_position: 1
---

# Вікна та діалоги

## Одного вікна замало

Усе, що ви робили у темах 21 і 22, відбувалося в одному-єдиному вікні:
компонування, кнопки, стилі, ресурси, маршрутизовані події. Але реальний
застосунок так не живе. Натиснули «Налаштування» — відкрилося окреме вікно.
Натиснули «Відкрити файл» — з'явився стандартний діалог Windows. Спробували
закрити програму з незбереженим текстом — вискочило питання «Зберегти зміни?».

Усе це — **вікна**. І з цієї теми ваш застосунок перестає бути одним екраном
і стає програмою з нормальною структурою.

У WPF вікно — це об'єкт класу **`Window`**. Кожне вікно у проєкті складається
з тієї самої пари файлів, що й головне: `SomeWindow.xaml` (розмітка) та
`SomeWindow.xaml.cs` (code-behind). Ніякої магії: `MainWindow` — просто перше
вікно, яке застосунок показує на старті.

Хто вирішує, яке вікно перше? Файл `App.xaml`:

```xml
<Application x:Class="WindowsDemo.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             StartupUri="MainWindow.xaml">
    <Application.Resources>
    </Application.Resources>
</Application>
```

Атрибут `StartupUri` вказує на XAML-файл стартового вікна. Змінили його на
`LoginWindow.xaml` — і застосунок почнеться з вікна входу.

:::info Цікаво
Застосунок WPF за замовчуванням завершується, коли закривається **головне**
вікно (`Application.Current.MainWindow`). Цю поведінку задає властивість
`ShutdownMode`. Можливі значення: `OnLastWindowClose` (за замовчуванням —
поки живе хоч одне вікно, програма працює), `OnMainWindowClose`
(закрили головне — усе закрилось) і `OnExplicitShutdown` (програма
завершується лише після виклику `Application.Current.Shutdown()`).
:::

## Життєвий цикл вікна

Вікно не просто «з'являється». Від моменту створення об'єкта до зникнення
з екрана воно проходить кілька станів, і на кожному переході WPF викликає
подію. Якщо ви знаєте цю послідовність, ви точно знаєте, куди вставити свій код.

```
  new MyWindow()
        │
        ▼
  ┌───────────────┐
  │  Initialized  │  об'єкт створено, XAML розібрано,
  └───────┬───────┘  елементи існують, але розмірів ще немає
          │
          │  .Show()  або  .ShowDialog()
          ▼
  ┌───────────────┐
  │   Activated   │  вікно отримало фокус
  └───────┬───────┘
          ▼
  ┌───────────────┐
  │    Loaded     │  ◀── ТУТ завантажують дані:
  └───────┬───────┘      розміри пораховані, все готове
          ▼
  ┌────────────────┐
  │ ContentRendered│  перший кадр намальовано на екрані
  └───────┬────────┘
          │
          │   ... користувач працює ...
          │   Deactivated / Activated — перемикання фокуса
          │
          │  .Close()  або хрестик
          ▼
  ┌───────────────┐
  │    Closing    │  ◀── ТУТ можна СКАСУВАТИ закриття:
  └───────┬───────┘      e.Cancel = true
          │
          ▼  (якщо не скасовано)
  ┌───────────────┐
  │  Deactivated  │
  └───────┬───────┘
          ▼
  ┌───────────────┐
  │    Closed     │  вікно зникло, ресурси звільняються
  └───────────────┘
```

Кожна подія потрібна для своєї задачі:

| Подія | Коли спрацьовує | Навіщо на практиці |
| --- | --- | --- |
| `Initialized` | після розбору XAML, до показу | рідко; розміри ще не пораховані |
| `Activated` | вікно стало активним (отримало фокус) | оновити дані, поки користувача не було |
| `Loaded` | вікно готове до показу | завантажити список, поставити фокус у поле |
| `ContentRendered` | намальовано перший кадр | анімація появи, вимір швидкодії |
| `Deactivated` | фокус пішов на інше вікно | автозбереження чернетки |
| `Closing` | користувач попросив закрити | запитати підтвердження, **скасувати** закриття |
| `Closed` | вікно вже закрите | звільнити ресурси, записати лог |

:::warning Обережно
Не пишіть код ініціалізації в конструкторі після `InitializeComponent()`,
якщо він залежить від розмірів елементів. У конструкторі `ActualWidth`
та `ActualHeight` ще дорівнюють нулю — компонування не відпрацювало.
Для такого коду є подія `Loaded`.
:::

### Loaded: готуємо вікно до роботи

```xml
<Window x:Class="WindowsDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Життєвий цикл вікна" Height="240" Width="420"
        Loaded="Window_Loaded"
        Closing="Window_Closing"
        Closed="Window_Closed">
    <StackPanel Margin="16">
        <TextBlock Text="Ваше ім'я:" />
        <TextBox x:Name="NameBox" Margin="0,4,0,12" />
        <TextBlock x:Name="StatusText" Foreground="Gray" />
    </StackPanel>
</Window>
```

```csharp
using System.ComponentModel;
using System.Windows;

namespace WindowsDemo;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private void Window_Loaded(object sender, RoutedEventArgs e)
    {
        // Вікно готове: можна ставити фокус і показувати розміри
        NameBox.Focus();
        StatusText.Text = $"Ширина вікна: {ActualWidth} пікселів";
    }

    private void Window_Closing(object sender, CancelEventArgs e)
    {
        // Поки що просто пропускаємо закриття далі
    }

    private void Window_Closed(object sender, EventArgs e)
    {
        // Вікна вже немає на екрані
    }
}
```

### Closing: як скасувати закриття

Це найкорисніша подія з усього списку. Її аргумент — `CancelEventArgs`
(простір імен `System.ComponentModel`), і в нього є властивість `Cancel`.
Поставили `e.Cancel = true` — вікно **не закриється**.

Класичний сценарій: у текстовому полі є незбережені зміни.

```csharp
private bool hasUnsavedChanges = true;   // для прикладу — одразу true

private void Window_Closing(object sender, CancelEventArgs e)
{
    if (!hasUnsavedChanges)
        return;                  // немає що зберігати — закриваємось мовчки

    var answer = MessageBox.Show(
        "Документ змінено. Зберегти зміни перед виходом?",
        "Незбережені зміни",
        MessageBoxButton.YesNoCancel,
        MessageBoxImage.Warning);

    switch (answer)
    {
        case MessageBoxResult.Yes:
            SaveDocument();      // зберегли і виходимо
            break;

        case MessageBoxResult.No:
            break;               // виходимо без збереження

        case MessageBoxResult.Cancel:
            e.Cancel = true;     // ПЕРЕДУМАЛИ: вікно лишається відкритим
            break;
    }
}

private void SaveDocument()
{
    hasUnsavedChanges = false;
}
```

:::danger Часта помилка
Студенти часто пишуть перевірку в `Closed` замість `Closing`. У `Closed`
вікно вже закрите — скасовувати нічого. Властивість `Cancel` є лише
в аргументах `Closing`, бо тільки там ще є що скасовувати.
:::

## Show проти ShowDialog

Показати вікно можна двома методами, і різниця між ними — принципова.

```csharp
var settings = new SettingsWindow();

settings.Show();        // немодально: код іде далі ОДРАЗУ
settings.ShowDialog();  // модально: код ЧЕКАЄ, поки вікно закриють
```

**Модальне вікно** — вікно, яке блокує роботу з рештою вікон застосунку,
доки його не закриють. **Немодальне** — вікно, яке працює паралельно
з іншими, ви вільно перемикаєтесь між ними.

```
        ShowDialog()  — МОДАЛЬНЕ
  ┌──────────────────────────────────┐
  │  Головне вікно                   │
  │  ┌────────────────────────────┐  │
  │  │  Діалог «Налаштування»     │  │   клік сюди ▶ ✖ ігнорується,
  │  │  [ Гаразд ] [ Скасувати ]  │  │   Windows «дзенькає»
  │  └────────────────────────────┘  │
  │   ✖ заблоковано ✖ заблоковано    │
  └──────────────────────────────────┘

  Потік виконання коду:

    var dlg = new SettingsWindow();
    dlg.ShowDialog();    ◀── код СТОЇТЬ тут, поки вікно відкрите
    // сюди потрапимо лише після закриття діалогу
    MessageBox.Show("Діалог закрито");


        Show()  — НЕМОДАЛЬНЕ
  ┌─────────────────┐     ┌─────────────────┐
  │  Головне вікно  │ ◀─▶ │  Вікно довідки  │   обидва активні,
  │   працює        │     │   працює        │   можна клацати в обох
  └─────────────────┘     └─────────────────┘

    var help = new HelpWindow();
    help.Show();         ◀── код НЕ чекає
    MessageBox.Show("Цей рядок виконається одразу");
```

| Ознака | `Show()` | `ShowDialog()` |
| --- | --- | --- |
| Тип вікна | немодальне | модальне |
| Тип, що повертається | `void` | `bool?` |
| Чи блокує інші вікна | ні | так, усі вікна застосунку |
| Чи чекає код | ні, іде далі одразу | так, стоїть до закриття |
| Чи можна читати дані одразу після виклику | **ні** (вікно ще живе) | так |
| `DialogResult` | кидає виняток | працює |
| Типове застосування | довідка, плаваюча панель, друге робоче вікно | налаштування, вхід, «Додати запис», підтвердження |

:::tip Порада
Просте правило: якщо вам **потрібна відповідь** від користувача, щоб
продовжити роботу, — `ShowDialog()`. Якщо вікно просто «живе поруч» —
`Show()`.
:::

## DialogResult: відповідь діалогу

Метод `ShowDialog()` повертає `bool?` — тобто значення, яке має три
можливі стани: `true`, `false` і `null`.

| Значення | Що означає |
| --- | --- |
| `true` | користувач підтвердив (натиснув «Гаразд») |
| `false` | користувач відмовився (натиснув «Скасувати») |
| `null` | вікно закрили хрестиком або через `Close()` |

Усередині діалогу цей результат задають через властивість вікна
`DialogResult`:

```csharp
// у коді дочірнього вікна SettingsWindow
private void OkButton_Click(object sender, RoutedEventArgs e)
{
    DialogResult = true;   // вікно ЗАКРИЄТЬСЯ САМЕ, Close() писати не треба
}
```

А в батьківському вікні результат перевіряють так:

```csharp
private void OpenSettings_Click(object sender, RoutedEventArgs e)
{
    var dlg = new SettingsWindow();
    dlg.Owner = this;                 // хто «батько» цього діалогу

    if (dlg.ShowDialog() == true)     // порівнюємо саме з true!
    {
        MessageBox.Show("Налаштування збережено");
    }
    else
    {
        MessageBox.Show("Скасовано");
    }
}
```

:::danger Часта помилка
`if (dlg.ShowDialog())` **не скомпілюється**: `bool?` не можна напряму
підставити в `if`. Пишіть `if (dlg.ShowDialog() == true)`. Так само
не можна встановлювати `DialogResult` у вікні, показаному через `Show()` —
це кидає `InvalidOperationException` з текстом про немодальне вікно.
:::

## Корисні властивості вікна

Вікно налаштовується десятком властивостей прямо в XAML. Ось ті, які
знадобляться вже сьогодні.

| Властивість | Значення | Що робить |
| --- | --- | --- |
| `WindowStartupLocation` | `Manual`, `CenterScreen`, `CenterOwner` | де з'явиться вікно |
| `ResizeMode` | `NoResize`, `CanMinimize`, `CanResize`, `CanResizeWithGrip` | чи можна змінювати розмір |
| `WindowState` | `Normal`, `Minimized`, `Maximized` | згорнуте, звичайне, розгорнуте |
| `SizeToContent` | `Manual`, `Width`, `Height`, `WidthAndHeight` | вікно підганяє розмір під вміст |
| `Owner` | інше вікно | хто «господар»; дочірнє завжди поверх нього |
| `Topmost` | `true` / `false` | вікно поверх усіх програм Windows |
| `ShowInTaskbar` | `true` / `false` | чи є значок на панелі задач |
| `WindowStyle` | `SingleBorderWindow`, `ToolWindow`, `None`, `ThreeDBorderWindow` | вигляд рамки |

Типовий діалог виглядає так:

```xml
<Window x:Class="WindowsDemo.SettingsWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Налаштування"
        SizeToContent="WidthAndHeight"
        ResizeMode="NoResize"
        WindowStartupLocation="CenterOwner"
        ShowInTaskbar="False">
    <StackPanel Margin="16" MinWidth="260">
        <CheckBox x:Name="AutoSaveBox" Content="Автозбереження" />
        <StackPanel Orientation="Horizontal"
                    HorizontalAlignment="Right" Margin="0,16,0,0">
            <Button Content="Гаразд" Width="90" IsDefault="True" />
            <Button Content="Скасувати" Width="90" Margin="8,0,0,0" IsCancel="True" />
        </StackPanel>
    </StackPanel>
</Window>
```

:::warning Обережно
`WindowStartupLocation="CenterOwner"` працює лише тоді, коли ви справді
задали `Owner`. Без власника вікно з'явиться там, де вирішить Windows —
часто в лівому верхньому куті екрана, а не по центру батьківського вікна.
:::

## MessageBox: найшвидший діалог

`MessageBox` — статичний клас із простору імен `System.Windows`. Створювати
об'єкт не потрібно, просто викликаєте `Show`.

```csharp
// 1. Тільки текст
MessageBox.Show("Файл збережено.");

// 2. Текст + заголовок вікна
MessageBox.Show("Файл збережено.", "Успіх");

// 3. + набір кнопок
MessageBox.Show("Видалити запис?", "Підтвердження", MessageBoxButton.YesNo);

// 4. + іконка
MessageBox.Show("Запис видалено назавжди.", "Увага",
                MessageBoxButton.OK, MessageBoxImage.Warning);

// 5. + кнопка за замовчуванням (та, на якій одразу стоїть фокус)
MessageBox.Show("Форматувати диск?", "Небезпека",
                MessageBoxButton.YesNo, MessageBoxImage.Stop,
                MessageBoxResult.No);

// 6. + власник (діалог з'явиться по центру вашого вікна)
MessageBox.Show(this, "Готово.", "Інформація",
                MessageBoxButton.OK, MessageBoxImage.Information);
```

Набори кнопок — перелік `MessageBoxButton`:

| Значення | Кнопки у вікні |
| --- | --- |
| `OK` | Гаразд |
| `OKCancel` | Гаразд, Скасувати |
| `YesNo` | Так, Ні |
| `YesNoCancel` | Так, Ні, Скасувати |

Іконки — перелік `MessageBoxImage`:

| Значення | Вигляд | Коли доречно |
| --- | --- | --- |
| `None` | без іконки | нейтральне повідомлення |
| `Information` (=`Asterisk`) | синє «i» | просто інформуємо |
| `Question` | знак питання | питання з відповіддю Так/Ні |
| `Warning` (=`Exclamation`) | жовтий трикутник | дія може нашкодити |
| `Error` (=`Hand`, `Stop`) | червоне коло | сталася помилка |

Відповідь користувача — перелік `MessageBoxResult`: `OK`, `Cancel`, `Yes`,
`No`, `None`.

```csharp
var answer = MessageBox.Show(
    "Видалити вибраний файл? Цю дію не можна скасувати.",
    "Підтвердження видалення",
    MessageBoxButton.YesNo,
    MessageBoxImage.Warning);

if (answer == MessageBoxResult.Yes)
{
    // видаляємо
}
```

:::tip Порада
Не показуйте `MessageBox` на кожен чих. Повідомлення зупиняє роботу
користувача. Для дрібних новин («Знайдено 12 записів») краще підходить
рядок стану `StatusBar` — про нього у підрозділі про меню.
:::

## OpenFileDialog і SaveFileDialog

Це не WPF-класи, а обгортки над стандартними діалогами Windows. Живуть
вони у просторі імен **`Microsoft.Win32`**, і його треба підключити явно:

```csharp
using Microsoft.Win32;
```

Обидва класи мають схожий набір властивостей:

| Властивість | Призначення |
| --- | --- |
| `Title` | заголовок вікна діалогу |
| `Filter` | які типи файлів показувати |
| `FilterIndex` | який фільтр вибрано спочатку (нумерація з 1) |
| `InitialDirectory` | папка, з якої почати |
| `FileName` | обраний файл (повний шлях) |
| `FileNames` | усі обрані файли, якщо `Multiselect = true` |
| `Multiselect` | лише в `OpenFileDialog`: дозволити кілька файлів |
| `DefaultExt` | лише в `SaveFileDialog`: розширення за замовчуванням |
| `AddExtension` | дописати розширення, якщо користувач його не ввів |

Формат рядка `Filter` — це пари «опис|маска», склеєні вертикальними рисками:

```csharp
dialog.Filter = "Текстові файли (*.txt)|*.txt|Усі файли (*.*)|*.*";
//                 ↑ опис для людини     ↑ маска   ↑ друга пара
```

Метод `ShowDialog()` повертає `bool?` — так само, як у звичайного вікна:
`true` означає «користувач вибрав файл і натиснув кнопку», усе інше —
«передумав».

:::info Цікаво
У WPF ці діалоги **не** треба загортати в `using`: класи `OpenFileDialog`
і `SaveFileDialog` з `Microsoft.Win32` не реалізують `IDisposable`.
У .NET 8 до них додався ще й `OpenFolderDialog` — для вибору папки,
якого історично дуже бракувало.
:::

## Робочий приклад: відкрити і зберегти текстовий файл

Складемо все разом. Вікно з великим текстовим полем і двома кнопками:
«Відкрити» читає файл у поле, «Зберегти як» записує вміст поля в новий файл.
Обидві операції загорнуті в `try`/`catch` — файл може зникнути, бути
зайнятим іншою програмою або недоступним через права.

```xml
<Window x:Class="FileDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Простий переглядач тексту" Height="420" Width="640"
        WindowStartupLocation="CenterScreen">
    <DockPanel Margin="8">

        <StackPanel DockPanel.Dock="Top" Orientation="Horizontal"
                    Margin="0,0,0,8">
            <Button x:Name="OpenButton" Content="Відкрити..." Width="120"
                    Click="OpenButton_Click" />
            <Button x:Name="SaveButton" Content="Зберегти як..." Width="120"
                    Margin="8,0,0,0" Click="SaveButton_Click" />
        </StackPanel>

        <TextBlock x:Name="StatusText" DockPanel.Dock="Bottom"
                   Foreground="DimGray" Margin="2,6,0,0"
                   Text="Файл не відкрито" />

        <TextBox x:Name="ContentBox"
                 AcceptsReturn="True"
                 TextWrapping="Wrap"
                 VerticalScrollBarVisibility="Auto"
                 FontFamily="Consolas" FontSize="14" />
    </DockPanel>
</Window>
```

```csharp
using System.IO;
using System.Windows;
using Microsoft.Win32;

namespace FileDemo;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private void OpenButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog
        {
            Title = "Виберіть текстовий файл",
            Filter = "Текстові файли (*.txt)|*.txt|Усі файли (*.*)|*.*",
            InitialDirectory = Environment.GetFolderPath(
                                   Environment.SpecialFolder.MyDocuments)
        };

        // Користувач передумав — просто виходимо
        if (dialog.ShowDialog() != true)
            return;

        try
        {
            ContentBox.Text = File.ReadAllText(dialog.FileName);
            StatusText.Text = $"Відкрито: {dialog.FileName}";
        }
        catch (FileNotFoundException)
        {
            MessageBox.Show("Файл не знайдено. Можливо, його перемістили.",
                            "Помилка", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        catch (IOException ex)
        {
            MessageBox.Show($"Не вдалося прочитати файл:\n{ex.Message}",
                            "Помилка", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        catch (UnauthorizedAccessException)
        {
            MessageBox.Show("Немає прав на читання цього файлу.",
                            "Помилка", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new SaveFileDialog
        {
            Title = "Зберегти як",
            Filter = "Текстові файли (*.txt)|*.txt|Усі файли (*.*)|*.*",
            DefaultExt = "txt",
            AddExtension = true,
            FileName = "новий-документ.txt"
        };

        if (dialog.ShowDialog() != true)
            return;

        try
        {
            File.WriteAllText(dialog.FileName, ContentBox.Text);
            StatusText.Text = $"Збережено: {dialog.FileName}";

            MessageBox.Show(this,
                $"Файл збережено.\nСимволів: {ContentBox.Text.Length}",
                "Готово", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (IOException ex)
        {
            MessageBox.Show($"Не вдалося записати файл:\n{ex.Message}",
                            "Помилка", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        catch (UnauthorizedAccessException)
        {
            MessageBox.Show("Немає прав на запис у цю папку. Виберіть іншу.",
                            "Помилка", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
}
```

Приблизний вигляд вікна:

```
┌─ Простий переглядач тексту ───────────────────── ─ □ ✕ ┐
│  [ Відкрити... ]  [ Зберегти як... ]                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Ліси притихли, ждуть зими.                          │ │
│ │ Ще вчора тут лунали голоси...                       │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ Відкрито: C:\Users\Student\Documents\вірш.txt            │
└─────────────────────────────────────────────────────────┘
```

Зверніть увагу на дві речі. По-перше, перевірка `if (dialog.ShowDialog() != true)`
з раннім `return` — так код не влазить у зайвий рівень вкладеності.
По-друге, `catch` ловить конкретні винятки, а не `Exception` загалом:
користувачеві корисніше прочитати «немає прав на запис», ніж «сталася помилка».

## Типові помилки

1. **Перевірка в `Closed` замість `Closing`.** У `Closed` скасувати вже нічого,
   властивість `Cancel` існує лише в аргументах `Closing`.

2. **`if (dialog.ShowDialog())`.** `ShowDialog()` повертає `bool?`, а не `bool`.
   Правильно: `if (dialog.ShowDialog() == true)`.

3. **`DialogResult = true` у вікні, показаному через `Show()`.**
   Кидає `InvalidOperationException`. `DialogResult` має сенс тільки для
   модальних вікон.

4. **Діалог без `Owner`.** Вікно з'являється невідомо де, а `CenterOwner`
   не працює. Ставте `dlg.Owner = this;` перед `ShowDialog()`.

5. **Читання файлу без `try`/`catch`.** Файл на флешці, флешку витягнули —
   застосунок падає з незрозумілим вікном .NET замість ввічливого повідомлення.
