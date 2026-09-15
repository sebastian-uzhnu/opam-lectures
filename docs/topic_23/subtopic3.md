---
sidebar_position: 4
---

# Навігація по сторінках і практичний приклад

## Коли вікон стає забагато

Уявіть застосунок «Довідник рослин»: список рослин, а по кліку — детальна
картка. Зробити картку окремим вікном можна, але користувачеві це незручно:
екран засипає вікнами, кожне треба закривати вручну, а щоб повернутися до
списку, доводиться шукати потрібне вікно серед інших.

Значно природніше — щоб **вміст одного вікна змінювався**, як у браузері:
натиснули посилання — з'явилась нова сторінка, натиснули «Назад» —
повернулися. Саме для цього у WPF є **навігація по сторінках**.

:::info[Цікаво]
У старих настільних застосунках для кількох документів в одному вікні
використовували підхід MDI (вікна всередині вікна). У WPF такого механізму
немає взагалі — і це свідома відмова: MDI вважають незручним. Замість нього
у WPF роблять вкладки (`TabControl`), окремі повноцінні вікна або
навігацію по сторінках, про яку цей підрозділ.
:::

## Page: сторінка замість вікна

**`Page`** — це елемент, схожий на вікно, але без власної рамки, заголовка
й кнопок згортання. Сторінка не існує сама по собі: її завжди хтось показує
всередині себе.

Додається так само, як вікно: Solution Explorer ▸ правою кнопкою на
проєкті ▸ Add ▸ Page (WPF).

```xml
<Page x:Class="GuideApp.PlantListPage"
      xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
      Title="Список рослин">
    <StackPanel Margin="16">
        <TextBlock Text="Оберіть рослину:" FontSize="16" Margin="0,0,0,8" />
        <ListBox x:Name="PlantsList" Height="160"
                 MouseDoubleClick="PlantsList_MouseDoubleClick">
            <ListBoxItem Content="Барвінок" />
            <ListBoxItem Content="Калина" />
            <ListBoxItem Content="Чебрець" />
        </ListBox>
        <Button Content="Детальніше" Margin="0,10,0,0"
                Click="DetailsButton_Click" />
    </StackPanel>
</Page>
```

Клас у code-behind успадковується від `Page`, а не від `Window`:

```csharp
public partial class PlantListPage : Page
{
    public PlantListPage()
    {
        InitializeComponent();
    }
}
```

Властивість `Title` сторінки — це не заголовок вікна, а **підпис у журналі
навігації**: саме він з'явиться у випадному списку історії переходів.

## Три способи показати сторінку

| Хост | Що це | Коли застосовувати |
| --- | --- | --- |
| `Frame` | «віконце» всередині звичайного `Window` | коли навігація потрібна лише в частині вікна |
| `NavigationWindow` | вікно, яке саме є навігатором | коли весь застосунок — послідовність сторінок |
| `Frame` у `Page` | вкладена навігація | рідко; складні майстри |

### Frame усередині вікна

Найгнучкіший варіант: звичайне вікно, а всередині — `Frame`, який показує
сторінки. Меню й панелі лишаються на місці, змінюється тільки центральна
частина.

```xml
<Window x:Class="GuideApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Довідник рослин" Height="420" Width="560">
    <DockPanel>
        <Menu DockPanel.Dock="Top">
            <MenuItem Header="_Навігація">
                <MenuItem Header="_Назад" Command="NavigationCommands.BrowseBack"
                          CommandTarget="{Binding ElementName=MainFrame}" />
                <MenuItem Header="_Уперед" Command="NavigationCommands.BrowseForward"
                          CommandTarget="{Binding ElementName=MainFrame}" />
            </MenuItem>
        </Menu>

        <Frame x:Name="MainFrame"
               Source="PlantListPage.xaml"
               NavigationUIVisibility="Automatic" />
    </DockPanel>
</Window>
```

Атрибут `Source` задає стартову сторінку. Властивість
**`NavigationUIVisibility`** керує вбудованою смужкою зі стрілками
«Назад/Уперед»:

| Значення | Поведінка |
| --- | --- |
| `Automatic` | смужка з'являється, щойно в журналі є куди йти |
| `Visible` | смужка видно завжди |
| `Hidden` | смужки немає; кнопки «Назад» робіть свої |

### NavigationWindow

Якщо весь застосунок — це послідовність сторінок (майстер налаштування,
опитувальник, кіоск), зручніше зробити головним вікном одразу
`NavigationWindow`. Тоді `Frame` не потрібен:

```xml
<NavigationWindow x:Class="GuideApp.MainNavWindow"
                  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
                  Title="Майстер налаштування"
                  Height="400" Width="520"
                  Source="Step1Page.xaml" />
```

У `App.xaml` при цьому вказують саме його: `StartupUri="MainNavWindow.xaml"`.

## NavigationService та журнал переходів

**`NavigationService`** — об'єкт, який виконує переходи. Кожна сторінка
має до нього доступ через властивість `NavigationService`; `Frame` і
`NavigationWindow` мають однойменну властивість теж.

```csharp
// Перехід на новий об'єкт сторінки
NavigationService.Navigate(new PlantDetailsPage("Калина"));

// Перехід за адресою XAML-файлу
NavigationService.Navigate(new Uri("PlantListPage.xaml", UriKind.Relative));

// Рух журналом
NavigationService.GoBack();
NavigationService.GoForward();

// Перевірка, чи є куди йти
if (NavigationService.CanGoBack)
    NavigationService.GoBack();
```

Журнал працює точно як у браузері:

```
   Користувач:   Список ──▶ Калина ──▶ Догляд

   Журнал:
     Назад ◀ [ Список ] [ Калина ] [ Догляд ] ▶ Уперед
                                       ▲
                                  поточна сторінка

   Натиснув «Назад» двічі:

     Назад ◀ [ Список ] [ Калина ] [ Догляд ] ▶ Уперед
                 ▲
            поточна сторінка       ── «Уперед» ще доступний

   Перейшов на НОВУ сторінку «Барвінок»:

     Назад ◀ [ Список ] [ Барвінок ]
                            ▲
                       гілка «Калина ▸ Догляд» СТЕРТА
```

:::warning[Обережно]
`NavigationService` дорівнює `null`, доки сторінку ще не показали.
У конструкторі сторінки його чіпати не можна — буде
`NullReferenceException`. Якщо перехід потрібен одразу після появи
сторінки, робіть це в обробнику події `Loaded`.
:::

Корисні події навігації: `Navigating` (перехід починається, можна
скасувати через `e.Cancel`), `Navigated` (перехід відбувся),
`LoadCompleted` (сторінка повністю завантажена).

## Передача параметрів між сторінками

Принцип той самий, що й між вікнами з попереднього підрозділу: **конструктор
уперед, подія назад**.

### Уперед: конструктор сторінки

```csharp
// Сторінка деталей приймає назву рослини
public partial class PlantDetailsPage : Page
{
    private readonly string plantName;

    public PlantDetailsPage(string name)
    {
        InitializeComponent();
        plantName = name;
        Title = $"Рослина: {name}";
        NameText.Text = name;
        DescriptionText.Text = GetDescription(name);
    }

    private static string GetDescription(string name) => name switch
    {
        "Барвінок" => "Вічнозелена рослина, символ вірності.",
        "Калина"   => "Кущ із червоними ягодами, символ України.",
        "Чебрець"  => "Запашна трава, яку заварюють як чай.",
        _          => "Опис поки що відсутній."
    };
}
```

Виклик зі сторінки списку:

```csharp
private void DetailsButton_Click(object sender, RoutedEventArgs e)
{
    if (PlantsList.SelectedItem is not ListBoxItem item)
    {
        MessageBox.Show("Оберіть рослину зі списку.", "Нічого не вибрано",
                        MessageBoxButton.OK, MessageBoxImage.Information);
        return;
    }

    var name = item.Content.ToString() ?? string.Empty;
    NavigationService.Navigate(new PlantDetailsPage(name));
}

private void PlantsList_MouseDoubleClick(object sender, MouseButtonEventArgs e)
{
    DetailsButton_Click(sender, e);
}
```

### Назад: подія сторінки

Щоб сторінка повідомила результат тому, хто її відкрив, використовують
подію — так само, як для немодального вікна:

```csharp
public partial class PlantDetailsPage : Page
{
    public event EventHandler<string>? PlantMarked;

    private void MarkButton_Click(object sender, RoutedEventArgs e)
    {
        PlantMarked?.Invoke(this, plantName);
        NavigationService.GoBack();
    }
}
```

```csharp
// на сторінці списку
var details = new PlantDetailsPage(name);
details.PlantMarked += (s, plant) => StatusText.Text = $"Позначено: {plant}";
NavigationService.Navigate(details);
```

:::tip[Порада]
Метод `Navigate` має перевантаження з другим параметром — `extraData`.
Ці дані потім доступні в події `LoadCompleted` через `e.ExtraData`.
Але для навчальних проєктів конструктор сторінки простіший і зрозуміліший:
типи перевіряє компілятор, а не ви очима.
:::

## Вікно чи сторінка

| Ознака | Окреме вікно | Сторінка у `Frame` |
| --- | --- | --- |
| Має власну рамку й заголовок | так | ні |
| Може бути модальним | так (`ShowDialog`) | ні |
| Журнал «Назад/Уперед» | немає | є |
| Кілька штук одночасно на екрані | так | ні, одна активна |
| Типове застосування | діалоги, другорядні вікна | майстри, довідники, кроки процесу |

## Практичний приклад: маленький текстовий редактор

Складемо все з теми в один застосунок: меню, панель інструментів, рядок
стану, команди з гарячими клавішами, запит на збереження при закритті
і власний діалог «Про програму».

### Макет вікна

```
┌─ Блокнот ОПАМ — без назви* ───────────────────── ─ □ ✕ ┐
│ Файл   Довідка                                          │
├─────────────────────────────────────────────────────────┤
│ [Створити] [Відкрити] [Зберегти]                        │
├─────────────────────────────────────────────────────────┤
│ Було колись — в Україні                                 │
│ Ревіли гармати;                                         │
│ Було колись — запорожці                                 │
│ Вміли пановати.                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Змінено           │ Символів: 96      │ без назви       │
└─────────────────────────────────────────────────────────┘
```

### Команди

```csharp
using System.Windows.Input;

namespace MiniEditor;

public static class EditorCommands
{
    public static readonly RoutedUICommand About = new RoutedUICommand(
        "Про програму", "About", typeof(EditorCommands),
        new InputGestureCollection { new KeyGesture(Key.F1) });
}
```

### Головне вікно: XAML

```xml
<Window x:Class="MiniEditor.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:MiniEditor"
        Title="Блокнот ОПАМ" Height="480" Width="680"
        WindowStartupLocation="CenterScreen"
        Closing="Window_Closing">

    <Window.CommandBindings>
        <CommandBinding Command="ApplicationCommands.New"
                        Executed="NewCommand_Executed" />
        <CommandBinding Command="ApplicationCommands.Open"
                        Executed="OpenCommand_Executed" />
        <CommandBinding Command="ApplicationCommands.Save"
                        Executed="SaveCommand_Executed"
                        CanExecute="SaveCommand_CanExecute" />
        <CommandBinding Command="ApplicationCommands.SaveAs"
                        Executed="SaveAsCommand_Executed" />
        <CommandBinding Command="ApplicationCommands.Close"
                        Executed="ExitCommand_Executed" />
        <CommandBinding Command="{x:Static local:EditorCommands.About}"
                        Executed="AboutCommand_Executed" />
    </Window.CommandBindings>

    <DockPanel>

        <Menu DockPanel.Dock="Top">
            <MenuItem Header="_Файл">
                <MenuItem Command="ApplicationCommands.New"    Header="_Створити" />
                <MenuItem Command="ApplicationCommands.Open"   Header="_Відкрити..." />
                <Separator />
                <MenuItem Command="ApplicationCommands.Save"   Header="З_берегти" />
                <MenuItem Command="ApplicationCommands.SaveAs" Header="Зберегти _як..." />
                <Separator />
                <MenuItem Command="ApplicationCommands.Close"  Header="Ви_хід" />
            </MenuItem>
            <MenuItem Header="_Довідка">
                <MenuItem Command="{x:Static local:EditorCommands.About}"
                          Header="_Про програму" />
            </MenuItem>
        </Menu>

        <ToolBarTray DockPanel.Dock="Top">
            <ToolBar>
                <Button Command="ApplicationCommands.New"
                        Content="Створити" ToolTip="Новий документ (Ctrl+N)" />
                <Button Command="ApplicationCommands.Open"
                        Content="Відкрити" ToolTip="Відкрити файл (Ctrl+O)" />
                <Button Command="ApplicationCommands.Save"
                        Content="Зберегти" ToolTip="Зберегти (Ctrl+S)" />
            </ToolBar>
        </ToolBarTray>

        <StatusBar DockPanel.Dock="Bottom">
            <StatusBarItem>
                <TextBlock x:Name="StatusText" Text="Готово" />
            </StatusBarItem>
            <Separator />
            <StatusBarItem>
                <TextBlock x:Name="CharCountText" Text="Символів: 0" />
            </StatusBarItem>
            <Separator />
            <StatusBarItem HorizontalAlignment="Right">
                <TextBlock x:Name="FileNameText" Text="без назви" />
            </StatusBarItem>
        </StatusBar>

        <TextBox x:Name="ContentBox"
                 AcceptsReturn="True" AcceptsTab="True"
                 TextWrapping="Wrap"
                 VerticalScrollBarVisibility="Auto"
                 FontFamily="Consolas" FontSize="14"
                 TextChanged="ContentBox_TextChanged" />

    </DockPanel>
</Window>
```

### Головне вікно: code-behind

```csharp
using System.ComponentModel;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Microsoft.Win32;

namespace MiniEditor;

public partial class MainWindow : Window
{
    private string? currentFilePath;   // null, якщо документ ще не зберігали
    private bool isModified;

    public MainWindow()
    {
        InitializeComponent();
        UpdateTitle();
    }

    // ---------- Команди ----------

    private void NewCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        if (!ConfirmSaveChanges())
            return;                    // користувач передумав

        ContentBox.Clear();
        currentFilePath = null;
        isModified = false;
        StatusText.Text = "Новий документ";
        UpdateTitle();
    }

    private void OpenCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        if (!ConfirmSaveChanges())
            return;

        var dialog = new OpenFileDialog
        {
            Title = "Відкрити документ",
            Filter = "Текстові файли (*.txt)|*.txt|Усі файли (*.*)|*.*"
        };

        if (dialog.ShowDialog() != true)
            return;

        try
        {
            ContentBox.Text = File.ReadAllText(dialog.FileName);
            currentFilePath = dialog.FileName;
            isModified = false;
            StatusText.Text = "Файл відкрито";
            UpdateTitle();
        }
        catch (IOException ex)
        {
            ShowError($"Не вдалося прочитати файл:\n{ex.Message}");
        }
        catch (UnauthorizedAccessException)
        {
            ShowError("Немає прав на читання цього файлу.");
        }
    }

    private void SaveCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        SaveDocument();
    }

    // Поки змін немає — пункт меню і кнопка «Зберегти» сірі
    private void SaveCommand_CanExecute(object sender, CanExecuteRoutedEventArgs e)
    {
        e.CanExecute = isModified;
    }

    private void SaveAsCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        SaveDocumentAs();
    }

    private void ExitCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        Close();                       // далі спрацює Window_Closing
    }

    private void AboutCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        var about = new AboutWindow { Owner = this };
        about.ShowDialog();
    }

    // ---------- Збереження ----------

    /// Зберігає документ. Повертає true, якщо збереження відбулося.
    private bool SaveDocument()
    {
        if (currentFilePath is null)
            return SaveDocumentAs();   // ще не мав імені — питаємо

        try
        {
            File.WriteAllText(currentFilePath, ContentBox.Text);
            isModified = false;
            StatusText.Text = "Збережено";
            UpdateTitle();
            return true;
        }
        catch (IOException ex)
        {
            ShowError($"Не вдалося зберегти файл:\n{ex.Message}");
            return false;
        }
    }

    private bool SaveDocumentAs()
    {
        var dialog = new SaveFileDialog
        {
            Title = "Зберегти як",
            Filter = "Текстові файли (*.txt)|*.txt|Усі файли (*.*)|*.*",
            DefaultExt = "txt",
            AddExtension = true,
            FileName = currentFilePath is null
                ? "без назви.txt"
                : Path.GetFileName(currentFilePath)
        };

        if (dialog.ShowDialog() != true)
            return false;

        currentFilePath = dialog.FileName;
        return SaveDocument();
    }

    /// Питає про незбережені зміни.
    /// Повертає false, якщо операцію треба СКАСУВАТИ.
    private bool ConfirmSaveChanges()
    {
        if (!isModified)
            return true;

        var answer = MessageBox.Show(this,
            "Документ змінено. Зберегти зміни?",
            "Незбережені зміни",
            MessageBoxButton.YesNoCancel,
            MessageBoxImage.Warning);

        return answer switch
        {
            MessageBoxResult.Yes    => SaveDocument(),   // зберегли — можна далі
            MessageBoxResult.No     => true,             // без збереження
            _                       => false             // Cancel або закрили хрестиком
        };
    }

    // ---------- Події вікна ----------

    private void Window_Closing(object sender, CancelEventArgs e)
    {
        if (!ConfirmSaveChanges())
            e.Cancel = true;           // лишаємось у програмі
    }

    private void ContentBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        isModified = true;
        CharCountText.Text = $"Символів: {ContentBox.Text.Length}";
        StatusText.Text = "Змінено";
        UpdateTitle();
    }

    // ---------- Дрібниці ----------

    private void UpdateTitle()
    {
        var name = currentFilePath is null
            ? "без назви"
            : Path.GetFileName(currentFilePath);

        FileNameText.Text = name;
        Title = isModified
            ? $"Блокнот ОПАМ — {name}*"
            : $"Блокнот ОПАМ — {name}";
    }

    private void ShowError(string message)
    {
        MessageBox.Show(this, message, "Помилка",
                        MessageBoxButton.OK, MessageBoxImage.Error);
    }
}
```

### Діалог «Про програму»

```xml
<Window x:Class="MiniEditor.AboutWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Про програму"
        SizeToContent="WidthAndHeight"
        ResizeMode="NoResize"
        WindowStartupLocation="CenterOwner"
        ShowInTaskbar="False">
    <StackPanel Margin="20" MinWidth="260">
        <TextBlock Text="Блокнот ОПАМ" FontSize="18" FontWeight="Bold" />
        <TextBlock Text="Версія 1.0" Margin="0,4,0,0" />
        <TextBlock Text="Навчальний проєкт до теми 23" Margin="0,4,0,0"
                   Foreground="DimGray" TextWrapping="Wrap" />
        <Button Content="Закрити" Width="90" Margin="0,16,0,0"
                HorizontalAlignment="Right"
                IsDefault="True" IsCancel="True" />
    </StackPanel>
</Window>
```

```csharp
using System.Windows;

namespace MiniEditor;

public partial class AboutWindow : Window
{
    public AboutWindow()
    {
        InitializeComponent();
    }
}
```

Зверніть увагу: у кнопки «Закрити» стоять одразу `IsDefault="True"` і
`IsCancel="True"`. І Enter, і Esc, і клік закривають вікно — жодного
рядка C# для цього не знадобилось.

### Що саме тут працює автоматично

- Ctrl+N, Ctrl+O, Ctrl+S — бо це вбудовані `ApplicationCommands`;
- F1 відкриває «Про програму» — бо так задано в `InputGestureCollection`;
- пункт меню «Зберегти» і кнопка на панелі сірі, поки текст не змінювався, —
  завдяки одному методу `SaveCommand_CanExecute`;
- хрестик, пункт «Вихід» і Alt+F4 ведуть в один і той самий `Window_Closing`;
- лічильник символів оновлюється на кожну зміну тексту.

## Типові помилки

1. **`ShowDialog()` без `Owner`.** Діалог з'являється не по центру
   батьківського вікна, а іноді й **за** ним — користувач думає, що
   програма зависла. Ставте `Owner = this` завжди.

2. **Читання даних дочірнього вікна після `Show()`.** `Show()` не чекає:
   на наступному рядку користувач ще нічого не ввів. Потрібен `ShowDialog()`
   або подія.

3. **Три обробники подій замість однієї команди.** Меню, панель і гаряча
   клавіша роблять те саме — значить, це `CommandBinding`, а не три методи,
   які потім забудеш синхронізувати.

4. **Забутий `e.Cancel` у `Closing`.** Класика: програма ввічливо питає
   «Зберегти зміни?», користувач тисне «Скасувати» — і програма все одно
   закривається, бо `e.Cancel = true` ніхто не написав.

5. **`DialogResult` у немодальному вікні.** Присвоєння `DialogResult`
   у вікні, показаному через `Show()`, кидає `InvalidOperationException`.
   Для немодального вікна результат повертають подією.

6. **`NavigationService` у конструкторі сторінки.** Він там ще `null`.
   Перехід одразу після появи сторінки робіть у події `Loaded`.
