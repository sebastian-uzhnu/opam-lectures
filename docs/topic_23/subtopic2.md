---
sidebar_position: 3
---

# Меню, панелі інструментів і команди

## Інтерфейс, який не вміщається у кнопки

Поки в застосунку три дії — вистачає трьох кнопок. Але щойно їх стає
двадцять, вікно перетворюється на панель приладів літака. Тому всі настільні
програми влаштовані однаково: **головне меню** зверху, **панель інструментів**
під ним із найчастішими діями, **контекстне меню** на правій кнопці миші
і **рядок стану** внизу.

```
┌─ Текстовий редактор ──────────────────────────── ─ □ ✕ ┐
│ Файл  Правка  Вигляд  Довідка         ◀── Menu          │
├─────────────────────────────────────────────────────────┤
│ [🗋] [📂] [💾] │ [✂] [⧉] [📋]          ◀── ToolBar       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   робоча область                                        │
│                          ┌──────────────┐               │
│                          │ Вирізати     │ ◀── ContextMenu│
│                          │ Копіювати    │               │
│                          │ Вставити     │               │
│                          └──────────────┘               │
├─────────────────────────────────────────────────────────┤
│ Готово          │ Символів: 128     │ Рядок 4  ◀ StatusBar
└─────────────────────────────────────────────────────────┘
```

Усі чотири елементи є у WPF «з коробки». Розберемо їх, а потім — головне:
як зробити так, щоб одна й та сама дія в усіх чотирьох місцях описувалась
**один раз**.

## Menu та MenuItem

**`Menu`** — контейнер головного меню. **`MenuItem`** — один пункт. Пункти
вкладаються один в одного скільки завгодно глибоко: `MenuItem` усередині
`MenuItem` стає підпунктом.

```xml
<Menu DockPanel.Dock="Top">

    <MenuItem Header="_Файл">
        <MenuItem Header="_Створити" InputGestureText="Ctrl+N"
                  Click="New_Click" />
        <MenuItem Header="_Відкрити..." InputGestureText="Ctrl+O"
                  Click="Open_Click" />
        <Separator />
        <MenuItem Header="З_берегти" InputGestureText="Ctrl+S"
                  Click="Save_Click" />
        <MenuItem Header="Зберегти _як..." Click="SaveAs_Click" />
        <Separator />
        <MenuItem Header="Останні файли">
            <MenuItem Header="вірш.txt" />
            <MenuItem Header="конспект.txt" />
        </MenuItem>
        <Separator />
        <MenuItem Header="Ви_хід" InputGestureText="Alt+F4"
                  Click="Exit_Click" />
    </MenuItem>

    <MenuItem Header="_Вигляд">
        <MenuItem x:Name="WrapItem" Header="Перенесення рядків"
                  IsCheckable="True" IsChecked="True"
                  Click="Wrap_Click" />
        <MenuItem x:Name="StatusBarItem" Header="Рядок стану"
                  IsCheckable="True" IsChecked="True"
                  Click="ToggleStatusBar_Click" />
        <Separator />
        <MenuItem Header="Шрифт..." IsEnabled="False" />
    </MenuItem>

    <MenuItem Header="_Довідка">
        <MenuItem Header="_Про програму" Click="About_Click" />
    </MenuItem>

</Menu>
```

Що тут важливого:

| Елемент | Що робить |
| --- | --- |
| `Header="_Файл"` | текст пункту; підкреслення перед буквою робить її **клавішею доступу** (Alt+Ф) |
| `Separator` | горизонтальна лінія-роздільник між групами пунктів |
| `InputGestureText` | напис про гарячу клавішу справа; це **лише текст**, він нічого не вмикає |
| `IsCheckable="True"` | пункт-прапорець: біля нього з'являється галочка |
| `IsChecked` | стан прапорця |
| `IsEnabled="False"` | пункт видно, але він сірий і не натискається |
| вкладений `MenuItem` | підменю, що розкривається вбік |

:::warning[Обережно]
`InputGestureText` — це просто напис. Написати `InputGestureText="Ctrl+S"`
і думати, що Ctrl+S тепер працює, — класична пастка. Щоб клавіша справді
спрацьовувала, потрібні команди або `InputBindings` (нижче в цьому
підрозділі).
:::

### Іконки в пунктах меню

У `MenuItem` є властивість `Icon` — у неї кладуть будь-який елемент
інтерфейсу. Без сторонніх бібліотек найпростіше намалювати фігуру або
поставити текстовий символ:

```xml
<MenuItem Header="З_берегти">
    <MenuItem.Icon>
        <TextBlock Text="💾" FontSize="14" />
    </MenuItem.Icon>
</MenuItem>

<MenuItem Header="Видалити">
    <MenuItem.Icon>
        <Ellipse Width="10" Height="10" Fill="Firebrick" />
    </MenuItem.Icon>
</MenuItem>
```

Обробник для пункту-прапорця читає його стан:

```csharp
private void Wrap_Click(object sender, RoutedEventArgs e)
{
    // IsChecked має тип bool?, тому порівнюємо з true
    ContentBox.TextWrapping = WrapItem.IsChecked == true
        ? TextWrapping.Wrap
        : TextWrapping.NoWrap;
}
```

## ContextMenu

**Контекстне меню** — те, що з'являється на правий клік. У WPF воно
задається властивістю `ContextMenu` будь-якого елемента:

```xml
<TextBox x:Name="ContentBox" AcceptsReturn="True">
    <TextBox.ContextMenu>
        <ContextMenu>
            <MenuItem Header="Вирізати" Command="ApplicationCommands.Cut" />
            <MenuItem Header="Копіювати" Command="ApplicationCommands.Copy" />
            <MenuItem Header="Вставити" Command="ApplicationCommands.Paste" />
            <Separator />
            <MenuItem Header="Виділити все" Command="ApplicationCommands.SelectAll" />
        </ContextMenu>
    </TextBox.ContextMenu>
</TextBox>
```

:::info[Цікаво]
У `TextBox` контекстне меню вже є за замовчуванням — WPF додає його сам.
Свій `ContextMenu` повністю замінює стандартний. А `Command="ApplicationCommands.Cut"`
працює без жодного рядка C#: текстові елементи керування вміють обробляти
команди редагування самі. Про це — за кілька абзаців.
:::

## ToolBar і ToolBarTray

**`ToolBar`** — горизонтальна смужка з кнопками. Усередину кладуть
`Button`, `ToggleButton`, `ComboBox`, `Separator` — що завгодно;
`ToolBar` сам застосує до них пласкі стилі.

**`ToolBarTray`** — контейнер для кількох панелей. Він дає користувачеві
можливість перетягувати панелі за «ручку» зліва й переставляти їх місцями.

```xml
<ToolBarTray DockPanel.Dock="Top">

    <ToolBar>
        <Button Content="Створити" ToolTip="Новий документ (Ctrl+N)" />
        <Button Content="Відкрити" ToolTip="Відкрити файл (Ctrl+O)" />
        <Button Content="Зберегти" ToolTip="Зберегти (Ctrl+S)" />
    </ToolBar>

    <ToolBar>
        <ToggleButton x:Name="BoldButton" Content="Ж" FontWeight="Bold"
                      ToolTip="Напівжирний" />
        <ToggleButton Content="К" FontStyle="Italic" ToolTip="Курсив" />
        <Separator />
        <ComboBox Width="70" SelectedIndex="1">
            <ComboBoxItem Content="12" />
            <ComboBoxItem Content="14" />
            <ComboBoxItem Content="16" />
        </ComboBox>
    </ToolBar>

</ToolBarTray>
```

```
 ToolBarTray
 ┌─────────────────────────────────────────────────────────┐
 │ ⋮ [Створити][Відкрити][Зберегти] ⋮ [Ж][К] │ [14 ▾]      │
 └─┬───────────────────────────────┬─────────────────────┬─┘
   │                               │                     │
   ручка ToolBar №1        ручка ToolBar №2        елементи всередині
   (можна перетягнути)
```

:::tip[Порада]
Кожній кнопці на панелі інструментів обов'язково задавайте `ToolTip`.
На кнопці лише значок, і без підказки користувач не здогадається, що вона
робить. У підказці корисно згадати й гарячу клавішу.
:::

## StatusBar

**`StatusBar`** — смужка внизу вікна для дрібної інформації: що робить
програма зараз, скільки символів у тексті, який файл відкрито. Вона
розбивається на секції за допомогою `StatusBarItem` і `Separator`.

```xml
<StatusBar DockPanel.Dock="Bottom">

    <StatusBarItem>
        <TextBlock x:Name="StatusText" Text="Готово" />
    </StatusBarItem>

    <Separator />

    <StatusBarItem>
        <TextBlock x:Name="CharCountText" Text="Символів: 0" />
    </StatusBarItem>

    <Separator />

    <!-- Ця секція притискається до правого краю -->
    <StatusBarItem HorizontalAlignment="Right">
        <TextBlock x:Name="FileNameText" Text="Без назви" />
    </StatusBarItem>

</StatusBar>
```

```csharp
private void ContentBox_TextChanged(object sender, TextChangedEventArgs e)
{
    CharCountText.Text = $"Символів: {ContentBox.Text.Length}";
}
```

Порядок розміщення в `DockPanel` має значення: `Menu`, `ToolBarTray` і
`StatusBar` мають бути оголошені **до** центрального елемента, інакше вони
з'їдять не той простір.

## Проблема, яку розв'язують команди

Тепер уявіть звичайнісіньку дію — «Зберегти». Вона доступна:

1. у меню Файл ▸ Зберегти;
2. кнопкою на панелі інструментів;
3. у контекстному меню;
4. гарячою клавішею Ctrl+S.

Чотири місця. Якщо писати обробники подій, доведеться:

```csharp
// ЯК НЕ ТРЕБА
private void SaveMenuItem_Click(object s, RoutedEventArgs e) => Save();
private void SaveToolBarButton_Click(object s, RoutedEventArgs e) => Save();
private void SaveContextItem_Click(object s, RoutedEventArgs e) => Save();
private void Window_KeyDown(object s, KeyEventArgs e)
{
    if (e.Key == Key.S && Keyboard.Modifiers == ModifierKeys.Control)
        Save();
}
```

І це ще пів біди. Друга половина: коли зберігати нічого (документ не
змінювався), дію треба **вимкнути** — і знову в чотирьох місцях:

```csharp
// ЯК НЕ ТРЕБА ×2
SaveMenuItem.IsEnabled = hasChanges;
SaveToolBarButton.IsEnabled = hasChanges;
SaveContextItem.IsEnabled = hasChanges;
// ...а про клавішу Ctrl+S взагалі забули
```

Забути одне з місць — питання часу. Саме тому у WPF з'явилися **команди**.

**Команда** — це об'єкт, який описує *дію* окремо від *елемента інтерфейсу*.
Елементи не знають, що робити; вони лише кажуть «виконай оцю команду».

```
              ОДНА КОМАНДА — ЧОТИРИ ДЖЕРЕЛА

  MenuItem         ToolBar Button      MenuItem           KeyGesture
  «Зберегти»       [💾]                у ContextMenu       Ctrl+S
      │                 │                  │                  │
      │ Command=        │ Command=         │ Command=         │ прив'язана
      │  Save           │  Save            │  Save            │  до Save
      └────────┬────────┴─────────┬────────┴─────────┬────────┘
               │                  │                  │
               ▼                  ▼                  ▼
        ┌──────────────────────────────────────────────┐
        │      ApplicationCommands.Save                │
        └───────────────────┬──────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────────────────┐
        │  CommandBinding у вікні                      │
        │                                              │
        │  Executed   ──▶ SaveDocument();              │
        │  CanExecute ──▶ e.CanExecute = hasChanges;   │
        └───────────────────┬──────────────────────────┘
                            │
              CanExecute = false вимикає
              ВСІ ЧОТИРИ джерела ОДНОЧАСНО
                            │
      ┌─────────────┬───────┴───────┬─────────────┐
      ▼             ▼               ▼             ▼
  пункт сірий   кнопка сіра    пункт сірий   Ctrl+S мовчить
```

Один опис дії. Одна перевірка доступності. Чотири місця, що оновлюються самі.

## Вбудовані команди: ApplicationCommands

WPF уже містить десятки готових команд для звичних дій. Найпотрібніші
зібрані у статичному класі **`ApplicationCommands`**, і більшість із них
**уже мають гарячі клавіші**:

| Команда | Гаряча клавіша | Типова назва пункту |
| --- | --- | --- |
| `ApplicationCommands.New` | Ctrl+N | Створити |
| `ApplicationCommands.Open` | Ctrl+O | Відкрити |
| `ApplicationCommands.Save` | Ctrl+S | Зберегти |
| `ApplicationCommands.SaveAs` | немає | Зберегти як |
| `ApplicationCommands.Print` | Ctrl+P | Друк |
| `ApplicationCommands.Cut` | Ctrl+X | Вирізати |
| `ApplicationCommands.Copy` | Ctrl+C | Копіювати |
| `ApplicationCommands.Paste` | Ctrl+V | Вставити |
| `ApplicationCommands.Undo` | Ctrl+Z | Скасувати |
| `ApplicationCommands.Redo` | Ctrl+Y | Повторити |
| `ApplicationCommands.SelectAll` | Ctrl+A | Виділити все |
| `ApplicationCommands.Find` | Ctrl+F | Знайти |
| `ApplicationCommands.Help` | F1 | Довідка |

Є й інші набори: `EditingCommands` (робота з текстом), `NavigationCommands`
(`BrowseBack`, `BrowseForward` — знадобляться у наступному підрозділі),
`MediaCommands` (відтворення).

:::info[Цікаво]
Команди `Cut`, `Copy`, `Paste`, `Undo`, `SelectAll` у `TextBox` і `RichTextBox`
працюють **самі**, без жодного `CommandBinding`: обробка вбудована в самі
елементи керування. Тому контекстне меню з попереднього прикладу було
повністю робочим без єдиного рядка C#.
:::

## CommandBinding: Executed і CanExecute

Команда сама по собі нічого не виконує — вона лише «ім'я дії». Зв'язати
ім'я з кодом — задача **`CommandBinding`**. Його додають у колекцію
`CommandBindings` вікна:

```xml
<Window.CommandBindings>
    <CommandBinding Command="ApplicationCommands.New"
                    Executed="NewCommand_Executed" />

    <CommandBinding Command="ApplicationCommands.Open"
                    Executed="OpenCommand_Executed" />

    <CommandBinding Command="ApplicationCommands.Save"
                    Executed="SaveCommand_Executed"
                    CanExecute="SaveCommand_CanExecute" />
</Window.CommandBindings>
```

У code-behind:

```csharp
using System.Windows;
using System.Windows.Input;

namespace EditorApp;

public partial class MainWindow : Window
{
    private bool isModified;

    public MainWindow()
    {
        InitializeComponent();
    }

    private void NewCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        ContentBox.Clear();
        isModified = false;
    }

    private void OpenCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        // ...код відкриття файлу...
    }

    private void SaveCommand_Executed(object sender, ExecutedRoutedEventArgs e)
    {
        // ...код збереження...
        isModified = false;
    }

    // Викликається АВТОМАТИЧНО, щоб дізнатись, чи дія зараз можлива
    private void SaveCommand_CanExecute(object sender, CanExecuteRoutedEventArgs e)
    {
        e.CanExecute = isModified;
    }
}
```

І тепер — найприємніше. Прив'язуємо команду до елементів:

```xml
<Menu DockPanel.Dock="Top">
    <MenuItem Header="_Файл">
        <MenuItem Command="ApplicationCommands.New" Header="_Створити" />
        <MenuItem Command="ApplicationCommands.Open" Header="_Відкрити..." />
        <MenuItem Command="ApplicationCommands.Save" Header="З_берегти" />
    </MenuItem>
</Menu>

<ToolBarTray DockPanel.Dock="Top">
    <ToolBar>
        <Button Command="ApplicationCommands.New" Content="Створити" />
        <Button Command="ApplicationCommands.Open" Content="Відкрити" />
        <Button Command="ApplicationCommands.Save" Content="Зберегти" />
    </ToolBar>
</ToolBarTray>
```

Що працює саме собою, без жодного додаткового рядка:

- клік по пункту меню викликає `SaveCommand_Executed`;
- клік по кнопці панелі — той самий метод;
- Ctrl+S — той самий метод;
- поки `isModified` дорівнює `false`, **і пункт меню, і кнопка сірі**;
- щойно `isModified` стане `true` — обидва вмикаються самі;
- напис «Ctrl+S» у меню з'являється автоматично.

:::info[Цікаво]
Хто ж викликає `CanExecute`? Клас `CommandManager`. Він переопитує всі
команди на кожен рух миші, натискання клавіші та зміну фокуса. Якщо
доступність команди змінилась «тихо» (наприклад, у таймері), і меню
не оновилось — попросіть переопитати вручну:
`CommandManager.InvalidateRequerySuggested();`
:::

:::warning[Обережно]
`MenuItem` без `Header`, але з `Command`, покаже текст самої команди —
а він англійською («Save», «New»). Тому в українському інтерфейсі
`Header` задавайте явно, як у прикладі вище.
:::

## Власна команда: RoutedUICommand

Вбудовані команди покривають типові дії, але «Про програму» чи
«Експортувати звіт» серед них немає. Свою команду створюють як
**`RoutedUICommand`** — зазвичай у статичному класі, щоб на неї
можна було послатися з XAML.

```csharp
using System.Windows.Input;

namespace EditorApp;

public static class AppCommands
{
    public static readonly RoutedUICommand About = new RoutedUICommand(
        text: "Про програму",        // текст для інтерфейсу
        name: "About",               // внутрішнє ім'я
        ownerType: typeof(AppCommands),
        inputGestures: new InputGestureCollection
        {
            new KeyGesture(Key.F1)   // гаряча клавіша команди
        });

    public static readonly RoutedUICommand WordCount = new RoutedUICommand(
        "Підрахувати слова", "WordCount", typeof(AppCommands),
        new InputGestureCollection
        {
            new KeyGesture(Key.W, ModifierKeys.Control | ModifierKeys.Shift)
        });
}
```

Щоб скористатися нею в XAML, спершу оголошуємо простір імен проєкту:

```xml
<Window x:Class="EditorApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:EditorApp"
        Title="Редактор" Height="400" Width="600">

    <Window.CommandBindings>
        <CommandBinding Command="{x:Static local:AppCommands.About}"
                        Executed="AboutCommand_Executed" />
        <CommandBinding Command="{x:Static local:AppCommands.WordCount}"
                        Executed="WordCountCommand_Executed" />
    </Window.CommandBindings>

    <DockPanel>
        <Menu DockPanel.Dock="Top">
            <MenuItem Header="_Сервіс">
                <MenuItem Command="{x:Static local:AppCommands.WordCount}"
                          Header="Підрахувати _слова" />
            </MenuItem>
            <MenuItem Header="_Довідка">
                <MenuItem Command="{x:Static local:AppCommands.About}"
                          Header="_Про програму" />
            </MenuItem>
        </Menu>

        <TextBox x:Name="ContentBox" AcceptsReturn="True" />
    </DockPanel>
</Window>
```

```csharp
private void AboutCommand_Executed(object sender, ExecutedRoutedEventArgs e)
{
    MessageBox.Show(this,
        "Простий редактор\nВерсія 1.0\nКурс ОПАМ, 2 курс",
        "Про програму", MessageBoxButton.OK, MessageBoxImage.Information);
}

private void WordCountCommand_Executed(object sender, ExecutedRoutedEventArgs e)
{
    var words = ContentBox.Text.Split(
        [' ', '\n', '\r', '\t'],
        StringSplitOptions.RemoveEmptyEntries);

    MessageBox.Show(this, $"Слів у тексті: {words.Length}", "Статистика");
}
```

Розширення розмітки `{x:Static ...}` означає «візьми значення статичного
поля». Саме воно дозволяє послатися з XAML на `AppCommands.About`.

## KeyBinding: гаряча клавіша без команди в конструкторі

Іноді гарячу клавішу хочеться призначити вже готовій команді — або змінити
стандартну. Для цього є колекція `InputBindings` вікна:

```xml
<Window.InputBindings>
    <KeyBinding Key="F1" Command="{x:Static local:AppCommands.About}" />
    <KeyBinding Key="S" Modifiers="Control+Shift"
                Command="ApplicationCommands.SaveAs" />
    <KeyBinding Key="D" Modifiers="Control"
                Command="{x:Static local:AppCommands.WordCount}" />
</Window.InputBindings>
```

| Спосіб | Де задається | Коли зручніше |
| --- | --- | --- |
| `InputGestureCollection` у конструкторі | у коді C#, разом із командою | клавіша «належить» команді назавжди |
| `KeyBinding` в `InputBindings` | у XAML вікна | клавіша своя для конкретного вікна |
| `InputGestureText` | у XAML пункту меню | **нічого не робить**, лише напис |

:::danger[Часта помилка]
`InputBindings` працюють, поки фокус усередині цього вікна. Якщо ви
поставили `KeyBinding` на кнопку чи панель, а фокус у той момент в іншому
місці вікна — клавіша не спрацює. Для загальних дій ставте `InputBindings`
саме на рівні `Window`.
:::

## А що таке ICommand

`RoutedUICommand` — не єдиний вид команд. Усі вони реалізують інтерфейс
**`ICommand`** із трьома членами: методом `Execute`, методом `CanExecute`
і подією `CanExecuteChanged`. Це означає, що команду можна написати й самому —
як звичайний клас, який не має жодного стосунку до вікон і XAML-дерева.

Навіщо? Бо `RoutedUICommand` тягне логіку у code-behind вікна, а це не завжди
добре: таку логіку важко тестувати й неможливо перевикористати. Власна
реалізація `ICommand` дозволяє винести дію в окремий клас — **модель подання**,
до якої інтерфейс просто прив'язується. Це фундамент шаблону MVVM,
і ми повернемось до нього в **темі 24**, коли вивчимо прив'язку даних.
Поки що `RoutedUICommand` і `CommandBinding` — цілком робочий і найпростіший
шлях.

## Типові помилки

1. **`InputGestureText` замість справжньої прив'язки.** Напис «Ctrl+S»
   з'явився, клавіша не працює. Потрібна команда з `InputGestureCollection`
   або `KeyBinding`.

2. **Чотири обробники `Click` на одну дію.** Меню, панель, контекстне меню
   і клавіша роблять те саме — це команда, а не чотири методи.

3. **Ручне вмикання й вимикання пунктів.** Замість `SaveMenuItem.IsEnabled = ...`
   у десятку місць — один метод `CanExecute`.

4. **`MenuItem` з `Command` і без `Header`.** У меню з'явиться англійське
   службове ім'я команди. Задавайте `Header` українською явно.

5. **Порядок у `DockPanel`.** `Menu`, `ToolBarTray` і `StatusBar` оголошуйте
   до центрального елемента, інакше центральний елемент займе весь простір,
   а панелі опиняться не там, де ви очікували.
