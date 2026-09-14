---
sidebar_position: 3
---

# Шаблони даних, сортування, фільтрація та групування

## Рядок тексту — це замало

`DisplayMemberPath` показує одну властивість. Іноді цього досить: список
прізвищ, перелік категорій. Але щойно в елемента стає кілька важливих полів,
одного рядка тексту не вистачає. Подивіться на будь-який застосунок, яким
користуєтесь: у стрічці повідомлень видно й ім'я, й текст, й час; у каталозі
товарів — назва, ціна, фото, наявність. Це вже не рядок, це **картка**.

```
        ДО (DisplayMemberPath)                  ПІСЛЯ (DataTemplate)
┌──────────────────────────────┐     ┌──────────────────────────────────────┐
│ Кава зернова                 │     │ ┌──────┐ Кава зернова       189,00 ₴ │
│ Молоко 2,5%                  │     │ │ НАП  │ Напої          в наявності  │
│ Цукор                        │     │ └──────┘ залишок: 12 шт             │
│ Круасан                      │     ├──────────────────────────────────────┤
└──────────────────────────────┘     │ ┌──────┐ Молоко 2,5%         38,50 ₴ │
                                     │ │ МОЛ  │ Молочне        в наявності  │
   одна властивість на рядок         │ └──────┘ залишок: 40 шт             │
                                     └──────────────────────────────────────┘
                                        довільна розмітка на кожен елемент
```

Інструмент, який це дає, називається **шаблон даних** (`DataTemplate`) —
шматок XAML, що описує, як намалювати **один** об'єкт з колекції.
Ви вже бачили його в темі 22 для `ContentControl`; тут він працює так само,
просто застосовується до кожного елемента списку.

## ItemTemplate: картка замість рядка

```xml
<ListBox ItemsSource="{Binding Products}"
         SelectedItem="{Binding SelectedProduct}"
         HorizontalContentAlignment="Stretch"
         Margin="12">
    <ListBox.ItemTemplate>
        <DataTemplate>
            <Border BorderBrush="#DDE3EA" BorderThickness="1"
                    CornerRadius="6" Padding="8" Margin="0,3">
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="46" />
                        <ColumnDefinition Width="*" />
                        <ColumnDefinition Width="Auto" />
                    </Grid.ColumnDefinitions>
                    <Grid.RowDefinitions>
                        <RowDefinition Height="Auto" />
                        <RowDefinition Height="Auto" />
                    </Grid.RowDefinitions>

                    <Border Grid.Column="0" Grid.RowSpan="2"
                            Background="#E8F0FE" CornerRadius="4"
                            Width="40" Height="40" VerticalAlignment="Top">
                        <TextBlock Text="{Binding Category}"
                                   FontSize="9" FontWeight="Bold"
                                   Foreground="#1A73E8"
                                   TextWrapping="Wrap" TextAlignment="Center"
                                   HorizontalAlignment="Center"
                                   VerticalAlignment="Center" />
                    </Border>

                    <TextBlock Grid.Column="1" Grid.Row="0" Margin="8,0,0,0"
                               Text="{Binding Name}"
                               FontSize="14" FontWeight="SemiBold" />

                    <TextBlock Grid.Column="1" Grid.Row="1" Margin="8,2,0,0"
                               Foreground="Gray"
                               Text="{Binding Quantity, StringFormat='залишок: {0} шт'}" />

                    <TextBlock Grid.Column="2" Grid.Row="0"
                               Text="{Binding Price, StringFormat='{}{0:N2} ₴'}"
                               FontSize="14" FontWeight="Bold" />

                    <TextBlock Grid.Column="2" Grid.Row="1"
                               HorizontalAlignment="Right" Margin="0,2,0,0"
                               Text="в наявності" Foreground="Green">
                        <TextBlock.Style>
                            <Style TargetType="TextBlock">
                                <Style.Triggers>
                                    <DataTrigger Binding="{Binding IsAvailable}" Value="False">
                                        <Setter Property="Text" Value="немає" />
                                        <Setter Property="Foreground" Value="#C62828" />
                                    </DataTrigger>
                                </Style.Triggers>
                            </Style>
                        </TextBlock.Style>
                    </TextBlock>
                </Grid>
            </Border>
        </DataTemplate>
    </ListBox.ItemTemplate>
</ListBox>
```

Усередині `DataTemplate` діє просте правило: **`DataContext` дорівнює самому
об'єкту колекції**. Тому пишемо `{Binding Name}`, `{Binding Price}` —
без жодних префіксів.

:::tip Порада
`HorizontalContentAlignment="Stretch"` на `ListBox` — маленька, але дуже
важлива деталь. Без неї картка стисне себе по ширині вмісту й ліпитиметься
до лівого краю, а ви довго шукатимете, чому `Grid` не розтягується.
:::

### Неявний шаблон через DataType

Якщо один і той самий об'єкт зустрічається в кількох місцях застосунку,
копіювати шаблон у кожен список — погана ідея. Помістіть його в ресурси
**без ключа**, але з атрибутом `DataType` — і WPF застосовуватиме його
автоматично скрізь, де трапиться об'єкт цього типу.

```xml
<Window x:Class="ViewsDemo.CardsWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:ViewsDemo"
        Title="Картки товарів" Height="420" Width="640">
    <Window.DataContext>
        <local:WarehouseViewModel />
    </Window.DataContext>

    <Window.Resources>
        <!-- Ключа немає, є DataType — шаблон стає неявним -->
        <DataTemplate DataType="{x:Type local:Product}">
            <StackPanel Margin="6">
                <TextBlock Text="{Binding Name}" FontWeight="Bold" />
                <TextBlock Text="{Binding Price, StringFormat='{}{0:N2} ₴'}"
                           Foreground="Gray" />
            </StackPanel>
        </DataTemplate>
    </Window.Resources>

    <!-- ItemTemplate не заданий, але картки все одно намалюються -->
    <ListBox ItemsSource="{Binding Products}" Margin="12" />
</Window>
```

Це той самий механізм, на якому тримається «навігація по моделях подання»
у великих MVVM-застосунках: ви кладете у властивість об'єкт, а WPF сам
знаходить для нього потрібний вигляд.

| Спосіб | Коли обирати |
| --- | --- |
| `ItemTemplate` прямо в списку | шаблон потрібен лише тут, один раз |
| ресурс із `x:Key` + `ItemTemplate="{StaticResource ...}"` | той самий шаблон у кількох списках |
| неявний шаблон із `DataType` | «цей тип завжди виглядає ось так» |

### ItemsPanelTemplate: змінюємо напрямок

`ItemTemplate` каже, як намалювати **один** елемент. А `ItemsPanelTemplate`
каже, як розкласти **всі** елементи. За замовчуванням це вертикальний
`VirtualizingStackPanel`, але нічого не заважає поставити `WrapPanel` —
і список перетвориться на плитку, як у Провіднику.

```xml
<ListBox ItemsSource="{Binding Products}"
         ScrollViewer.HorizontalScrollBarVisibility="Disabled">
    <ListBox.ItemsPanel>
        <ItemsPanelTemplate>
            <WrapPanel Orientation="Horizontal" />
        </ItemsPanelTemplate>
    </ListBox.ItemsPanel>

    <ListBox.ItemTemplate>
        <DataTemplate>
            <Border Width="150" Height="90" Margin="4" Padding="8"
                    Background="#F4F7FB" CornerRadius="6">
                <StackPanel>
                    <TextBlock Text="{Binding Name}" FontWeight="Bold" TextWrapping="Wrap" />
                    <TextBlock Text="{Binding Price, StringFormat='{}{0:N2} ₴'}" />
                </StackPanel>
            </Border>
        </DataTemplate>
    </ListBox.ItemTemplate>
</ListBox>
```

```
┌─ Плитка ────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │Кава      │ │Молоко    │ │Цукор     │          │
│ │189,00 ₴  │ │ 38,50 ₴  │ │ 32,00 ₴  │          │
│ └──────────┘ └──────────┘ └──────────┘          │
│ ┌──────────┐                                    │
│ │Круасан   │                                    │
│ │ 28,00 ₴  │                                    │
│ └──────────┘                                    │
└─────────────────────────────────────────────────┘
```

:::warning Обережно
`WrapPanel` **не вміє віртуалізації**. На чотирьох товарах це непомітно,
на десяти тисячах — застосунок повисне на кілька секунд, бо WPF створить
десять тисяч карток одразу. Плитка годиться для невеликих колекцій;
для великих залишайте вертикальну панель.
:::

### DataTemplateSelector коротко

Буває, що вигляд елемента залежить не від типу, а від значення: акційні товари
малюємо жовтою карткою, прострочені — сірою. Простий випадок закривається
`DataTrigger` усередині одного шаблону (як вище з написом «немає»). Коли ж
розмітка відрізняється кардинально, пишуть **селектор шаблонів** — клас,
що вибирає `DataTemplate` у коді:

```csharp
using System.Windows;
using System.Windows.Controls;

namespace ViewsDemo;

public class ProductTemplateSelector : DataTemplateSelector
{
    public DataTemplate? NormalTemplate { get; set; }
    public DataTemplate? ExpiredTemplate { get; set; }

    public override DataTemplate? SelectTemplate(object item, DependencyObject container)
    {
        if (item is Product product && product.IsExpired)
            return ExpiredTemplate;

        return NormalTemplate;
    }
}
```

```xml
<Window.Resources>
    <DataTemplate x:Key="NormalCard"> ... </DataTemplate>
    <DataTemplate x:Key="ExpiredCard"> ... </DataTemplate>

    <local:ProductTemplateSelector x:Key="CardSelector"
        NormalTemplate="{StaticResource NormalCard}"
        ExpiredTemplate="{StaticResource ExpiredCard}" />
</Window.Resources>

<ListBox ItemsSource="{Binding Products}"
         ItemTemplateSelector="{StaticResource CardSelector}" />
```

Метод `SelectTemplate` викликається для кожного елемента один раз, у момент
створення контейнера. Тому селектор не годиться для змінних умов: якщо товар
протермінується вже під час роботи програми, шаблон сам не переключиться.
Для таких випадків — `DataTrigger`.

## CollectionViewSource: погляд на колекцію

Тепер головне питання підрозділу. Ви показали список товарів. Користувач
просить: «відсортуй за ціною», «покажи лише напої», «згрупуй за категоріями».

Наївне рішення — щоразу будувати нову колекцію: створити другий
`ObservableCollection`, пройтися циклом, відібрати потрібне, посортувати
й підставити в `ItemsSource`. Так робити **не треба**, і ось чому:

- список «стрибає»: втрачається виділення, позиція прокручування, режим
  редагування;
- дані дублюються в пам'яті;
- при кожній зміні оригіналу треба не забути перебудувати копію;
- редагування працює з копією, а не з оригіналом.

WPF пропонує інше. Між колекцією і списком є проміжний шар — **подання
колекції** (`ICollectionView`). Це не копія даних, а «окуляри»: набір правил
сортування, фільтрації та групування, через які видно ту саму колекцію.

```
                     ┌──────────────────────────────┐
                     │  ObservableCollection        │
                     │  (єдине джерело даних)       │
                     │  Кава · Молоко · Цукор ·     │
                     │  Круасан · Чай · Сир         │
                     └──────────────┬───────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ Погляд 1        │    │ Погляд 2         │    │ Погляд 3         │
   │ сортування:     │    │ фільтр:          │    │ групування:      │
   │ за ціною ↓      │    │ "мол"            │    │ за категорією    │
   ├─────────────────┤    ├──────────────────┤    ├──────────────────┤
   │ Сир      210,00 │    │ Молоко           │    │ ▼ Напої (2)      │
   │ Кава     189,00 │    │                  │    │    Кава, Чай     │
   │ Молоко    38,50 │    │                  │    │ ▼ Молочне (2)    │
   │ Цукор     32,00 │    │                  │    │    Молоко, Сир   │
   └─────────────────┘    └──────────────────┘    └──────────────────┘

   Дані одні. Поглядів скільки завгодно. Пам'ять не дублюється.
```

**`CollectionViewSource`** — це XAML-обгортка, через яку такий погляд створюють
і налаштовують. У коді ту саму річ дістають методом
`CollectionViewSource.GetDefaultView(колекція)`.

:::info Цікаво
Подання для колекції існує завжди, навіть якщо ви про нього не знаєте.
Коли ви пишете `ItemsSource="{Binding Products}"`, `ListBox` насправді
працює не з колекцією, а з її **поданням за замовчуванням**. Саме тому
`SelectedItem`, сортування кліком по заголовку `DataGrid` і переміщення
стрілками працюють без вашої участі. І саме тому подання за замовчуванням
одне на колекцію: два списки, прив'язані до `Products`, ділять одне виділення.
Якщо потрібні незалежні погляди — створюйте окремі `CollectionViewSource`.
:::

### Оголошення в XAML

```xml
<Window.Resources>
    <CollectionViewSource x:Key="ProductsView"
                          Source="{Binding Products}">
        <CollectionViewSource.SortDescriptions>
            <scm:SortDescription PropertyName="Name" Direction="Ascending" />
        </CollectionViewSource.SortDescriptions>
    </CollectionViewSource>
</Window.Resources>
```

Тип `SortDescription` живе у просторі імен `System.ComponentModel`, тому
у вікні потрібен ще один префікс:

```xml
xmlns:scm="clr-namespace:System.ComponentModel;assembly=WindowsBase"
```

Прив'язка до такого ресурсу робиться через `StaticResource`:

```xml
<DataGrid ItemsSource="{Binding Source={StaticResource ProductsView}}"
          AutoGenerateColumns="False" />
```

### Оголошення в коді моделі подання

XAML-варіант зручний для фіксованих правил. Але фільтр за текстом із поля
пошуку живе в моделі подання, тож частіше подання створюють у C#:

```csharp
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows.Data;

namespace ViewsDemo;

public class WarehouseViewModel : ViewModelBase
{
    public ObservableCollection<Product> Products { get; } = [ /* ... */ ];

    // Саме це подання прив'язуємо до списку.
    public ICollectionView ProductsView { get; }

    public WarehouseViewModel()
    {
        ProductsView = CollectionViewSource.GetDefaultView(Products);
        ProductsView.SortDescriptions.Add(
            new SortDescription(nameof(Product.Name), ListSortDirection.Ascending));
    }
}
```

```xml
<DataGrid ItemsSource="{Binding ProductsView}" AutoGenerateColumns="False" />
```

## Сортування

### Одне поле

```csharp
ProductsView.SortDescriptions.Clear();
ProductsView.SortDescriptions.Add(
    new SortDescription(nameof(Product.Price), ListSortDirection.Descending));
```

### Багаторівневе

Порядок у колекції `SortDescriptions` = пріоритет. Перший опис — головний
ключ, другий застосовується всередині однакових значень першого, і так далі.

```csharp
// Спочатку за категорією (за абеткою), всередині категорії — за ціною (спадання)
ProductsView.SortDescriptions.Clear();
ProductsView.SortDescriptions.Add(
    new SortDescription(nameof(Product.Category), ListSortDirection.Ascending));
ProductsView.SortDescriptions.Add(
    new SortDescription(nameof(Product.Price), ListSortDirection.Descending));
```

Результат:

```
Бакалія   │ Цукор           32,00
Випічка   │ Круасан         28,00
Молочне   │ Сир            210,00   ← у межах "Молочне" сортування за ціною
Молочне   │ Молоко          38,50
Напої     │ Кава           189,00   ← у межах "Напої" теж
Напої     │ Чай             95,00
```

### Перемикач сортування в інтерфейсі

```csharp
private string _sortField = "Name";

public string SortField
{
    get => _sortField;
    set
    {
        if (SetProperty(ref _sortField, value))
            ApplySort();
    }
}

private void ApplySort()
{
    var direction = _sortField == "Price"
        ? ListSortDirection.Descending
        : ListSortDirection.Ascending;

    ProductsView.SortDescriptions.Clear();
    ProductsView.SortDescriptions.Add(new SortDescription(_sortField, direction));
}
```

```xml
<ComboBox SelectedValuePath="Tag"
          SelectedValue="{Binding SortField}" Width="180">
    <ComboBoxItem Content="За назвою"     Tag="Name" />
    <ComboBoxItem Content="За ціною"      Tag="Price" />
    <ComboBoxItem Content="За кількістю"  Tag="Quantity" />
</ComboBox>
```

:::tip Порада
Не забувайте `SortDescriptions.Clear()` перед додаванням нового правила.
Без нього описи накопичуються, і після п'яти перемикань у вас буде
п'ятирівневе сортування, де працює тільки перший рівень — той, що ви
задали найпершим.
:::

:::note
У `DataGrid` сортування кліком по заголовку і `SortDescriptions` — це той самий
механізм. Клік просто очищає описи й додає свій. Тому ваше програмне
сортування «зникне», щойно користувач клікне по заголовку, — це нормально
й очікувано.
:::

## Фільтрація

Фільтр — це **предикат**: функція, яка для кожного елемента відповідає
«показувати» або «не показувати». У WPF він має тип
`Predicate<object>` — приймає `object`, повертає `bool`.

```csharp
ProductsView.Filter = item =>
{
    if (item is not Product product)
        return false;

    return product.Quantity > 0;   // показувати лише те, що є на складі
};
```

Прибрати фільтр: `ProductsView.Filter = null;`.

### Живий пошук по тексту

Класична задача: поле пошуку, і список звужується на кожен натиск клавіші.

```csharp
private string _searchText = "";
private string _categoryFilter = "Усі";

public string SearchText
{
    get => _searchText;
    set
    {
        if (SetProperty(ref _searchText, value))
            ProductsView.Refresh();          // перепитати фільтр
    }
}

public string CategoryFilter
{
    get => _categoryFilter;
    set
    {
        if (SetProperty(ref _categoryFilter, value))
            ProductsView.Refresh();
    }
}

private bool FilterProducts(object item)
{
    if (item is not Product product)
        return false;

    // Умова 1: категорія
    if (_categoryFilter != "Усі" && product.Category != _categoryFilter)
        return false;

    // Умова 2: підрядок у назві, без урахування регістру
    if (!string.IsNullOrWhiteSpace(_searchText) &&
        product.Name.IndexOf(_searchText, StringComparison.OrdinalIgnoreCase) < 0)
        return false;

    return true;   // усі умови пройдено
}
```

У конструкторі моделі подання:

```csharp
ProductsView = CollectionViewSource.GetDefaultView(Products);
ProductsView.Filter = FilterProducts;
```

Поле пошуку в XAML — з обов'язковим `UpdateSourceTrigger=PropertyChanged`,
інакше фільтр спрацює лише після втрати фокуса:

```xml
<DockPanel Margin="12">
    <StackPanel DockPanel.Dock="Top" Orientation="Horizontal" Margin="0,0,0,8">
        <TextBlock Text="Пошук:" VerticalAlignment="Center" Margin="0,0,6,0" />
        <TextBox Width="200"
                 Text="{Binding SearchText, UpdateSourceTrigger=PropertyChanged}" />

        <TextBlock Text="Категорія:" VerticalAlignment="Center" Margin="16,0,6,0" />
        <ComboBox Width="140"
                  ItemsSource="{Binding FilterCategories}"
                  SelectedItem="{Binding CategoryFilter}" />

        <TextBlock Margin="16,0,0,0" VerticalAlignment="Center"
                   Text="{Binding VisibleCount, StringFormat='Знайдено: {0}'}" />
    </StackPanel>

    <DataGrid ItemsSource="{Binding ProductsView}" AutoGenerateColumns="False">
        <DataGrid.Columns>
            <DataGridTextColumn Header="Назва" Width="*" Binding="{Binding Name}" />
            <DataGridTextColumn Header="Категорія" Width="120" Binding="{Binding Category}" />
            <DataGridTextColumn Header="Ціна" Width="100"
                                Binding="{Binding Price, StringFormat='{}{0:N2}'}" />
        </DataGrid.Columns>
    </DataGrid>
</DockPanel>
```

Скільки рядків лишилося після фільтра, теж рахуємо в моделі подання —
через цикл, без LINQ:

```csharp
public int VisibleCount
{
    get
    {
        var count = 0;
        foreach (var _ in ProductsView)   // подання віддає лише видимі елементи
            count++;
        return count;
    }
}
```

Не забудьте сповістити про зміну після кожного `Refresh()`:

```csharp
ProductsView.Refresh();
OnPropertyChanged(nameof(VisibleCount));
```

:::danger Часта помилка
`Filter` очікує `Predicate<object>`, а не `Predicate<Product>`. Тому перше,
що робить кожен фільтр, — перевіряє тип: `if (item is not Product product)`.
Якщо забути перевірку й одразу зробити приведення `(Product)item`, застосунок
упаде на рядку-заповнювачі `DataGrid` (той, що з зірочкою, коли
`CanUserAddRows="True"`): у ньому лежить не `Product`, а службовий об'єкт.
:::

## Групування

Групування перетворює плаский список на дерево з заголовками. Правило
групування описує клас `PropertyGroupDescription`:

```csharp
ProductsView.GroupDescriptions.Clear();
ProductsView.GroupDescriptions.Add(
    new PropertyGroupDescription(nameof(Product.Category)));
```

Або в XAML:

```xml
<CollectionViewSource x:Key="GroupedProducts" Source="{Binding Products}">
    <CollectionViewSource.GroupDescriptions>
        <PropertyGroupDescription PropertyName="Category" />
    </CollectionViewSource.GroupDescriptions>
    <CollectionViewSource.SortDescriptions>
        <scm:SortDescription PropertyName="Category" />
        <scm:SortDescription PropertyName="Name" />
    </CollectionViewSource.SortDescriptions>
</CollectionViewSource>
```

Саме по собі групування ще нічого не намалює — потрібен `GroupStyle`,
який описує вигляд заголовка групи:

```xml
<DataGrid ItemsSource="{Binding ProductsView}"
          AutoGenerateColumns="False">
    <DataGrid.GroupStyle>
        <GroupStyle>
            <GroupStyle.HeaderTemplate>
                <DataTemplate>
                    <Border Background="#E8EEF6" Padding="6,4" Margin="0,4,0,0"
                            CornerRadius="3">
                        <StackPanel Orientation="Horizontal">
                            <TextBlock Text="{Binding Name}"
                                       FontWeight="Bold" FontSize="13" />
                            <TextBlock Text="{Binding ItemCount,
                                              StringFormat=' — позицій: {0}'}"
                                       Foreground="#546E7A" />
                        </StackPanel>
                    </Border>
                </DataTemplate>
            </GroupStyle.HeaderTemplate>
        </GroupStyle>
    </DataGrid.GroupStyle>

    <DataGrid.Columns>
        <DataGridTextColumn Header="Назва" Width="*" Binding="{Binding Name}" />
        <DataGridTextColumn Header="Ціна" Width="100"
                            Binding="{Binding Price, StringFormat='{}{0:N2}'}" />
        <DataGridTextColumn Header="К-сть" Width="80" Binding="{Binding Quantity}" />
    </DataGrid.Columns>
</DataGrid>
```

Усередині `HeaderTemplate` `DataContext` — це не товар, а об'єкт
`CollectionViewGroup` із двома корисними властивостями:

| Властивість | Що містить |
| --- | --- |
| `Name` | значення, за яким згрупували (`"Напої"`) |
| `ItemCount` | скільки елементів у групі |
| `Items` | самі елементи групи |

Результат:

```
┌─ Товари за категоріями ──────────────────────────────┐
│ ╔══════════════════════════════════════════════════╗ │
│ ║ Бакалія — позицій: 1                             ║ │
│ ╚══════════════════════════════════════════════════╝ │
│   Цукор                      32,00        0          │
│ ╔══════════════════════════════════════════════════╗ │
│ ║ Молочне — позицій: 2                             ║ │
│ ╚══════════════════════════════════════════════════╝ │
│   Молоко 2,5%                38,50       40          │
│   Сир твердий               210,00        4          │
│ ╔══════════════════════════════════════════════════╗ │
│ ║ Напої — позицій: 2                               ║ │
│ ╚══════════════════════════════════════════════════╝ │
│   Кава зернова              189,00       12          │
│   Чай зелений                95,00       20          │
└──────────────────────────────────────────────────────┘
```

Групування чудово поєднується з сортуванням і фільтром: фільтр відсіює
елементи, сортування розкладає їх по порядку, групування збирає в блоки —
і все це над однією й тією самою колекцією.

:::tip Порада
Групувати можна не лише за наявною властивістю. Додайте в модель обчислювану
властивість на кшталт `PriceRange`, яка повертає `"до 50 грн"`,
`"50–150 грн"`, `"понад 150 грн"`, — і групуйте за нею. Це найдешевший спосіб
зробити «звіт за діапазонами».
:::

:::warning Обережно
Групування вимикає віртуалізацію `DataGrid`. Якщо рядків багато, поставте
`VirtualizingPanel.IsVirtualizingWhenGrouping="True"` на самому `DataGrid` —
у .NET 8 це працює й помітно рятує швидкодію.
:::

## Refresh: коли і навіщо

`ICollectionView` перебудовує себе автоматично лише тоді, коли змінюється
**сама колекція** — додали або видалили елемент у `ObservableCollection`.
Усі інші зміни для нього невидимі, і треба сказати явно:
`ProductsView.Refresh()`.

| Що сталося | Чи оновиться подання саме | Потрібен `Refresh()` |
| --- | --- | --- |
| додали елемент у `ObservableCollection` | так | ні |
| видалили елемент | так | ні |
| змінилося поле елемента, за яким **сортуємо** | ні | так |
| змінилося поле, за яким **фільтруємо** | ні | так |
| змінилося поле, за яким **групуємо** | ні | так |
| змінився текст у полі пошуку | ні | так |
| додали новий `SortDescription` | так | ні |

Простими словами: `Refresh()` викликають, коли змінилися не елементи,
а **умови** — або коли змінилося поле всередині елемента, від якого залежить
порядок чи видимість.

:::danger Часта помилка
`Refresh()` — операція **важка**: подання заново переглядає всю колекцію,
прогонить через фільтр, відсортує й перебудує групи. Виклик усередині циклу
на тисячу елементів — це тисяча повних перебудов і зависання інтерфейсу
на кілька секунд.

Неправильно:

```csharp
foreach (var product in newProducts)
{
    Products.Add(product);
    ProductsView.Refresh();   // жах: перебудова на кожній ітерації
}
```

Правильно — один раз після циклу, а ще краще взагалі не викликати
(додавання в `ObservableCollection` подання бачить саме):

```csharp
using (ProductsView.DeferRefresh())   // зміни накопичуються...
{
    foreach (var product in newProducts)
        Products.Add(product);
}                                     // ...і застосовуються один раз тут
```
:::

Метод `DeferRefresh()` повертає об'єкт `IDisposable`: поки блок `using`
не завершився, подання не перемальовується. Це той самий прийом,
що й «заморозити екран, зробити зміни, розморозити».

## Типові помилки

1. **Перебудова колекції замість фільтра.** Створити другий
   `ObservableCollection` і наповнювати його в циклі при кожному натиску
   клавіші — втрачається виділення, дублюються дані, ламається редагування.
   Правильно: `ICollectionView.Filter` плюс `Refresh()`.

2. **`SortDescriptions.Add` без `Clear`.** Правила накопичуються, і після
   кількох перемикань сортування перестає слухатись. Правильно: спочатку
   `Clear()`, потім `Add(...)`.

3. **Фільтр без перевірки типу.** Приведення `(Product)item` падає на
   службовому рядку-заповнювачі `DataGrid`. Правильно:
   `if (item is not Product product) return false;`.

4. **`Binding` без `UpdateSourceTrigger=PropertyChanged` у полі пошуку.**
   Список фільтрується лише після Tab або кліку повз поле, і студенту
   здається, що фільтр не працює. Правильно: додати
   `UpdateSourceTrigger=PropertyChanged`.

5. **`WrapPanel` як `ItemsPanel` для великої колекції.** Віртуалізація
   вимикається, застосунок «підвисає». Правильно: плитка — тільки для
   невеликих списків.
