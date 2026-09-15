---
sidebar_position: 4
---

# Шаблон MVVM

## Хвороба: товстий code-behind

Повернімось востаннє до редактора з теми 23. Його `MainWindow.xaml.cs` містив:

- поля стану (`currentFilePath`, `isModified`);
- читання й запис файлів;
- діалоги відкриття та збереження;
- логіку «питати чи не питати про незбережені зміни»;
- оновлення п'яти елементів інтерфейсу;
- обробники шести команд.

Приблизно двісті рядків. Додайте туди друк, останні відкриті файли,
пошук із заміною, налаштування шрифту — і буде чотириста. У реальних проєктах
такі файли на півтори тисячі рядків зустрічаються постійно, і в них
ніхто не хоче лізти.

Але кількість рядків — не найгірше. Найгірше ось що: **цей код неможливо
перевірити інакше, ніж мишкою**.

Уявіть, що вам треба переконатись: після відкриття файлу ознака «є зміни»
стає `false`. Автоматичний тест мав би виглядати так:

```csharp
// так ми хотіли б написати тест
var editor = new EditorViewModel();
editor.OpenFile("test.txt");
Assert.IsFalse(editor.IsModified);
```

З кодом теми 23 це неможливо. Щоб дістатися до `isModified`, треба створити
об'єкт `MainWindow`, а він одразу потягне за собою всю графічну підсистему
WPF. Метод `OpenCommand_Executed` вимагає параметра `ExecutedRoutedEventArgs`,
а всередині сам відкриває модальний діалог і чекає на людину з мишкою.
Тест зависне назавжди.

Проблема не в тому, що код поганий. Проблема в тому, що в одному класі
**змішано три різні речі**: що показувати, як показувати і звідки це взялося.

## Три частини MVVM

**MVVM (Model — View — ViewModel)** — це спосіб розкласти застосунок на три
шари так, щоб кожен відповідав рівно за одне.

**Model (модель)** — дані та бізнес-правила. Класи `Product`, `TodoItem`,
`Order`, а також код, що читає й пише файли або базу. Модель **нічого не знає
про інтерфейс**: у ній немає жодного `using System.Windows`.

**View (подання)** — XAML. Розмітка, стилі, шаблони, анімації. У code-behind
подання лишається лише `InitializeComponent()`. View не знає, звідки беруться
дані — вона лише каже, як їх намалювати.

**ViewModel (модель подання)** — стан екрана і дії користувача. Тут живуть
властивості, до яких прив'язується View (`Items`, `SelectedItem`, `NewTitle`,
`IsBusy`), і команди (`AddCommand`, `DeleteCommand`). ViewModel **не знає
про конкретні кнопки й поля**: у ній немає ні `TextBox`, ні `Button`,
ні `MessageBox`.

Головне в MVVM — не назви класів, а **напрямок залежностей**:

```
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   │   ┌────────────┐    прив'язки    ┌──────────────┐        │
   │   │    View    │ ───────────────▶│  ViewModel   │        │
   │   │   (XAML)   │    і команди    │              │        │
   │   └────────────┘                 └──────┬───────┘        │
   │         ▲                               │                │
   │         │  PropertyChanged              │ читає/змінює   │
   │         └───────────────────────────────┤                │
   │            (через механізм прив'язки,   │                │
   │             без прямих посилань)        ▼                │
   │                                  ┌──────────────┐        │
   │                                  │    Model     │        │
   │                                  │ (дані, файли)│        │
   │                                  └──────────────┘        │
   └──────────────────────────────────────────────────────────┘

   Правило стрілок: вони йдуть ТІЛЬКИ вниз.

   View   ───знає про───▶  ViewModel   ───знає про───▶  Model
   View   ◀──НЕ знає───     ViewModel   ◀──НЕ знає───     Model
```

View знає ім'я властивості `Items` — і це все, що вона знає про ViewModel.
ViewModel не має жодного посилання на View: вона навіть не здогадується,
чи її `Items` показують у `ListBox`, у `DataGrid`, чи взагалі виводять у консоль
у тесті. Модель не знає ні про кого.

Зв'язок «знизу вгору» існує, але він **непрямий**: ViewModel піднімає подію
`PropertyChanged`, а хто на неї підписався — не її справа. Саме тому
попередній підрозділ про `INotifyPropertyChanged` був обов'язковою передумовою:
без нього MVVM просто не працює.

:::info[Цікаво]
MVVM придумала команда Microsoft, яка створювала WPF: у 2005 році архітектор
Джон Госсман описав шаблон у своєму блозі саме як «той спосіб працювати,
для якого ми будували прив'язку даних». Тобто це не зовнішня мода, а рідний
для WPF спосіб організації коду.
:::

## Що куди кладемо

| Що це | Куди | Чому |
|---|---|---|
| Клас `TodoItem` з полями `Title`, `IsDone` | Model | чисті дані |
| Правило «назва не довша за 60 символів» | Model | це правило предметної області, воно істинне і без вікна |
| Список справ, який зараз на екрані | ViewModel | це стан **подання**, а не даних |
| Поточний фільтр (усі / активні / виконані) | ViewModel | у файлі фільтра немає, він існує лише на екрані |
| Текст у полі «нова справа» | ViewModel | стан введення |
| Команда «Додати» | ViewModel | дія користувача |
| Ширина колонки, колір рядка, анімація | View | суто оформлення |
| Читання й запис файлу зі справами | Model (або окремий сервіс) | робота з даними |
| Форматування дати як «Сьогодні, 14:30» | View (конвертер) | подання, не зміст |
| Підрахунок «залишилось 3 справи» | ViewModel | це число існує лише для екрана |

Спірні випадки, які варто розібрати окремо.

**Валідація.** Базові правила («ціна більша за нуль») — у моделі: вони
істинні завжди. Правила, що стосуються форми («поле не заповнене»), — у моделі
подання. На практиці для невеликих проєктів `IDataErrorInfo` часто реалізують
прямо у ViewModel, і це нормально.

**Сортування списку.** Якщо порядок — частина предметної області (черга
замовлень за номером), це модель. Якщо користувач клацнув заголовок колонки —
це модель подання.

**Показ повідомлення про помилку.** `MessageBox.Show` у ViewModel — порушення:
ViewModel одразу стає непридатною для тестів. Правильно — властивість
`ErrorMessage` у ViewModel, а View показує її у `TextBlock` або в
`Popup`. Тест перевірить рядок, а не шукатиме вікно на екрані.

**Відкриття другого вікна.** Теж не справа ViewModel. Або View робить це
у відповідь на подію, або запроваджують спеціальний «сервіс діалогів»,
який передають у ViewModel через конструктор.

## ICommand: дія без кнопки

Прив'язка розв'язала питання даних. Залишилися дії: користувач натискає
кнопку — щось має статися. Але писати `Click="AddButton_Click"` не можна,
бо обробник опиниться у code-behind View.

Відповідь — інтерфейс **`ICommand`** із простору імен `System.Windows.Input`.
З темою 23 він вам частково знайомий: `RoutedUICommand` реалізує саме
цей інтерфейс.

```csharp
public interface ICommand
{
    bool CanExecute(object? parameter);
    void Execute(object? parameter);
    event EventHandler? CanExecuteChanged;
}
```

- **`Execute`** — виконати дію.
- **`CanExecute`** — чи можна її зараз виконати. Кнопка, прив'язана
  до команди, сама стає сірою, якщо метод повернув `false`. Ніякого
  `SaveButton.IsEnabled = ...` у коді більше не потрібно.
- **`CanExecuteChanged`** — подія, якою команда повідомляє: «перепитайте
  мене, відповідь могла змінитись».

`RoutedUICommand` з теми 23 для MVVM не підходить: він вимагає
`CommandBinding` у вікні, тобто знову тягне обробники у code-behind. Потрібна
своя реалізація, яка приймає дію у вигляді делегата. Традиційно її звуть
**`RelayCommand`** (у деяких бібліотеках — `DelegateCommand`).

## RelayCommand: повний код

```csharp
using System;
using System.Windows.Input;

namespace TodoApp;

/// <summary>
/// Універсальна команда, яка виконує передані делегати.
/// </summary>
public class RelayCommand : ICommand
{
    private readonly Action<object?> execute;
    private readonly Predicate<object?>? canExecute;

    /// Команда з параметром.
    public RelayCommand(Action<object?> execute, Predicate<object?>? canExecute = null)
    {
        this.execute = execute ?? throw new ArgumentNullException(nameof(execute));
        this.canExecute = canExecute;
    }

    /// Зручна перевантажена версія для команд без параметра.
    public RelayCommand(Action execute, Func<bool>? canExecute = null)
        : this(_ => execute(),
               canExecute is null ? null : _ => canExecute())
    {
    }

    /// Чи доступна команда зараз.
    public bool CanExecute(object? parameter)
        => canExecute is null || canExecute(parameter);

    /// Виконати команду.
    public void Execute(object? parameter) => execute(parameter);

    /// Підписку перенаправляємо в CommandManager: хай WPF сам вирішує,
    /// коли перепитати команду про доступність.
    public event EventHandler? CanExecuteChanged
    {
        add => CommandManager.RequerySuggested += value;
        remove => CommandManager.RequerySuggested -= value;
    }
}
```

Розберімо рядок за рядком.

**`private readonly Action<object?> execute;`** — команда не робить нічого сама.
Вона лише зберігає делегат, який їй дали. Саме тому один клас `RelayCommand`
обслуговує всі команди застосунку.

**`Predicate<object?>? canExecute`** — `Predicate<T>` це те саме, що
`Func<T, bool>`: метод, який повертає `true` або `false`. Тип nullable,
бо перевірка не обов'язкова.

**Другий конструктор** — синтаксичний цукор. Без нього кожну команду без
параметра довелося б писати як `new RelayCommand(_ => Add())` з незручним
підкресленням. Виклик `: this(...)` переадресовує роботу першому конструктору,
загорнувши делегати без параметрів у делегати з параметром.

**`CanExecute`** — якщо перевірки не задали, команда доступна завжди.

**`CanExecuteChanged`** — найцікавіше. Ми не зберігаємо власний список
підписників, а перенаправляємо підписку у статичну подію
**`CommandManager.RequerySuggested`**. Це вбудований механізм WPF:
після кожної дії користувача (клацання, натискання клавіші, зміна фокуса)
`CommandManager` піднімає `RequerySuggested`, і **всі** команди у застосунку
перепитуються про свою доступність.

Наслідок: кнопки автоматично сіріють і активуються без жодного вашого коду.
Написали поле «нова справа» порожнім — кнопка «Додати» сіра; ввели літеру —
кнопка ожила.

:::warning[Обережно]
`CommandManager.RequerySuggested` опитує команди **дуже часто**. Тому
`CanExecute` має бути швидким: перевірка поля на порожнечу, порівняння з `null`,
`Count > 0`. Ніяких звернень до файлів, бази даних чи довгих циклів — інтерфейс
почне помітно гальмувати.
:::

:::info[Цікаво]
`CommandManager.RequerySuggested` зберігає **слабкі** посилання на підписників.
Це захищає від витоків пам'яті, але має побічний ефект: якщо ваша команда
ніде не збережена в полі, а створюється «на льоту» щоразу в геттері —
підписку може забрати збирач сміття, і кнопка перестане оновлюватись.
Тому команди завжди зберігайте у полях або у властивостях з `get; private set;`,
а не створюйте новий об'єкт у кожному виклику геттера.
:::

## RelayCommand з параметром

Часто команді потрібен аргумент: видалити **цей** елемент, відкрити **цю**
картку. У XAML аргумент передають через `CommandParameter`, а в команду він
приходить як `object`. Кожного разу приводити тип вручну — нудно, тому зробимо
узагальнену версію:

```csharp
using System;
using System.Windows.Input;

namespace TodoApp;

/// <summary>
/// Команда з типізованим параметром.
/// </summary>
public class RelayCommand<T> : ICommand
{
    private readonly Action<T?> execute;
    private readonly Predicate<T?>? canExecute;

    public RelayCommand(Action<T?> execute, Predicate<T?>? canExecute = null)
    {
        this.execute = execute ?? throw new ArgumentNullException(nameof(execute));
        this.canExecute = canExecute;
    }

    public bool CanExecute(object? parameter)
    {
        // Параметр ще не заданий або має інший тип — команда недоступна
        if (parameter is null)
            return canExecute is null || canExecute(default);

        if (parameter is not T typed)
            return false;

        return canExecute is null || canExecute(typed);
    }

    public void Execute(object? parameter)
    {
        if (parameter is T typed)
            execute(typed);
        else
            execute(default);
    }

    public event EventHandler? CanExecuteChanged
    {
        add => CommandManager.RequerySuggested += value;
        remove => CommandManager.RequerySuggested -= value;
    }
}
```

Тепер замість `object` у методі буде потрібний тип:

```csharp
DeleteCommand = new RelayCommand<TodoItem>(Delete, item => item is not null);

private void Delete(TodoItem? item)
{
    if (item is null) return;
    allItems.Remove(item);
    RefreshItems();
}
```

## Наскрізний приклад: «Список справ»

Зберімо все, що вивчили, в один невеликий, але повноцінний застосунок.

**Макет вікна:**

```
┌───────────────────────────────────────────────────────────────┐
│ Список справ                                                  │
├───────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ ┌──────────┐  │
│ │ Нова справа...                              │ │  Додати  │  │
│ └─────────────────────────────────────────────┘ └──────────┘  │
│                                                               │
│  (•) Усі    ( ) Активні    ( ) Виконані                       │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ [x] ~~Купити хліб~~                                  [✕]  │ │
│ │ [ ] Здати лабораторну з ОПАМ                         [✕]  │ │
│ │ [ ] Подзвонити бабусі                                [✕]  │ │
│ │ [x] ~~Полити квіти~~                                 [✕]  │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ Залишилось: 2 з 4                       [ Прибрати виконані ] │
└───────────────────────────────────────────────────────────────┘
```

### Model: TodoItem

```csharp
using System;

namespace TodoApp;

/// <summary>
/// Одна справа. Про інтерфейс не знає нічого.
/// </summary>
public class TodoItem : ObservableObject
{
    private string title = "";
    private bool isDone;

    public TodoItem(string title)
    {
        this.title = title;
        CreatedAt = DateTime.Now;
    }

    public string Title
    {
        get => title;
        set => SetProperty(ref title, value);
    }

    public bool IsDone
    {
        get => isDone;
        set => SetProperty(ref isDone, value);
    }

    public DateTime CreatedAt { get; }
}
```

Клас `ObservableObject` — той самий, що ми написали у попередньому підрозділі.

### ViewModel: TodoViewModel

```csharp
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows.Input;

namespace TodoApp;

public enum TodoFilter
{
    All,
    Active,
    Done
}

public class TodoViewModel : ObservableObject
{
    // Повний набір справ — сюди додаємо й видаляємо
    private readonly List<TodoItem> allItems = [];

    private string newTitle = "";
    private TodoFilter filter = TodoFilter.All;

    /// Те, що зараз видно на екрані (після фільтра)
    public ObservableCollection<TodoItem> Items { get; } = [];

    public ICommand AddCommand { get; }
    public ICommand DeleteCommand { get; }
    public ICommand ToggleCommand { get; }
    public ICommand ClearDoneCommand { get; }

    public TodoViewModel()
    {
        AddCommand = new RelayCommand(
            Add,
            () => !string.IsNullOrWhiteSpace(NewTitle));

        DeleteCommand = new RelayCommand<TodoItem>(Delete);

        ToggleCommand = new RelayCommand<TodoItem>(Toggle);

        ClearDoneCommand = new RelayCommand(
            ClearDone,
            () => DoneCount > 0);

        // Демонстраційні дані
        AddItem(new TodoItem("Купити хліб") { IsDone = true });
        AddItem(new TodoItem("Здати лабораторну з ОПАМ"));
        AddItem(new TodoItem("Подзвонити бабусі"));
        AddItem(new TodoItem("Полити квіти") { IsDone = true });
        RefreshItems();
    }

    // ---------- Властивості стану ----------

    /// Текст у полі введення
    public string NewTitle
    {
        get => newTitle;
        set => SetProperty(ref newTitle, value);
    }

    public TodoFilter Filter
    {
        get => filter;
        set
        {
            if (SetProperty(ref filter, value))
            {
                RefreshItems();
                OnPropertyChanged(nameof(IsAllSelected));
                OnPropertyChanged(nameof(IsActiveSelected));
                OnPropertyChanged(nameof(IsDoneSelected));
            }
        }
    }

    // Три властивості для перемикачів — прив'язка RadioButton.IsChecked
    public bool IsAllSelected
    {
        get => filter == TodoFilter.All;
        set { if (value) Filter = TodoFilter.All; }
    }

    public bool IsActiveSelected
    {
        get => filter == TodoFilter.Active;
        set { if (value) Filter = TodoFilter.Active; }
    }

    public bool IsDoneSelected
    {
        get => filter == TodoFilter.Done;
        set { if (value) Filter = TodoFilter.Done; }
    }

    // ---------- Лічильники ----------

    public int TotalCount => allItems.Count;

    public int DoneCount
    {
        get
        {
            var count = 0;
            foreach (var item in allItems)
                if (item.IsDone)
                    count++;
            return count;
        }
    }

    public int RemainingCount => TotalCount - DoneCount;

    public string SummaryText => TotalCount == 0
        ? "Справ поки немає"
        : $"Залишилось: {RemainingCount} з {TotalCount}";

    // ---------- Дії ----------

    private void Add()
    {
        AddItem(new TodoItem(NewTitle.Trim()));
        NewTitle = "";
        RefreshItems();
    }

    private void Delete(TodoItem? item)
    {
        if (item is null)
            return;

        item.PropertyChanged -= Item_PropertyChanged;
        allItems.Remove(item);
        RefreshItems();
    }

    private void Toggle(TodoItem? item)
    {
        if (item is null)
            return;

        item.IsDone = !item.IsDone;
    }

    private void ClearDone()
    {
        // Йдемо з кінця, щоб видалення не збивало індекси
        for (var i = allItems.Count - 1; i >= 0; i--)
        {
            if (allItems[i].IsDone)
            {
                allItems[i].PropertyChanged -= Item_PropertyChanged;
                allItems.RemoveAt(i);
            }
        }

        RefreshItems();
    }

    // ---------- Службове ----------

    private void AddItem(TodoItem item)
    {
        item.PropertyChanged += Item_PropertyChanged;
        allItems.Add(item);
    }

    /// Коли всередині справи змінився стан «виконано» —
    /// треба перерахувати лічильники і, можливо, перефільтрувати список.
    private void Item_PropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName != nameof(TodoItem.IsDone))
            return;

        RefreshCounters();

        if (filter != TodoFilter.All)
            RefreshItems();
    }

    /// Перебудовує видимий список за поточним фільтром.
    private void RefreshItems()
    {
        Items.Clear();

        foreach (var item in allItems)
        {
            var visible = filter switch
            {
                TodoFilter.Active => !item.IsDone,
                TodoFilter.Done   => item.IsDone,
                _                 => true
            };

            if (visible)
                Items.Add(item);
        }

        RefreshCounters();
    }

    private void RefreshCounters()
    {
        OnPropertyChanged(nameof(TotalCount));
        OnPropertyChanged(nameof(DoneCount));
        OnPropertyChanged(nameof(RemainingCount));
        OnPropertyChanged(nameof(SummaryText));
    }
}
```

Зверніть увагу: у цьому файлі немає жодного `using System.Windows.Controls`.
Тут немає кнопок, полів і вікон — лише дані, стан і дії. Такий клас можна
створити у консольній програмі або в тесті й повністю перевірити:

```csharp
var vm = new TodoViewModel();
vm.NewTitle = "Тестова справа";
vm.AddCommand.Execute(null);

// очікуємо, що справ стало п'ять, а поле введення очистилось
System.Diagnostics.Debug.Assert(vm.TotalCount == 5);
System.Diagnostics.Debug.Assert(vm.NewTitle == "");
```

Саме це й мали на увазі, коли казали «MVVM спрощує тестування».

### View: MainWindow.xaml

```xml
<Window x:Class="TodoApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:TodoApp"
        Title="Список справ" Height="420" Width="560">

    <Window.DataContext>
        <local:TodoViewModel/>
    </Window.DataContext>

    <Window.Resources>
        <!-- Виконані справи — сірі й закреслені -->
        <Style x:Key="TodoTitleStyle" TargetType="TextBlock">
            <Setter Property="VerticalAlignment" Value="Center"/>
            <Style.Triggers>
                <DataTrigger Binding="{Binding IsDone}" Value="True">
                    <Setter Property="TextDecorations" Value="Strikethrough"/>
                    <Setter Property="Foreground" Value="Gray"/>
                </DataTrigger>
            </Style.Triggers>
        </Style>
    </Window.Resources>

    <Grid Margin="16">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Рядок 0: введення нової справи -->
        <DockPanel Grid.Row="0">
            <Button DockPanel.Dock="Right"
                    Content="Додати"
                    Padding="16,6" Margin="8,0,0,0"
                    Command="{Binding AddCommand}"
                    IsDefault="True"/>
            <TextBox Padding="6"
                     Text="{Binding NewTitle, UpdateSourceTrigger=PropertyChanged}"/>
        </DockPanel>

        <!-- Рядок 1: фільтр -->
        <StackPanel Grid.Row="1" Orientation="Horizontal" Margin="0,12,0,8">
            <RadioButton Content="Усі" GroupName="Filter" Margin="0,0,16,0"
                         IsChecked="{Binding IsAllSelected}"/>
            <RadioButton Content="Активні" GroupName="Filter" Margin="0,0,16,0"
                         IsChecked="{Binding IsActiveSelected}"/>
            <RadioButton Content="Виконані" GroupName="Filter"
                         IsChecked="{Binding IsDoneSelected}"/>
        </StackPanel>

        <!-- Рядок 2: список -->
        <ListBox Grid.Row="2"
                 ItemsSource="{Binding Items}"
                 HorizontalContentAlignment="Stretch">
            <ListBox.ItemTemplate>
                <DataTemplate>
                    <DockPanel Margin="2,4">
                        <Button DockPanel.Dock="Right"
                                Content="✕"
                                Width="26" Height="22"
                                ToolTip="Видалити справу"
                                Command="{Binding RelativeSource={RelativeSource AncestorType=Window},
                                                  Path=DataContext.DeleteCommand}"
                                CommandParameter="{Binding}"/>
                        <CheckBox IsChecked="{Binding IsDone}"
                                  VerticalAlignment="Center"
                                  Margin="0,0,8,0"/>
                        <TextBlock Text="{Binding Title}"
                                   Style="{StaticResource TodoTitleStyle}"/>
                    </DockPanel>
                </DataTemplate>
            </ListBox.ItemTemplate>
        </ListBox>

        <!-- Рядок 3: підсумок -->
        <DockPanel Grid.Row="3" Margin="0,12,0,0">
            <Button DockPanel.Dock="Right"
                    Content="Прибрати виконані"
                    Padding="12,4"
                    Command="{Binding ClearDoneCommand}"/>
            <TextBlock Text="{Binding SummaryText}"
                       VerticalAlignment="Center"
                       FontWeight="Bold"/>
        </DockPanel>

    </Grid>
</Window>
```

### View: MainWindow.xaml.cs

```csharp
using System.Windows;

namespace TodoApp;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
```

Три рядки коду. Саме так і має виглядати code-behind у MVVM.

### Що тут відбувається

1. **`Window.DataContext` створюється прямо в XAML.** Тег
   `local:TodoViewModel` створює екземпляр моделі подання без єдиного рядка C#.
   Бонус: конструктор класу виконується й у дизайнері Visual Studio, тому
   демонстраційні справи видно ще до запуску.
2. **Кнопка «Додати» сіра, поки поле порожнє.** Це `CanExecute`, який
   перевіряє `NewTitle`. Працює завдяки `CommandManager.RequerySuggested`
   і `UpdateSourceTrigger=PropertyChanged`.
3. **`IsDefault="True"` на кнопці** дає безкоштовний Enter: набрали текст,
   натиснули Enter — справу додано.
4. **Прапорець «виконано»** прив'язаний до `IsDone` у режимі `TwoWay`
   (це режим за замовчуванням для `CheckBox.IsChecked`). Команда `ToggleCommand`
   для цього не потрібна взагалі — прив'язки вистачає. Вона залишена у
   ViewModel для тих випадків, коли стан перемикають з іншого місця,
   наприклад із контекстного меню.
5. **Закреслений текст** — це `DataTrigger` у стилі. Жодного конвертера
   й жодного коду: XAML сам реагує на зміну `IsDone`.
6. **Кнопка видалення** знаходить команду через
   `RelativeSource AncestorType=Window`, бо всередині `DataTemplate`
   контекст — окрема справа, а не вся ViewModel. Сама справа передається
   як `CommandParameter="{Binding}"`.
7. **Підсумок «Залишилось: 2 з 4»** — обчислювана властивість `SummaryText`,
   яка оновлюється з `RefreshCounters()`.
8. **Фільтр** перебудовує колекцію `Items`, а `ObservableCollection`
   повідомляє `ListBox` про кожну зміну.

Позначте виконаною справу, поки ввімкнено фільтр «Активні» — рядок зникне
зі списку. Це не помилка, а наслідок пункту 8: список показує лише активні.

:::tip[Порада]
Коли кнопка з командою «нічого не робить», перевіряйте три речі саме в цьому
порядку: чи встановлено `DataContext` (вікно Output покаже `DataItem=null`),
чи правильно написано ім'я команди у прив'язці, чи не повертає `CanExecute`
завжди `false`. У 95% випадків це одна з трьох причин.
:::

## Чесно про межі MVVM

MVVM не безкоштовний. Замість одного файлу у вас три, замість
`SaveButton.IsEnabled = false` — властивість, сповіщення і прив'язка.
Для деяких завдань це надмірно.

| MVVM виправданий | MVVM надлишковий |
|---|---|
| вікно з формою на 5 і більше полів | діалог «Ви впевнені?» з двома кнопками |
| будь-який список, який редагується | вікно «Про програму» зі статичним текстом |
| дані завантажуються з файлу чи бази | однокнопковий інструмент, що робить одну дію |
| логіку треба покрити тестами | навчальний приклад на п'ять хвилин |
| над проєктом працює більше однієї людини | разовий скрипт із графічною оболонкою |
| екран змінюватимуть і через півроку | код, який точно видалять наступного тижня |

Орієнтир простий: **якщо у code-behind з'явилася змінна, що зберігає стан
між натисканнями кнопок, — час виносити ViewModel**. Якщо code-behind
складається лише з реакцій на дії, які нічого не запам'ятовують,
можна залишити як є.

І ще одне. MVVM не забороняє code-behind повністю. Суто візуальні речі —
поставити фокус у поле, запустити анімацію, прокрутити список до потрібного
рядка — цілком можуть жити у code-behind View. Це не логіка, це оформлення.
Догма «жодного рядка в code-behind» шкідлива не менше, ніж повна її відсутність.

## Типові помилки

- **`DataContext` не встановлено.** Вікно порожнє, кнопки неактивні,
  у вікні Output — `DataItem=null`. Ставте `DataContext` у XAML тегом
  `Window.DataContext` або першим рядком після `InitializeComponent()`.
- **Властивість без сповіщення.** ViewModel успадкували від
  `ObservableObject`, але написали автовластивість `public string Title { get; set; }`.
  Значення змінюється, екран стоїть. Потрібне поле плюс `SetProperty`.
- **`List` замість `ObservableCollection`.** Найпопулярніша помилка на
  лабораторній: додали елемент, у колекції він є, у списку його немає.
- **Бізнес-логіка у View.** Обробник `Click`, який рахує суму замовлення
  й пише її у `TextBlock`, перекреслює весь сенс MVVM. Якщо у code-behind
  з'явився `if` про дані — переносьте у ViewModel.
- **`MessageBox.Show` усередині ViewModel.** Клас одразу стає неможливим
  для тестів: тест зависне на вікні, яке ніхто не закриє. Виводьте помилку
  через властивість, а показує її View.
- **Забутий `ConvertBack` у двосторонній прив'язці.** Конвертер на
  `TextBox.Text` без `ConvertBack` кине `NotSupportedException` у момент,
  коли користувач почне редагувати поле. Або реалізуйте метод,
  або поставте `Mode=OneWay`.
- **Команда створюється в геттері.** `public ICommand AddCommand => new RelayCommand(Add);`
  щоразу повертає новий об'єкт: прив'язка втрачає підписку, кнопка
  перестає реагувати на `CanExecute`. Створюйте команду один раз
  у конструкторі.
