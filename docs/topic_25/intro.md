---
sidebar_position: 1
---

# Відображення колекцій: ListBox, ListView, DataGrid

## Один об'єкт ми показувати вміємо. А сто?

У темі 24 ви навчилися прив'язувати інтерфейс до **одного** об'єкта: поле
`TextBox` до властивості `Name`, `CheckBox` до `IsActive`, і все це автоматично
оновлювалося завдяки `INotifyPropertyChanged`. Модель подання тримала дані,
подання їх малювало, code-behind залишався порожнім.

Але жодна реальна програма не працює з одним об'єктом. Журнал відвідуваності —
це тридцять студентів. Склад — це сотні товарів. Каса кав'ярні — це десятки
замовлень за день. Дані приходять **списком**, і показувати їх треба списком.

Писати тридцять `TextBlock` вручну — очевидно, не варіант: ви не знаєте наперед,
скільки їх буде. Потрібен елемент керування, який сам подивиться на колекцію
і сам намалює стільки рядків, скільки в ній елементів. У WPF таких елементів
багато — `ListBox`, `ListView`, `DataGrid`, `ComboBox`, `TreeView`, `TabControl`, —
але всі вони влаштовані однаково, бо всі походять від одного класу.

## Спільний предок: ItemsControl

**`ItemsControl`** — базовий клас усіх елементів WPF, які показують колекцію.
Його робота складається з трьох кроків:

1. взяти колекцію з властивості `ItemsSource`;
2. для кожного елемента колекції створити **контейнер** — візуальну обгортку
   (`ListBoxItem`, `DataGridRow`, `ComboBoxItem` тощо);
3. усередині контейнера намалювати сам елемент — або через `ToString()`,
   або через `DisplayMemberPath`, або через шаблон даних `ItemTemplate`.

```
   Модель подання                 ItemsControl                     Екран
┌──────────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│ ObservableCollection │      │  ItemsSource        │      │ ┌──────────────┐ │
│   [0] Іваненко О.    │─────▶│  (звідки брати)     │      │ │ Іваненко О.  │ │
│   [1] Петренко І.    │      │         │           │      │ ├──────────────┤ │
│   [2] Сидоренко М.   │      │         ▼           │      │ │ Петренко І.  │ │
└──────────────────────┘      │  ItemContainer      │      │ ├──────────────┤ │
          ▲                   │    Generator        │─────▶│ │ Сидоренко М. │ │
          │                   │  (генератор         │      │ └──────────────┘ │
          │                   │   контейнерів)      │      └──────────────────┘
          │                   │         │           │               │
          │                   │         ▼           │               │
          │                   │  ItemTemplate       │               │
          │                   │  (як саме малювати) │               │
          │                   └─────────────────────┘               │
          │                                                         │
          └───── SelectedItem ◀─────────────────────────────────────┘
                 (що користувач обрав)
```

Ліворуч — дані, праворуч — пікселі, посередині — машинка, яка перетворює одне
на інше. Коли ви розумієте цю схему, усі списки в WPF стають одним і тим самим
елементом з різними налаштуваннями.

### Чотири властивості, які треба знати напам'ять

| Властивість | Тип | Що робить |
| --- | --- | --- |
| `ItemsSource` | `IEnumerable` | джерело даних: колекція, яку показуємо |
| `SelectedItem` | `object` | **об'єкт**, який зараз вибрав користувач |
| `SelectedIndex` | `int` | номер вибраного рядка; `-1` — нічого не вибрано |
| `DisplayMemberPath` | `string` | назва властивості, яку показувати текстом |

Ще дві трапляються рідше, але корисні для `ComboBox`:

| Властивість | Що робить |
| --- | --- |
| `SelectedValuePath` | яку властивість обраного об'єкта вважати «значенням» |
| `SelectedValue` | саме це значення (наприклад, `Id`, а не весь об'єкт) |

:::warning[Обережно]
`ItemsSource` і ручне додавання в `Items` — це «або-або». Щойно ви задали
`ItemsSource`, колекція `Items` стає доступною тільки для читання, і виклик
`Items.Add(...)` кине виняток `InvalidOperationException`. Хочете змінити
вміст — міняйте саму колекцію-джерело.
:::

## Готуємо дані: модель і модель подання

Далі в підрозділі всі приклади працюють з однією й тією самою моделлю —
студентом групи. Модель зроблена так, як у темі 24: з `INotifyPropertyChanged`,
щоб зміни в об'єкті доходили до екрана.

Спершу — базовий клас, який ви вже писали:

```csharp
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace CollectionsDemo;

// Те саме, що й у темі 24: спільна реалізація INotifyPropertyChanged.
public class ViewModelBase : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));

    // Повертає true, якщо значення справді змінилося.
    protected bool SetProperty<T>(ref T field, T value,
                                  [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value))
            return false;

        field = value;
        OnPropertyChanged(propertyName);
        return true;
    }
}
```

Тепер сама модель студента:

```csharp
namespace CollectionsDemo;

public class Student : ViewModelBase
{
    private string _lastName = "";
    private string _firstName = "";
    private int _averageMark;
    private bool _hasScholarship;

    public string LastName
    {
        get => _lastName;
        set => SetProperty(ref _lastName, value);
    }

    public string FirstName
    {
        get => _firstName;
        set => SetProperty(ref _firstName, value);
    }

    public int AverageMark
    {
        get => _averageMark;
        set
        {
            if (SetProperty(ref _averageMark, value))
                OnPropertyChanged(nameof(FullInfo));   // залежна властивість
        }
    }

    public bool HasScholarship
    {
        get => _hasScholarship;
        set => SetProperty(ref _hasScholarship, value);
    }

    // Обчислювана властивість — зручно для DisplayMemberPath.
    public string FullName => $"{LastName} {FirstName}";

    public string FullInfo => $"{FullName} — {AverageMark} балів";
}
```

І модель подання зі списком:

```csharp
using System.Collections.ObjectModel;

namespace CollectionsDemo;

public class GroupViewModel : ViewModelBase
{
    private Student? _selectedStudent;

    public ObservableCollection<Student> Students { get; } =
    [
        new Student { LastName = "Іваненко",  FirstName = "Олег",   AverageMark = 92, HasScholarship = true  },
        new Student { LastName = "Петренко",  FirstName = "Ірина",  AverageMark = 78, HasScholarship = false },
        new Student { LastName = "Сидоренко", FirstName = "Максим", AverageMark = 65, HasScholarship = false },
        new Student { LastName = "Коваль",    FirstName = "Анна",   AverageMark = 88, HasScholarship = true  }
    ];

    // Сюди DataGrid чи ListBox покладе обраний рядок.
    public Student? SelectedStudent
    {
        get => _selectedStudent;
        set => SetProperty(ref _selectedStudent, value);
    }
}
```

:::info[Цікаво]
Запис `= [ ... ]` — це **collection expression** з C# 12. Раніше довелося б
писати `new ObservableCollection<Student> { ... }`. Компілятор сам розуміє,
яку колекцію створити, бо бачить тип властивості.
:::

:::danger[Часта помилка]
Якщо зробити `public List<Student> Students { get; } = [...]`, список
намалюється, але **не оновлюватиметься**. `List` не вміє повідомляти інтерфейс
про додавання й видалення елементів. Для колекції, яка змінюється під час
роботи програми, завжди беріть `ObservableCollection<T>` — вона реалізує
`INotifyCollectionChanged`.
:::

## ItemsControl у чистому вигляді: просто показати

Найпростіший випадок: треба вивести перелік, у якому нічого не вибирають
і нічого не редагують. Наприклад, стрічка повідомлень або список нагадувань.

```xml
<Window x:Class="CollectionsDemo.PlainListWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:CollectionsDemo"
        Title="Просто список" Height="260" Width="360">
    <Window.DataContext>
        <local:GroupViewModel />
    </Window.DataContext>

    <ItemsControl ItemsSource="{Binding Students}"
                  DisplayMemberPath="FullInfo"
                  Margin="12" />
</Window>
```

На екрані:

```
┌─ Просто список ─────────────────── ─ □ ✕ ┐
│ Іваненко Олег — 92 балів                 │
│ Петренко Ірина — 78 балів                │
│ Сидоренко Максим — 65 балів              │
│ Коваль Анна — 88 балів                   │
└──────────────────────────────────────────┘
```

Зверніть увагу: рядки не підсвічуються під мишею, їх не можна вибрати,
немає смуги прокручування. `ItemsControl` — це просто «намалюй усе підряд».
І саме тому його беруть, коли вибір не потрібен: він найлегший і не малює
зайвого.

:::tip[Порада]
Якщо елементів багато, загорніть `ItemsControl` у `ScrollViewer` —
сам він прокручування не має, на відміну від `ListBox`.
:::

## ListBox: коли треба вибирати

`ListBox` додає до `ItemsControl` головне — **вибір**. Рядок під мишею
підсвічується, клік обирає елемент, обраний об'єкт потрапляє в `SelectedItem`.

```xml
<Window x:Class="CollectionsDemo.ListBoxWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:CollectionsDemo"
        Title="ListBox" Height="300" Width="400">
    <Window.DataContext>
        <local:GroupViewModel />
    </Window.DataContext>

    <DockPanel Margin="12">
        <TextBlock DockPanel.Dock="Bottom" Margin="0,8,0,0"
                   Text="{Binding SelectedStudent.FullInfo,
                                  FallbackValue='Нікого не обрано'}" />

        <ListBox x:Name="StudentsList"
                 ItemsSource="{Binding Students}"
                 SelectedItem="{Binding SelectedStudent}"
                 DisplayMemberPath="FullName" />
    </DockPanel>
</Window>
```

Три речі варто розібрати окремо.

**`SelectedItem="{Binding SelectedStudent}"`** — двостороння прив'язка
(для `SelectedItem` вона двостороння за замовчуванням). Користувач клікнув
рядок — властивість моделі подання змінилася. Ви присвоїли властивості
значення з коду — у списку підсвітився потрібний рядок. Це і є той місток,
завдяки якому модель подання «знає», що зараз обрано, і при цьому не має
жодного посилання на `ListBox`.

**`DisplayMemberPath="FullName"`** — без нього `ListBox` викликав би
`ToString()` і показав би `CollectionsDemo.Student` чотири рази.

**`FallbackValue`** — текст, який показується, поки прив'язка не дала
результату (тут — поки `SelectedStudent` дорівнює `null`).

### Множинний вибір

```xml
<ListBox ItemsSource="{Binding Students}"
         DisplayMemberPath="FullName"
         SelectionMode="Extended" />
```

| Значення `SelectionMode` | Поведінка |
| --- | --- |
| `Single` | один елемент (за замовчуванням) |
| `Multiple` | клік додає елемент до вибраних, повторний клік знімає |
| `Extended` | як у Провіднику: Ctrl — додати, Shift — діапазон |

:::warning[Обережно]
При множинному виборі обрані елементи лежать у `SelectedItems` (з `s` на кінці),
і це **не** властивість залежності — прив'язати її до моделі подання
напряму не вийде. Найпростіше рішення для MVVM: додати в кожен елемент
властивість `IsSelected` і прив'язати її через `ItemContainerStyle`.
:::

## ListView з GridView: список у колонках

Коли в кожного елемента кілька важливих полів, один рядок тексту стає тісним.
`ListView` — це той самий `ListBox` (він від нього успадкований), але з
можливістю підставити **вигляд** через властивість `View`. Стандартний вигляд
у WPF один — `GridView`, таблиця з колонками й заголовками.

```xml
<Window x:Class="CollectionsDemo.ListViewWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:CollectionsDemo"
        Title="ListView з колонками" Height="300" Width="520">
    <Window.DataContext>
        <local:GroupViewModel />
    </Window.DataContext>

    <ListView ItemsSource="{Binding Students}"
              SelectedItem="{Binding SelectedStudent}"
              Margin="12">
        <ListView.View>
            <GridView>
                <GridViewColumn Header="Прізвище" Width="140"
                                DisplayMemberBinding="{Binding LastName}" />
                <GridViewColumn Header="Ім'я" Width="120"
                                DisplayMemberBinding="{Binding FirstName}" />
                <GridViewColumn Header="Середній бал" Width="110"
                                DisplayMemberBinding="{Binding AverageMark}" />
                <GridViewColumn Header="Стипендія" Width="90">
                    <GridViewColumn.CellTemplate>
                        <DataTemplate>
                            <CheckBox IsChecked="{Binding HasScholarship}"
                                      IsEnabled="False"
                                      HorizontalAlignment="Center" />
                        </DataTemplate>
                    </GridViewColumn.CellTemplate>
                </GridViewColumn>
            </GridView>
        </ListView.View>
    </ListView>
</Window>
```

```
┌─ ListView з колонками ─────────────────────────────── ─ □ ✕ ┐
│ Прізвище      │ Ім'я    │ Середній бал │ Стипендія         │
├───────────────┼─────────┼──────────────┼───────────────────┤
│ Іваненко      │ Олег    │ 92           │        ☑          │
│ Петренко      │ Ірина   │ 78           │        ☐          │
│ Сидоренко     │ Максим  │ 65           │        ☐          │
│ Коваль        │ Анна    │ 88           │        ☑          │
└─────────────────────────────────────────────────────────────┘
```

Виглядає як таблиця. Але це **не** таблиця: комірки не редагуються,
клік по заголовку нічого не сортує (сортування доведеться писати руками),
додати рядок користувач не може. `ListView` — це список, який просто гарно
вирівняний у колонки.

:::info[Цікаво]
`GridViewColumn` має дві схожі властивості: `DisplayMemberBinding` (просто текст)
і `CellTemplate` (довільний вміст комірки). Якщо задати обидві, виграє
`DisplayMemberBinding` — шаблон буде проігноровано. Це класична пастка:
«чому мій шаблон не працює?».
:::

## DataGrid: справжня таблиця

`DataGrid` — найважчий і найпотужніший з цієї четвірки. Він уміє те, чого
не вміє жоден інший: **редагувати дані прямо в комірці**, додавати й видаляти
рядки, сортувати кліком по заголовку, змінювати ширину колонок мишею.

```xml
<Window x:Class="CollectionsDemo.DataGridWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:CollectionsDemo"
        Title="DataGrid" Height="300" Width="560">
    <Window.DataContext>
        <local:GroupViewModel />
    </Window.DataContext>

    <DataGrid ItemsSource="{Binding Students}"
              SelectedItem="{Binding SelectedStudent}"
              AutoGenerateColumns="False"
              CanUserAddRows="True"
              Margin="12">
        <DataGrid.Columns>
            <DataGridTextColumn Header="Прізвище" Width="*"
                                Binding="{Binding LastName}" />
            <DataGridTextColumn Header="Ім'я" Width="*"
                                Binding="{Binding FirstName}" />
            <DataGridTextColumn Header="Бал" Width="80"
                                Binding="{Binding AverageMark}" />
            <DataGridCheckBoxColumn Header="Стипендія" Width="90"
                                    Binding="{Binding HasScholarship}" />
        </DataGrid.Columns>
    </DataGrid>
</Window>
```

Двічі клацніть по комірці «Бал», введіть 70, натисніть Enter — значення
потрапить у властивість `AverageMark` об'єкта `Student`. Ніякого коду
ви для цього не написали. Саме за це `DataGrid` і люблять — і саме тому
йому присвячений увесь наступний підрозділ.

## Що обирати: таблиця-порівняння

| Елемент | Що вміє | Коли обирати | Чого коштує |
| --- | --- | --- | --- |
| `ItemsControl` | лише показати колекцію | стрічка новин, перелік тегів, будь-що без вибору | немає вибору, немає прокручування |
| `ListBox` | + вибір, підсвічування, прокручування, множинний вибір | список, з якого щось обирають; список карток із шаблоном | одна «колонка» даних на рядок |
| `ListView` + `GridView` | + колонки із заголовками | перегляд таблиці **без** редагування | не редагує, не сортує сам |
| `DataGrid` | + редагування, додавання й видалення рядків, сортування кліком | робота з табличними даними, які треба правити | найважчий, найбільше налаштувань |
| `ComboBox` | вибір одного зі списку в згорнутому вигляді | коли місця мало, а варіантів багато | не показує список цілком |

Просте правило вибору:

```
Потрібно редагувати дані в таблиці?
        │
        ├── так ──▶ DataGrid
        │
        └── ні ───▶ Потрібні колонки з заголовками?
                            │
                            ├── так ──▶ ListView + GridView
                            │
                            └── ні ───▶ Потрібно щось обирати?
                                              │
                                              ├── так ──▶ ListBox
                                              │
                                              └── ні ───▶ ItemsControl
```

## ComboBox: коли місця немає

`ComboBox` — компактна альтернатива `ListBox`: у згорнутому стані він займає
один рядок, а список показує лише тоді, коли його відкрили. Ідеально для
вибору категорії, групи, статусу.

```xml
<StackPanel Margin="12">
    <TextBlock Text="Оберіть студента:" />
    <ComboBox ItemsSource="{Binding Students}"
              SelectedItem="{Binding SelectedStudent}"
              DisplayMemberPath="FullName"
              Margin="0,4,0,12" />

    <TextBlock Text="{Binding SelectedStudent.FullInfo,
                              FallbackValue='—'}"
               FontWeight="Bold" />
</StackPanel>
```

Іноді моделі подання не потрібен цілий об'єкт — вистачить одного поля.
Тоді беруть пару `SelectedValuePath` плюс `SelectedValue`:

```xml
<ComboBox ItemsSource="{Binding Students}"
          DisplayMemberPath="FullName"
          SelectedValuePath="LastName"
          SelectedValue="{Binding SelectedLastName}" />
```

Тепер у `SelectedLastName` (тип `string`) потрапить лише прізвище, а не весь
об'єкт `Student`.

:::tip[Порада]
Властивість `IsEditable="True"` перетворює `ComboBox` на поле з підказками:
користувач може і обрати зі списку, і ввести свій текст. Разом з
`IsTextSearchEnabled="True"` це дає звичний «автодоповнювач».
:::

## Майстер-деталь: список зліва, подробиці справа

Найчастіший сценарій із колекціями називають **майстер-деталь**
(master-detail): в одній частині вікна список, у другій — детальна картка
того елемента, який зараз обраний. Класика: пошта (зліва листи, справа текст),
контакти, каталог товарів.

У WPF це робиться майже без коду — весь зв'язок тримає `SelectedItem`.

```
┌─ Група ПЗ-21 ─────────────────────────────────────── ─ □ ✕ ┐
│ ┌──────────────────┐ ┌────────────────────────────────────┐│
│ │ Іваненко Олег    │ │ Прізвище: [Петренко            ]   ││
│ │▶Петренко Ірина   │ │ Ім'я:     [Ірина               ]   ││
│ │ Сидоренко Максим │ │ Бал:      [78                  ]   ││
│ │ Коваль Анна      │ │ [ ] Стипендія                      ││
│ └──────────────────┘ └────────────────────────────────────┘│
│ Обрано: Петренко Ірина — 78 балів                          │
└─────────────────────────────────────────────────────────────┘
```

Повне вікно:

```xml
<Window x:Class="CollectionsDemo.MasterDetailWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:CollectionsDemo"
        Title="Група ПЗ-21" Height="320" Width="620">
    <Window.DataContext>
        <local:GroupViewModel />
    </Window.DataContext>

    <Grid Margin="12">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="220" />
            <ColumnDefinition Width="*" />
        </Grid.ColumnDefinitions>
        <Grid.RowDefinitions>
            <RowDefinition Height="*" />
            <RowDefinition Height="Auto" />
        </Grid.RowDefinitions>

        <!-- Майстер: список -->
        <ListBox Grid.Row="0" Grid.Column="0"
                 ItemsSource="{Binding Students}"
                 SelectedItem="{Binding SelectedStudent}"
                 DisplayMemberPath="FullName" />

        <!-- Деталі: усе прив'язано до SelectedStudent -->
        <GroupBox Grid.Row="0" Grid.Column="1" Margin="12,0,0,0"
                  Header="Картка студента"
                  DataContext="{Binding SelectedStudent}">
            <StackPanel Margin="8">
                <TextBlock Text="Прізвище:" />
                <TextBox Text="{Binding LastName, UpdateSourceTrigger=PropertyChanged}"
                         Margin="0,2,0,8" />

                <TextBlock Text="Ім'я:" />
                <TextBox Text="{Binding FirstName, UpdateSourceTrigger=PropertyChanged}"
                         Margin="0,2,0,8" />

                <TextBlock Text="Середній бал:" />
                <TextBox Text="{Binding AverageMark, UpdateSourceTrigger=PropertyChanged}"
                         Margin="0,2,0,8" />

                <CheckBox Content="Отримує стипендію"
                          IsChecked="{Binding HasScholarship}" />
            </StackPanel>
        </GroupBox>

        <TextBlock Grid.Row="1" Grid.ColumnSpan="2" Margin="0,10,0,0"
                   Text="{Binding SelectedStudent.FullInfo,
                                  FallbackValue='Нікого не обрано'}" />
    </Grid>
</Window>
```

Ключовий трюк — рядок `DataContext="{Binding SelectedStudent}"` на `GroupBox`.
Він каже: «усе, що всередині, прив'язується не до моделі подання, а до
обраного студента». Далі всередині пишемо просто `{Binding LastName}` —
без довгих шляхів на кшталт `SelectedStudent.LastName`. Коли користувач
обирає інший рядок, `DataContext` групи міняється сам, і вся картка
перемальовується.

А тепер спробуйте виправити прізвище у правому полі — і подивіться на список
зліва. Воно зміниться там теж, миттєво. Це працює, бо:

1. `TextBox` записав нове значення у властивість `LastName`;
2. `SetProperty` викликав `OnPropertyChanged`;
3. `ListBox` слухає `PropertyChanged` кожного елемента і перемальовує рядок.

:::danger[Часта помилка]
Якщо модель `Student` не реалізує `INotifyPropertyChanged`, редагування
в правій панелі «мовчки» не оновить список зліва. Дані в об'єкті зміняться,
а на екрані лишиться старий текст — і студент півгодини шукає помилку
в прив'язці, хоча проблема в моделі.
:::

## Чому список на 100 000 рядків не гальмує

Уявіть `ListBox` зі ста тисячами елементів. Якби WPF створив сто тисяч
`ListBoxItem` з усіма їхніми рамками, фонами й текстами, програма з'їла б
кілька гігабайтів пам'яті й зависла б на секунди. Але вона не зависає —
завдяки **віртуалізації**.

Ідея проста: на екрані одночасно видно, скажімо, 20 рядків. Отже, і створювати
треба лише 20 контейнерів. Коли користувач прокручує список, WPF не робить
нових контейнерів — він **перевикористовує** старі, просто підставляючи в них
інші дані. Панель, яка це вміє, називається `VirtualizingStackPanel`, і в
`ListBox`, `ListView`, `DataGrid` та `ComboBox` вона стоїть за замовчуванням.

:::warning[Обережно]
Віртуалізацію легко зламати випадково. Вона вимикається, якщо: замінити
`ItemsPanel` на `WrapPanel` чи `StackPanel`; загорнути список у `ScrollViewer`
з `VerticalScrollBarVisibility="Disabled"` (тоді список отримує нескінченну
висоту й мусить намалювати все); увімкнути групування без
`VirtualizingPanel.IsVirtualizingWhenGrouping="True"`. Якщо ваш список
раптом почав «думати» кілька секунд — шукайте, де ви її вимкнули.
:::

## Типові помилки

1. **`List` замість `ObservableCollection`.** Дані є, початковий список
   малюється, але `Add` і `Remove` не видно на екрані. Правильно:
   `ObservableCollection<T>` для всього, що змінюється під час роботи.

2. **`Items.Add(...)` при заданому `ItemsSource`.** Виняток
   `InvalidOperationException` з текстом про «Items collection must be empty».
   Правильно: додавати в колекцію-джерело, а не в `Items`.

3. **Забутий `DisplayMemberPath`.** У списку чотири рядки
   `CollectionsDemo.Student`. Правильно: або `DisplayMemberPath`, або
   `ItemTemplate` (про нього — у підрозділі 3), або, у крайньому разі,
   перевизначений `ToString()`.

4. **Робота з елементом через `SelectedIndex` замість `SelectedItem`.**
   Код на кшталт `Students[SelectedIndex]` ламається, щойно з'являється
   сортування або фільтр: індекс у списку на екрані і індекс у колекції —
   це різні речі. Правильно: завжди беріть сам об'єкт із `SelectedItem`.
